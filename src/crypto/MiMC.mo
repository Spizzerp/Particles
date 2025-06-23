import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Int "mo:base/Int";
import Debug "mo:base/Debug";
import Char "mo:base/Char";
import Text "mo:base/Text";

module {
    // MiMC implementation for BN254 scalar field
    // Field modulus for BN254: p = 21888242871839275222246405745257275088548364400416034343698204186575808495617
    
    // Constants for MiMC rounds (simplified version)
    // In production, these should match gnark-crypto exactly
    private let ROUNDS : Nat = 220; // MiMC-220 for 128-bit security
    
    // BN254 scalar field modulus as Nat
    private let FIELD_MODULUS : Nat = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    
    // Round constants (first 10 shown, need all 220)
    // These MUST match gnark-crypto's MiMC constants exactly
    private let ROUND_CONSTANTS : [Nat] = [
        0,
        7,
        10,
        12,
        17,
        48,
        625,
        32,
        412,
        45,
        // ... need to add remaining 210 constants from gnark-crypto
        // For now, using simplified constants
    ];
    
    // Convert bytes to Nat (big-endian)
    private func bytesToNat(bytes: [Nat8]) : Nat {
        var result = 0;
        for (byte in bytes.vals()) {
            result := result * 256 + Nat8.toNat(byte);
        };
        result
    };
    
    // Convert Nat to 32 bytes (big-endian)
    private func natTo32Bytes(n: Nat) : [Nat8] {
        let bytes = Buffer.Buffer<Nat8>(32);
        var temp = n;
        
        // Fill buffer with bytes
        for (i in Iter.range(0, 31)) {
            bytes.add(Nat8.fromNat(temp % 256));
            temp := temp / 256;
        };
        
        // Reverse for big-endian
        let result = Buffer.toArray(bytes);
        Array.tabulate<Nat8>(32, func(i) = result[31 - i])
    };
    
    // Modular exponentiation (x^3 mod p)
    private func cube(x: Nat) : Nat {
        let x2 = (x * x) % FIELD_MODULUS;
        (x2 * x) % FIELD_MODULUS
    };
    
    // MiMC block cipher encryption
    // k: key (0 for hash function)
    // x: input
    private func mimcF(k: Nat, x: Nat) : Nat {
        var state = x;
        
        // Apply rounds
        for (i in Iter.range(0, ROUNDS - 1)) {
            // Get round constant (using simple constants for now)
            let c = if (i < ROUND_CONSTANTS.size()) {
                ROUND_CONSTANTS[i]
            } else {
                Nat64.toNat(Nat64.fromNat(i + 1) * 7 + 1) % FIELD_MODULUS
            };
            
            // Round function: state = (state + k + c)^3
            state := (state + k + c) % FIELD_MODULUS;
            state := cube(state);
        };
        
        // Final addition
        (state + k) % FIELD_MODULUS
    };
    
    // Hash single field element
    public func hashOne(input: Blob) : Blob {
        let bytes = Blob.toArray(input);
        let padded = if (bytes.size() > 32) {
            // Take last 32 bytes if too long
            Array.tabulate<Nat8>(32, func(i) = bytes[bytes.size() - 32 + i])
        } else if (bytes.size() < 32) {
            // Pad with zeros on the left
            Array.tabulate<Nat8>(32, func(i) = 
                if (i < 32 - bytes.size()) { 0 } 
                else { bytes[i - (32 - bytes.size())] }
            )
        } else {
            bytes
        };
        
        let inputNat = bytesToNat(padded);
        let output = mimcF(0, inputNat);
        Blob.fromArray(natTo32Bytes(output))
    };
    
    // Hash two field elements (for Merkle tree)
    public func hashTwo(left: Blob, right: Blob) : Blob {
        let leftBytes = Blob.toArray(left);
        let rightBytes = Blob.toArray(right);
        
        // Ensure 32 bytes each
        let leftPadded = if (leftBytes.size() != 32) {
            Array.tabulate<Nat8>(32, func(i) = 
                if (i < 32 - leftBytes.size()) { 0 } 
                else { leftBytes[i - (32 - leftBytes.size())] }
            )
        } else { leftBytes };
        
        let rightPadded = if (rightBytes.size() != 32) {
            Array.tabulate<Nat8>(32, func(i) = 
                if (i < 32 - rightBytes.size()) { 0 } 
                else { rightBytes[i - (32 - rightBytes.size())] }
            )
        } else { rightBytes };
        
        let leftNat = bytesToNat(leftPadded);
        let rightNat = bytesToNat(rightPadded);
        
        // MiMC sponge construction for 2-to-1 hash
        // state = mimcF(0, left + right)
        let sum = (leftNat + rightNat) % FIELD_MODULUS;
        let h1 = mimcF(0, sum);
        
        // Second round with h1 as key
        let h2 = mimcF(h1, sum);
        
        Blob.fromArray(natTo32Bytes(h2))
    };
    
    // Hash three field elements (for commitment with amount)
    public func hashThree(a: Blob, b: Blob, c: Blob) : Blob {
        // First hash a and b
        let h1 = hashTwo(a, b);
        // Then hash result with c
        hashTwo(h1, c)
    };
    
    // Utility function to convert hex string to blob
    public func hexToBlob(hex: Text) : ?Blob {
        // Remove 0x prefix if present
        let cleanHex = if (hex.size() >= 2 and hex.chars().next() == ?'0' and 
                          switch(hex.chars().next()) { case (?c) { c == 'x' }; case null { false } }) {
            // Skip first 2 chars
            var result = "";
            var i = 0;
            for (c in hex.chars()) {
                if (i >= 2) { result #= Char.toText(c) };
                i += 1;
            };
            result
        } else { hex };
        
        // Convert hex pairs to bytes
        if (cleanHex.size() % 2 != 0) { return null };
        
        let bytes = Buffer.Buffer<Nat8>(cleanHex.size() / 2);
        var i = 0;
        while (i < cleanHex.size()) {
            let pair = cleanHex.substr(i, 2);
            switch (pair) {
                case (?p) {
                    // Convert hex pair to byte
                    var byte = 0;
                    for (c in p.chars()) {
                        byte *= 16;
                        if (c >= '0' and c <= '9') {
                            byte += Char.toNat32(c) - Char.toNat32('0');
                        } else if (c >= 'a' and c <= 'f') {
                            byte += 10 + Char.toNat32(c) - Char.toNat32('a');
                        } else if (c >= 'A' and c <= 'F') {
                            byte += 10 + Char.toNat32(c) - Char.toNat32('A');
                        } else {
                            return null; // Invalid hex
                        };
                    };
                    bytes.add(Nat8.fromNat(Nat32.toNat(byte)));
                };
                case null { return null };
            };
            i += 2;
        };
        
        ?Blob.fromArray(Buffer.toArray(bytes))
    };
    
    // Convert blob to hex string
    public func blobToHex(blob: Blob) : Text {
        let bytes = Blob.toArray(blob);
        var hex = "0x";
        for (byte in bytes.vals()) {
            let high = Nat8.toNat(byte) / 16;
            let low = Nat8.toNat(byte) % 16;
            hex #= (if (high < 10) { Nat.toText(high) } else { 
                switch(high) {
                    case 10 { "a" };
                    case 11 { "b" };
                    case 12 { "c" };
                    case 13 { "d" };
                    case 14 { "e" };
                    case 15 { "f" };
                    case _ { "?" };
                }
            });
            hex #= (if (low < 10) { Nat.toText(low) } else {
                switch(low) {
                    case 10 { "a" };
                    case 11 { "b" };
                    case 12 { "c" };
                    case 13 { "d" };
                    case 14 { "e" };
                    case 15 { "f" };
                    case _ { "?" };
                }
            });
        };
        hex
    };
}
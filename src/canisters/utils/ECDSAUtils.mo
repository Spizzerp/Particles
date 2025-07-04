import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Nat8 "mo:base/Nat8";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Result "mo:base/Result";
import Debug "mo:base/Debug";

module {
    // Secp256k1 curve parameters
    private let p : Nat = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
    
    // Decompress a secp256k1 public key
    public func decompressPublicKey(compressed: Blob) : Result.Result<Blob, Text> {
        let bytes = Blob.toArray(compressed);
        
        if (bytes.size() != 33) {
            return #err("Invalid compressed key length: expected 33 bytes, got " # Nat.toText(bytes.size()));
        };
        
        let prefix = bytes[0];
        if (prefix != 0x02 and prefix != 0x03) {
            return #err("Invalid compression prefix: " # Nat8.toText(prefix));
        };
        
        // Extract x coordinate (32 bytes after prefix)
        let xBytes = Array.subArray(bytes, 1, 32);
        let x = bytesToNat(xBytes);
        
        // Calculate y² = x³ + 7 (mod p)
        let xCubed = mulMod(mulMod(x, x, p), x, p);
        let ySquared = addMod(xCubed, 7, p);
        
        // Calculate y = sqrt(y²) mod p
        let y = modSqrt(ySquared, p);
        
        switch (y) {
            case (?yVal) {
                // Choose the correct y based on the prefix
                let yFinal = if ((yVal % 2 == 0 and prefix == 0x02) or (yVal % 2 == 1 and prefix == 0x03)) {
                    yVal
                } else {
                    p - yVal
                };
                
                // Convert back to bytes
                let yBytes = natToBytes32(yFinal);
                
                // Create uncompressed key (0x04 + x + y)
                let uncompressed = Array.tabulate<Nat8>(65, func(i: Nat) : Nat8 {
                    if (i == 0) { 0x04 }
                    else if (i <= 32) { xBytes[i - 1] }
                    else { yBytes[i - 33] }
                });
                
                #ok(Blob.fromArray(uncompressed))
            };
            case null {
                #err("Failed to calculate square root")
            };
        };
    };
    
    // Convert bytes to Nat (big-endian)
    private func bytesToNat(bytes: [Nat8]) : Nat {
        var result : Nat = 0;
        for (byte in bytes.vals()) {
            result := (result * 256) + Nat8.toNat(byte);
        };
        result
    };
    
    // Convert Nat to 32 bytes (big-endian)
    private func natToBytes32(n: Nat) : [Nat8] {
        var num = n;
        var bytes = Array.init<Nat8>(32, 0);
        var i = 31;
        
        while (num > 0 and i >= 0) {
            bytes[i] := Nat8.fromNat(num % 256);
            num := num / 256;
            if (i > 0) { i -= 1; };
        };
        
        Array.freeze(bytes)
    };
    
    // Modular multiplication
    private func mulMod(a: Nat, b: Nat, m: Nat) : Nat {
        ((a % m) * (b % m)) % m
    };
    
    // Modular addition
    private func addMod(a: Nat, b: Nat, m: Nat) : Nat {
        ((a % m) + (b % m)) % m
    };
    
    // Modular square root using Tonelli-Shanks algorithm
    // For secp256k1, p ≡ 3 (mod 4), so we can use the simpler formula
    private func modSqrt(n: Nat, p: Nat) : ?Nat {
        if (n == 0) { return ?0; };
        
        // For p ≡ 3 (mod 4), sqrt(n) = n^((p+1)/4) mod p
        let exponent = (p + 1) / 4;
        let result = modPow(n, exponent, p);
        
        // Verify the result
        if (mulMod(result, result, p) == n % p) {
            ?result
        } else {
            null
        }
    };
    
    // Modular exponentiation
    private func modPow(base: Nat, exp: Nat, mod: Nat) : Nat {
        if (mod == 1) { return 0; };
        
        var result : Nat = 1;
        var b = base % mod;
        var e = exp;
        
        while (e > 0) {
            if (e % 2 == 1) {
                result := mulMod(result, b, mod);
            };
            e := e / 2;
            b := mulMod(b, b, mod);
        };
        
        result
    };
};
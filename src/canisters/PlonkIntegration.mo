import Result "mo:base/Result";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Char "mo:base/Char";
import Error "mo:base/Error";
import Types "../types/Types";
import Debug "mo:base/Debug";

/// PLONK Verifier Integration for Particle Fund
/// 
/// This module interfaces with the plonk_verifier_on_icp canister
/// to provide full cryptographic verification of ZK proofs
module {
    
    // PLONK verifier canister ID (mainnet)
    // Updated with deployed verifier canister ID
    public let PLONK_VERIFIER_CANISTER = "f66vz-jaaaa-aaaaj-a2eua-cai";
    
    // Interface to the PLONK verifier canister
    public type PlonkVerifier = actor {
        verify_bytes : (vk_bytes: [Nat8], proof_bytes: [Nat8], witness_bytes: [Nat8], vk_has_lines: Bool) -> async Bool;
        verify_hex : (vk_hex: Text, proof_hex: Text, witness_hex: Text, vk_has_lines: Bool) -> async Bool;
    };
    
    
    /// Convert our proof format to PLONK bytes (gnark compressed format)
    public func serializeProof(proof: Types.PlonkProof) : Result.Result<[Nat8], Text> {
        let buffer = Buffer.Buffer<Nat8>(800); // PLONK proofs are ~800 bytes
        
        // The gnark compressed format expects (from proof.rs):
        // 1. Three G1 points for L, R, O commitments (32 bytes each, x-coordinate only)
        // 2. Z commitment (32 bytes)
        // 3. Three H commitments (32 bytes each)
        // 4. Batched proof H (32 bytes)
        // 5. Batched proof values length (4 bytes)
        // 6. Batched proof values (32 bytes each)
        // 7. Z shifted H (32 bytes)
        // 8. Z shifted value (32 bytes)
        // 9. BSB22 commitments length (4 bytes)
        // 10. BSB22 commitments (32 bytes each)
        
        // Helper function to serialize a point coordinate
        func serializeCoordinate(coord: Text) : Result.Result<(), Text> {
            switch (hexToBytes(coord)) {
                case (#ok(bytes)) {
                    // Take only first 32 bytes (x-coordinate for compressed format)
                    let size = Nat.min(32, bytes.size());
                    for (i in Iter.range(0, size - 1)) {
                        buffer.add(bytes[i]);
                    };
                    // Pad if necessary
                    for (i in Iter.range(size, 31)) {
                        buffer.add(0);
                    };
                    #ok()
                };
                case (#err(e)) { #err(e) };
            }
        };
        
        // 1. Serialize LRO commitments (L, R, O) - expecting array of 3
        if (proof.lro.size() != 3) {
            return #err("LRO array must have exactly 3 points");
        };
        
        // L commitment
        switch (serializeCoordinate(proof.lro[0].0)) {
            case (#err(e)) { return #err("Failed to serialize L: " # e); };
            case (#ok()) {};
        };
        
        // R commitment
        switch (serializeCoordinate(proof.lro[1].0)) {
            case (#err(e)) { return #err("Failed to serialize R: " # e); };
            case (#ok()) {};
        };
        
        // O commitment
        switch (serializeCoordinate(proof.lro[2].0)) {
            case (#err(e)) { return #err("Failed to serialize O: " # e); };
            case (#ok()) {};
        };
        
        // 2. Z commitment
        switch (serializeCoordinate(proof.z.0)) {
            case (#err(e)) { return #err("Failed to serialize Z: " # e); };
            case (#ok()) {};
        };
        
        // 3. H commitments (h0, h1, h2) - expecting array of 3
        if (proof.h.size() != 3) {
            return #err("H array must have exactly 3 points");
        };
        
        // h0
        switch (serializeCoordinate(proof.h[0].0)) {
            case (#err(e)) { return #err("Failed to serialize h0: " # e); };
            case (#ok()) {};
        };
        
        // h1
        switch (serializeCoordinate(proof.h[1].0)) {
            case (#err(e)) { return #err("Failed to serialize h1: " # e); };
            case (#ok()) {};
        };
        
        // h2
        switch (serializeCoordinate(proof.h[2].0)) {
            case (#err(e)) { return #err("Failed to serialize h2: " # e); };
            case (#ok()) {};
        };
        
        // 4. Batched proof H
        switch (serializeCoordinate(proof.batched_proof.h.0)) {
            case (#err(e)) { return #err("Failed to serialize batched proof h: " # e); };
            case (#ok()) {};
        };
        
        // 5. Batched proof values length (4 bytes, big-endian)
        let claimedValuesLen = proof.batched_proof.claimed_values.size();
        buffer.add(Nat8.fromNat(claimedValuesLen / 16777216 % 256)); // >> 24
        buffer.add(Nat8.fromNat(claimedValuesLen / 65536 % 256));    // >> 16  
        buffer.add(Nat8.fromNat(claimedValuesLen / 256 % 256));      // >> 8
        buffer.add(Nat8.fromNat(claimedValuesLen % 256));            // & 0xFF
        
        // 6. Batched proof values
        Debug.print("Serializing " # Nat.toText(claimedValuesLen) # " claimed values");
        for (i in Iter.range(0, claimedValuesLen - 1)) {
            let value = proof.batched_proof.claimed_values[i];
            Debug.print("  Claimed value " # Nat.toText(i) # ": " # value # " (length: " # Nat.toText(Text.size(value)) # ")");
            switch (hexToBytes(value)) {
                case (#ok(bytes)) {
                    Debug.print("    Converted to " # Nat.toText(bytes.size()) # " bytes");
                    if (bytes.size() != 32) {
                        Debug.print("    WARNING: Expected 32 bytes!");
                    };
                    let size = Nat.min(32, bytes.size());
                    for (j in Iter.range(0, size - 1)) {
                        buffer.add(bytes[j]);
                    };
                    for (j in Iter.range(size, 31)) {
                        buffer.add(0);
                    };
                };
                case (#err(e)) { return #err("Failed to serialize claimed value " # Nat.toText(i) # ": " # e); };
            };
        };
        
        // 7. Z shifted H
        switch (serializeCoordinate(proof.zshifted_proof.h.0)) {
            case (#err(e)) { return #err("Failed to serialize z shifted h: " # e); };
            case (#ok()) {};
        };
        
        // 8. Z shifted value
        switch (hexToBytes(proof.zshifted_proof.claimed_value)) {
            case (#ok(bytes)) {
                let size = Nat.min(32, bytes.size());
                for (i in Iter.range(0, size - 1)) {
                    buffer.add(bytes[i]);
                };
                for (i in Iter.range(size, 31)) {
                    buffer.add(0);
                };
            };
            case (#err(e)) { return #err("Failed to serialize z shifted value: " # e); };
        };
        
        // 9. BSB22 commitments length (4 bytes, big-endian)
        let bsb22Len = proof.bsb22_commitments.size();
        buffer.add(Nat8.fromNat(bsb22Len / 16777216 % 256)); // >> 24
        buffer.add(Nat8.fromNat(bsb22Len / 65536 % 256));    // >> 16  
        buffer.add(Nat8.fromNat(bsb22Len / 256 % 256));      // >> 8
        buffer.add(Nat8.fromNat(bsb22Len % 256));            // & 0xFF
        
        // 10. BSB22 commitments (if any)
        for (commitment in proof.bsb22_commitments.vals()) {
            switch (serializeCoordinate(commitment.0)) {
                case (#err(e)) { return #err("Failed to serialize BSB22 commitment: " # e); };
                case (#ok()) {};
            };
        };
        
        #ok(Buffer.toArray(buffer))
    };
    
    /// Convert public inputs to witness bytes
    public func serializeWitness(publicInputs: [Text]) : Result.Result<[Nat8], Text> {
        let buffer = Buffer.Buffer<Nat8>(12 + publicInputs.size() * 32); // 12 bytes header + 32 bytes per input
        
        // Write witness header FIRST according to gnark format:
        // 4 bytes: number of public inputs
        let numPublic = publicInputs.size();
        buffer.add(Nat8.fromNat(numPublic / 16777216 % 256)); // >> 24
        buffer.add(Nat8.fromNat(numPublic / 65536 % 256));    // >> 16
        buffer.add(Nat8.fromNat(numPublic / 256 % 256));      // >> 8
        buffer.add(Nat8.fromNat(numPublic % 256));            // & 0xFF
        
        // 4 bytes: number of secret inputs (0 for public witness)
        buffer.add(0);
        buffer.add(0);
        buffer.add(0);
        buffer.add(0);
        
        // 4 bytes: vector length (same as public inputs)
        buffer.add(Nat8.fromNat(numPublic / 16777216 % 256)); // >> 24
        buffer.add(Nat8.fromNat(numPublic / 65536 % 256));    // >> 16
        buffer.add(Nat8.fromNat(numPublic / 256 % 256));      // >> 8
        buffer.add(Nat8.fromNat(numPublic % 256));            // & 0xFF
        
        // THEN write the actual public inputs (32 bytes each)
        for (input in publicInputs.vals()) {
            switch (hexToBytes(input)) {
                case (#ok(bytes)) {
                    if (bytes.size() != 32) {
                        return #err("Public input must be exactly 32 bytes, got " # Nat.toText(bytes.size()) # " for: " # input);
                    };
                    for (byte in bytes.vals()) {
                        buffer.add(byte);
                    };
                };
                case (#err(e)) { return #err("Failed to convert public input: " # e); };
            };
        };
        
        #ok(Buffer.toArray(buffer));
    };
    
    /// Verify a PLONK proof using the external verifier
    public func verifyWithPlonk(
        verifierCanister: PlonkVerifier,
        vkBytes: [Nat8],
        proof: Types.PlonkProof,
        publicInputs: [Text]
    ) : async Result.Result<Bool, Text> {
        
        // Serialize the proof
        let proofBytes = switch (serializeProof(proof)) {
            case (#ok(bytes)) { bytes };
            case (#err(e)) { return #err("Failed to serialize proof: " # e); };
        };
        
        // Serialize the witness (public inputs)
        let witnessBytes = switch (serializeWitness(publicInputs)) {
            case (#ok(bytes)) { bytes };
            case (#err(e)) { return #err("Failed to serialize witness: " # e); };
        };
        
        // Call the PLONK verifier
        try {
            let isValid = await verifierCanister.verify_bytes(
                vkBytes,
                proofBytes,
                witnessBytes,
                true // vk_has_lines - set to true since our VK is 34KB and includes lines
            );
            
            #ok(isValid)
        } catch (e) {
            #err("PLONK verification failed: " # Error.message(e))
        }
    };
    
    /// Convert hex string to bytes
    private func hexToBytes(hex: Text) : Result.Result<[Nat8], Text> {
        var cleanHex = hex;
        
        // Remove 0x prefix if present
        if (Text.startsWith(hex, #text "0x")) {
            cleanHex := Text.trimStart(hex, #text "0x");
        };
        
        // Check even length
        if (Text.size(cleanHex) % 2 != 0) {
            return #err("Hex string must have even length");
        };
        
        let buffer = Buffer.Buffer<Nat8>(Text.size(cleanHex) / 2);
        var i = 0;
        
        while (i < Text.size(cleanHex)) {
            let chars = Text.toArray(cleanHex);
            let byteChars = Array.subArray(chars, i, 2);
            let byteStr = Text.fromIter(byteChars.vals());
            
            switch (hexByteToNat8(byteStr)) {
                case (#ok(byte)) { buffer.add(byte); };
                case (#err(e)) { return #err(e); };
            };
            
            i += 2;
        };
        
        #ok(Buffer.toArray(buffer))
    };
    
    /// Convert 2-char hex string to Nat8
    private func hexByteToNat8(hex: Text) : Result.Result<Nat8, Text> {
        if (Text.size(hex) != 2) {
            return #err("Invalid hex byte length");
        };
        
        let chars = Text.toArray(hex);
        
        switch (hexCharToNat(chars[0]), hexCharToNat(chars[1])) {
            case (#ok(high), #ok(low)) {
                #ok(Nat8.fromNat(high * 16 + low))
            };
            case _ { #err("Invalid hex characters"); };
        }
    };
    
    /// Convert hex character to nat
    private func hexCharToNat(c: Char) : Result.Result<Nat, Text> {
        if (c >= '0' and c <= '9') {
            #ok(Nat8.toNat(Nat8.fromNat(Nat32.toNat(Char.toNat32(c)) - Nat32.toNat(Char.toNat32('0')))))
        } else if (c >= 'a' and c <= 'f') {
            #ok(Nat8.toNat(Nat8.fromNat(Nat32.toNat(Char.toNat32(c)) - Nat32.toNat(Char.toNat32('a')) + 10)))
        } else if (c >= 'A' and c <= 'F') {
            #ok(Nat8.toNat(Nat8.fromNat(Nat32.toNat(Char.toNat32(c)) - Nat32.toNat(Char.toNat32('A')) + 10)))
        } else {
            #err("Invalid hex character")
        }
    };
}
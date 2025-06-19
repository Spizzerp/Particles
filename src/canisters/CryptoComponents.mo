import Principal "mo:base/Principal";
import Map "mo:base/HashMap";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Hash "mo:base/Hash";
import Types "../types/Types";

actor CryptoComponents {
    private var merkleTree = Map.HashMap<Nat, [Types.CommitmentHash]>(10, Nat.equal, Hash.hash);
    private var merkleRoots = Map.HashMap<Nat, Types.MerkleRoot>(10, Nat.equal, Hash.hash);
    private stable var currentTreeLevel : Nat = 0;
    private stable var leafCount : Nat = 0;
    
    private stable var merkleTreeEntries : [(Nat, [Types.CommitmentHash])] = [];
    private stable var merkleRootEntries : [(Nat, Types.MerkleRoot)] = [];
    
    system func preupgrade() {
        merkleTreeEntries := Iter.toArray(merkleTree.entries());
        merkleRootEntries := Iter.toArray(merkleRoots.entries());
    };
    
    system func postupgrade() {
        merkleTree := Map.fromIter<Nat, [Types.CommitmentHash]>(merkleTreeEntries.vals(), 10, Nat.equal, Hash.hash);
        merkleRoots := Map.fromIter<Nat, Types.MerkleRoot>(merkleRootEntries.vals(), 10, Nat.equal, Hash.hash);
    };
    
    public func generateCommitment(
        secret: Text,
        nullifier: Text,
        amount: Nat
    ) : async Result.Result<Types.CommitmentHash, Text> {
        let data = secret # nullifier # Nat.toText(amount);
        let commitment = await hash(data);
        #ok(commitment)
    };
    
    public func generateNullifier(
        secret: Text,
        leafIndex: Nat
    ) : async Result.Result<Types.NullifierHash, Text> {
        let data = secret # Nat.toText(leafIndex);
        let nullifier = await hash(data);
        #ok(nullifier)
    };
    
    public func addLeaf(commitment: Types.CommitmentHash) : async Result.Result<Nat, Text> {
        let leafIndex = leafCount;
        leafCount += 1;
        
        switch (merkleTree.get(0)) {
            case null {
                merkleTree.put(0, [commitment]);
            };
            case (?leaves) {
                merkleTree.put(0, Array.append(leaves, [commitment]));
            };
        };
        
        let _ = await updateMerkleTree();
        
        #ok(leafIndex)
    };
    
    private func updateMerkleTree() : async Result.Result<(), Text> {
        var level = 0;
        
        loop {
            switch (merkleTree.get(level)) {
                case null { return #ok(); };
                case (?currentLevel) {
                    if (currentLevel.size() <= 1) {
                        if (level > currentTreeLevel) {
                            currentTreeLevel := level;
                        };
                        merkleRoots.put(level, currentLevel[0]);
                        return #ok();
                    };
                    
                    var nextLevel : [Types.CommitmentHash] = [];
                    var i = 0;
                    
                    while (i < currentLevel.size()) {
                        if (i + 1 < currentLevel.size()) {
                            let combined = await hashPair(currentLevel[i], currentLevel[i + 1]);
                            nextLevel := Array.append(nextLevel, [combined]);
                            i += 2;
                        } else {
                            nextLevel := Array.append(nextLevel, [currentLevel[i]]);
                            i += 1;
                        };
                    };
                    
                    merkleTree.put(level + 1, nextLevel);
                    level += 1;
                };
            };
        };
    };
    
    public func getMerkleProof(leafIndex: Nat) : async Result.Result<[Types.CommitmentHash], Text> {
        if (leafIndex >= leafCount) {
            return #err("Leaf index out of bounds");
        };
        
        var proof : [Types.CommitmentHash] = [];
        var currentIndex = leafIndex;
        var level = 0;
        
        loop {
            switch (merkleTree.get(level)) {
                case null { return #ok(proof); };
                case (?levelNodes) {
                    if (levelNodes.size() <= 1) {
                        return #ok(proof);
                    };
                    
                    let siblingIndex = if (currentIndex % 2 == 0) {
                        currentIndex + 1
                    } else {
                        currentIndex - 1
                    };
                    
                    if (siblingIndex < levelNodes.size()) {
                        proof := Array.append(proof, [levelNodes[siblingIndex]]);
                    };
                    
                    currentIndex := currentIndex / 2;
                    level += 1;
                };
            };
        };
    };
    
    public func verifyMerkleProof(
        leaf: Types.CommitmentHash,
        proof: [Types.CommitmentHash],
        root: Types.MerkleRoot,
        leafIndex: Nat
    ) : async Bool {
        var computedHash = leaf;
        var index = leafIndex;
        
        for (proofElement in proof.vals()) {
            if (index % 2 == 0) {
                computedHash := await hashPair(computedHash, proofElement);
            } else {
                computedHash := await hashPair(proofElement, computedHash);
            };
            index := index / 2;
        };
        
        computedHash == root
    };
    
    private func hash(data: Text) : async Text {
        let bytes = Text.encodeUtf8(data);
        let hash = Blob.toArray(bytes);
        
        var result = 0;
        for (byte in hash.vals()) {
            result := (result * 31 + Nat8.toNat(byte)) % 2147483647;
        };
        
        "0x" # Nat.toText(result)
    };
    
    private func hashPair(left: Text, right: Text) : async Text {
        await hash(left # right)
    };
    
    public func generateZKProof(
        secret: Text,
        nullifier: Text,
        recipient: Text,
        amount: Nat,
        merkleRoot: Types.MerkleRoot,
        merkleProof: [Types.CommitmentHash],
        leafIndex: Nat
    ) : async Result.Result<Types.ZKProof, Text> {
        let commitment = await hash(secret # nullifier # Nat.toText(amount));
        let nullifierHash = await hash(secret # Nat.toText(leafIndex));
        
        let proof : Types.ZKProof = {
            a = ("0x1234567890abcdef", "0xfedcba0987654321");
            b = (
                ("0x1111111111111111", "0x2222222222222222"),
                ("0x3333333333333333", "0x4444444444444444")
            );
            c = ("0x5555555555555555", "0x6666666666666666");
            publicSignals = [
                merkleRoot,
                nullifierHash,
                recipient,
                Nat.toText(amount)
            ];
        };
        
        #ok(proof)
    };
    
    public query func getCurrentMerkleRoot() : async ?Types.MerkleRoot {
        merkleRoots.get(currentTreeLevel)
    };
    
    public query func getMerkleRootAtLevel(level: Nat) : async ?Types.MerkleRoot {
        merkleRoots.get(level)
    };
    
    public query func getTreeDepth() : async Nat {
        currentTreeLevel
    };
    
    public query func getLeafCount() : async Nat {
        leafCount
    };
    
    public func encryptData(data: Text, publicKey: Text) : async Result.Result<Text, Text> {
        let encrypted = "encrypted_" # data # "_with_" # publicKey;
        #ok(encrypted)
    };
    
    public func decryptData(encryptedData: Text, privateKey: Text) : async Result.Result<Text, Text> {
        if (Text.contains(encryptedData, #text "encrypted_") and Text.contains(encryptedData, #text "_with_")) {
            let parts = Iter.toArray(Text.split(encryptedData, #text "_with_"));
            if (parts.size() > 0) {
                let dataPart = parts[0];
                let dataOnly = Text.replace(dataPart, #text "encrypted_", "");
                #ok(dataOnly)
            } else {
                #err("Invalid encrypted data format")
            }
        } else {
            #err("Invalid encrypted data")
        }
    };
}
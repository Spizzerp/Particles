import Array "mo:base/Array";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Iter "mo:base/Iter";

module {
    // Merkle tree implementation with proper ordering and consistency
    
    public type Commitment = Text; // Hex string of commitment
    public type MerkleNode = Text; // Hex string of hash
    public type MerkleProof = [MerkleNode];
    
    // Tree parameters
    public let TREE_DEPTH : Nat = 20; // 2^20 leaves max
    
    // Empty leaf value (0 in the field)
    public let EMPTY_LEAF : Text = "0x0000000000000000000000000000000000000000000000000000000000000000";
    
    public class MerkleTree(mimcHash: (Text, Text) -> Text) {
        private var commitments = Buffer.Buffer<Commitment>(256);
        private var currentRoot : MerkleNode = EMPTY_LEAF;
        
        // Get current number of deposits
        public func size() : Nat {
            commitments.size()
        };
        
        // Add a new commitment and update the tree
        public func addCommitment(commitment: Commitment) : Nat {
            let index = commitments.size();
            commitments.add(commitment);
            
            // Recompute root after adding
            currentRoot := computeRoot();
            
            return index;
        };
        
        // Get the current Merkle root
        public func getRoot() : MerkleNode {
            currentRoot
        };
        
        // Get all commitments (for proof generation)
        public func getCommitments() : [Commitment] {
            Buffer.toArray(commitments)
        };
        
        // Generate Merkle proof for a specific index
        public func getMerkleProof(leafIndex: Nat) : Result.Result<MerkleProof, Text> {
            if (leafIndex >= commitments.size()) {
                return #err("Invalid leaf index");
            };
            
            var proof = Buffer.Buffer<MerkleNode>(TREE_DEPTH);
            var currentIndex = leafIndex;
            
            // Build the tree level by level
            var currentLevel = Buffer.Buffer<MerkleNode>(commitments.size());
            for (commitment in commitments.vals()) {
                currentLevel.add(commitment);
            };
            
            // Process each level of the tree
            for (level in Iter.range(0, TREE_DEPTH - 1)) {
                let levelSize = currentLevel.size();
                
                // Find sibling
                let isRightNode = currentIndex % 2 == 1;
                let siblingIndex = if (isRightNode) { currentIndex - 1 } else { currentIndex + 1 };
                
                // Add sibling to proof
                if (siblingIndex < levelSize) {
                    proof.add(currentLevel.get(siblingIndex));
                } else {
                    proof.add(EMPTY_LEAF);
                };
                
                // Build next level
                let nextLevel = Buffer.Buffer<MerkleNode>(levelSize / 2 + 1);
                var i = 0;
                while (i < levelSize) {
                    let left = currentLevel.get(i);
                    let right = if (i + 1 < levelSize) { 
                        currentLevel.get(i + 1) 
                    } else { 
                        EMPTY_LEAF 
                    };
                    
                    nextLevel.add(mimcHash(left, right));
                    i += 2;
                };
                
                currentLevel := nextLevel;
                currentIndex := currentIndex / 2;
                
                // If we've reduced to a single element, fill rest with empty
                if (currentLevel.size() == 1) {
                    var j = level + 1;
                    while (j < TREE_DEPTH) {
                        proof.add(EMPTY_LEAF);
                        j += 1;
                    };
                    return #ok(Buffer.toArray(proof));
                };
            };
            
            #ok(Buffer.toArray(proof))
        };
        
        // Compute the Merkle root from current commitments
        private func computeRoot() : MerkleNode {
            if (commitments.size() == 0) {
                return EMPTY_LEAF;
            };
            
            // Start with commitments as leaves
            var currentLevel = Buffer.Buffer<MerkleNode>(commitments.size());
            for (commitment in commitments.vals()) {
                currentLevel.add(commitment);
            };
            
            // Build tree level by level
            var level = 0;
            while (level < TREE_DEPTH and currentLevel.size() > 1) {
                let nextLevel = Buffer.Buffer<MerkleNode>(currentLevel.size() / 2 + 1);
                
                var i = 0;
                while (i < currentLevel.size()) {
                    let left = currentLevel.get(i);
                    let right = if (i + 1 < currentLevel.size()) { 
                        currentLevel.get(i + 1) 
                    } else { 
                        EMPTY_LEAF 
                    };
                    
                    nextLevel.add(mimcHash(left, right));
                    i += 2;
                };
                
                currentLevel := nextLevel;
                level += 1;
            };
            
            currentLevel.get(0)
        };
        
        // Verify a Merkle proof
        public func verifyProof(
            leaf: MerkleNode,
            leafIndex: Nat,
            proof: MerkleProof,
            root: MerkleNode
        ) : Bool {
            var currentHash = leaf;
            var currentIndex = leafIndex;
            
            for (sibling in proof.vals()) {
                let isRightNode = currentIndex % 2 == 1;
                
                currentHash := if (isRightNode) {
                    mimcHash(sibling, currentHash)
                } else {
                    mimcHash(currentHash, sibling)
                };
                
                currentIndex := currentIndex / 2;
            };
            
            currentHash == root
        };
    };
}
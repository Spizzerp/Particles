pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

template CommitmentHasher() {
    signal input nullifier;
    signal input secret;
    signal input amount;
    signal input chainId;
    signal output commitment;
    
    component hasher = Poseidon(4);
    hasher.inputs[0] <== nullifier;
    hasher.inputs[1] <== secret;
    hasher.inputs[2] <== amount;
    hasher.inputs[3] <== chainId;
    
    commitment <== hasher.out;
}

template MerkleTreeInclusionProof(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;
    
    component hashers[levels];
    signal computedPath[levels + 1];
    computedPath[0] <== leaf;
    
    for (var i = 0; i < levels; i++) {
        pathIndices[i] * (pathIndices[i] - 1) === 0;
        
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== computedPath[i] - pathIndices[i] * (computedPath[i] - pathElements[i]);
        hashers[i].inputs[1] <== pathElements[i] - pathIndices[i] * (pathElements[i] - computedPath[i]);
        computedPath[i + 1] <== hashers[i].out;
    }
    
    root <== computedPath[levels];
}

template Withdraw(levels) {
    // Public inputs
    signal input root;
    signal input nullifierHash;
    signal input recipient; 
    signal input relayer;
    signal input fee;
    signal input amount;
    signal input chainId;
    
    // Private inputs
    signal input nullifier;
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    
    // Verify that the nullifier hash matches
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHash === nullifierHasher.out;
    
    // Verify that the commitment is in the tree
    component commitmentHasher = CommitmentHasher();
    commitmentHasher.nullifier <== nullifier;
    commitmentHasher.secret <== secret;
    commitmentHasher.amount <== amount;
    commitmentHasher.chainId <== chainId;
    
    component tree = MerkleTreeInclusionProof(levels);
    tree.leaf <== commitmentHasher.commitment;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }
    
    root === tree.root;
    
    // Add a constraint to prevent tampering with recipient
    signal recipientSquared;
    recipientSquared <== recipient * recipient;
    
    // Add a constraint to prevent tampering with fee
    component feeCheck = LessThan(64);
    feeCheck.in[0] <== fee;
    feeCheck.in[1] <== amount;
    feeCheck.out === 1;
}

component main {public [root, nullifierHash, recipient, relayer, fee, amount, chainId]} = Withdraw(20);
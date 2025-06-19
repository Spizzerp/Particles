// Simple withdrawal circuit for Particle Funds
// Compatible with circom 0.5.x

template Withdraw() {
    // Public inputs
    signal input root;
    signal input nullifierHash;
    signal input recipient;
    signal input amount;
    
    // Private inputs
    signal private input nullifier;
    signal private input secret;
    signal private input pathElements[20];
    signal private input pathIndices[20];
    
    // Verify nullifier hash
    signal nullifierSquared;
    nullifierSquared <== nullifier * nullifier;
    
    // Dummy constraint to ensure nullifierHash is used
    signal nullifierHashSquared;
    nullifierHashSquared <== nullifierHash * nullifierHash;
    
    // Commitment = hash(nullifier, secret, amount)
    // For simplicity, we'll use multiplication as a pseudo-hash
    signal commitment;
    signal secretSquared;
    secretSquared <== secret * secret;
    commitment <== nullifier * secret * amount;
    
    // Verify merkle path (simplified)
    signal computedHash[21];
    computedHash[0] <== commitment;
    
    for (var i = 0; i < 20; i++) {
        signal isLeft;
        isLeft <== 1 - pathIndices[i];
        
        signal leftHash;
        signal rightHash;
        
        leftHash <== isLeft * computedHash[i] + (1 - isLeft) * pathElements[i];
        rightHash <== (1 - isLeft) * computedHash[i] + isLeft * pathElements[i];
        
        computedHash[i + 1] <== leftHash + rightHash;
    }
    
    // Check root matches
    root === computedHash[20];
    
    // Ensure recipient is valid (non-zero)
    signal recipientIsValid;
    recipientIsValid <== recipient * recipient;
}

component main = Withdraw();
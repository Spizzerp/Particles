package particlefund

import (
    "math/big"
    "testing"
    
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/backend/groth16"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/r1cs"
    "github.com/consensys/gnark/std/hash/mimc"
    "github.com/consensys/gnark/test"
)

// Helper function to build a simple 5-level Merkle tree
func buildMerkleTree(commitments []frontend.Variable) (root frontend.Variable, paths map[int][5]frontend.Variable) {
    // For simplicity, we'll build a tree with exactly 32 leaves (2^5)
    // Pad with zeros if needed
    leaves := make([]frontend.Variable, 32)
    for i := 0; i < len(commitments) && i < 32; i++ {
        leaves[i] = commitments[i]
    }
    // Pad remaining with zeros
    for i := len(commitments); i < 32; i++ {
        leaves[i] = big.NewInt(0)
    }
    
    // Build the tree level by level
    tree := make([][]frontend.Variable, 6) // 6 levels total (0=leaves, 5=root)
    tree[0] = leaves
    
    // Build each level
    for level := 1; level <= 5; level++ {
        prevLevel := tree[level-1]
        currentLevel := make([]frontend.Variable, len(prevLevel)/2)
        
        for i := 0; i < len(currentLevel); i++ {
            // Hash pairs of nodes
            h := mimc.NewMiMC()
            h.Write(prevLevel[2*i].(*big.Int).Bytes())
            h.Write(prevLevel[2*i+1].(*big.Int).Bytes())
            hash := h.Sum(nil)
            currentLevel[i] = new(big.Int).SetBytes(hash)
        }
        
        tree[level] = currentLevel
    }
    
    root = tree[5][0]
    
    // Build Merkle paths for each leaf
    paths = make(map[int][5]frontend.Variable)
    for leafIdx := 0; leafIdx < len(commitments); leafIdx++ {
        var path [5]frontend.Variable
        currentIdx := leafIdx
        
        for level := 0; level < 5; level++ {
            // Sibling is the other node in the pair
            siblingIdx := currentIdx ^ 1 // XOR with 1 flips the last bit
            path[level] = tree[level][siblingIdx]
            currentIdx = currentIdx / 2 // Move to parent index
        }
        
        paths[leafIdx] = path
    }
    
    return root, paths
}

func TestBasicMerkleCircuit(t *testing.T) {
    // Test values
    secret := big.NewInt(123456789)
    nullifier := big.NewInt(987654321)
    leafIndex := 3 // Position in tree
    
    // Compute commitment
    h1 := mimc.NewMiMC()
    h1.Write(secret.Bytes())
    h1.Write(nullifier.Bytes())
    commitmentBytes := h1.Sum(nil)
    commitment := new(big.Int).SetBytes(commitmentBytes)
    
    // Compute nullifier hash
    h2 := mimc.NewMiMC()
    h2.Write(nullifier.Bytes())
    nullifierHashBytes := h2.Sum(nil)
    nullifierHash := new(big.Int).SetBytes(nullifierHashBytes)
    
    // Build a simple Merkle tree with our commitment at position 3
    commitments := make([]frontend.Variable, 4)
    commitments[0] = big.NewInt(111)
    commitments[1] = big.NewInt(222)
    commitments[2] = big.NewInt(333)
    commitments[3] = commitment
    
    root, paths := buildMerkleTree(commitments)
    merklePath := paths[leafIndex]
    
    // Create witness
    witness := BasicMerkleCircuit{
        MerkleRoot:    root,
        NullifierHash: nullifierHash,
        Secret:        secret,
        Nullifier:     nullifier,
        LeafIndex:     big.NewInt(int64(leafIndex)),
        MerklePath:    merklePath,
    }
    
    // Test with test engine
    assert := test.NewAssert(t)
    assert.ProverSucceeded(&BasicMerkleCircuit{}, &witness, test.WithCurves(ecc.BN254))
}

func TestBasicMerkleCircuitCompile(t *testing.T) {
    var circuit BasicMerkleCircuit
    
    // Compile the circuit
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), r1cs.NewBuilder, &circuit)
    if err != nil {
        t.Fatal(err)
    }
    
    // Print circuit info
    t.Logf("Step 3 Circuit compiled successfully")
    t.Logf("Number of constraints: %d", ccs.GetNbConstraints())
    t.Logf("Number of public inputs: %d", ccs.GetNbPublicVariables())
    t.Logf("Number of secret inputs: %d", ccs.GetNbSecretVariables())
}
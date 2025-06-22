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

// Helper function to build a 20-level Merkle tree (simplified for testing)
func buildFullMerkleTree(commitment frontend.Variable, leafIndex int) (root frontend.Variable, path [20]frontend.Variable) {
    // For testing, we'll create a sparse tree with just our commitment
    // In production, this would be a full tree
    
    // Initialize path with dummy values
    for i := 0; i < 20; i++ {
        // Use deterministic dummy values for siblings
        path[i] = big.NewInt(int64(i * 1000 + 42))
    }
    
    // Compute root by hashing up from the commitment
    currentHash := commitment
    currentIdx := leafIndex
    
    for level := 0; level < 20; level++ {
        h := mimc.NewMiMC()
        
        // Determine if we're left or right child
        if currentIdx&1 == 0 {
            // We're left child, sibling is right
            h.Write(currentHash.(*big.Int).Bytes())
            h.Write(path[level].(*big.Int).Bytes())
        } else {
            // We're right child, sibling is left
            h.Write(path[level].(*big.Int).Bytes())
            h.Write(currentHash.(*big.Int).Bytes())
        }
        
        hashBytes := h.Sum(nil)
        currentHash = new(big.Int).SetBytes(hashBytes)
        currentIdx = currentIdx / 2
    }
    
    root = currentHash
    return root, path
}

func TestFullMerkleCircuit(t *testing.T) {
    // Test values
    secret := big.NewInt(123456789)
    nullifier := big.NewInt(987654321)
    leafIndex := 524287 // Position near middle of tree (2^19 - 1)
    
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
    
    // Build Merkle tree and get path
    root, merklePath := buildFullMerkleTree(commitment, leafIndex)
    
    // Create witness
    witness := FullMerkleCircuit{
        MerkleRoot:    root,
        NullifierHash: nullifierHash,
        Secret:        secret,
        Nullifier:     nullifier,
        LeafIndex:     big.NewInt(int64(leafIndex)),
        MerklePath:    merklePath,
    }
    
    // Test with test engine
    assert := test.NewAssert(t)
    assert.ProverSucceeded(&FullMerkleCircuit{}, &witness, test.WithCurves(ecc.BN254))
}

func TestFullMerkleCircuitCompile(t *testing.T) {
    var circuit FullMerkleCircuit
    
    // Compile the circuit
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), r1cs.NewBuilder, &circuit)
    if err != nil {
        t.Fatal(err)
    }
    
    // Print circuit info
    t.Logf("Step 4 Circuit compiled successfully")
    t.Logf("Number of constraints: %d", ccs.GetNbConstraints())
    t.Logf("Number of public inputs: %d", ccs.GetNbPublicVariables())
    t.Logf("Number of secret inputs: %d", ccs.GetNbSecretVariables())
    
    // Check that constraints are in expected range
    constraints := ccs.GetNbConstraints()
    if constraints < 15000 || constraints > 25000 {
        t.Logf("Warning: Constraint count %d is outside expected range (15k-25k)", constraints)
    }
}
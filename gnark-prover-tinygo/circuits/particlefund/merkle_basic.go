// Step 3: Basic Merkle Circuit
// This circuit proves knowledge of (secret, nullifier) pair whose commitment is in a 5-level Merkle tree
// Constraints: ~1,500-2,000
package particlefund

import (
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/std/hash/mimc"
)

// BasicMerkleCircuit - Step 3 of incremental build
// Proves: "I know (secret, nullifier) whose commitment is in this 5-level Merkle tree"
type BasicMerkleCircuit struct {
    // Public inputs
    MerkleRoot    frontend.Variable `gnark:",public"`
    NullifierHash frontend.Variable `gnark:",public"`
    
    // Private inputs
    Secret    frontend.Variable `gnark:",secret"`
    Nullifier frontend.Variable `gnark:",secret"`
    
    // Merkle proof (5 levels for 32 leaves)
    LeafIndex  frontend.Variable   `gnark:",secret"` // Position in tree (0-31)
    MerklePath [5]frontend.Variable `gnark:",secret"` // Sibling hashes
}

// Define implements the circuit logic
func (circuit *BasicMerkleCircuit) Define(api frontend.API) error {
    // Part 1: Verify nullifier hash (from Step 1)
    mimc1, err := mimc.NewMiMC(api)
    if err != nil {
        return err
    }
    
    mimc1.Write(circuit.Nullifier)
    computedNullifierHash := mimc1.Sum()
    api.AssertIsEqual(computedNullifierHash, circuit.NullifierHash)
    
    // Part 2: Compute commitment (from Step 2)
    mimc2, err := mimc.NewMiMC(api)
    if err != nil {
        return err
    }
    
    mimc2.Write(circuit.Secret)
    mimc2.Write(circuit.Nullifier)
    commitment := mimc2.Sum()
    
    // Part 3: Verify Merkle proof (new in Step 3)
    // First, ensure leafIndex is within valid range (0-31)
    // We do this by asserting leafIndex < 32
    api.AssertIsLessOrEqual(circuit.LeafIndex, 31)
    
    // Start from the leaf (commitment)
    currentHash := commitment
    
    // For each level of the tree
    for i := 0; i < 5; i++ {
        // Get the i-th bit of leafIndex to determine ordering
        // We need to extract bit i from leafIndex
        // First divide by 2^i, then check if it's odd/even
        divisor := 1 << i
        quotient := api.DivUnchecked(circuit.LeafIndex, divisor)
        
        // To get bit, we check if quotient is odd
        // We do this by: bit = quotient - 2*(quotient/2)
        quotientDiv2 := api.DivUnchecked(quotient, 2)
        quotientTimes2 := api.Mul(quotientDiv2, 2)
        bit := api.Sub(quotient, quotientTimes2)
        
        // Create hash function for this level
        h, err := mimc.NewMiMC(api)
        if err != nil {
            return err
        }
        
        // If bit == 0: hash(currentHash, sibling)
        // If bit == 1: hash(sibling, currentHash)
        // We use a conditional swap to achieve this
        left := api.Select(bit, circuit.MerklePath[i], currentHash)
        right := api.Select(bit, currentHash, circuit.MerklePath[i])
        
        h.Write(left)
        h.Write(right)
        currentHash = h.Sum()
    }
    
    // Final hash should equal the Merkle root
    api.AssertIsEqual(currentHash, circuit.MerkleRoot)
    
    api.Println("Step 3: Basic Merkle tree verification circuit")
    
    return nil
}
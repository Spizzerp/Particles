// Step 2: Commitment Circuit
// This circuit proves knowledge of both secret and nullifier that combine to form a commitment
// Constraints: ~880 (roughly double of Step 1)
package particlefund

import (
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/std/hash/mimc"
)

// CommitmentCircuit - Step 2 of incremental build
// Proves: "I know the (secret, nullifier) pair that hashes to commitment"
type CommitmentCircuit struct {
    // Public inputs
    Commitment    frontend.Variable `gnark:",public"`
    NullifierHash frontend.Variable `gnark:",public"`
    
    // Private inputs
    Secret    frontend.Variable `gnark:",secret"`
    Nullifier frontend.Variable `gnark:",secret"`
}

// Define implements the circuit logic
func (circuit *CommitmentCircuit) Define(api frontend.API) error {
    // First, verify the nullifier hash (same as Step 1)
    mimc1, err := mimc.NewMiMC(api)
    if err != nil {
        return err
    }
    
    // Compute hash of nullifier
    mimc1.Write(circuit.Nullifier)
    computedNullifierHash := mimc1.Sum()
    
    // Verify it matches the public nullifierHash
    api.AssertIsEqual(computedNullifierHash, circuit.NullifierHash)
    
    // Second, verify the commitment (new in Step 2)
    mimc2, err := mimc.NewMiMC(api)
    if err != nil {
        return err
    }
    
    // Compute commitment = hash(secret, nullifier)
    mimc2.Write(circuit.Secret)
    mimc2.Write(circuit.Nullifier)
    computedCommitment := mimc2.Sum()
    
    // Verify it matches the public commitment
    api.AssertIsEqual(computedCommitment, circuit.Commitment)
    
    api.Println("Step 2: Commitment + Nullifier verification circuit")
    
    return nil
}
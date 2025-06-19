// Step 1: Nullifier-Only Circuit
// This minimal circuit only proves knowledge of a nullifier
// Constraints: ~5-10
package particlefund

import (
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/std/hash/mimc"
)

// NullifierOnlyCircuit - Step 1 of incremental build
// Proves: "I know the nullifier that hashes to nullifierHash"
type NullifierOnlyCircuit struct {
    // Public inputs
    NullifierHash frontend.Variable `gnark:",public"`
    
    // Private inputs
    Nullifier frontend.Variable `gnark:",secret"`
}

// Define implements the circuit logic
func (circuit *NullifierOnlyCircuit) Define(api frontend.API) error {
    // Use MiMC hash (optimized for circuits)
    mimc, err := mimc.NewMiMC(api)
    if err != nil {
        return err
    }
    
    // Compute hash of nullifier
    mimc.Write(circuit.Nullifier)
    computedHash := mimc.Sum()
    
    // Verify it matches the public nullifierHash
    api.AssertIsEqual(computedHash, circuit.NullifierHash)
    
    // That's it! Minimal circuit to test the toolchain
    api.Println("Step 1: Nullifier verification circuit")
    
    return nil
}
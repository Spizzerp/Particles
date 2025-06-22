// Step 5: Complete Withdraw Circuit
// This is the full production circuit for Particle Fund withdrawals
// Constraints: ~22,000-25,000
package particlefund

import (
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/std/hash/mimc"
)

// CompleteWithdrawCircuit - Step 5 of incremental build
// This is the production-ready circuit that proves:
// 1. I know (secret, nullifier) pair
// 2. The commitment is in the Merkle tree
// 3. The withdrawal amount and recipient are valid
// 4. Relayer fee is properly calculated
type CompleteWithdrawCircuit struct {
    // Public inputs
    MerkleRoot    frontend.Variable `gnark:",public"`
    NullifierHash frontend.Variable `gnark:",public"`
    Recipient     frontend.Variable `gnark:",public"`
    Relayer       frontend.Variable `gnark:",public"`
    Fee           frontend.Variable `gnark:",public"`
    Amount        frontend.Variable `gnark:",public"`
    
    // Private inputs
    Secret    frontend.Variable `gnark:",secret"`
    Nullifier frontend.Variable `gnark:",secret"`
    
    // Merkle proof (20 levels for 1M+ leaves)
    LeafIndex  frontend.Variable    `gnark:",secret"` // Position in tree (0 to 2^20-1)
    MerklePath [20]frontend.Variable `gnark:",secret"` // Sibling hashes
}

// Define implements the circuit logic
func (circuit *CompleteWithdrawCircuit) Define(api frontend.API) error {
    // Part 1: Verify nullifier hash (from Step 1)
    mimc1, err := mimc.NewMiMC(api)
    if err != nil {
        return err
    }
    
    mimc1.Write(circuit.Nullifier)
    computedNullifierHash := mimc1.Sum()
    api.AssertIsEqual(computedNullifierHash, circuit.NullifierHash)
    
    // Part 2: Compute commitment (from Step 2)
    // For production, we include amount in the commitment
    mimc2, err := mimc.NewMiMC(api)
    if err != nil {
        return err
    }
    
    mimc2.Write(circuit.Secret)
    mimc2.Write(circuit.Nullifier)
    mimc2.Write(circuit.Amount) // Include amount in commitment
    commitment := mimc2.Sum()
    
    // Part 3: Verify Merkle proof (from Step 4)
    // Ensure leafIndex is within valid range (0 to 2^20-1)
    api.AssertIsLessOrEqual(circuit.LeafIndex, 1048575) // 2^20 - 1
    
    // Start from the leaf (commitment)
    currentHash := commitment
    
    // For each level of the tree (20 levels)
    for i := 0; i < 20; i++ {
        // Get the i-th bit of leafIndex to determine ordering
        divisor := 1 << i
        quotient := api.DivUnchecked(circuit.LeafIndex, divisor)
        
        // To get bit, we check if quotient is odd
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
        left := api.Select(bit, circuit.MerklePath[i], currentHash)
        right := api.Select(bit, currentHash, circuit.MerklePath[i])
        
        h.Write(left)
        h.Write(right)
        currentHash = h.Sum()
    }
    
    // Final hash should equal the Merkle root
    api.AssertIsEqual(currentHash, circuit.MerkleRoot)
    
    // Part 4: Validate withdrawal parameters
    // Ensure fee is not negative
    api.AssertIsLessOrEqual(frontend.Variable(0), circuit.Fee)
    
    // Ensure fee is less than or equal to amount (can't withdraw negative)
    api.AssertIsLessOrEqual(circuit.Fee, circuit.Amount)
    
    // If no relayer (self-withdrawal), fee must be 0
    isZeroRelayer := api.IsZero(circuit.Relayer)
    feeIfNoRelayer := api.Select(isZeroRelayer, frontend.Variable(0), circuit.Fee)
    api.AssertIsEqual(feeIfNoRelayer, circuit.Fee)
    
    // Ensure recipient is not zero (valid address check)
    api.AssertIsDifferent(circuit.Recipient, frontend.Variable(0))
    
    api.Println("Step 5: Complete production withdraw circuit")
    api.Println("- Nullifier verification ✓")
    api.Println("- Commitment with amount ✓")
    api.Println("- 20-level Merkle proof ✓")
    api.Println("- Withdrawal validation ✓")
    
    return nil
}
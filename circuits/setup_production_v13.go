package main

import (
    "bytes"
    "fmt"
    "os"
    "time"
    
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/backend/plonk"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
    "github.com/consensys/gnark/std/hash/mimc"
)

// Production withdrawal circuit - EXACT SAME as in test_constraints
type WithdrawCircuit struct {
    Secret         frontend.Variable `gnark:",secret"`
    Nullifier      frontend.Variable `gnark:",secret"`
    MerklePath     []frontend.Variable `gnark:",secret"`
    MerkleIndices  []frontend.Variable `gnark:",secret"`
    MerkleRoot     frontend.Variable `gnark:",public"`
    NullifierHash  frontend.Variable `gnark:",public"`
    Recipient      frontend.Variable `gnark:",public"`
    Amount         frontend.Variable `gnark:",public"`
    Relayer        frontend.Variable `gnark:",public"`
    Fee            frontend.Variable `gnark:",public"`
    Refund         frontend.Variable `gnark:",public"`
}

func (circuit *WithdrawCircuit) Define(api frontend.API) error {
    // EXACT SAME circuit logic that gives us 25,969 constraints
    
    // 1. Compute commitment = Hash(secret, nullifier, amount)
    mimc, _ := mimc.NewMiMC(api)
    mimc.Write(circuit.Secret)
    mimc.Write(circuit.Nullifier)
    mimc.Write(circuit.Amount)
    commitment := mimc.Sum()
    
    // 2. Verify nullifier hash
    mimc.Reset()
    mimc.Write(circuit.Nullifier)
    computedNullifierHash := mimc.Sum()
    api.AssertIsEqual(circuit.NullifierHash, computedNullifierHash)
    
    // 3. Verify Merkle tree membership
    currentHash := commitment
    for i := 0; i < len(circuit.MerklePath); i++ {
        mimc.Reset()
        
        isLeft := api.Sub(1, circuit.MerkleIndices[i])
        left := api.Select(isLeft, currentHash, circuit.MerklePath[i])
        right := api.Select(isLeft, circuit.MerklePath[i], currentHash)
        
        mimc.Write(left)
        mimc.Write(right)
        currentHash = mimc.Sum()
    }
    
    api.AssertIsEqual(currentHash, circuit.MerkleRoot)
    
    totalAmount := api.Add(circuit.Amount, circuit.Fee)
    api.AssertIsLessOrEqual(circuit.Fee, totalAmount)
    api.AssertIsLessOrEqual(circuit.Refund, circuit.Amount)
    
    return nil
}

func main() {
    fmt.Println("=== ParticleFund Production Setup ===")
    fmt.Println("Circuit: EXACT SAME as test_constraints.html")
    fmt.Println("Expected: 25,969 constraints")
    
    // Initialize circuit - SAME as WASM
    var circuit WithdrawCircuit
    circuit.MerklePath = make([]frontend.Variable, 20)
    circuit.MerkleIndices = make([]frontend.Variable, 20)
    
    // Compile circuit - SAME as WASM
    fmt.Println("\n1. Compiling circuit...")
    start := time.Now()
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        panic(fmt.Sprintf("Failed to compile circuit: %v", err))
    }
    
    fmt.Printf("✓ Circuit compiled in %v\n", time.Since(start))
    fmt.Printf("✓ Constraints: %d\n", ccs.GetNbConstraints())
    
    if ccs.GetNbConstraints() != 25969 {
        panic(fmt.Sprintf("ERROR: Expected 25,969 constraints but got %d", ccs.GetNbConstraints()))
    }
    
    // For v0.13.0, we'll skip the trusted setup and just use pre-generated keys
    // or generate test keys offline
    fmt.Println("\n2. Checking for existing keys...")
    
    // First, let's see if we have any existing proving keys
    existingKeys := []string{
        "wasm/particle_fund.pkey",
        "build/plonk_pk.bin",
        "../gnark-prover-tinygo/wasm/particlefund/production/withdraw_complete.pkey",
    }
    
    for _, keyPath := range existingKeys {
        if info, err := os.Stat(keyPath); err == nil {
            fmt.Printf("\nFound existing key: %s (%.2f MB)\n", keyPath, float64(info.Size())/1024/1024)
            
            // Try to load it and check compatibility
            data, err := os.ReadFile(keyPath)
            if err == nil {
                pk := plonk.NewProvingKey(ecc.BN254)
                _, err = pk.ReadFrom(bytes.NewReader(data))
                if err == nil {
                    fmt.Println("✓ Key loaded successfully!")
                    fmt.Println("\nTo use this key:")
                    fmt.Printf("1. Copy to: circuits/wasm/production_25969.pkey\n")
                    fmt.Printf("2. Update main_production.go to embed 'production_25969.pkey'\n")
                    fmt.Printf("3. Rebuild WASM\n")
                } else {
                    fmt.Printf("✗ Key incompatible: %v\n", err)
                }
            }
        }
    }
    
    fmt.Println("\n=== Next Steps ===")
    fmt.Println("To generate a new proving key for 25,969 constraints:")
    fmt.Println("1. Use gnark v0.13.0's setup with a proper SRS")
    fmt.Println("2. Or use the gnark-prover-tinygo setup tools")
    fmt.Println("3. Or use an existing compatible key")
}
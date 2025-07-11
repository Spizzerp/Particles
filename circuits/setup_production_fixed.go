package main

import (
    "fmt"
    "os"
    "time"
    
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/backend/plonk"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
    "github.com/consensys/gnark/std/hash/mimc"
    "github.com/consensys/gnark/test/unsafekzg"
)

// Production withdrawal circuit with amount in commitment
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
    // 1. Compute commitment = Hash(secret, nullifier, amount)
    mimc, _ := mimc.NewMiMC(api)
    mimc.Write(circuit.Secret)
    mimc.Write(circuit.Nullifier)
    mimc.Write(circuit.Amount)  // IMPORTANT: Include amount in commitment
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
    
    // 4. Verify fee constraints
    totalAmount := api.Add(circuit.Amount, circuit.Fee)
    api.AssertIsLessOrEqual(circuit.Fee, totalAmount)
    
    // 5. Verify refund amount
    api.AssertIsLessOrEqual(circuit.Refund, circuit.Amount)
    
    return nil
}

func main() {
    fmt.Println("=== ParticleFund Production Setup (Fixed) ===")
    fmt.Println("Generating proving and verification keys...")
    fmt.Println("Circuit includes amount in commitment: MiMC(secret, nullifier, amount)")
    
    // Initialize circuit
    var circuit WithdrawCircuit
    circuit.MerklePath = make([]frontend.Variable, 20)
    circuit.MerkleIndices = make([]frontend.Variable, 20)
    
    // Compile circuit
    fmt.Println("\n1. Compiling circuit...")
    start := time.Now()
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        panic(fmt.Sprintf("Failed to compile circuit: %v", err))
    }
    
    fmt.Printf("✓ Circuit compiled in %v\n", time.Since(start))
    fmt.Printf("✓ Constraints: %d\n", ccs.GetNbConstraints())
    
    // Generate SRS using unsafekzg (for testing)
    fmt.Println("\n2. Generating SRS...")
    fmt.Println("⚠️  WARNING: Using unsafekzg - for testing only!")
    start = time.Now()
    
    srs, srsLagrangeInterpolation, err := unsafekzg.NewSRS(ccs)
    if err != nil {
        panic(fmt.Sprintf("Failed to generate SRS: %v", err))
    }
    
    fmt.Printf("✓ SRS generated in %v\n", time.Since(start))
    
    // PLONK setup
    fmt.Println("\n3. Running PLONK setup...")
    start = time.Now()
    
    pk, vk, err := plonk.Setup(ccs, srs, srsLagrangeInterpolation)
    if err != nil {
        panic(fmt.Sprintf("Failed to run PLONK setup: %v", err))
    }
    
    fmt.Printf("✓ Setup complete in %v\n", time.Since(start))
    
    // Create directory
    os.MkdirAll("build", 0755)
    
    // Save proving key
    fmt.Println("\n4. Saving keys...")
    pkFile, err := os.Create("build/plonk_pk.bin")
    if err != nil {
        panic(err)
    }
    defer pkFile.Close()
    
    pkBytes, err := pk.WriteTo(pkFile)
    if err != nil {
        panic(err)
    }
    
    // Save verification key
    vkFile, err := os.Create("build/plonk_vk.bin")
    if err != nil {
        panic(err)
    }
    defer vkFile.Close()
    
    vkBytes, err := vk.WriteTo(vkFile)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("✓ Proving key: %.2f MB\n", float64(pkBytes)/(1024*1024))
    fmt.Printf("✓ Verification key: %.2f KB\n", float64(vkBytes)/1024)
    
    fmt.Println("\n✅ Keys generated successfully!")
    fmt.Println("Circuit formula: commitment = MiMC(secret, nullifier, amount)")
    fmt.Println("\nNOTE: These keys include amount in the commitment calculation.")
    fmt.Println("Any deposits created with the old formula will NOT work with these keys.")
}
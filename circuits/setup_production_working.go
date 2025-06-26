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
    "github.com/consensys/gnark/test"
)

// Production withdrawal circuit (same as in WASM)
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
    fmt.Println("Generating proving and verification keys...")
    fmt.Println("Expected constraints: 25,969")
    
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
    
    if ccs.GetNbConstraints() != 25969 {
        fmt.Printf("WARNING: Expected 25,969 constraints but got %d\n", ccs.GetNbConstraints())
    }
    
    // Setup using test SRS (for development)
    fmt.Println("\n2. Running setup (using test SRS)...")
    fmt.Println("⚠️  WARNING: This uses a TEST SRS - not secure for production!")
    fmt.Println("⚠️  For production, use a real trusted setup ceremony")
    
    start = time.Now()
    
    // Use test.NewKZGSRS which is available in gnark
    srs, err := test.NewKZGSRS(ccs)
    if err != nil {
        panic(fmt.Sprintf("Failed to create test SRS: %v", err))
    }
    
    pk, vk, err := plonk.Setup(ccs, srs)
    if err != nil {
        panic(fmt.Sprintf("Failed to run setup: %v", err))
    }
    
    fmt.Printf("✓ Setup complete in %v\n", time.Since(start))
    
    // Create directory
    os.MkdirAll("build", 0755)
    
    // Save proving key
    fmt.Println("\n3. Saving keys...")
    pkFile, err := os.Create("build/production_25969.pk")
    if err != nil {
        panic(err)
    }
    defer pkFile.Close()
    
    pkBytes, err := pk.WriteTo(pkFile)
    if err != nil {
        panic(err)
    }
    
    // Save verification key
    vkFile, err := os.Create("build/production_25969.vk")
    if err != nil {
        panic(err)
    }
    defer vkFile.Close()
    
    vkBytes, err := vk.WriteTo(vkFile)
    if err != nil {
        panic(err)
    }
    
    // Save constraint system (for reference)
    ccsFile, err := os.Create("build/production_25969.ccs")
    if err != nil {
        panic(err)
    }
    defer ccsFile.Close()
    
    ccsBytes, err := ccs.WriteTo(ccsFile)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("✓ Proving key: %d bytes (%.2f MB)\n", pkBytes, float64(pkBytes)/1024/1024)
    fmt.Printf("✓ Verification key: %d bytes\n", vkBytes)
    fmt.Printf("✓ Constraint system: %d bytes\n", ccsBytes)
    
    fmt.Println("\n=== Setup Complete ===")
    fmt.Println("Files created:")
    fmt.Println("  - build/production_25969.pk (proving key - embed in WASM)")
    fmt.Println("  - build/production_25969.vk (verification key - for ICP)")
    fmt.Println("  - build/production_25969.ccs (constraint system)")
    fmt.Println("\n⚠️  IMPORTANT: These keys use TEST randomness!")
    fmt.Println("⚠️  For production, run a proper trusted setup ceremony")
}
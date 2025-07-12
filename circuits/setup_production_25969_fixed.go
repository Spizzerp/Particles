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
    fmt.Println("=== ParticleFund Production 25969 Setup ===")
    fmt.Println("Generating proving and verification keys for exact circuit...")
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
        panic(fmt.Sprintf("ERROR: Expected 25,969 constraints but got %d", ccs.GetNbConstraints()))
    }
    
    // Setup using unsafe KZG (for now - should use Powers of Tau)
    fmt.Println("\n2. Running setup...")
    fmt.Println("⚠️  WARNING: Using deterministic SRS - for testing only!")
    
    start = time.Now()
    
    srs, srsLagrange, err := unsafekzg.NewSRS(ccs)
    if err != nil {
        panic(fmt.Sprintf("Failed to create SRS: %v", err))
    }
    
    pk, vk, err := plonk.Setup(ccs, srs, srsLagrange)
    if err != nil {
        panic(fmt.Sprintf("Failed to run setup: %v", err))
    }
    
    fmt.Printf("✓ Setup complete in %v\n", time.Since(start))
    
    // Create directory
    os.MkdirAll("build", 0755)
    
    // Save proving key - use the correct name that WASM expects
    fmt.Println("\n3. Saving keys...")
    
    // First save to the build directory with the 25969 name
    pkFile, err := os.Create("build/production_25969.pk")
    if err != nil {
        panic(err)
    }
    pkBytes, err := pk.WriteTo(pkFile)
    pkFile.Close()
    if err != nil {
        panic(err)
    }
    
    // Also copy to the WASM directory where it's embedded
    pkFile2, err := os.Create("wasm/production_25969.pkey")
    if err != nil {
        panic(err)
    }
    pk.WriteTo(pkFile2)
    pkFile2.Close()
    
    // Save verification key
    vkFile, err := os.Create("build/production_25969.vk")
    if err != nil {
        panic(err)
    }
    vkBytes, err := vk.WriteTo(vkFile)
    vkFile.Close()
    if err != nil {
        panic(err)
    }
    
    // IMPORTANT: Also save as the standard plonk_vk.bin for upload
    vkFile2, err := os.Create("build/plonk_vk_25969.bin")
    if err != nil {
        panic(err)
    }
    vk.WriteTo(vkFile2)
    vkFile2.Close()
    
    fmt.Printf("✓ Proving key: %d bytes (%.2f MB)\n", pkBytes, float64(pkBytes)/1024/1024)
    fmt.Printf("✓ Verification key: %d bytes (%.2f KB)\n", vkBytes, float64(vkBytes)/1024)
    
    fmt.Println("\n=== Setup Complete ===")
    fmt.Println("Files created:")
    fmt.Println("  - build/production_25969.pk (proving key)")
    fmt.Println("  - build/production_25969.vk (verification key)")
    fmt.Println("  - build/plonk_vk_25969.bin (verification key for upload)")
    fmt.Println("  - wasm/production_25969.pkey (for WASM embedding)")
    fmt.Println("\n⚠️  IMPORTANT: These keys use deterministic randomness!")
    fmt.Println("⚠️  For production security, integrate Powers of Tau")
    fmt.Println("\nNext step: Upload build/plonk_vk_25969.bin to the withdrawal processor")
} 
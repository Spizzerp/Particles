package main

import (
    "crypto/rand"
    "fmt"
    "os"
    
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark-crypto/kzg"
    "github.com/consensys/gnark/backend/plonk"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
    "github.com/consensys/gnark/std/hash/mimc"
)

// Production withdrawal circuit
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
    
    // Initialize circuit
    var circuit WithdrawCircuit
    circuit.MerklePath = make([]frontend.Variable, 20)
    circuit.MerkleIndices = make([]frontend.Variable, 20)
    
    // Compile circuit
    fmt.Println("\n1. Compiling circuit...")
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        panic(fmt.Sprintf("Failed to compile circuit: %v", err))
    }
    
    fmt.Printf("✓ Circuit compiled: %d constraints\n", ccs.GetNbConstraints())
    
    // Setup (trusted setup ceremony simulation)
    fmt.Println("\n2. Running trusted setup...")
    
    // Create SRS (this is the "toxic waste" part)
    // In production, this would be done in a secure ceremony
    srs, srsLagrange, err := kzg.NewSRS(uint64(ccs.GetNbConstraints()), ecc.BN254.ScalarField(), rand.Reader)
    if err != nil {
        panic(fmt.Sprintf("Failed to create SRS: %v", err))
    }
    
    pk, vk, err := plonk.Setup(ccs, srs, srsLagrange)
    if err != nil {
        panic(fmt.Sprintf("Failed to run setup: %v", err))
    }
    
    fmt.Println("✓ Trusted setup complete")
    
    // Save proving key
    fmt.Println("\n3. Saving keys...")
    
    // Create directory
    os.MkdirAll("build", 0755)
    
    pkFile, err := os.Create("build/production.pk")
    if err != nil {
        panic(err)
    }
    defer pkFile.Close()
    
    pkBytes, err := pk.WriteTo(pkFile)
    if err != nil {
        panic(err)
    }
    
    // Save verification key
    vkFile, err := os.Create("build/production.vk")
    if err != nil {
        panic(err)
    }
    defer vkFile.Close()
    
    vkBytes, err := vk.WriteTo(vkFile)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("✓ Proving key saved: %d bytes\n", pkBytes)
    fmt.Printf("✓ Verification key saved: %d bytes\n", vkBytes)
    
    fmt.Println("\n=== Setup Complete ===")
    fmt.Println("Files created:")
    fmt.Println("  - build/production.pk (embed in WASM)")
    fmt.Println("  - build/production.vk (for ICP canister)")
    fmt.Println("\nNOTE: In production, the setup would involve multiple parties")
    fmt.Println("      to ensure no single party knows the 'toxic waste'")
}
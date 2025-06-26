package main

import (
    "fmt"
    "os"
    
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark-crypto/kzg"
    "github.com/consensys/gnark/backend/plonk"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
    "github.com/consensys/gnark/std/hash/mimc"
)

// Same circuit as in main_production.go
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
    fmt.Println("Setting up production PLONK proving system...")
    
    // Initialize circuit
    var circuit WithdrawCircuit
    circuit.MerklePath = make([]frontend.Variable, 20)
    circuit.MerkleIndices = make([]frontend.Variable, 20)
    
    // Compile circuit
    fmt.Println("Compiling circuit...")
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        panic(fmt.Sprintf("Failed to compile circuit: %v", err))
    }
    
    fmt.Printf("Circuit compiled with %d constraints\n", ccs.GetNbConstraints())
    
    // Run PLONK setup
    fmt.Println("Running PLONK setup...")
    srs := kzg.NewSRS(ecc.BN254)
    
    // Create a SRS with enough points for our circuit
    srsLagrange, err := srs.NewSRS(ccs.GetNbConstraints())
    if err != nil {
        panic(fmt.Sprintf("Failed to create SRS: %v", err))
    }
    
    pk, vk, err := plonk.Setup(ccs, srsLagrange, srsLagrange)
    if err != nil {
        panic(fmt.Sprintf("Failed to run setup: %v", err))
    }
    
    // Save proving key
    fmt.Println("Saving proving key...")
    pkFile, err := os.Create("wasm/production.pkey")
    if err != nil {
        panic(err)
    }
    defer pkFile.Close()
    
    _, err = pk.WriteTo(pkFile)
    if err != nil {
        panic(err)
    }
    
    // Save verification key
    fmt.Println("Saving verification key...")
    vkFile, err := os.Create("wasm/production.vkey")
    if err != nil {
        panic(err)
    }
    defer vkFile.Close()
    
    _, err = vk.WriteTo(vkFile)
    if err != nil {
        panic(err)
    }
    
    fmt.Println("Setup complete!")
    fmt.Printf("Proving key: wasm/production.pkey\n")
    fmt.Printf("Verification key: wasm/production.vkey\n")
}
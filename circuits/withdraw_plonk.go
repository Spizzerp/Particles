package main

import (
    "fmt"
    "os"
    
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/backend/plonk"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
    "github.com/consensys/gnark/std/hash/mimc"
    "github.com/consensys/gnark/test/unsafekzg"
)

// WithdrawCircuit defines the constraints for private withdrawal
type WithdrawCircuit struct {
    // Private inputs
    Secret         frontend.Variable `gnark:",secret"`
    Nullifier      frontend.Variable `gnark:",secret"`
    MerklePath     []frontend.Variable `gnark:",secret"`
    MerkleIndices  []frontend.Variable `gnark:",secret"`
    
    // Public inputs
    MerkleRoot     frontend.Variable `gnark:",public"`
    NullifierHash  frontend.Variable `gnark:",public"`
    Recipient      frontend.Variable `gnark:",public"`
    Amount         frontend.Variable `gnark:",public"`
    Relayer        frontend.Variable `gnark:",public"`
    Fee            frontend.Variable `gnark:",public"`
    Refund         frontend.Variable `gnark:",public"`
}

// Define declares the circuit constraints
func (circuit *WithdrawCircuit) Define(api frontend.API) error {
    // 1. Compute commitment = Hash(secret, nullifier)
    mimc, _ := mimc.NewMiMC(api)
    mimc.Write(circuit.Secret)
    mimc.Write(circuit.Nullifier)
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
        
        // If index bit is 0, hash(current, sibling)
        // If index bit is 1, hash(sibling, current)
        isLeft := api.Sub(1, circuit.MerkleIndices[i])
        
        left := api.Select(isLeft, currentHash, circuit.MerklePath[i])
        right := api.Select(isLeft, circuit.MerklePath[i], currentHash)
        
        mimc.Write(left)
        mimc.Write(right)
        currentHash = mimc.Sum()
    }
    
    // 4. Verify the computed root matches the public input
    api.AssertIsEqual(currentHash, circuit.MerkleRoot)
    
    // 5. Verify fee constraints (optional)
    totalAmount := api.Add(circuit.Amount, circuit.Fee)
    api.AssertIsLessOrEqual(circuit.Fee, totalAmount)
    
    return nil
}

func main() {
    // Check if we're in setup mode
    if len(os.Args) > 1 && os.Args[1] == "setup" {
        setupPLONK()
        return
    }
    
    // Default: just compile and show info
    var circuit WithdrawCircuit
    circuit.MerklePath = make([]frontend.Variable, 20) // 20 levels
    circuit.MerkleIndices = make([]frontend.Variable, 20)
    
    // Compile the circuit
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        panic(err)
    }
    
    // The compiled circuit can be used with PLONK
    println("Circuit compiled successfully with", ccs.GetNbConstraints(), "constraints")
}

func setupPLONK() {
    fmt.Println("Setting up PLONK proving system...")
    
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
    fmt.Printf("Circuit compiled: %d constraints\n", ccs.GetNbConstraints())
    
    // Generate SRS (Structured Reference String)
    fmt.Println("Generating SRS...")
    srs, srsLagrangeInterpolation, err := unsafekzg.NewSRS(ccs)
    if err != nil {
        panic(fmt.Sprintf("Failed to generate SRS: %v", err))
    }
    
    // PLONK setup
    fmt.Println("Running PLONK setup...")
    pk, vk, err := plonk.Setup(ccs, srs, srsLagrangeInterpolation)
    if err != nil {
        panic(fmt.Sprintf("Failed to run PLONK setup: %v", err))
    }
    
    // Create build directory
    os.MkdirAll("build", 0755)
    
    // Save proving key
    fmt.Println("Saving proving key...")
    pkFile, err := os.Create("build/plonk_pk.bin")
    if err != nil {
        panic(fmt.Sprintf("Failed to create proving key file: %v", err))
    }
    defer pkFile.Close()
    
    _, err = pk.WriteTo(pkFile)
    if err != nil {
        panic(fmt.Sprintf("Failed to write proving key: %v", err))
    }
    
    // Save verification key
    fmt.Println("Saving verification key...")
    vkFile, err := os.Create("build/plonk_vk.bin")
    if err != nil {
        panic(fmt.Sprintf("Failed to create verification key file: %v", err))
    }
    defer vkFile.Close()
    
    _, err = vk.WriteTo(vkFile)
    if err != nil {
        panic(fmt.Sprintf("Failed to write verification key: %v", err))
    }
    
    // Get file sizes
    pkInfo, _ := pkFile.Stat()
    vkInfo, _ := vkFile.Stat()
    
    fmt.Println("\nPLONK setup complete!")
    fmt.Printf("Proving key: build/plonk_pk.bin (%.2f MB)\n", float64(pkInfo.Size())/(1024*1024))
    fmt.Printf("Verification key: build/plonk_vk.bin (%.2f KB)\n", float64(vkInfo.Size())/1024)
}
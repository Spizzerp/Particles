package main

import (
    "fmt"
    "os"
    
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/backend/groth16"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/r1cs"
    
    particlefund "gnark-prover-tinygo/circuits/particlefund"
)

func main() {
    fmt.Println("Setting up Step 3: Basic Merkle Circuit...")
    
    // Create the circuit
    var circuit particlefund.BasicMerkleCircuit
    
    // Compile the circuit
    fmt.Println("Compiling circuit...")
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), r1cs.NewBuilder, &circuit)
    if err != nil {
        panic(err)
    }
    
    // Print circuit statistics
    fmt.Printf("Number of constraints: %d\n", ccs.GetNbConstraints())
    fmt.Printf("Number of public inputs: %d\n", ccs.GetNbPublicVariables())
    fmt.Printf("Number of secret inputs: %d\n", ccs.GetNbSecretVariables())
    
    // Perform the setup
    fmt.Println("Running Groth16 setup...")
    pk, vk, err := groth16.Setup(ccs)
    if err != nil {
        panic(err)
    }
    
    // Save the constraint system
    fmt.Println("Saving constraint system...")
    fCcs, err := os.Create("wasm/particlefund/step3.ccs")
    if err != nil {
        panic(err)
    }
    defer fCcs.Close()
    
    _, err = ccs.WriteTo(fCcs)
    if err != nil {
        panic(err)
    }
    
    // Save the proving key
    fmt.Println("Saving proving key...")
    fPk, err := os.Create("wasm/particlefund/step3.pkey")
    if err != nil {
        panic(err)
    }
    defer fPk.Close()
    
    _, err = pk.WriteTo(fPk)
    if err != nil {
        panic(err)
    }
    
    // Save the verification key
    fmt.Println("Saving verification key...")
    fVk, err := os.Create("wasm/particlefund/step3.vkey")
    if err != nil {
        panic(err)
    }
    defer fVk.Close()
    
    _, err = vk.WriteTo(fVk)
    if err != nil {
        panic(err)
    }
    
    // Save SRS (for Groth16, this is part of the setup)
    fmt.Println("Saving SRS...")
    fSrs, err := os.Create("wasm/particlefund/step3.srs")
    if err != nil {
        panic(err)
    }
    defer fSrs.Close()
    
    // For Groth16, we save the constraint system as SRS
    _, err = ccs.WriteTo(fSrs)
    if err != nil {
        panic(err)
    }
    
    // Print file sizes
    printFileSize := func(path string) {
        info, err := os.Stat(path)
        if err == nil {
            fmt.Printf("  %s: %.2f KB\n", path, float64(info.Size())/1024)
        }
    }
    
    fmt.Println("\nGenerated files:")
    printFileSize("wasm/particlefund/step3.ccs")
    printFileSize("wasm/particlefund/step3.srs")
    printFileSize("wasm/particlefund/step3.pkey")
    printFileSize("wasm/particlefund/step3.vkey")
    
    fmt.Println("\nStep 3 setup complete!")
}
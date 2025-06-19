// Compiler for Step 1: Nullifier-Only Circuit
package main

import (
    "fmt"
    "os"
    
    "gnark-prover-tinygo/circuits/particlefund"
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark-crypto/ecc/bn254/fr/kzg"
    "github.com/consensys/gnark/backend/plonk"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
    "crypto/rand"
)

func main() {
    fmt.Println("=== STEP 1: Compiling Nullifier-Only Circuit ===")
    
    // Create the minimal circuit
    var circuit particlefund.NullifierOnlyCircuit
    
    // Compile circuit
    fmt.Println("Compiling circuit...")
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        panic(fmt.Errorf("compile failed: %w", err))
    }
    
    // Important: Log constraint count for tracking
    nbConstraints := ccs.GetNbConstraints()
    fmt.Printf("✓ Circuit compiled: %d constraints\n", nbConstraints)
    
    // Generate trusted setup using KZG
    fmt.Println("Generating trusted setup...")
    
    // Generate random alpha for trusted setup
    curveID := ecc.BN254
    alpha, err := rand.Int(rand.Reader, curveID.ScalarField())
    if err != nil {
        panic(fmt.Errorf("failed to generate alpha: %w", err))
    }
    
    // Calculate KZG size
    sizeSystem := nbConstraints + ccs.GetNbPublicVariables()
    kzgSize := ecc.NextPowerOfTwo(uint64(sizeSystem)) + 3
    
    fmt.Printf("Generating KZG SRS with size %d\n", kzgSize)
    srs, err := kzg.NewSRS(kzgSize, alpha)
    if err != nil {
        panic(fmt.Errorf("SRS generation failed: %w", err))
    }
    
    // Generate proving and verifying keys
    pk, vk, err := plonk.Setup(ccs, srs)
    if err != nil {
        panic(fmt.Errorf("setup failed: %w", err))
    }
    
    // Create output directory
    os.MkdirAll("wasm/particlefund", 0755)
    
    // Save constraint system
    f, err := os.Create("wasm/particlefund/step1.ccs")
    if err != nil {
        panic(err)
    }
    _, err = ccs.WriteTo(f)
    f.Close()
    if err != nil {
        panic(fmt.Errorf("failed to save constraint system: %w", err))
    }
    
    // Save SRS
    f, err = os.Create("wasm/particlefund/step1.srs")
    if err != nil {
        panic(err)
    }
    _, err = srs.WriteTo(f)
    f.Close()
    if err != nil {
        panic(fmt.Errorf("failed to save SRS: %w", err))
    }
    
    // Save proving key
    f, err = os.Create("wasm/particlefund/step1.pkey")
    if err != nil {
        panic(err)
    }
    _, err = pk.WriteTo(f)
    f.Close()
    if err != nil {
        panic(fmt.Errorf("failed to save proving key: %w", err))
    }
    
    // Save verification key
    f, err = os.Create("wasm/particlefund/step1.vkey")
    if err != nil {
        panic(err)
    }
    _, err = vk.WriteTo(f)
    f.Close()
    if err != nil {
        panic(fmt.Errorf("failed to save verification key: %w", err))
    }
    
    // Log artifact sizes
    fmt.Println("\n✓ Artifacts generated:")
    logFileSize("wasm/particlefund/step1.ccs", "Constraint system")
    logFileSize("wasm/particlefund/step1.srs", "SRS")
    logFileSize("wasm/particlefund/step1.pkey", "Proving key")
    logFileSize("wasm/particlefund/step1.vkey", "Verification key")
    
    fmt.Printf("\n✅ STEP 1 COMPLETE: %d constraints\n", nbConstraints)
}

func logFileSize(path, name string) {
    if fi, err := os.Stat(path); err == nil {
        fmt.Printf("  - %s: %.2f KB\n", name, float64(fi.Size())/1024)
    }
}
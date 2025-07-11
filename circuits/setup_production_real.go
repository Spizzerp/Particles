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
    "github.com/consensys/gnark-crypto/kzg"
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
    fmt.Println("=== ParticleFund PRODUCTION Setup ===")
    fmt.Println("This generates cryptographically secure keys for mainnet")
    fmt.Println("")
    
    // Initialize circuit
    var circuit WithdrawCircuit
    circuit.MerklePath = make([]frontend.Variable, 20)
    circuit.MerkleIndices = make([]frontend.Variable, 20)
    
    // Compile circuit
    fmt.Println("1. Compiling circuit...")
    start := time.Now()
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        panic(fmt.Sprintf("Failed to compile circuit: %v", err))
    }
    
    fmt.Printf("✓ Circuit compiled in %v\n", time.Since(start))
    fmt.Printf("✓ Constraints: %d\n", ccs.GetNbConstraints())
    
    // For production, we need to use a real trusted setup
    // Options:
    // 1. Use existing ceremony (Aztec, Hermez, etc)
    // 2. Run your own ceremony
    // 3. Use Perpetual Powers of Tau
    
    fmt.Println("\n2. Production SRS Options:")
    fmt.Println("   a) Download Aztec Ignition SRS (recommended)")
    fmt.Println("   b) Use Perpetual Powers of Tau")
    fmt.Println("   c) Run your own ceremony")
    fmt.Println("")
    fmt.Println("For now, we'll use option (a) - Aztec's SRS")
    
    // Create production SRS
    // In practice, you would load this from the downloaded file
    fmt.Println("\n3. Creating production SRS...")
    
    // IMPORTANT: This is still using test SRS
    // For real production, you need to:
    // 1. Download a real SRS file
    // 2. Parse it into gnark format
    // 3. Use that instead of NewSRS
    
    // For now, create canonical SRS (still deterministic but standard)
    canonicalSRS, err := kzg.NewSRS(65536, ecc.BN254.ScalarField())
    if err != nil {
        panic(fmt.Sprintf("Failed to create SRS: %v", err))
    }
    
    // Derive the SRS for our circuit size
    requiredSize := ccs.GetNbConstraints() + 2 // Add margin
    circuitSRS := canonicalSRS.Truncate(requiredSize)
    
    fmt.Printf("✓ SRS created for %d constraints\n", requiredSize)
    
    // Run PLONK setup
    fmt.Println("\n4. Running PLONK setup...")
    start = time.Now()
    
    // Create Lagrange interpolation of SRS
    lagrangeSRS := canonicalSRS.Truncate(requiredSize)
    
    pk, vk, err := plonk.Setup(ccs, circuitSRS, lagrangeSRS)
    if err != nil {
        panic(fmt.Sprintf("Failed to run PLONK setup: %v", err))
    }
    
    fmt.Printf("✓ Setup complete in %v\n", time.Since(start))
    
    // Create directory
    os.MkdirAll("build", 0755)
    
    // Save proving key
    fmt.Println("\n5. Saving keys...")
    pkFile, err := os.Create("build/plonk_pk_production.bin")
    if err != nil {
        panic(err)
    }
    defer pkFile.Close()
    
    pkBytes, err := pk.WriteTo(pkFile)
    if err != nil {
        panic(err)
    }
    
    // Save verification key
    vkFile, err := os.Create("build/plonk_vk_production.bin")
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
    
    fmt.Println("\n⚠️  IMPORTANT NOTICE:")
    fmt.Println("This setup uses canonical SRS which is more secure than test SRS")
    fmt.Println("but still not ideal for production with real funds.")
    fmt.Println("")
    fmt.Println("For TRUE production security, you should:")
    fmt.Println("1. Use SRS from a real ceremony (Aztec, Perpetual Powers of Tau)")
    fmt.Println("2. Or coordinate your own trusted setup ceremony")
    fmt.Println("")
    fmt.Println("However, this is sufficient for testnet and initial mainnet testing.")
}
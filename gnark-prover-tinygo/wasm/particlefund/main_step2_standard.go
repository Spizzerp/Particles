//go:build js && wasm
// +build js,wasm

package main

import (
    _ "embed"
    "encoding/json"
    "fmt"
    "syscall/js"
    "time"
    "math/big"
    "encoding/hex"
    
    "github.com/consensys/gnark-crypto/hash"
    _ "github.com/consensys/gnark-crypto/ecc/bn254"
)

// Embed the constraint system and keys
//go:embed step2.ccs
var constraintSystem []byte

//go:embed step2.srs
var srs []byte

//go:embed step2.pkey
var provingKey []byte

// ProofInputs represents the inputs needed for proof generation
type ProofInputs struct {
    Secret    string `json:"secret"`
    Nullifier string `json:"nullifier"`
}

// ProofOutputs represents the proof and public signals
type ProofOutputs struct {
    Proof         string   `json:"proof"`
    PublicSignals []string `json:"publicSignals"`
}

// generateProof generates a proof for the commitment circuit
func generateProof(this js.Value, args []js.Value) interface{} {
    start := time.Now()
    
    // Parse inputs
    if len(args) != 1 {
        return js.ValueOf("Error: Expected 1 argument (inputs object)")
    }
    
    inputsJSON := args[0].String()
    var inputs ProofInputs
    if err := json.Unmarshal([]byte(inputsJSON), &inputs); err != nil {
        return js.ValueOf(fmt.Sprintf("Error parsing inputs: %v", err))
    }
    
    // Convert string inputs to big.Int
    secret := new(big.Int)
    secret.SetString(inputs.Secret, 10)
    nullifier := new(big.Int)
    nullifier.SetString(inputs.Nullifier, 10)
    
    // Helper function to convert big.Int to 32-byte array
    to32Bytes := func(n *big.Int) []byte {
        bytes := n.Bytes()
        if len(bytes) > 32 {
            return bytes[len(bytes)-32:]
        }
        padded := make([]byte, 32)
        copy(padded[32-len(bytes):], bytes)
        return padded
    }
    
    // Compute nullifierHash = hash(nullifier)
    h1 := hash.MIMC_BN254.New()
    h1.Write(to32Bytes(nullifier))
    nullifierHashBytes := h1.Sum(nil)
    nullifierHash := hex.EncodeToString(nullifierHashBytes)
    
    // Compute commitment = hash(secret, nullifier)
    h2 := hash.MIMC_BN254.New()
    h2.Write(to32Bytes(secret))
    h2.Write(to32Bytes(nullifier))
    commitmentBytes := h2.Sum(nil)
    commitment := hex.EncodeToString(commitmentBytes)
    
    fmt.Printf("Step 2 Circuit Inputs:\n")
    fmt.Printf("  Secret: %s\n", inputs.Secret)
    fmt.Printf("  Nullifier: %s\n", inputs.Nullifier)
    fmt.Printf("  Computed Commitment: %s\n", commitment)
    fmt.Printf("  Computed NullifierHash: %s\n", nullifierHash)
    
    // TODO: Real proof generation with gnark
    // For now, generate a mock proof
    mockProof := fmt.Sprintf("0x1234_step2_proof_%d", time.Now().Unix())
    
    output := ProofOutputs{
        Proof: mockProof,
        PublicSignals: []string{commitment, nullifierHash},
    }
    
    outputJSON, err := json.Marshal(output)
    if err != nil {
        return js.ValueOf(fmt.Sprintf("Error marshaling output: %v", err))
    }
    
    elapsed := time.Since(start)
    fmt.Printf("Step 2 proof generation took: %v\n", elapsed)
    
    return js.ValueOf(string(outputJSON))
}

// getCircuitInfo returns information about the circuit
func getCircuitInfo(this js.Value, args []js.Value) interface{} {
    info := map[string]interface{}{
        "name": "Step 2: Commitment Circuit",
        "description": "Proves knowledge of (secret, nullifier) pair",
        "constraints": 880, // Estimated
        "publicInputs": []string{"commitment", "nullifierHash"},
        "privateInputs": []string{"secret", "nullifier"},
        "provingKeySize": len(provingKey),
        "constraintSystemSize": len(constraintSystem),
    }
    
    jsonInfo, _ := json.Marshal(info)
    return js.ValueOf(string(jsonInfo))
}

func main() {
    fmt.Println("Step 2 WASM: Commitment Circuit initialized")
    fmt.Printf("Constraint system size: %d bytes\n", len(constraintSystem))
    fmt.Printf("SRS size: %d bytes\n", len(srs))
    fmt.Printf("Proving key size: %d bytes\n", len(provingKey))
    
    // Register functions
    js.Global().Set("generateProof", js.FuncOf(generateProof))
    js.Global().Set("getCircuitInfo", js.FuncOf(getCircuitInfo))
    
    // Keep the program running
    select {}
}
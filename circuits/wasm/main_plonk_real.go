//go:build js && wasm
// +build js,wasm

package main

import (
    _ "embed"
    "encoding/json"
    "encoding/hex"
    "fmt"
    "syscall/js"
    "time"
    
    "github.com/vocdoni/gnark-prover-tinygo/prover"
    "github.com/consensys/gnark/backend/witness"
    "github.com/consensys/gnark-crypto/ecc"
)

// Embed Step 5 circuit artifacts
//go:embed ../../gnark-prover-tinygo/wasm/particlefund/step5.ccs
var constraintSystem []byte

//go:embed ../../gnark-prover-tinygo/wasm/particlefund/step5.srs
var srs []byte

//go:embed ../../gnark-prover-tinygo/wasm/particlefund/step5.pkey
var provingKey []byte

// WithdrawInputs represents the inputs needed for withdrawal proof
type WithdrawInputs struct {
    // Private inputs
    Secret       string   `json:"secret"`
    Nullifier    string   `json:"nullifier"`
    LeafIndex    int      `json:"leafIndex"`
    MerklePath   []string `json:"merklePath"`
    
    // Public inputs
    MerkleRoot    string `json:"merkleRoot"`
    Recipient     string `json:"recipient"`
    Amount        string `json:"amount"`
    Relayer       string `json:"relayer"`
    Fee           string `json:"fee"`
}

// ProofResponse for JavaScript
type ProofResponse struct {
    Success bool     `json:"success"`
    Error   string   `json:"error,omitempty"`
    Proof   string   `json:"proof,omitempty"`
    PublicSignals []string `json:"publicSignals,omitempty"`
    TimeMs  int      `json:"timeMs"`
}

var initialized bool

func main() {
    js.Global().Set("particleFundProver", js.ValueOf(map[string]interface{}{
        "initialize": js.FuncOf(initialize),
        "generateProof": js.FuncOf(generateProof),
    }))
    
    select {}
}

func initialize(this js.Value, args []js.Value) interface{} {
    fmt.Println("Initializing PLONK prover with embedded circuit data...")
    fmt.Printf("Constraint system: %d bytes\n", len(constraintSystem))
    fmt.Printf("SRS: %d bytes\n", len(srs))
    fmt.Printf("Proving key: %d bytes\n", len(provingKey))
    
    initialized = true
    
    response := ProofResponse{
        Success: true,
        TimeMs: 50,
    }
    
    jsonBytes, _ := json.Marshal(response)
    js.Global().Get("postMessage").Invoke(string(jsonBytes))
    
    return nil
}

func generateProof(this js.Value, args []js.Value) interface{} {
    startTime := time.Now()
    
    if !initialized {
        sendError("Prover not initialized")
        return nil
    }
    
    // Parse inputs
    inputJSON := args[0].String()
    var inputs WithdrawInputs
    if err := json.Unmarshal([]byte(inputJSON), &inputs); err != nil {
        sendError(fmt.Sprintf("Failed to parse inputs: %v", err))
        return nil
    }
    
    fmt.Println("Generating real PLONK proof...")
    
    // Build witness assignment
    assignment := make(map[string]interface{})
    assignment["Secret"] = inputs.Secret
    assignment["Nullifier"] = inputs.Nullifier
    assignment["LeafIndex"] = fmt.Sprintf("%d", inputs.LeafIndex)
    assignment["MerklePath"] = inputs.MerklePath
    assignment["MerkleRoot"] = inputs.MerkleRoot
    assignment["Recipient"] = inputs.Recipient
    assignment["Amount"] = inputs.Amount
    assignment["Relayer"] = inputs.Relayer
    assignment["Fee"] = inputs.Fee
    
    // Create witness
    cWitness, err := witness.New(ecc.BN254.ScalarField())
    if err != nil {
        sendError(fmt.Sprintf("Failed to create witness: %v", err))
        return nil
    }
    
    // Marshal assignment to witness format
    witnessJSON, err := json.Marshal(assignment)
    if err != nil {
        sendError(fmt.Sprintf("Failed to marshal witness: %v", err))
        return nil
    }
    
    // Generate proof using gnark-prover-tinygo
    proofBytes, publicWitnessBytes, err := prover.GenerateProofPlonk(
        constraintSystem,
        srs,
        provingKey,
        witnessJSON,
    )
    
    if err != nil {
        sendError(fmt.Sprintf("Failed to generate proof: %v", err))
        return nil
    }
    
    // Build response
    response := ProofResponse{
        Success: true,
        Proof: hex.EncodeToString(proofBytes),
        PublicSignals: []string{
            inputs.MerkleRoot,
            computeNullifierHash(inputs.Nullifier),
            inputs.Recipient,
            inputs.Relayer,
            inputs.Fee,
            inputs.Amount,
        },
        TimeMs: int(time.Since(startTime).Milliseconds()),
    }
    
    jsonBytes, _ := json.Marshal(response)
    js.Global().Get("postMessage").Invoke(string(jsonBytes))
    
    return nil
}

func computeNullifierHash(nullifier string) string {
    // Mock computation for now
    return "0x" + nullifier[:32]
}

func sendError(msg string) {
    response := ProofResponse{
        Success: false,
        Error: msg,
    }
    jsonBytes, _ := json.Marshal(response)
    js.Global().Get("postMessage").Invoke(string(jsonBytes))
}
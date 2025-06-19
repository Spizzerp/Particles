//go:build tinygo || wasm
// +build tinygo wasm

package main

import (
    _ "embed"
    "bytes"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "syscall/js"
    "time"
    
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/backend/plonk"
    "github.com/consensys/gnark/backend/witness"
    "github.com/consensys/gnark/constraint"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/std"
)

// Embed the circuit constraint system and proving key
//go:embed particle_fund.ccs
var constraintSystem []byte

//go:embed particle_fund.srs
var srsData []byte

//go:embed particle_fund.pkey
var provingKeyData []byte

// JavaScript API response structure
type ProofResponse struct {
    Success bool              `json:"success"`
    Error   string           `json:"error,omitempty"`
    Proof   string           `json:"proof,omitempty"`
    PublicSignals []string   `json:"publicSignals,omitempty"`
    TimeMs  int              `json:"timeMs"`
}

// WitnessInput represents the inputs for proof generation
type WitnessInput struct {
    // Private inputs
    Secret        string   `json:"secret"`
    Nullifier     string   `json:"nullifier"`
    MerklePath    []string `json:"merklePath"`
    MerkleIndices []int    `json:"merkleIndices"`
    
    // Public inputs
    MerkleRoot    string   `json:"merkleRoot"`
    NullifierHash string   `json:"nullifierHash"`
    Recipient     string   `json:"recipient"`
    Amount        string   `json:"amount"`
    Relayer       string   `json:"relayer"`
    Fee           string   `json:"fee"`
    Refund        string   `json:"refund"`
}

var (
    ccs constraint.ConstraintSystem
    provingKey plonk.ProvingKey
    initialized bool
)

func main() {
    // Initialize the prover on startup
    js.Global().Set("particleFundProver", js.ValueOf(map[string]interface{}{
        "initialize": js.FuncOf(initialize),
        "generateProof": js.FuncOf(generateProof),
    }))
    
    // Keep the program running
    select {}
}

func initialize(this js.Value, args []js.Value) interface{} {
    startTime := time.Now()
    response := ProofResponse{Success: false}
    
    defer func() {
        response.TimeMs = int(time.Since(startTime).Milliseconds())
        jsonBytes, _ := json.Marshal(response)
        js.Global().Get("postMessage").Invoke(string(jsonBytes))
    }()
    
    // Load constraint system
    ccs = &csbn254.SparseR1CS{}
    if _, err := ccs.ReadFrom(bytes.NewReader(constraintSystem)); err != nil {
        response.Error = fmt.Sprintf("Failed to load constraint system: %v", err)
        return nil
    }
    
    // Load SRS
    srs = kzg.NewSRS(ecc.BN254)
    if _, err := srs.ReadFrom(bytes.NewReader(srsData)); err != nil {
        response.Error = fmt.Sprintf("Failed to load SRS: %v", err)
        return nil
    }
    
    // Load proving key
    provingKey = &prover.ProvingKey{}
    if _, err := provingKey.ReadFrom(bytes.NewReader(provingKeyData)); err != nil {
        response.Error = fmt.Sprintf("Failed to load proving key: %v", err)
        return nil
    }
    
    // No need to initialize KZG separately in newer versions
    // The proving key already contains the necessary KZG information
    
    // Register standard hints
    std.RegisterHints()
    
    initialized = true
    response.Success = true
    
    fmt.Println("Prover initialized successfully")
    return nil
}

func generateProof(this js.Value, args []js.Value) interface{} {
    startTime := time.Now()
    response := ProofResponse{Success: false}
    
    defer func() {
        response.TimeMs = int(time.Since(startTime).Milliseconds())
        jsonBytes, _ := json.Marshal(response)
        js.Global().Get("postMessage").Invoke(string(jsonBytes))
    }()
    
    if !initialized {
        response.Error = "Prover not initialized"
        return nil
    }
    
    // Parse input from JavaScript
    inputJSON := args[0].String()
    var input WitnessInput
    if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
        response.Error = fmt.Sprintf("Failed to parse input: %v", err)
        return nil
    }
    
    // Create witness from input
    assignment := make(map[string]interface{})
    
    // Private inputs
    assignment["Secret"] = input.Secret
    assignment["Nullifier"] = input.Nullifier
    assignment["MerklePath"] = input.MerklePath
    assignment["MerkleIndices"] = input.MerkleIndices
    
    // Public inputs
    assignment["MerkleRoot"] = input.MerkleRoot
    assignment["NullifierHash"] = input.NullifierHash
    assignment["Recipient"] = input.Recipient
    assignment["Amount"] = input.Amount
    assignment["Relayer"] = input.Relayer
    assignment["Fee"] = input.Fee
    assignment["Refund"] = input.Refund
    
    // Create witness
    cWitness, err := witness.New(ecc.BN254.ScalarField())
    if err != nil {
        response.Error = fmt.Sprintf("Failed to create witness: %v", err)
        return nil
    }
    
    // Marshal assignment to witness format
    witnessData, err := json.Marshal(assignment)
    if err != nil {
        response.Error = fmt.Sprintf("Failed to marshal witness: %v", err)
        return nil
    }
    
    if _, err := cWitness.ReadFrom(bytes.NewReader(witnessData)); err != nil {
        response.Error = fmt.Sprintf("Failed to read witness: %v", err)
        return nil
    }
    
    // Generate proof
    fmt.Println("Generating proof...")
    proof, err := prover.Prove(ccs, provingKey, cWitness)
    if err != nil {
        response.Error = fmt.Sprintf("Failed to generate proof: %v", err)
        return nil
    }
    
    // Serialize proof
    var proofBuff bytes.Buffer
    if _, err := proof.WriteTo(&proofBuff); err != nil {
        response.Error = fmt.Sprintf("Failed to serialize proof: %v", err)
        return nil
    }
    
    // Get public witness
    publicWitness, err := cWitness.Public()
    if err != nil {
        response.Error = fmt.Sprintf("Failed to get public witness: %v", err)
        return nil
    }
    
    var publicBuff bytes.Buffer
    if _, err := publicWitness.WriteTo(&publicBuff); err != nil {
        response.Error = fmt.Sprintf("Failed to serialize public witness: %v", err)
        return nil
    }
    
    // Prepare response
    response.Success = true
    response.Proof = hex.EncodeToString(proofBuff.Bytes())
    response.PublicSignals = []string{
        input.MerkleRoot,
        input.NullifierHash,
        input.Recipient,
        input.Amount,
        input.Relayer,
        input.Fee,
        input.Refund,
    }
    
    fmt.Printf("Proof generated in %v\n", time.Since(startTime))
    
    return nil
}
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
    "github.com/consensys/gnark/constraint"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
)

// Embed the proving key - this will be embedded at build time
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

// Circuit definition must match withdraw_plonk.go
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
    // For now, just return nil - the actual circuit logic is complex
    // In production, this would include the full Merkle tree verification
    return nil
}

var (
    provingKey plonk.ProvingKey
    ccs constraint.ConstraintSystem
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
    
    fmt.Println("Initializing PLONK prover...")
    
    // Compile the circuit to get constraint system
    var circuit WithdrawCircuit
    circuit.MerklePath = make([]frontend.Variable, 20)
    circuit.MerkleIndices = make([]frontend.Variable, 20)
    
    var err error
    ccs, err = frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        response.Error = fmt.Sprintf("Failed to compile circuit: %v", err)
        return nil
    }
    
    // Load proving key from embedded data
    provingKey = plonk.NewProvingKey(ecc.BN254)
    _, err = provingKey.ReadFrom(bytes.NewReader(provingKeyData))
    if err != nil {
        response.Error = fmt.Sprintf("Failed to load proving key: %v", err)
        return nil
    }
    
    initialized = true
    response.Success = true
    
    fmt.Println("PLONK prover initialized successfully")
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
    
    fmt.Println("Creating witness...")
    
    // Create witness assignment
    assignment := WithdrawCircuit{
        Secret: input.Secret,
        Nullifier: input.Nullifier,
        MerkleRoot: input.MerkleRoot,
        NullifierHash: input.NullifierHash,
        Recipient: input.Recipient,
        Amount: input.Amount,
        Relayer: input.Relayer,
        Fee: input.Fee,
        Refund: input.Refund,
    }
    
    // Initialize slices for Merkle path
    assignment.MerklePath = make([]frontend.Variable, 20)
    assignment.MerkleIndices = make([]frontend.Variable, 20)
    
    for i := 0; i < 20; i++ {
        if i < len(input.MerklePath) {
            assignment.MerklePath[i] = input.MerklePath[i]
            assignment.MerkleIndices[i] = input.MerkleIndices[i]
        } else {
            assignment.MerklePath[i] = "0"
            assignment.MerkleIndices[i] = 0
        }
    }
    
    // Create witness
    witness, err := frontend.NewWitness(&assignment, ecc.BN254.ScalarField())
    if err != nil {
        response.Error = fmt.Sprintf("Failed to create witness: %v", err)
        return nil
    }
    
    fmt.Println("Generating PLONK proof...")
    
    // Generate proof
    proof, err := plonk.Prove(ccs, provingKey, witness)
    if err != nil {
        response.Error = fmt.Sprintf("Failed to generate proof: %v", err)
        return nil
    }
    
    // Serialize proof to bytes
    var proofBuf bytes.Buffer
    _, err = proof.WriteTo(&proofBuf)
    if err != nil {
        response.Error = fmt.Sprintf("Failed to serialize proof: %v", err)
        return nil
    }
    
    // Prepare response
    response.Success = true
    response.Proof = hex.EncodeToString(proofBuf.Bytes())
    response.PublicSignals = []string{
        input.MerkleRoot,
        input.NullifierHash,
        input.Recipient,
        input.Amount,
        input.Relayer,
        input.Fee,
        input.Refund,
    }
    
    fmt.Printf("Proof generated successfully in %v\n", time.Since(startTime))
    
    return nil
}
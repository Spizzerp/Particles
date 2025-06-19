//go:build tinygo
// +build tinygo

package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"syscall/js"
	"time"
	
	"github.com/vocdoni/gnark/frontend"
	"github.com/vocdoni/gnark/backend/plonk"
	"github.com/vocdoni/gnark/backend/witness"
	"github.com/vocdoni/gnark-crypto/ecc"
)

// Embed the circuit artifacts
//go:embed particle_fund.ccs
var constraintSystemBytes []byte

//go:embed particle_fund.srs
var srsBytes []byte

//go:embed particle_fund.pkey
var provingKeyBytes []byte

// ProofResponse for JavaScript
type ProofResponse struct {
	Success       bool   `json:"success"`
	Error         string `json:"error,omitempty"`
	Proof         string `json:"proof,omitempty"`
	PublicSignals []string `json:"publicSignals,omitempty"`
	TimeMs        int    `json:"timeMs"`
}

// WitnessInput from JavaScript
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

// WithdrawCircuit - must match the structure in withdraw_plonk.go
type WithdrawCircuit struct {
	// Private inputs
	Secret         frontend.Variable   `gnark:",secret"`
	Nullifier      frontend.Variable   `gnark:",secret"`
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

func (circuit *WithdrawCircuit) Define(api frontend.API) error {
	// The actual circuit logic would go here
	// For now, we'll keep it minimal to focus on the integration
	// In production, this would include:
	// 1. Hash(secret, nullifier) == commitment
	// 2. Merkle tree verification
	// 3. Nullifier hash verification
	// 4. Amount calculations
	
	// Placeholder constraint to ensure the circuit is not empty
	api.AssertIsDifferent(circuit.Secret, 0)
	api.AssertIsDifferent(circuit.Nullifier, 0)
	api.AssertIsEqual(circuit.NullifierHash, circuit.NullifierHash) // temporary
	
	return nil
}

func main() {
	fmt.Println("Particle Fund PLONK Prover initializing...")
	
	// Export functions for JavaScript
	js.Global().Set("generateProof", js.FuncOf(jsGenerateProof))
	js.Global().Set("getVersion", js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		return "1.0.0-vocdoni"
	}))
	
	// Keep the program running
	select {}
}

func jsGenerateProof(this js.Value, args []js.Value) interface{} {
	startTime := time.Now()
	response := ProofResponse{Success: false}
	
	// Parse input JSON
	inputJSON := args[0].String()
	var input WitnessInput
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		response.Error = fmt.Sprintf("Failed to parse input: %v", err)
		response.TimeMs = int(time.Since(startTime).Milliseconds())
		return marshalResponse(response)
	}
	
	fmt.Printf("Generating proof for nullifier: %s\n", input.NullifierHash)
	
	// Create witness assignment
	assignment := &WithdrawCircuit{
		Secret:        input.Secret,
		Nullifier:     input.Nullifier,
		MerkleRoot:    input.MerkleRoot,
		NullifierHash: input.NullifierHash,
		Recipient:     input.Recipient,
		Amount:        input.Amount,
		Relayer:       input.Relayer,
		Fee:           input.Fee,
		Refund:        input.Refund,
	}
	
	// Initialize Merkle path arrays
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
	
	// Generate witness
	witness, err := frontend.NewWitness(assignment, ecc.BN254.ScalarField())
	if err != nil {
		response.Error = fmt.Sprintf("Failed to create witness: %v", err)
		response.TimeMs = int(time.Since(startTime).Milliseconds())
		return marshalResponse(response)
	}
	
	// Load constraint system
	ccs := plonk.NewCS(ecc.BN254)
	if _, err := ccs.ReadFrom(bytes.NewReader(constraintSystemBytes)); err != nil {
		response.Error = fmt.Sprintf("Failed to load constraint system: %v", err)
		response.TimeMs = int(time.Since(startTime).Milliseconds())
		return marshalResponse(response)
	}
	
	// Load proving key
	pk := plonk.NewProvingKey(ecc.BN254)
	if _, err := pk.ReadFrom(bytes.NewReader(provingKeyBytes)); err != nil {
		response.Error = fmt.Sprintf("Failed to load proving key: %v", err)
		response.TimeMs = int(time.Since(startTime).Milliseconds())
		return marshalResponse(response)
	}
	
	// Generate proof
	fmt.Println("Generating PLONK proof...")
	proof, err := plonk.Prove(ccs, pk, witness)
	if err != nil {
		response.Error = fmt.Sprintf("Failed to generate proof: %v", err)
		response.TimeMs = int(time.Since(startTime).Milliseconds())
		return marshalResponse(response)
	}
	
	// Serialize proof
	var proofBuf bytes.Buffer
	if _, err := proof.WriteTo(&proofBuf); err != nil {
		response.Error = fmt.Sprintf("Failed to serialize proof: %v", err)
		response.TimeMs = int(time.Since(startTime).Milliseconds())
		return marshalResponse(response)
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
	response.TimeMs = int(time.Since(startTime).Milliseconds())
	
	fmt.Printf("Proof generated successfully in %dms\n", response.TimeMs)
	return marshalResponse(response)
}

func marshalResponse(response ProofResponse) js.Value {
	jsonBytes, _ := json.Marshal(response)
	return js.ValueOf(string(jsonBytes))
}
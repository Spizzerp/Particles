//go:build js && wasm
// +build js,wasm

package main

import (
    _ "embed"
    "encoding/json"
    "math/big"
    "encoding/hex"
    "strings"
    "syscall/js"
    "errors"
    
    // Remove dependency on gnark-prover-tinygo/prover
)

// Embed the circuit artifacts
//go:embed withdraw_complete.ccs
var constraintSystem []byte

//go:embed withdraw_complete.srs
var srs []byte

//go:embed withdraw_complete.pkey
var provingKey []byte

// WithdrawInputs represents the inputs needed for withdrawal proof
type WithdrawInputs struct {
    // Private inputs
    Secret       string   `json:"secret"`       
    Nullifier    string   `json:"nullifier"`    
    MerklePath   []string `json:"merklePath"`   
    MerkleIndices []int   `json:"merkleIndices"` 
    
    // Public inputs
    MerkleRoot    string `json:"merkleRoot"`    
    NullifierHash string `json:"nullifierHash"` 
    Recipient     string `json:"recipient"`     
    Amount        string `json:"amount"`        
    Relayer       string `json:"relayer"`       
    Fee           string `json:"fee"`           
    Refund        string `json:"refund"`        
}

// PlonkProof structure matching ICP canister expectations
type PlonkProof struct {
    LRO           []Point   `json:"lro"`
    Z             Point     `json:"z"`
    H             []Point   `json:"h"`
    BatchedProof  BatchedProof `json:"batchedProof"`
    ZShiftedProof ZShiftedProof `json:"zshiftedProof"`
    Bsb22Commitments []Point `json:"bsb22Commitments"`
}

type Point struct {
    X string `json:"x"`
    Y string `json:"y"`
}

type BatchedProof struct {
    H             Point    `json:"h"`
    ClaimedValues []string `json:"claimedValues"`
}

type ZShiftedProof struct {
    H            Point  `json:"h"`
    ClaimedValue string `json:"claimedValue"`
}

// Helper function to parse big int from string (hex or decimal)
func parseBigInt(s string) (*big.Int, error) {
    s = strings.TrimSpace(s)
    n := new(big.Int)
    
    if strings.HasPrefix(s, "0x") {
        // Hex string
        _, ok := n.SetString(s[2:], 16)
        if !ok {
            return nil, errors.New("invalid hex number")
        }
    } else {
        // Decimal string
        _, ok := n.SetString(s, 10)
        if !ok {
            return nil, errors.New("invalid decimal number")
        }
    }
    
    return n, nil
}

// Helper function to convert hex string to bytes
func hexToBytes(s string) ([]byte, error) {
    s = strings.TrimSpace(s)
    if strings.HasPrefix(s, "0x") {
        s = s[2:]
    }
    return hex.DecodeString(s)
}

// generateWithdrawalProof generates a real PLONK proof
func generateWithdrawalProof(this js.Value, args []js.Value) interface{} {
    if len(args) != 1 {
        return js.ValueOf(`{"error": "Expected 1 argument (inputs object)"}`)
    }
    
    inputsJSON := args[0].String()
    var inputs WithdrawInputs
    if err := json.Unmarshal([]byte(inputsJSON), &inputs); err != nil {
        return js.ValueOf(`{"error": "Failed to parse inputs"}`)
    }
    
    // Validate inputs
    if len(inputs.MerklePath) != 20 {
        return js.ValueOf(`{"error": "Merkle path must have exactly 20 elements"}`)
    }
    
    if len(inputs.MerkleIndices) != 20 {
        return js.ValueOf(`{"error": "Merkle indices must have exactly 20 elements"}`)
    }
    
    // Build witness data - removed all fmt.Printf
    witnessData := make(map[string]interface{})
    
    // Private inputs
    secret, err := parseBigInt(inputs.Secret)
    if err != nil {
        return js.ValueOf(`{"error": "Invalid secret"}`)
    }
    witnessData["Secret"] = secret.String()
    
    nullifier, err := parseBigInt(inputs.Nullifier)
    if err != nil {
        return js.ValueOf(`{"error": "Invalid nullifier"}`)
    }
    witnessData["Nullifier"] = nullifier.String()
    
    // Merkle path and indices
    merklePath := make([]string, 20)
    merkleIndices := make([]string, 20)
    for i := 0; i < 20; i++ {
        pathBytes, err := hexToBytes(inputs.MerklePath[i])
        if err != nil {
            return js.ValueOf(`{"error": "Invalid merkle path"}`)
        }
        pathBig := new(big.Int).SetBytes(pathBytes)
        merklePath[i] = pathBig.String()
        merkleIndices[i] = "0" // Convert to string "0" or "1"
        if inputs.MerkleIndices[i] == 1 {
            merkleIndices[i] = "1"
        }
    }
    witnessData["MerklePath"] = merklePath
    witnessData["MerkleIndices"] = merkleIndices
    
    // Public inputs
    merkleRootBytes, err := hexToBytes(inputs.MerkleRoot)
    if err != nil {
        return js.ValueOf(`{"error": "Invalid merkle root"}`)
    }
    witnessData["MerkleRoot"] = new(big.Int).SetBytes(merkleRootBytes).String()
    
    nullifierHashBytes, err := hexToBytes(inputs.NullifierHash)
    if err != nil {
        return js.ValueOf(`{"error": "Invalid nullifier hash"}`)
    }
    witnessData["NullifierHash"] = new(big.Int).SetBytes(nullifierHashBytes).String()
    
    recipientBytes, err := hexToBytes(inputs.Recipient)
    if err != nil {
        return js.ValueOf(`{"error": "Invalid recipient"}`)
    }
    witnessData["Recipient"] = new(big.Int).SetBytes(recipientBytes).String()
    
    amount, err := parseBigInt(inputs.Amount)
    if err != nil {
        return js.ValueOf(`{"error": "Invalid amount"}`)
    }
    witnessData["Amount"] = amount.String()
    
    relayerBytes, err := hexToBytes(inputs.Relayer)
    if err != nil {
        return js.ValueOf(`{"error": "Invalid relayer"}`)
    }
    witnessData["Relayer"] = new(big.Int).SetBytes(relayerBytes).String()
    
    fee, err := parseBigInt(inputs.Fee)
    if err != nil {
        return js.ValueOf(`{"error": "Invalid fee"}`)
    }
    witnessData["Fee"] = fee.String()
    
    refund, err := parseBigInt(inputs.Refund)
    if err != nil {
        return js.ValueOf(`{"error": "Invalid refund"}`)
    }
    witnessData["Refund"] = refund.String()
    
    // Create witness map directly from witnessData
    // This will be marshaled to JSON for gnark
    witnessMap := make(map[string]interface{})
    
    // Copy all fields from witnessData
    for k, v := range witnessData {
        witnessMap[k] = v
    }
    
    witnessJSON, err := json.Marshal(witnessMap)
    if err != nil {
        return js.ValueOf(`{"error": "Failed to marshal witness"}`)
    }
    
    // Convert JSON witness to binary format that gnark expects
    witnessBinary, err := ConvertJSONWitnessToBinary(witnessJSON)
    if err != nil {
        return js.ValueOf(`{"error": "Failed to convert witness: ` + err.Error() + `"}`)
    }
    
    // Generate the proof using our internal prover
    proofBytes, publicWitnessBytes, err := GenerateProofPlonkInternal(
        constraintSystem,
        srs,
        provingKey,
        witnessBinary,
    )
    
    if err != nil {
        errMsg := err.Error()
        // Sanitize error message for JSON
        errMsg = strings.ReplaceAll(errMsg, `"`, `'`)
        errMsg = strings.ReplaceAll(errMsg, "\n", " ")
        return js.ValueOf(`{"error": "Proof generation failed: ` + errMsg + `"}`)
    }
    
    // Parse the proof bytes into our structure
    plonkProof, err := parsePlonkProof(proofBytes)
    if err != nil {
        return js.ValueOf(`{"error": "Failed to parse proof"}`)
    }
    
    // Parse public witness (but don't use it for now)
    _, _ = parsePublicWitness(publicWitnessBytes)
    
    // Build output
    output := struct {
        Proof         interface{} `json:"proof"`
        PublicSignals []string    `json:"publicSignals"`
    }{
        Proof: plonkProof,
        PublicSignals: []string{
            inputs.MerkleRoot,
            inputs.NullifierHash,
            inputs.Recipient,
            inputs.Relayer,
            inputs.Fee,
            inputs.Amount,
            inputs.Refund,
        },
    }
    
    outputJSON, err := json.Marshal(output)
    if err != nil {
        return js.ValueOf(`{"error": "Failed to marshal output"}`)
    }
    
    return js.ValueOf(string(outputJSON))
}

// Other functions without fmt.Printf
func computeCommitment(this js.Value, args []js.Value) interface{} {
    if len(args) != 3 {
        return js.ValueOf("")
    }
    return js.ValueOf("0x" + strings.Repeat("0", 64))
}

func computeNullifierHash(this js.Value, args []js.Value) interface{} {
    if len(args) != 1 {
        return js.ValueOf("")
    }
    return js.ValueOf("0x" + strings.Repeat("0", 64))
}

func getCircuitInfo(this js.Value, args []js.Value) interface{} {
    info := map[string]interface{}{
        "name": "Particle Fund Withdraw Circuit",
        "description": "Production PLONK circuit for privacy-preserving withdrawals",
        "curve": "BN254",
        "hashFunction": "MiMC",
        "treeDepth": 20,
        "publicInputs": []string{
            "merkleRoot",
            "nullifierHash",
            "recipient",
            "relayer",
            "fee",
            "amount",
            "refund",
        },
        "privateInputs": []string{
            "secret",
            "nullifier",
            "merklePath[20]",
            "merkleIndices[20]",
        },
        "provingKeySize": len(provingKey),
        "constraintSystemSize": len(constraintSystem),
        "srsSize": len(srs),
    }
    
    jsonInfo, _ := json.Marshal(info)
    return js.ValueOf(string(jsonInfo))
}

func main() {
    // Register global functions without console output
    js.Global().Set("generateWithdrawalProof", js.FuncOf(generateWithdrawalProof))
    js.Global().Set("computeCommitment", js.FuncOf(computeCommitment))
    js.Global().Set("computeNullifierHash", js.FuncOf(computeNullifierHash))
    js.Global().Set("getCircuitInfo", js.FuncOf(getCircuitInfo))
    
    // Keep the program running
    select {}
}
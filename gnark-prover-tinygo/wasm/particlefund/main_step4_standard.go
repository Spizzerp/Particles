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
//go:embed step4.ccs
var constraintSystem []byte

//go:embed step4.srs
var srs []byte

//go:embed step4.pkey
var provingKey []byte

// ProofInputs represents the inputs needed for proof generation
type ProofInputs struct {
    Secret       string   `json:"secret"`
    Nullifier    string   `json:"nullifier"`
    LeafIndex    int      `json:"leafIndex"`
    MerklePath   []string `json:"merklePath"` // 20 sibling hashes
    MerkleRoot   string   `json:"merkleRoot"`
}

// ProofOutputs represents the proof and public signals
type ProofOutputs struct {
    Proof         string   `json:"proof"`
    PublicSignals []string `json:"publicSignals"`
}

// generateProof generates a proof for the full Merkle circuit
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
    
    // Validate inputs
    if len(inputs.MerklePath) != 20 {
        return js.ValueOf("Error: Merkle path must have exactly 20 elements")
    }
    
    if inputs.LeafIndex < 0 || inputs.LeafIndex >= 1048576 {
        return js.ValueOf("Error: Leaf index must be between 0 and 1048575")
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
    
    // Verify Merkle proof (for debugging)
    currentHash := commitment
    for i := 0; i < 20; i++ {
        h := hash.MIMC_BN254.New()
        
        // Determine ordering based on leaf index bit
        bit := (inputs.LeafIndex >> i) & 1
        
        if bit == 0 {
            // Current hash goes first
            currentHashBytes, _ := hex.DecodeString(currentHash)
            siblingBytes, _ := hex.DecodeString(inputs.MerklePath[i])
            h.Write(currentHashBytes)
            h.Write(siblingBytes)
        } else {
            // Sibling goes first
            siblingBytes, _ := hex.DecodeString(inputs.MerklePath[i])
            currentHashBytes, _ := hex.DecodeString(currentHash)
            h.Write(siblingBytes)
            h.Write(currentHashBytes)
        }
        
        currentHash = hex.EncodeToString(h.Sum(nil))
    }
    
    fmt.Printf("Step 4 Circuit Inputs:\n")
    fmt.Printf("  Secret: %s\n", inputs.Secret)
    fmt.Printf("  Nullifier: %s\n", inputs.Nullifier)
    fmt.Printf("  Leaf Index: %d\n", inputs.LeafIndex)
    fmt.Printf("  Merkle Root: %s\n", inputs.MerkleRoot)
    fmt.Printf("  Computed Root: %s\n", currentHash)
    fmt.Printf("  Root Match: %v\n", currentHash == inputs.MerkleRoot)
    
    // TODO: Real proof generation with gnark
    // For now, generate a mock proof
    mockProof := fmt.Sprintf("0x1234_step4_proof_%d", time.Now().Unix())
    
    output := ProofOutputs{
        Proof: mockProof,
        PublicSignals: []string{inputs.MerkleRoot, nullifierHash},
    }
    
    outputJSON, err := json.Marshal(output)
    if err != nil {
        return js.ValueOf(fmt.Sprintf("Error marshaling output: %v", err))
    }
    
    elapsed := time.Since(start)
    fmt.Printf("Step 4 proof generation took: %v\n", elapsed)
    
    return js.ValueOf(string(outputJSON))
}

// getCircuitInfo returns information about the circuit
func getCircuitInfo(this js.Value, args []js.Value) interface{} {
    info := map[string]interface{}{
        "name": "Step 4: Full Merkle Circuit",
        "description": "Proves commitment is in a 20-level Merkle tree",
        "constraints": 18000, // Estimated
        "publicInputs": []string{"merkleRoot", "nullifierHash"},
        "privateInputs": []string{"secret", "nullifier", "leafIndex", "merklePath[20]"},
        "treeDepth": 20,
        "maxLeaves": 1048576, // 2^20
        "provingKeySize": len(provingKey),
        "constraintSystemSize": len(constraintSystem),
    }
    
    jsonInfo, _ := json.Marshal(info)
    return js.ValueOf(string(jsonInfo))
}

// buildTestTree builds a sparse test tree for Step 4
func buildTestTree(this js.Value, args []js.Value) interface{} {
    if len(args) != 3 {
        return js.ValueOf("Error: Expected 3 arguments (secret, nullifier, leafIndex)")
    }
    
    secret := args[0].String()
    nullifier := args[1].String()
    leafIndex := args[2].Int()
    
    if leafIndex < 0 || leafIndex >= 1048576 {
        return js.ValueOf("Error: leafIndex must be between 0 and 1048575")
    }
    
    // Helper to convert big.Int to 32-byte array
    to32Bytes := func(n *big.Int) []byte {
        bytes := n.Bytes()
        if len(bytes) > 32 {
            return bytes[len(bytes)-32:]
        }
        padded := make([]byte, 32)
        copy(padded[32-len(bytes):], bytes)
        return padded
    }
    
    // First compute the user's commitment
    secretBig := new(big.Int)
    secretBig.SetString(secret, 10)
    nullifierBig := new(big.Int)
    nullifierBig.SetString(nullifier, 10)
    
    h := hash.MIMC_BN254.New()
    h.Write(to32Bytes(secretBig))
    h.Write(to32Bytes(nullifierBig))
    commitment := hex.EncodeToString(h.Sum(nil))
    
    // For a 20-level tree, we'll build a sparse tree
    // Generate path from leaf to root
    path := make([]string, 20)
    currentHash := commitment
    currentIdx := leafIndex
    
    for level := 0; level < 20; level++ {
        // Create a deterministic sibling hash based on position
        siblingIdx := currentIdx ^ 1 // XOR to get sibling index
        
        // Generate sibling hash deterministically
        h := hash.MIMC_BN254.New()
        dummyValue := big.NewInt(int64(siblingIdx * 1000 + level))
        h.Write(to32Bytes(dummyValue))
        siblingHash := hex.EncodeToString(h.Sum(nil))
        
        path[level] = siblingHash
        
        // Compute parent hash
        h = hash.MIMC_BN254.New()
        if currentIdx&1 == 0 {
            // We're left child
            currentHashBytes, _ := hex.DecodeString(currentHash)
            siblingBytes, _ := hex.DecodeString(siblingHash)
            h.Write(currentHashBytes)
            h.Write(siblingBytes)
        } else {
            // We're right child
            siblingBytes, _ := hex.DecodeString(siblingHash)
            currentHashBytes, _ := hex.DecodeString(currentHash)
            h.Write(siblingBytes)
            h.Write(currentHashBytes)
        }
        
        currentHash = hex.EncodeToString(h.Sum(nil))
        currentIdx = currentIdx / 2
    }
    
    result := map[string]interface{}{
        "root": currentHash,
        "path": path,
        "commitment": commitment,
    }
    
    resultJSON, _ := json.Marshal(result)
    return js.ValueOf(string(resultJSON))
}

func main() {
    fmt.Println("Step 4 WASM: Full Merkle Circuit initialized")
    fmt.Printf("Constraint system size: %d bytes\n", len(constraintSystem))
    fmt.Printf("SRS size: %d bytes\n", len(srs))
    fmt.Printf("Proving key size: %d bytes\n", len(provingKey))
    
    // Register functions
    js.Global().Set("generateProof", js.FuncOf(generateProof))
    js.Global().Set("getCircuitInfo", js.FuncOf(getCircuitInfo))
    js.Global().Set("buildTestTree", js.FuncOf(buildTestTree))
    
    // Keep the program running
    select {}
}
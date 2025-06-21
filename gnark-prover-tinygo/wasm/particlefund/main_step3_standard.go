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
//go:embed step3.ccs
var constraintSystem []byte

//go:embed step3.srs
var srs []byte

//go:embed step3.pkey
var provingKey []byte

// ProofInputs represents the inputs needed for proof generation
type ProofInputs struct {
    Secret       string   `json:"secret"`
    Nullifier    string   `json:"nullifier"`
    LeafIndex    int      `json:"leafIndex"`
    MerklePath   []string `json:"merklePath"` // 5 sibling hashes
    MerkleRoot   string   `json:"merkleRoot"`
}

// ProofOutputs represents the proof and public signals
type ProofOutputs struct {
    Proof         string   `json:"proof"`
    PublicSignals []string `json:"publicSignals"`
}

// generateProof generates a proof for the basic Merkle circuit
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
    if len(inputs.MerklePath) != 5 {
        return js.ValueOf("Error: Merkle path must have exactly 5 elements")
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
    for i := 0; i < 5; i++ {
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
    
    fmt.Printf("Step 3 Circuit Inputs:\n")
    fmt.Printf("  Secret: %s\n", inputs.Secret)
    fmt.Printf("  Nullifier: %s\n", inputs.Nullifier)
    fmt.Printf("  Leaf Index: %d\n", inputs.LeafIndex)
    fmt.Printf("  Merkle Root: %s\n", inputs.MerkleRoot)
    fmt.Printf("  Computed Root: %s\n", currentHash)
    fmt.Printf("  Root Match: %v\n", currentHash == inputs.MerkleRoot)
    
    // TODO: Real proof generation with gnark
    // For now, generate a mock proof
    mockProof := fmt.Sprintf("0x1234_step3_proof_%d", time.Now().Unix())
    
    output := ProofOutputs{
        Proof: mockProof,
        PublicSignals: []string{inputs.MerkleRoot, nullifierHash},
    }
    
    outputJSON, err := json.Marshal(output)
    if err != nil {
        return js.ValueOf(fmt.Sprintf("Error marshaling output: %v", err))
    }
    
    elapsed := time.Since(start)
    fmt.Printf("Step 3 proof generation took: %v\n", elapsed)
    
    return js.ValueOf(string(outputJSON))
}

// getCircuitInfo returns information about the circuit
func getCircuitInfo(this js.Value, args []js.Value) interface{} {
    info := map[string]interface{}{
        "name": "Step 3: Basic Merkle Circuit",
        "description": "Proves commitment is in a 5-level Merkle tree",
        "constraints": 4547, // Actual from compilation
        "publicInputs": []string{"merkleRoot", "nullifierHash"},
        "privateInputs": []string{"secret", "nullifier", "leafIndex", "merklePath[5]"},
        "treeDepth": 5,
        "maxLeaves": 32,
        "provingKeySize": len(provingKey),
        "constraintSystemSize": len(constraintSystem),
    }
    
    jsonInfo, _ := json.Marshal(info)
    return js.ValueOf(string(jsonInfo))
}

// computeCommitmentFromInputs computes commitment from secret and nullifier
func computeCommitmentFromInputs(this js.Value, args []js.Value) interface{} {
    if len(args) != 2 {
        return js.ValueOf("Error: Expected 2 arguments (secret, nullifier)")
    }
    
    secret := new(big.Int)
    secret.SetString(args[0].String(), 10)
    nullifier := new(big.Int)
    nullifier.SetString(args[1].String(), 10)
    
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
    
    // Compute commitment = hash(secret, nullifier)
    h := hash.MIMC_BN254.New()
    h.Write(to32Bytes(secret))
    h.Write(to32Bytes(nullifier))
    commitmentBytes := h.Sum(nil)
    
    return js.ValueOf(hex.EncodeToString(commitmentBytes))
}

func main() {
    fmt.Println("Step 3 WASM: Basic Merkle Circuit initialized")
    fmt.Printf("Constraint system size: %d bytes\n", len(constraintSystem))
    fmt.Printf("SRS size: %d bytes\n", len(srs))
    fmt.Printf("Proving key size: %d bytes\n", len(provingKey))
    
    // Register functions
    js.Global().Set("generateProof", js.FuncOf(generateProof))
    js.Global().Set("getCircuitInfo", js.FuncOf(getCircuitInfo))
    js.Global().Set("computeCommitment", js.FuncOf(computeCommitmentFromInputs))
    js.Global().Set("buildTestTree", js.FuncOf(buildTestTree))
    
    // Keep the program running
    select {}
}

// buildTestTree builds a complete test Merkle tree
func buildTestTree(this js.Value, args []js.Value) interface{} {
    if len(args) != 3 {
        return js.ValueOf("Error: Expected 3 arguments (secret, nullifier, leafIndex)")
    }
    
    secret := args[0].String()
    nullifier := args[1].String()
    leafIndex := args[2].Int()
    
    if leafIndex < 0 || leafIndex >= 32 {
        return js.ValueOf("Error: leafIndex must be between 0 and 31")
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
    
    // Build leaves - use simple values for other leaves
    leaves := make([]string, 32)
    for i := 0; i < 32; i++ {
        if i == leafIndex {
            leaves[i] = commitment
        } else {
            // Create dummy leaf
            h := hash.MIMC_BN254.New()
            dummyValue := big.NewInt(int64(i * 111))
            h.Write(to32Bytes(dummyValue))
            leaves[i] = hex.EncodeToString(h.Sum(nil))
        }
    }
    
    // Build tree level by level
    tree := [][]string{leaves}
    
    for level := 0; level < 5; level++ {
        currentLevel := tree[level]
        nextLevel := make([]string, len(currentLevel)/2)
        
        for i := 0; i < len(nextLevel); i++ {
            leftBytes, _ := hex.DecodeString(currentLevel[2*i])
            rightBytes, _ := hex.DecodeString(currentLevel[2*i+1])
            
            h := hash.MIMC_BN254.New()
            h.Write(leftBytes)
            h.Write(rightBytes)
            nextLevel[i] = hex.EncodeToString(h.Sum(nil))
        }
        
        tree = append(tree, nextLevel)
    }
    
    // Extract Merkle path for the given leaf
    path := make([]string, 5)
    idx := leafIndex
    for level := 0; level < 5; level++ {
        siblingIdx := idx ^ 1
        path[level] = tree[level][siblingIdx]
        idx = idx / 2
    }
    
    result := map[string]interface{}{
        "root": tree[5][0],
        "path": path,
        "commitment": commitment,
    }
    
    resultJSON, _ := json.Marshal(result)
    return js.ValueOf(string(resultJSON))
}
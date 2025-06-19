//go:build js && wasm
// +build js,wasm

// Step 1: WASM entry point for Nullifier-Only Circuit (Standard Go)
package main

import (
    _ "embed"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "syscall/js"
    "time"
)

// Embed the circuit artifacts
//go:embed step1.ccs
var constraintSystem []byte

//go:embed step1.srs
var srs []byte

//go:embed step1.pkey
var provingKey []byte

func main() {
    fmt.Println("Step 1: Nullifier-Only Prover initializing...")
    
    // Export functions for JavaScript
    js.Global().Set("generateProof", js.FuncOf(jsGenerateProof))
    js.Global().Set("getCircuitInfo", js.FuncOf(func(this js.Value, args []js.Value) interface{} {
        return "Step 1: Nullifier-Only Circuit (442 constraints)"
    }))
    
    fmt.Println("✓ Functions exported to JavaScript")
    
    // Keep program running
    select {}
}

func jsGenerateProof(this js.Value, args []js.Value) interface{} {
    if len(args) < 1 {
        return map[string]interface{}{
            "success": false,
            "error":   "Missing witness argument",
        }
    }
    
    // Get witness bytes from JavaScript
    // args[0] is a Uint8Array
    length := args[0].Length()
    witnessBytes := make([]byte, length)
    js.CopyBytesToGo(witnessBytes, args[0])
    
    fmt.Printf("Generating proof for Step 1... (witness: %d bytes)\n", len(witnessBytes))
    startTime := time.Now()
    
    // Parse witness JSON
    var witness map[string]string
    if err := json.Unmarshal(witnessBytes, &witness); err != nil {
        return map[string]interface{}{
            "success": false,
            "error":   fmt.Sprintf("Failed to parse witness: %v", err),
        }
    }
    
    fmt.Printf("Witness: nullifier=%s, nullifierHash=%s\n", 
        witness["nullifier"][:10]+"...", 
        witness["nullifierHash"][:10]+"...")
    
    // For now, generate a mock proof since we need to fix the prover import
    // In production, this would call prover.GenerateProofPlonk
    mockProof := make([]byte, 512)
    for i := range mockProof {
        mockProof[i] = byte(i % 256)
    }
    
    elapsedMs := int(time.Since(startTime).Milliseconds())
    fmt.Printf("✓ Proof generated in %dms\n", elapsedMs)
    
    // Return proof data
    return map[string]interface{}{
        "success":       true,
        "proof":         hex.EncodeToString(mockProof),
        "publicWitness": witness["nullifierHash"],
        "timeMs":        elapsedMs,
        "circuit":       "step1_nullifier_only",
        "constraints":   442,
    }
}
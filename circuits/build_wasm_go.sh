#!/bin/bash
# Production build script using standard Go compiler for WASM

set -e

echo "Building Particle Fund PLONK WASM prover with Go..."

# Check if wasm-opt is installed
if ! command -v wasm-opt &> /dev/null; then
    echo "wasm-opt is recommended but not required."
    echo "Install with: npm install -g wasm-opt"
    SKIP_OPT=true
fi

# Create output directories
mkdir -p wasm/build
mkdir -p ../public/wasm

# First, ensure we have the proving key
if [ ! -f "build/plonk_pk.bin" ]; then
    echo "Proving key not found. Running setup..."
    go run withdraw_plonk.go setup
fi

# Create a Go-compatible WASM build
echo "Creating WASM-compatible main.go..."
cat > wasm/main_go.go << 'EOF'
//go:build wasm
// +build wasm

package main

import (
    "encoding/base64"
    "encoding/json"
    "fmt"
    "syscall/js"
    "time"
)

// For now, we'll create a stub that can be expanded later
// The full gnark integration requires significant work to be WASM-compatible

type ProofResponse struct {
    Success bool              `json:"success"`
    Error   string           `json:"error,omitempty"`
    Proof   string           `json:"proof,omitempty"`
    PublicSignals []string   `json:"publicSignals,omitempty"`
    TimeMs  int              `json:"timeMs"`
}

type WitnessInput struct {
    Secret        string   `json:"secret"`
    Nullifier     string   `json:"nullifier"`
    MerklePath    []string `json:"merklePath"`
    MerkleIndices []int    `json:"merkleIndices"`
    MerkleRoot    string   `json:"merkleRoot"`
    NullifierHash string   `json:"nullifierHash"`
    Recipient     string   `json:"recipient"`
    Amount        string   `json:"amount"`
    Relayer       string   `json:"relayer"`
    Fee           string   `json:"fee"`
    Refund        string   `json:"refund"`
}

func main() {
    fmt.Println("Particle Fund PLONK Prover initializing...")
    
    js.Global().Set("particleFundProver", js.ValueOf(map[string]interface{}{
        "initialize": js.FuncOf(initialize),
        "generateProof": js.FuncOf(generateProof),
    }))
    
    // Keep the program running
    select {}
}

func initialize(this js.Value, args []js.Value) interface{} {
    response := ProofResponse{
        Success: true,
        TimeMs: 100,
    }
    
    jsonBytes, _ := json.Marshal(response)
    return string(jsonBytes)
}

func generateProof(this js.Value, args []js.Value) interface{} {
    startTime := time.Now()
    
    // Parse input
    inputJSON := args[0].String()
    var input WitnessInput
    if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
        response := ProofResponse{
            Success: false,
            Error: fmt.Sprintf("Failed to parse input: %v", err),
            TimeMs: int(time.Since(startTime).Milliseconds()),
        }
        jsonBytes, _ := json.Marshal(response)
        return string(jsonBytes)
    }
    
    // Note: This is a temporary implementation
    // In production, this would integrate with gnark for real proof generation
    fmt.Printf("Generating proof for nullifier: %s\n", input.NullifierHash)
    
    // Simulate proof generation
    time.Sleep(500 * time.Millisecond)
    
    // Create a deterministic mock proof based on inputs
    mockProof := map[string]interface{}{
        "lro": [][]string{
            {input.Secret[:32], input.Nullifier[:32]},
            {input.MerkleRoot[:32], input.NullifierHash[:32]},
            {input.Recipient[:32], input.Amount[:32]},
        },
        "z": []string{input.Relayer[:32], input.Fee[:32]},
        "h": [][]string{
            {"0x7777777777777777777777777777777777777777777777777777777777777777", "0x8888888888888888888888888888888888888888888888888888888888888888"},
            {"0x9999999999999999999999999999999999999999999999999999999999999999", "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
            {"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"},
        },
        "batched_proof": map[string]interface{}{
            "h": []string{"0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"},
            "claimed_values": []string{
                "0x1234123412341234123412341234123412341234123412341234123412341234",
                "0x5678567856785678567856785678567856785678567856785678567856785678",
            },
        },
        "zshifted_proof": map[string]interface{}{
            "h": []string{"0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", "0x1111111111111111111111111111111111111111111111111111111111111111"},
            "claimed_value": "0x2222222222222222222222222222222222222222222222222222222222222222",
        },
        "bsb22_commitments": [][]string{},
    }
    
    proofJSON, _ := json.Marshal(mockProof)
    
    response := ProofResponse{
        Success: true,
        Proof: base64.StdEncoding.EncodeToString(proofJSON),
        PublicSignals: []string{
            input.MerkleRoot,
            input.NullifierHash,
            input.Recipient,
            input.Amount,
            input.Relayer,
            input.Fee,
            input.Refund,
        },
        TimeMs: int(time.Since(startTime).Milliseconds()),
    }
    
    jsonBytes, _ := json.Marshal(response)
    return string(jsonBytes)
}
EOF

# Build with standard Go compiler
echo "Building WASM with Go compiler..."
cd wasm
GOOS=js GOARCH=wasm go build -o build/particle_fund_prover.wasm main_go.go
cd ..

# Optimize if wasm-opt is available
if [ -z "$SKIP_OPT" ]; then
    echo "Optimizing WASM..."
    wasm-opt -O2 wasm/build/particle_fund_prover.wasm -o wasm/build/particle_fund_prover_opt.wasm --enable-bulk-memory
    cp wasm/build/particle_fund_prover_opt.wasm ../public/wasm/particle_fund_prover.wasm
else
    cp wasm/build/particle_fund_prover.wasm ../public/wasm/particle_fund_prover.wasm
fi

# Copy Go's wasm_exec.js
echo "Copying Go wasm_exec.js..."
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" ../public/wasm/

# Copy verification key
cp build/plonk_vk.bin ../public/wasm/particle_fund.vkey

# Create placeholder files
echo "go_wasm_build" > ../public/wasm/particle_fund.pkey
echo "go_wasm_build" > ../public/wasm/particle_fund.ccs
echo "go_wasm_build" > ../public/wasm/particle_fund.srs

# Get file sizes
echo ""
echo "Build complete!"
echo ""
echo "Files created:"
ls -lh ../public/wasm/

echo ""
echo "WASM Size: $(ls -lh ../public/wasm/particle_fund_prover.wasm | awk '{print $5}')"
echo ""
echo "NOTE: This is a development build with mock proof generation."
echo "For production PLONK proofs, we need to either:"
echo "1. Use Vocdoni's gnark-tiny-prover"
echo "2. Run proof generation server-side"
echo "3. Implement a custom WASM-compatible prover"
echo ""
echo "The current implementation will allow testing the full flow with deterministic proofs."
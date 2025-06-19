#!/bin/bash
# Adapt Vocdoni's gnark-prover-tinygo for Particle Fund

set -e

echo "Adapting Vocdoni's gnark-prover-tinygo for Particle Fund..."

# Work in the existing clone
cd ../../gnark-prover-tinygo

# Create our circuit in their structure
echo "Creating Particle Fund circuit..."
cat > circuits/particlefund/withdraw.go << 'EOF'
package particlefund

import (
    "github.com/consensys/gnark/frontend"
    "gnark-prover-tinygo/std/hash/poseidon"
)

// WithdrawCircuit for Particle Fund privacy pool
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
    // Use Poseidon hash (optimized for ZK)
    // 1. Compute commitment = Poseidon(secret, nullifier)
    commitment, err := poseidon.Hash(api, circuit.Secret, circuit.Nullifier)
    if err != nil {
        return err
    }
    
    // 2. Verify Merkle proof
    currentHash := commitment
    for i := 0; i < len(circuit.MerklePath); i++ {
        left := api.Select(circuit.MerkleIndices[i], currentHash, circuit.MerklePath[i])
        right := api.Select(circuit.MerkleIndices[i], circuit.MerklePath[i], currentHash)
        
        currentHash, err = poseidon.Hash(api, left, right)
        if err != nil {
            return err
        }
    }
    
    // Verify Merkle root
    api.AssertIsEqual(currentHash, circuit.MerkleRoot)
    
    // 3. Compute and verify nullifier hash
    computedNullifierHash, err := poseidon.Hash(api, circuit.Nullifier)
    if err != nil {
        return err
    }
    api.AssertIsEqual(computedNullifierHash, circuit.NullifierHash)
    
    // 4. Basic amount verification
    api.AssertIsDifferent(circuit.Amount, 0)
    
    return nil
}
EOF

# Create circuit inputs structure
cat > circuits/particlefund/inputs.go << 'EOF'
package particlefund

import (
    "encoding/json"
    "math/big"
)

// WithdrawInputs represents the JSON input from the browser
type WithdrawInputs struct {
    // Private inputs
    Secret        string   `json:"secret"`
    Nullifier     string   `json:"nullifier"`
    MerklePath    []string `json:"merklePath"`
    MerkleIndices []int    `json:"merkleIndices"`
    
    // Public inputs
    MerkleRoot    string `json:"merkleRoot"`
    NullifierHash string `json:"nullifierHash"`
    Recipient     string `json:"recipient"`
    Amount        string `json:"amount"`
    Relayer       string `json:"relayer"`
    Fee           string `json:"fee"`
    Refund        string `json:"refund"`
}

// ToCircuit converts JSON inputs to circuit format
func (w *WithdrawInputs) ToCircuit(depth int) *WithdrawCircuit {
    circuit := &WithdrawCircuit{}
    
    // Convert hex strings to big.Int
    circuit.Secret = hexToBigInt(w.Secret)
    circuit.Nullifier = hexToBigInt(w.Nullifier)
    circuit.MerkleRoot = hexToBigInt(w.MerkleRoot)
    circuit.NullifierHash = hexToBigInt(w.NullifierHash)
    circuit.Recipient = hexToBigInt(w.Recipient)
    circuit.Amount = hexToBigInt(w.Amount)
    circuit.Relayer = hexToBigInt(w.Relayer)
    circuit.Fee = hexToBigInt(w.Fee)
    circuit.Refund = hexToBigInt(w.Refund)
    
    // Initialize Merkle arrays
    circuit.MerklePath = make([]frontend.Variable, depth)
    circuit.MerkleIndices = make([]frontend.Variable, depth)
    
    for i := 0; i < depth; i++ {
        if i < len(w.MerklePath) {
            circuit.MerklePath[i] = hexToBigInt(w.MerklePath[i])
            circuit.MerkleIndices[i] = w.MerkleIndices[i]
        } else {
            circuit.MerklePath[i] = big.NewInt(0)
            circuit.MerkleIndices[i] = 0
        }
    }
    
    return circuit
}

func hexToBigInt(hex string) *big.Int {
    if len(hex) > 2 && hex[:2] == "0x" {
        hex = hex[2:]
    }
    val, _ := new(big.Int).SetString(hex, 16)
    if val == nil {
        return big.NewInt(0)
    }
    return val
}
EOF

# Create WASM entry point
cat > wasm/particlefund/main.go << 'EOF'
//go:build tinygo
// +build tinygo

package main

import (
    _ "embed"
    "encoding/json"
    "fmt"
    "gnark-prover-tinygo/circuits/particlefund"
    "gnark-prover-tinygo/prover"
    "syscall/js"
    "time"
)

//go:embed withdraw.ccs
var eccs []byte

//go:embed withdraw.srs
var esrs []byte

//go:embed withdraw.pkey
var epkey []byte

const MERKLE_DEPTH = 20

func main() {
    js.Global().Set("generateProof", js.FuncOf(jsGenerateProof))
    js.Global().Set("getProverInfo", js.FuncOf(func(this js.Value, args []js.Value) interface{} {
        return js.ValueOf("Particle Fund PLONK Prover v1.0.0")
    }))
    <-make(chan int)
}

func jsGenerateProof(this js.Value, args []js.Value) interface{} {
    inputJSON := args[0].String()
    
    fmt.Println("Parsing inputs...")
    var inputs particlefund.WithdrawInputs
    if err := json.Unmarshal([]byte(inputJSON), &inputs); err != nil {
        fmt.Printf("Failed to parse inputs: %v\n", err)
        return js.ValueOf(map[string]interface{}{
            "success": false,
            "error": fmt.Sprintf("Failed to parse inputs: %v", err),
        })
    }
    
    // Convert to circuit format
    circuit := inputs.ToCircuit(MERKLE_DEPTH)
    
    // Generate witness
    fmt.Println("Generating witness...")
    witness, err := frontend.NewWitness(circuit, ecc.BN254.ScalarField())
    if err != nil {
        return js.ValueOf(map[string]interface{}{
            "success": false,
            "error": fmt.Sprintf("Failed to create witness: %v", err),
        })
    }
    
    // Convert witness to bytes
    var witnessBuf bytes.Buffer
    if _, err := witness.WriteTo(&witnessBuf); err != nil {
        return js.ValueOf(map[string]interface{}{
            "success": false,
            "error": fmt.Sprintf("Failed to serialize witness: %v", err),
        })
    }
    
    fmt.Println("Generating PLONK proof...")
    startTime := time.Now()
    
    proof, publicWitness, err := prover.GenerateProofPlonk(eccs, esrs, epkey, witnessBuf.Bytes())
    if err != nil {
        fmt.Printf("Proof generation failed: %v\n", err)
        return js.ValueOf(map[string]interface{}{
            "success": false,
            "error": fmt.Sprintf("Proof generation failed: %v", err),
        })
    }
    
    elapsedMs := int(time.Since(startTime).Milliseconds())
    fmt.Printf("Proof generated in %dms\n", elapsedMs)
    
    // Extract public signals
    publicSignals := []string{
        inputs.MerkleRoot,
        inputs.NullifierHash,
        inputs.Recipient,
        inputs.Amount,
        inputs.Relayer,
        inputs.Fee,
        inputs.Refund,
    }
    
    return js.ValueOf(map[string]interface{}{
        "success": true,
        "proof": hex.EncodeToString(proof),
        "publicSignals": publicSignals,
        "publicWitness": hex.EncodeToString(publicWitness),
        "timeMs": elapsedMs,
    })
}
EOF

# Create compiler for generating artifacts
cat > cmd/particlefund-compiler/main.go << 'EOF'
package main

import (
    "os"
    "fmt"
    "gnark-prover-tinygo/circuits/particlefund"
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/backend/plonk"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
    "github.com/consensys/gnark/test/unsafekzg"
)

const MERKLE_DEPTH = 20

func main() {
    fmt.Println("Compiling Particle Fund withdraw circuit...")
    
    // Create circuit with proper Merkle depth
    var circuit particlefund.WithdrawCircuit
    circuit.MerklePath = make([]frontend.Variable, MERKLE_DEPTH)
    circuit.MerkleIndices = make([]frontend.Variable, MERKLE_DEPTH)
    
    // Compile circuit
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        panic(fmt.Errorf("circuit compilation failed: %w", err))
    }
    
    fmt.Printf("Circuit compiled: %d constraints\n", ccs.GetNbConstraints())
    
    // Setup
    srs, srsLagrange, err := unsafekzg.NewSRS(ccs)
    if err != nil {
        panic(err)
    }
    
    pk, vk, err := plonk.Setup(ccs, srs, srsLagrange)
    if err != nil {
        panic(err)
    }
    
    // Save artifacts
    os.Mkdir("wasm/particlefund", 0755)
    
    // Save constraint system
    f, _ := os.Create("wasm/particlefund/withdraw.ccs")
    ccs.WriteTo(f)
    f.Close()
    
    // Save SRS
    f, _ = os.Create("wasm/particlefund/withdraw.srs")
    srs.WriteTo(f)
    f.Close()
    
    // Save proving key
    f, _ = os.Create("wasm/particlefund/withdraw.pkey")
    pk.WriteTo(f)
    f.Close()
    
    // Save verification key
    f, _ = os.Create("wasm/particlefund/withdraw.vkey")
    vk.WriteTo(f)
    f.Close()
    
    fmt.Println("Artifacts saved!")
    fmt.Printf("Proving key size: %d KB\n", getFileSize("wasm/particlefund/withdraw.pkey")/1024)
    fmt.Printf("Verification key size: %d KB\n", getFileSize("wasm/particlefund/withdraw.vkey")/1024)
}

func getFileSize(path string) int64 {
    fi, _ := os.Stat(path)
    return fi.Size()
}
EOF

echo "Setup complete!"
echo ""
echo "To build:"
echo "1. cd ../../gnark-prover-tinygo"
echo "2. go run cmd/particlefund-compiler/main.go"
echo "3. make build-tinygo-wasm"
echo ""
echo "Note: You'll need to modify their Makefile to include particlefund target"
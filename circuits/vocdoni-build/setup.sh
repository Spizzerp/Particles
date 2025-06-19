#!/bin/bash
# Setup script for building Particle Fund PLONK prover with Vocdoni's gnark-tiny-prover

set -e

echo "Setting up Vocdoni gnark-tiny-prover build environment..."

# Create build directory
mkdir -p vocdoni-workspace
cd vocdoni-workspace

# Clone Vocdoni's forked repositories
echo "Cloning Vocdoni's forked gnark..."
git clone https://github.com/vocdoni/gnark.git
cd gnark
git checkout v0.0.0-20230413134136-187f3b3ead69
cd ..

echo "Cloning Vocdoni's forked gnark-crypto..."
git clone https://github.com/vocdoni/gnark-crypto.git
cd gnark-crypto
git checkout v0.10.1-0.20230411213837-3e72368bec7e
cd ..

# Create a new module for our prover
echo "Creating Particle Fund prover module..."
mkdir -p particle-fund-prover
cd particle-fund-prover

# Initialize go module with replace directives
cat > go.mod << 'EOF'
module particle-fund-prover

go 1.19

replace github.com/consensys/gnark => ../gnark
replace github.com/consensys/gnark-crypto => ../gnark-crypto

require (
    github.com/consensys/gnark v0.7.2
    github.com/consensys/gnark-crypto v0.9.2
)
EOF

# Create circuit definition
mkdir -p circuits
cat > circuits/withdraw.go << 'EOF'
package circuits

import (
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark-crypto/hash/mimc"
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
    // 1. Compute commitment = MiMC(secret, nullifier)
    mimc, err := mimc.NewMiMC(api)
    if err != nil {
        return err
    }
    
    mimc.Write(circuit.Secret)
    mimc.Write(circuit.Nullifier)
    commitment := mimc.Sum()
    
    // 2. Verify Merkle proof
    currentHash := commitment
    for i := 0; i < len(circuit.MerklePath); i++ {
        left := api.Select(circuit.MerkleIndices[i], currentHash, circuit.MerklePath[i])
        right := api.Select(circuit.MerkleIndices[i], circuit.MerklePath[i], currentHash)
        
        mimc.Reset()
        mimc.Write(left)
        mimc.Write(right)
        currentHash = mimc.Sum()
    }
    
    // Verify Merkle root
    api.AssertIsEqual(currentHash, circuit.MerkleRoot)
    
    // 3. Compute and verify nullifier hash
    mimc.Reset()
    mimc.Write(circuit.Nullifier)
    computedNullifierHash := mimc.Sum()
    api.AssertIsEqual(computedNullifierHash, circuit.NullifierHash)
    
    // 4. Verify amount constraints
    // Amount = Fee + Refund + (sent to recipient)
    totalOut := api.Add(circuit.Fee, circuit.Refund)
    api.AssertIsLessOrEqual(totalOut, circuit.Amount)
    
    return nil
}

// NewWithdrawCircuit creates a circuit with specified Merkle tree depth
func NewWithdrawCircuit(merkleDepth int) *WithdrawCircuit {
    circuit := &WithdrawCircuit{}
    circuit.MerklePath = make([]frontend.Variable, merkleDepth)
    circuit.MerkleIndices = make([]frontend.Variable, merkleDepth)
    return circuit
}
EOF

# Create WASM main file
mkdir -p wasm
cat > wasm/main.go << 'EOF'
//go:build tinygo
// +build tinygo

package main

import (
    _ "embed"
    "encoding/hex"
    "encoding/json"
    "particle-fund-prover/circuits"
    "particle-fund-prover/prover"
    "syscall/js"
)

//go:embed withdraw.ccs
var ccsBytes []byte

//go:embed withdraw.srs  
var srsBytes []byte

//go:embed withdraw.pkey
var pkeyBytes []byte

func main() {
    js.Global().Set("generateProof", js.FuncOf(jsGenerateProof))
    select {}
}

func jsGenerateProof(this js.Value, args []js.Value) interface{} {
    inputJSON := args[0].String()
    
    proof, publicSignals, err := prover.GenerateProof(
        ccsBytes, 
        srsBytes, 
        pkeyBytes, 
        []byte(inputJSON),
    )
    
    if err != nil {
        return js.ValueOf(map[string]interface{}{
            "success": false,
            "error": err.Error(),
        })
    }
    
    return js.ValueOf(map[string]interface{}{
        "success": true,
        "proof": hex.EncodeToString(proof),
        "publicSignals": publicSignals,
    })
}
EOF

# Create build script
cat > build.sh << 'EOF'
#!/bin/bash
set -e

# 1. Generate circuit artifacts
echo "Generating circuit artifacts..."
go run cmd/setup/main.go

# 2. Copy artifacts to WASM directory
cp build/withdraw.ccs wasm/
cp build/withdraw.srs wasm/
cp build/withdraw.pkey wasm/

# 3. Build WASM with TinyGo
echo "Building WASM..."
tinygo build -o ../../../public/wasm/particle_fund_prover.wasm \
    -target wasm \
    -opt 2 \
    -no-debug \
    -scheduler asyncify \
    -ldflags "-X main.wasmMemorySize=4294967296" \
    wasm/main.go

echo "Build complete!"
EOF

chmod +x build.sh

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. cd vocdoni-workspace/particle-fund-prover"
echo "2. Implement the prover package"
echo "3. Run ./build.sh to generate WASM"
echo ""
echo "Note: This requires TinyGo and specific build flags for optimal performance"
EOF

chmod +x setup.sh
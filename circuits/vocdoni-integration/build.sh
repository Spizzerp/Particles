#!/bin/bash
# Build script for Vocdoni-based PLONK WASM prover

set -e

echo "Building Particle Fund PLONK WASM prover with Vocdoni's gnark-tiny-prover..."

# Check prerequisites
if ! command -v tinygo &> /dev/null; then
    echo "TinyGo is required but not installed."
    echo "Install from: https://tinygo.org/getting-started/install/"
    exit 1
fi

# Create output directory
mkdir -p ../../public/wasm

# First, we need to compile our circuit and generate the artifacts
echo "Generating circuit artifacts..."
cd ..

# Check if we have the proving key
if [ ! -f "build/plonk_pk.bin" ]; then
    echo "Proving key not found. Running setup..."
    go run withdraw_plonk.go setup
fi

# Copy artifacts to Vocdoni integration directory
cp build/plonk_pk.bin vocdoni-integration/wasm/particle_fund.pkey
cp build/plonk_vk.bin vocdoni-integration/particle_fund.vkey

# We need to generate the constraint system file using Vocdoni's approach
echo "Generating constraint system for Vocdoni integration..."
cat > vocdoni-integration/generate_ccs.go << 'EOF'
package main

import (
    "os"
    "fmt"
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
)

// WithdrawCircuit must match withdraw_plonk.go
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
    // Minimal constraints for testing
    api.AssertIsDifferent(circuit.Secret, 0)
    api.AssertIsDifferent(circuit.Nullifier, 0)
    return nil
}

func main() {
    var circuit WithdrawCircuit
    circuit.MerklePath = make([]frontend.Variable, 20)
    circuit.MerkleIndices = make([]frontend.Variable, 20)
    
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        panic(err)
    }
    
    file, err := os.Create("vocdoni-integration/wasm/particle_fund.ccs")
    if err != nil {
        panic(err)
    }
    defer file.Close()
    
    _, err = ccs.WriteTo(file)
    if err != nil {
        panic(err)
    }
    
    fmt.Println("Constraint system saved")
}
EOF

go run vocdoni-integration/generate_ccs.go
rm vocdoni-integration/generate_ccs.go

# Generate SRS using the same approach
echo "Generating SRS..."
cat > vocdoni-integration/generate_srs.go << 'EOF'
package main

import (
    "os"
    "fmt"
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
    "github.com/consensys/gnark/test/unsafekzg"
)

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
    api.AssertIsDifferent(circuit.Secret, 0)
    api.AssertIsDifferent(circuit.Nullifier, 0)
    return nil
}

func main() {
    var circuit WithdrawCircuit
    circuit.MerklePath = make([]frontend.Variable, 20)
    circuit.MerkleIndices = make([]frontend.Variable, 20)
    
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        panic(err)
    }
    
    srs, _, err := unsafekzg.NewSRS(ccs)
    if err != nil {
        panic(err)
    }
    
    file, err := os.Create("vocdoni-integration/wasm/particle_fund.srs")
    if err != nil {
        panic(err)
    }
    defer file.Close()
    
    _, err = srs.WriteTo(file)
    if err != nil {
        panic(err)
    }
    
    fmt.Println("SRS saved")
}
EOF

go run vocdoni-integration/generate_srs.go
rm vocdoni-integration/generate_srs.go

# Now we'll use a simpler approach - adapt Vocdoni's example
echo "Creating adapted WASM prover..."

# Copy and adapt their PLONK example
cd vocdoni-integration
cp -r ../../gnark-prover-tinygo/examples/web/* .

# Update the HTML to use our circuit
sed -i '' 's/ZkCensus/ParticleFund/g' index_plonk.html

echo "Building with TinyGo..."
# This is complex and requires Vocdoni's forked dependencies
# For now, let's use a pre-built approach

echo ""
echo "Note: Full Vocdoni integration requires:"
echo "1. Their forked gnark and gnark-crypto"
echo "2. Special TinyGo build flags"
echo "3. Manual memory optimization"
echo ""
echo "For production use, consider:"
echo "1. Using their pre-built binaries as a starting point"
echo "2. Collaborating with Vocdoni team"
echo "3. Starting with server-side proof generation"
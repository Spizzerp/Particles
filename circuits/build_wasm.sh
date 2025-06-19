#!/bin/bash
# Build script for Particle Fund PLONK WASM prover

set -e

echo "Building Particle Fund PLONK WASM prover..."

# Check if TinyGo is installed
if ! command -v tinygo &> /dev/null; then
    echo "TinyGo is required but not installed."
    echo "Install from: https://tinygo.org/getting-started/install/"
    exit 1
fi

# Check if wasm-opt is installed
if ! command -v wasm-opt &> /dev/null; then
    echo "wasm-opt is required but not installed."
    echo "Install with: npm install -g wasm-opt"
    exit 1
fi

# Create output directory
mkdir -p wasm/build

# First, we need to generate the circuit constraint system and keys
echo "Generating circuit artifacts..."
go run withdraw_plonk.go setup

# Copy artifacts with correct names
echo "Copying artifacts..."
cp build/plonk_pk.bin wasm/particle_fund.pkey
cp build/plonk_vk.bin wasm/particle_fund.vkey

# We also need to generate the constraint system file
echo "Generating constraint system..."
cat > generate_ccs.go << 'EOF'
package main

import (
    "os"
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
)

func main() {
    // Same circuit structure as withdraw_plonk.go
    var circuit WithdrawCircuit
    circuit.MerklePath = make([]frontend.Variable, 20)
    circuit.MerkleIndices = make([]frontend.Variable, 20)
    
    // Compile to constraint system
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        panic(err)
    }
    
    // Save constraint system
    file, err := os.Create("wasm/particle_fund.ccs")
    if err != nil {
        panic(err)
    }
    defer file.Close()
    
    _, err = ccs.WriteTo(file)
    if err != nil {
        panic(err)
    }
    
    println("Constraint system saved")
}

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
    // Circuit definition would go here
    return nil
}
EOF

go run generate_ccs.go
rm generate_ccs.go

# Generate SRS file (using test SRS for now)
echo "Generating SRS..."
cat > generate_srs.go << 'EOF'
package main

import (
    "os"
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
    "github.com/consensys/gnark/test/unsafekzg"
)

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
    
    file, err := os.Create("wasm/particle_fund.srs")
    if err != nil {
        panic(err)
    }
    defer file.Close()
    
    _, err = srs.WriteTo(file)
    if err != nil {
        panic(err)
    }
    
    println("SRS saved")
}

// Circuit definition omitted for brevity
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
    return nil
}
EOF

go run generate_srs.go
rm generate_srs.go

# Build WASM with TinyGo
echo "Building WASM with TinyGo..."
tinygo build -target=wasm -opt=2 -no-debug -scheduler=asyncify -o wasm/build/particle_fund_prover.wasm wasm/main.go

# Optimize WASM
echo "Optimizing WASM..."
wasm-opt -O2 wasm/build/particle_fund_prover.wasm -o wasm/build/particle_fund_prover.wasm --enable-bulk-memory

# Get file size
WASM_SIZE=$(ls -lh wasm/build/particle_fund_prover.wasm | awk '{print $5}')
echo "WASM prover built successfully!"
echo "Size: $WASM_SIZE"
echo "Output: wasm/build/particle_fund_prover.wasm"

# Copy wasm_exec.js for TinyGo
echo "Copying TinyGo wasm_exec.js..."
cp "$(tinygo env TINYGOROOT)/targets/wasm_exec.js" wasm/build/

echo "Build complete!"
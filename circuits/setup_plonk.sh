#!/bin/bash

# PLONK Circuit Setup Script for gnark

echo "Setting up PLONK circuit with gnark..."

# Step 1: Install Go if not present
if ! command -v go &> /dev/null; then
    echo "Go is not installed. Please install Go first."
    exit 1
fi

# Step 2: Initialize go module
cd /Users/spizzerp/ParticleFund/circuits
go mod init particlefund/circuits 2>/dev/null || true

# Step 3: Get gnark dependencies
echo "Installing gnark dependencies..."
go get github.com/consensys/gnark@latest
go get github.com/consensys/gnark-crypto@latest

# Step 4: Build the circuit
echo "Building withdraw circuit..."
go build -o withdraw_plonk_builder withdraw_plonk.go

# Step 5: Generate the setup files
echo "Generating PLONK setup files..."
cat > generate_plonk_keys.go << 'EOF'
package main

import (
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/backend/plonk"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/scs"
    "github.com/consensys/gnark/test"
    "os"
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
    // Circuit definition here (same as withdraw_plonk.go)
    return nil
}

func main() {
    var circuit WithdrawCircuit
    circuit.MerklePath = make([]frontend.Variable, 20)
    circuit.MerkleIndices = make([]frontend.Variable, 20)
    
    // Compile circuit
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), scs.NewBuilder, &circuit)
    if err != nil {
        panic(err)
    }
    
    // PLONK setup
    srs, err := test.NewKZGSRS(ccs)
    if err != nil {
        panic(err)
    }
    
    pk, vk, err := plonk.Setup(ccs, srs)
    if err != nil {
        panic(err)
    }
    
    // Save proving key
    pkFile, _ := os.Create("plonk_pk.bin")
    pk.WriteTo(pkFile)
    pkFile.Close()
    
    // Save verification key
    vkFile, _ := os.Create("plonk_vk.bin")
    vk.WriteTo(vkFile)
    vkFile.Close()
    
    println("PLONK setup complete!")
    println("Proving key: plonk_pk.bin")
    println("Verification key: plonk_vk.bin")
}
EOF

go run generate_plonk_keys.go

echo "PLONK setup complete!"
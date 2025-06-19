#!/bin/bash

# Exit on error
set -e

echo "Building withdrawal circuit..."

# Create build directory if it doesn't exist
mkdir -p build

# Use local circom binary
CIRCOM="./bin/circom"

# Check if circom is installed
if [ ! -f "$CIRCOM" ]; then
    echo "Error: circom not found at $CIRCOM. Please run the download script first."
    exit 1
fi

# Compile the circuit (using original circuit with circom 2)
echo "Compiling circuit..."
$CIRCOM src/withdraw.circom --r1cs --wasm --sym -o build/

echo "Circuit compilation complete!"

# Download powers of tau if not already present
if [ ! -f "build/powersOfTau28_hez_final_20.ptau" ]; then
    echo "Downloading powers of tau..."
    cd build
    # Using a mirror from the snarkjs repo
    curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau -o powersOfTau28_hez_final_20.ptau || \
    curl -L https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_20.ptau -o powersOfTau28_hez_final_20.ptau
    cd ..
fi

# Generate the proving and verification keys
echo "Running trusted setup..."
cd build

# Generate initial contribution
snarkjs groth16 setup withdraw.r1cs powersOfTau28_hez_final_20.ptau withdraw_0000.zkey

# Contribute to the ceremony
echo "Contributing to ceremony..."
snarkjs zkey contribute withdraw_0000.zkey withdraw_0001.zkey --name="First contribution" -v

# Generate final zkey
echo "Generating final zkey..."
snarkjs zkey beacon withdraw_0001.zkey withdraw_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"

# Export verification key
echo "Exporting verification key..."
snarkjs zkey export verificationkey withdraw_final.zkey verification_key.json

# Create a simple prover script
cat > ../prove.js << 'EOF'
const snarkjs = require("snarkjs");
const fs = require("fs");

async function prove(input) {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "build/withdraw_js/withdraw.wasm",
        "build/withdraw_final.zkey"
    );
    
    return { proof, publicSignals };
}

async function verify(proof, publicSignals) {
    const vKey = JSON.parse(fs.readFileSync("build/verification_key.json"));
    const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    return res;
}

module.exports = { prove, verify };
EOF

cd ..

echo "Circuit build complete! Generated files:"
echo "  - build/withdraw.wasm"
echo "  - build/withdraw_final.zkey"
echo "  - build/verification_key.json"
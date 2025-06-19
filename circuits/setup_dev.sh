#!/bin/bash

# Development setup script for ZK circuits
# Uses smaller parameters for faster development

set -e

echo "Setting up development environment for ZK circuits..."

# Create build directory
mkdir -p build

# Generate a smaller powers of tau for development (2^14 constraints)
echo "Generating development powers of tau..."
npx snarkjs powersoftau new bn128 14 build/pot14_0000.ptau

# Add entropy non-interactively
echo "Contributing to ceremony..."
npx snarkjs powersoftau contribute build/pot14_0000.ptau build/pot14_0001.ptau \
    --name="Development contribution" \
    -e="$(date +%s)$(openssl rand -hex 32)"

# Prepare phase 2
echo "Preparing phase 2..."
npx snarkjs powersoftau prepare phase2 build/pot14_0001.ptau build/pot14_final.ptau

# Now setup the circuit
echo "Setting up circuit..."
npx snarkjs groth16 setup build/withdraw.r1cs build/pot14_final.ptau build/withdraw_0000.zkey

# Contribute to the circuit ceremony
echo "Contributing to circuit ceremony..."
npx snarkjs zkey contribute build/withdraw_0000.zkey build/withdraw_0001.zkey \
    --name="Circuit contribution" \
    -e="$(date +%s)$(openssl rand -hex 32)"

# Apply random beacon
echo "Applying random beacon..."
npx snarkjs zkey beacon build/withdraw_0001.zkey build/withdraw_final.zkey \
    0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 \
    -n="Final Beacon"

# Export verification key
echo "Exporting verification key..."
npx snarkjs zkey export verificationkey build/withdraw_final.zkey build/verification_key.json

echo "Development setup complete!"
echo "Generated files:"
echo "  - build/withdraw_final.zkey (proving key)"
echo "  - build/verification_key.json (verification key)"
echo "  - build/withdraw_js/withdraw.wasm (witness generator)"
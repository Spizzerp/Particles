#!/bin/bash

# Copy circuit artifacts to appropriate locations

echo "Copying circuit artifacts..."

# Create directories if they don't exist
mkdir -p public/circuits
mkdir -p src/canisters/zkp

# Copy proving key and wasm for frontend
cp circuits/build/withdraw_final.zkey public/circuits/
cp circuits/build/withdraw_js/withdraw.wasm public/circuits/

# Copy verification key for canister
cp circuits/build/verification_key.json src/canisters/zkp/

echo "Circuit artifacts copied:"
echo "  - public/circuits/withdraw_final.zkey (for frontend proof generation)"
echo "  - public/circuits/withdraw.wasm (circuit logic for browser)"
echo "  - src/canisters/zkp/verification_key.json (for canister verification)"
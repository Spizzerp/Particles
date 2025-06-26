#!/bin/bash
# Build production WASM for Particle Fund with standard Go compiler

set -e

echo "Building Particle Fund production WASM prover with standard Go..."

# Check prerequisites
if ! command -v go &> /dev/null; then
    echo "Go is required but not installed."
    exit 1
fi

# Create necessary directories
mkdir -p wasm/particlefund/production
mkdir -p build/particlefund
mkdir -p ../../public/wasm

# Step 1: Generate circuit artifacts if they don't exist
echo "Checking circuit artifacts..."
cd ../circuits

if [ ! -f "build/withdraw_complete.ccs" ] || [ ! -f "build/withdraw_complete.srs" ] || [ ! -f "build/withdraw_complete.pkey" ]; then
    echo "Generating circuit artifacts..."
    go run withdraw_complete_setup.go
fi

# Copy artifacts to gnark-prover-tinygo directory
echo "Copying circuit artifacts..."
mkdir -p ../gnark-prover-tinygo/wasm/particlefund/production
cp build/withdraw_complete.ccs ../gnark-prover-tinygo/wasm/particlefund/production/
cp build/withdraw_complete.srs ../gnark-prover-tinygo/wasm/particlefund/production/
cp build/withdraw_complete.pkey ../gnark-prover-tinygo/wasm/particlefund/production/

cd ../gnark-prover-tinygo

# Step 2: Build the WASM module with standard Go
echo "Building WASM module with standard Go compiler..."

# First rename the old main.go temporarily
mv wasm/particlefund/production/main.go wasm/particlefund/production/main_old.go
mv wasm/particlefund/production/main_clean.go wasm/particlefund/production/main.go

GOOS=js GOARCH=wasm go build -o build/particlefund/particlefund_prover.wasm \
    -ldflags="-s -w" \
    ./wasm/particlefund/production

# Restore original names
mv wasm/particlefund/production/main.go wasm/particlefund/production/main_clean.go
mv wasm/particlefund/production/main_old.go wasm/particlefund/production/main.go

# Copy to public directory
echo "Copying WASM to public directory..."
cp build/particlefund/particlefund_prover.wasm ../../public/wasm/

# Copy wasm_exec.js from Go installation
echo "Copying wasm_exec.js..."
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" ../../public/wasm/

echo "Build complete!"
echo "Files generated:"
echo "  - WASM: ../../public/wasm/particlefund_prover.wasm"
echo "  - JS Support: ../../public/wasm/wasm_exec.js"
echo ""
echo "WASM size: $(ls -lh build/particlefund/particlefund_prover.wasm | awk '{print $5}')"
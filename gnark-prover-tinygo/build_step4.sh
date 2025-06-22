#!/bin/bash

echo "Building Step 4: Full Merkle Circuit (20 levels)..."

# Clean previous artifacts
rm -f wasm/particlefund/step4.ccs
rm -f wasm/particlefund/step4.srs
rm -f wasm/particlefund/step4.pkey
rm -f wasm/particlefund/step4.vkey
rm -f wasm/particlefund/particlefund_step4_standard.wasm

# Step 1: Run setup to generate proving keys
echo "Running circuit setup..."
cd examples/particlefund/setup
go run step4_setup.go
cd ../../..

# Step 2: Compile WASM
echo "Compiling WASM module..."
cd wasm/particlefund
GOOS=js GOARCH=wasm go build -o particlefund_step4_standard.wasm main_step4_standard.go
cd ../..

# Copy test files
echo "Copying test files..."
cp -f examples/particlefund/step4_test.html wasm/particlefund/

# Print sizes
echo ""
echo "Generated artifacts:"
ls -lh wasm/particlefund/step4.* wasm/particlefund/particlefund_step4_standard.wasm

echo ""
echo "Step 4 build complete!"
echo "Open http://localhost:8080/step4_test.html to test"
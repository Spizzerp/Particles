#!/bin/bash

echo "Building Step 5: Complete Withdraw Circuit..."

# Clean previous artifacts
rm -f wasm/particlefund/step5.ccs
rm -f wasm/particlefund/step5.srs
rm -f wasm/particlefund/step5.pkey
rm -f wasm/particlefund/step5.vkey
rm -f wasm/particlefund/particlefund_step5_standard.wasm

# Step 1: Run setup to generate proving keys
echo "Running circuit setup..."
cd examples/particlefund/setup
go run step5_setup.go
cd ../../..

# Step 2: Compile WASM
echo "Compiling WASM module..."
cd wasm/particlefund
GOOS=js GOARCH=wasm go build -o particlefund_step5_standard.wasm main_step5_standard.go
cd ../..

# Copy test files
echo "Copying test files..."
cp -f examples/particlefund/step5_test.html wasm/particlefund/

# Print sizes
echo ""
echo "Generated artifacts:"
ls -lh wasm/particlefund/step5.* wasm/particlefund/particlefund_step5_standard.wasm

echo ""
echo "Step 5 build complete!"
echo "This is the production-ready withdrawal circuit."
echo "Open http://localhost:8080/step5_test.html to test"
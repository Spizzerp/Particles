#!/bin/bash

# Build Step 2: Commitment Circuit for Particle Fund

echo "Building Step 2: Commitment Circuit..."

# Create output directory for Step 2
mkdir -p wasm/particlefund

# Build the constraint system and keys
echo "Generating Step 2 constraint system and keys..."
go run examples/particlefund/setup/step2_setup.go

# Build WASM with standard Go compiler
echo "Building Step 2 WASM with standard Go compiler..."
cd wasm/particlefund
GOOS=js GOARCH=wasm go build -o ../../examples/particlefund/particlefund_step2_standard.wasm main_step2_standard.go
cd ../..

# Copy test HTML
echo "Creating browser test file..."
cp examples/particlefund/step1_test_working.html examples/particlefund/step2_test.html

echo "Step 2 build complete!"
echo ""
echo "Artifacts generated:"
echo "  - wasm/particlefund/step2.ccs (constraint system)"
echo "  - wasm/particlefund/step2.srs (structured reference string)"
echo "  - wasm/particlefund/step2.pkey (proving key)"
echo "  - wasm/particlefund/step2.vkey (verification key)"
echo "  - examples/particlefund/particlefund_step2_standard.wasm"
echo ""
echo "To test in browser:"
echo "  1. cd examples/particlefund"
echo "  2. python3 -m http.server 8000"
echo "  3. Open http://localhost:8000/step2_test.html"
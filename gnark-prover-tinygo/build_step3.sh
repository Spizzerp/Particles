#!/bin/bash

# Build Step 3: Basic Merkle Circuit for Particle Fund

echo "Building Step 3: Basic Merkle Circuit..."

# Create output directory for Step 3
mkdir -p wasm/particlefund

# Build the constraint system and keys
echo "Generating Step 3 constraint system and keys..."
go run examples/particlefund/setup/step3_setup.go

# Build WASM with standard Go compiler
echo "Building Step 3 WASM with standard Go compiler..."
cd wasm/particlefund
GOOS=js GOARCH=wasm go build -o ../../examples/particlefund/particlefund_step3_standard.wasm main_step3_standard.go
cd ../..

echo "Step 3 build complete!"
echo ""
echo "Artifacts generated:"
echo "  - wasm/particlefund/step3.ccs (constraint system)"
echo "  - wasm/particlefund/step3.srs (structured reference string)"
echo "  - wasm/particlefund/step3.pkey (proving key)"
echo "  - wasm/particlefund/step3.vkey (verification key)"
echo "  - examples/particlefund/particlefund_step3_standard.wasm"
echo ""
echo "To test in browser:"
echo "  1. cd examples/particlefund"
echo "  2. python3 -m http.server 8000"
echo "  3. Open http://localhost:8000/step3_test.html"
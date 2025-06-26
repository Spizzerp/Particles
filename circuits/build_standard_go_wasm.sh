#!/bin/bash
set -e

echo "Building PLONK WASM with standard Go compiler..."

# Create a clean build directory
mkdir -p wasm/standard_build
cd wasm/standard_build

# Copy the working main_fixed.go
cp ../main_fixed.go main.go

# Copy proving key
cp ../particle_fund.pkey .

# Create a clean go.mod
cat > go.mod << 'EOF'
module particlefund/plonkwasm

go 1.21

require (
    github.com/consensys/gnark v0.13.0
    github.com/consensys/gnark-crypto v0.18.0
)
EOF

# Download dependencies
echo "Downloading dependencies..."
go mod download

# Build WASM
echo "Building WASM (this may take a minute)..."
GOOS=js GOARCH=wasm go build -o particle_fund_real.wasm main.go

# Move to public directory
mv particle_fund_real.wasm ../../../public/wasm/

# Get file size
echo "Build complete!"
ls -lh ../../../public/wasm/particle_fund_real.wasm

echo ""
echo "Note: Standard Go WASM files are larger but have full gnark support."
echo "This WASM can generate real PLONK proofs!"
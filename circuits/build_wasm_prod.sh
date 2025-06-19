#!/bin/bash
# Production build script for Particle Fund PLONK WASM prover

set -e

echo "Building Particle Fund PLONK WASM prover (Production)..."

# Check if TinyGo is installed
if ! command -v tinygo &> /dev/null; then
    echo "TinyGo is required but not installed."
    echo "Install from: https://tinygo.org/getting-started/install/"
    exit 1
fi

# Check if wasm-opt is installed
if ! command -v wasm-opt &> /dev/null; then
    echo "wasm-opt is required but not installed."
    echo "Install with: npm install -g wasm-opt"
    exit 1
fi

# Create output directories
mkdir -p wasm/build
mkdir -p ../public/wasm

# First, ensure we have the proving key
if [ ! -f "build/plonk_pk.bin" ]; then
    echo "Proving key not found. Running setup..."
    go run withdraw_plonk.go setup
fi

# Copy proving key to wasm directory for embedding
cp build/plonk_pk.bin wasm/particle_fund.pkey

# Build WASM with TinyGo
echo "Building WASM with TinyGo..."
echo "This will embed the proving key (2MB) directly in the WASM binary..."

cd wasm
tinygo build -target=wasm -opt=2 -no-debug -scheduler=asyncify -o build/particle_fund_prover.wasm main_fixed.go

# Return to circuits directory
cd ..

# Optimize WASM with wasm-opt
echo "Optimizing WASM..."
wasm-opt -O2 wasm/build/particle_fund_prover.wasm -o wasm/build/particle_fund_prover_opt.wasm --enable-bulk-memory

# Copy files to public directory
echo "Deploying WASM files..."
cp wasm/build/particle_fund_prover_opt.wasm ../public/wasm/particle_fund_prover.wasm
cp "$(tinygo env TINYGOROOT)/targets/wasm_exec.js" ../public/wasm/

# Also copy the verification key for the withdrawal processor
cp build/plonk_vk.bin ../public/wasm/particle_fund.vkey

# Create placeholder files for backwards compatibility
# (The real data is embedded in the WASM)
echo "embedded_in_wasm" > ../public/wasm/particle_fund.pkey
echo "embedded_in_wasm" > ../public/wasm/particle_fund.ccs
echo "embedded_in_wasm" > ../public/wasm/particle_fund.srs

# Get file sizes
echo ""
echo "Production build complete!"
echo ""
echo "Files created:"
ls -lh ../public/wasm/

echo ""
echo "WASM Size: $(ls -lh ../public/wasm/particle_fund_prover.wasm | awk '{print $5}')"
echo ""
echo "The PLONK prover is now ready for production use."
echo "Proving key is embedded in the WASM binary for optimal performance."
echo ""
echo "Note: First proof generation may take 5-10 seconds due to initialization."
echo "Subsequent proofs will be faster (~2-5 seconds)."
#!/bin/bash
set -e

echo "=== Rebuilding Production WASM with New Keys ==="
echo "This will rebuild the WASM with the new proving key that includes amount in commitment"
echo ""

# Change to circuits directory
cd "$(dirname "$0")"

# Verify new keys exist
if [ ! -f "build/plonk_pk.bin" ]; then
    echo "Error: New proving key not found at build/plonk_pk.bin"
    exit 1
fi

echo "✓ Found new proving key (generated $(date -r build/plonk_pk.bin))"
echo ""

# Change to wasm directory
cd wasm

# Build the production WASM
echo "Building production WASM..."
GOOS=js GOARCH=wasm go build -o particlefund_production_new.wasm main_production.go

if [ $? -eq 0 ]; then
    echo "✓ WASM built successfully"
    ls -lh particlefund_production_new.wasm
else
    echo "❌ Build failed"
    exit 1
fi

# Copy to public directory
echo ""
echo "Deploying to public directory..."

# Backup old WASM
if [ -f "../../public/wasm/particlefund_production_real.wasm" ]; then
    cp ../../public/wasm/particlefund_production_real.wasm ../../public/wasm/particlefund_production_real_backup.wasm
    echo "✓ Backed up old WASM"
fi

# Copy new WASM
cp particlefund_production_new.wasm ../../public/wasm/particlefund_production_real.wasm
echo "✓ Deployed new WASM to public/wasm/particlefund_production_real.wasm"

# Also copy the wasm_exec.js if needed
if [ ! -f "../../public/wasm/wasm_exec.js" ]; then
    cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" ../../public/wasm/
    echo "✓ Copied wasm_exec.js"
fi

echo ""
echo "✅ WASM rebuild complete!"
echo ""
echo "The new WASM includes:"
echo "- Proving key with MiMC(secret, nullifier, amount) formula"
echo "- Circuit that matches the new commitment calculation"
echo ""
echo "You can now test withdrawals with your existing deposit!"
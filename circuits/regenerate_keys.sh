#!/bin/bash
# Script to regenerate PLONK proving and verification keys with the updated circuit

set -e

echo "=== Regenerating PLONK Keys with Updated Circuit ==="
echo "This will create new proving and verification keys that include amount in commitment"
echo ""

# Backup old keys
if [ -f "build/plonk_pk.bin" ]; then
    echo "Backing up old keys..."
    mv build/plonk_pk.bin build/plonk_pk_old.bin
    mv build/plonk_vk.bin build/plonk_vk_old.bin
    echo "Old keys backed up with _old suffix"
fi

# Run the setup with the production circuit
echo "Running PLONK setup with production circuit..."
go run setup_production_fixed.go

echo ""
echo "Keys regenerated successfully!"
echo ""
echo "Next steps:"
echo "1. Rebuild the WASM with the new proving key"
echo "2. Deploy the new WASM to public/wasm/"
echo "3. Test with a new deposit"
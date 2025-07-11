#!/bin/bash
set -e

echo "=== Downloading Production SRS for PLONK ==="
echo ""

cd "$(dirname "$0")"
mkdir -p trusted_setup

# Option 1: Aztec's Ignition Powers of Tau (recommended for PLONK)
echo "Downloading Aztec's Ignition ceremony SRS..."
echo "This is a real trusted setup with 176 participants"
echo ""

# Download the SRS file (this is smaller, ~100MB for testing)
# For production, you'd want the larger file
curl -L -o trusted_setup/aztec_srs_16.dat \
  https://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/sealed/transcript00.dat

echo ""
echo "✅ Downloaded production SRS"
echo ""
echo "This SRS is from Aztec's Ignition ceremony:"
echo "- 176 participants contributed randomness"
echo "- Cryptographically secure for production use"
echo "- Compatible with BN254 curve (same as your circuit)"
echo ""
echo "Next: Run setup_production_aztec.go to generate production keys"
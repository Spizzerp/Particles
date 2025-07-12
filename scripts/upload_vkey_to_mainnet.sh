#!/bin/bash

# Upload PLONK verification key to mainnet withdrawal processor

WITHDRAWAL_PROCESSOR_ID="hauct-cqaaa-aaaaj-a2dgq-cai"
VK_FILE="circuits/build/plonk_vk.bin"

echo "Uploading PLONK verification key to mainnet withdrawal processor..."
echo "Canister ID: $WITHDRAWAL_PROCESSOR_ID"

if [ ! -f "$VK_FILE" ]; then
    echo "Error: Verification key file not found at $VK_FILE"
    exit 1
fi

# Show key info
echo "Verification key: $VK_FILE"
echo "Generated: $(date -r "$VK_FILE")"
echo "Size: $(ls -lh "$VK_FILE" | awk '{print $5}')"

# Convert binary to hex for blob format
VK_BLOB=$(cat "$VK_FILE" | xxd -p | tr -d '\n')

# Upload to canister
dfx canister --network ic call "$WITHDRAWAL_PROCESSOR_ID" setPlonkVerificationKey "(blob \"$VK_BLOB\")"

echo "Verification key upload complete!" 
#!/bin/bash
# Upload PLONK verification key to withdrawal processor

echo "Reading verification key..."
VK_HEX=$(xxd -p circuits/build/plonk_vk.bin | tr -d '\n')

echo "Uploading verification key to withdrawal processor..."
dfx canister call withdrawal_processor setPlonkVerificationKey "(blob \"$VK_HEX\")"

echo "Verification key uploaded successfully!"
#!/bin/bash

echo "🔍 Verifying Signing Address"
echo "============================"
echo ""

USER_PRINCIPAL="mbfpc-mr2wm-cgvpo-tc7y5-vyxbb-5rlez-luwyc-4s23b-bzw3b-zmccd-rvy"

echo "1. Debugging address generation to see public key..."
DEBUG_RESULT=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai debugAddressGeneration "(principal \"$USER_PRINCIPAL\")" 2>&1)
echo "Debug result: $DEBUG_RESULT"

# Extract address and public key
if [[ $DEBUG_RESULT == *"address = "* ]]; then
    ADDRESS=$(echo "$DEBUG_RESULT" | grep -o 'address = "[^"]*"' | cut -d'"' -f2)
    PUBKEY=$(echo "$DEBUG_RESULT" | grep -o 'publicKey = "[^"]*"' | cut -d'"' -f2)
    echo ""
    echo "Generated:"
    echo "- Address: $ADDRESS"
    echo "- Public Key: $PUBKEY"
    echo ""
    echo "Expected:"
    echo "- Address: 0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e"
    echo ""
    
    if [[ "$ADDRESS" != "0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e" ]]; then
        echo "❌ Address mismatch! The canister is signing with a different key!"
        echo "   This explains why the transaction fails - the signature doesn't match the from address"
    else
        echo "✅ Address matches"
    fi
fi
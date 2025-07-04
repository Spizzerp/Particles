#!/bin/bash

echo "🔍 Testing ECDSA Public Key Format"
echo "=================================="
echo ""

# Test what format the ECDSA canister returns
echo "Testing public key format from IC's ECDSA..."
echo ""

# Get public key and check its format
RESULT=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai debugAddressGeneration '(principal "rgjif-6iaaa-aaaao-qhvuq-cai")' 2>&1)

echo "Debug output:"
echo "$RESULT"
echo ""

# Extract public key if present
if [[ $RESULT == *"publicKey"* ]]; then
    PUBLIC_KEY=$(echo "$RESULT" | grep -o '"publicKey" = "[^"]*"' | cut -d'"' -f4)
    echo "Public key: $PUBLIC_KEY"
    echo "Length: $((${#PUBLIC_KEY} / 2)) bytes"
    
    # Check first byte
    FIRST_BYTE=${PUBLIC_KEY:0:2}
    echo "First byte: 0x$FIRST_BYTE"
    
    if [ "$FIRST_BYTE" = "04" ]; then
        echo "Format: Uncompressed (65 bytes)"
    elif [ "$FIRST_BYTE" = "02" ] || [ "$FIRST_BYTE" = "03" ]; then
        echo "Format: Compressed (33 bytes)"
    else
        echo "Format: Unknown"
    fi
fi

echo ""
echo "Note: If the IC returns compressed keys (33 bytes), the publicKeyToEthereumAddress"
echo "function needs to decompress them before hashing, which it currently doesn't do."
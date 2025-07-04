#!/bin/bash

echo "🔄 Processing Mainnet Deposits..."
echo "================================"

# Check if we're on mainnet
NETWORK=$(dfx canister --network ic id ethereum_adapter 2>/dev/null)
if [ -z "$NETWORK" ]; then
    echo "❌ Ethereum adapter not found on mainnet"
    echo "Make sure the canister is deployed to mainnet"
    exit 1
fi

echo "✅ Ethereum Adapter: $NETWORK"
echo ""

# Process deposit addresses
echo "📡 Calling processDepositAddresses()..."
RESULT=$(dfx canister --network ic call ethereum_adapter processDepositAddresses 2>&1)

echo "Result: $RESULT"

# Check if successful
if [[ "$RESULT" == *"ok"* ]]; then
    echo ""
    echo "✅ Processing completed!"
    
    # Extract transaction hashes if any
    if [[ "$RESULT" =~ 0x[a-fA-F0-9]{64} ]]; then
        echo ""
        echo "📜 Transaction hashes found:"
        echo "$RESULT" | grep -oE '0x[a-fA-F0-9]{64}' | while read -r hash; do
            echo "- $hash"
            echo "  View: https://etherscan.io/tx/$hash"
        done
    fi
else
    echo ""
    echo "❌ Processing failed or no deposits found"
fi
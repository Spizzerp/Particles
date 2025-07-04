#!/bin/bash

echo "🔍 Checking All Pending Deposits"
echo "================================="
echo ""

# Get the Ethereum adapter canister ID
ETHEREUM_ADAPTER=$(dfx canister --network ic id ethereum_adapter 2>/dev/null)

if [ -z "$ETHEREUM_ADAPTER" ]; then
    echo "❌ Ethereum adapter not found on mainnet"
    echo "Try getting it manually with: dfx canister --network ic id ethereum_adapter"
    exit 1
fi

echo "📍 Ethereum Adapter: $ETHEREUM_ADAPTER"
echo ""

# Get all pending deposits
echo "📊 Fetching all pending deposits..."
PENDING=$(dfx canister --network ic call ethereum_adapter getPendingDeposits 2>&1)
echo "Pending Deposits:"
echo "$PENDING"
echo ""

# Check if our specific address is in there
TARGET_ADDRESS="0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e"
if echo "$PENDING" | grep -qi "$TARGET_ADDRESS"; then
    echo "✅ Found deposit address $TARGET_ADDRESS in pending list!"
else
    echo "❌ Deposit address $TARGET_ADDRESS NOT found in pending list"
fi
#!/bin/bash

echo "🔍 Checking Deposit Address Status"
echo "=================================="
echo ""

DEPOSIT_ADDRESS="0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e"

# Get the Ethereum adapter canister ID
ETHEREUM_ADAPTER=$(dfx canister --network ic id ethereum_adapter 2>/dev/null)

if [ -z "$ETHEREUM_ADAPTER" ]; then
    echo "❌ Ethereum adapter not found on mainnet"
    exit 1
fi

echo "📍 Ethereum Adapter: $ETHEREUM_ADAPTER"
echo "📍 Deposit Address: $DEPOSIT_ADDRESS"
echo ""

# Check deposit info
echo "📊 Checking deposit info..."
DEPOSIT_INFO=$(dfx canister --network ic call ethereum_adapter getDepositInfo "(\"$DEPOSIT_ADDRESS\")" 2>&1)
echo "Deposit Info: $DEPOSIT_INFO"
echo ""

# Try to process this single deposit
echo "🔄 Attempting to process single deposit..."
PROCESS_RESULT=$(dfx canister --network ic call ethereum_adapter processSingleDeposit "(\"$DEPOSIT_ADDRESS\")" 2>&1)
echo "Process Result: $PROCESS_RESULT"
echo ""

# Check if it appears in processDepositAddresses
echo "🔄 Running processDepositAddresses..."
PROCESS_ALL=$(dfx canister --network ic call ethereum_adapter processDepositAddresses 2>&1)
echo "Process All Result: $PROCESS_ALL"
echo ""

# Check recent deposits
echo "📜 Checking recent deposits..."
RECENT_DEPOSITS=$(dfx canister --network ic call ethereum_adapter checkDeposits 2>&1)
echo "Recent Deposits: $RECENT_DEPOSITS"
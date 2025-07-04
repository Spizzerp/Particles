#!/bin/bash

# Test the live Ethereum deposit flow

echo "🧪 Testing Live Ethereum Deposit Flow"
echo "===================================="

ETHEREUM_ADAPTER="icmw4-miaaa-aaaad-qhmmq-cai"

echo ""
echo "1️⃣ Checking pool address..."
POOL_ADDRESS=$(dfx canister call $ETHEREUM_ADAPTER getPoolAddress --ic | grep -o '0x[a-fA-F0-9]\{40\}')
echo "Pool address: $POOL_ADDRESS"

echo ""
echo "2️⃣ Generating test deposit address..."
# Generate test commitment
COMMITMENT="0x$(openssl rand -hex 32)"
AMOUNT="10000000000000000" # 0.01 ETH in wei
USER_PRINCIPAL="aaaaa-aa"

echo "Commitment: $COMMITMENT"
echo "Amount: 0.01 ETH"

# Generate deposit address
RESULT=$(dfx canister call $ETHEREUM_ADAPTER getDepositAddress "( principal \"$USER_PRINCIPAL\", \"$COMMITMENT\", $AMOUNT : nat)" --ic)
echo "Result: $RESULT"

# Extract address from result
if [[ $RESULT == *"ok"* ]]; then
    ADDRESS=$(echo $RESULT | grep -o '0x[a-fA-F0-9]\{40\}')
    echo "✅ Generated deposit address: $ADDRESS"
    
    echo ""
    echo "3️⃣ To complete the test:"
    echo "   a) Send 0.01 ETH to: $ADDRESS"
    echo "   b) Wait for transaction confirmation"
    echo "   c) Run: dfx canister call $ETHEREUM_ADAPTER processDepositAddresses --ic"
    echo ""
    echo "4️⃣ Monitor with:"
    echo "   dfx canister call $ETHEREUM_ADAPTER getDepositInfo '(\"$ADDRESS\")' --ic"
else
    echo "❌ Failed to generate address"
fi
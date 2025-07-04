#!/bin/bash

echo "🔍 Testing Rust Canister Forwarding"
echo "==================================="
echo ""

DEPOSIT_ADDRESS="0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e"
ETH_ADAPTER_ID="55iy2-vaaaa-aaaas-amn7a-cai"

echo "1. Testing with Rust canister (EIP-1559)..."
RESULT=$(dfx canister --network ic call $ETH_ADAPTER_ID testRustForwardingEIP1559 "(\"$DEPOSIT_ADDRESS\")" 2>&1)
echo "Result: $RESULT"

if [[ $RESULT == *"err"* ]]; then
    echo ""
    echo "2. Testing with Rust canister (Legacy)..."
    RESULT_LEGACY=$(dfx canister --network ic call $ETH_ADAPTER_ID testRustForwarding "(\"$DEPOSIT_ADDRESS\")" 2>&1)
    echo "Result: $RESULT_LEGACY"
fi

echo ""
echo "3. Checking eth_transaction_handler canister ID..."
dfx canister --network ic id eth_transaction_handler
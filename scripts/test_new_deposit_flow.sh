#!/bin/bash

echo "🔍 Testing New Deposit Flow with V2"
echo "==================================="
echo ""

# Test principal
TEST_PRINCIPAL="rrkah-fqaaa-aaaaa-aaaaq-cai"
TEST_COMMITMENT="0xtest1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab"
TEST_AMOUNT="1000000000000000" # 0.001 ETH

echo "1. Creating new deposit address using V2..."
RESULT=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai getDepositAddressV2 "(principal \"$TEST_PRINCIPAL\", \"$TEST_COMMITMENT\", $TEST_AMOUNT)")

if [[ $RESULT == *"ok"* ]]; then
    # Extract address
    ADDRESS=$(echo "$RESULT" | grep -o '"[^"]*"' | sed 's/"//g' | grep "^0x")
    echo "   ✅ Generated address: $ADDRESS"
    
    echo ""
    echo "2. Verifying address generation..."
    DEBUG_RESULT=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai debugAddressGeneration "(principal \"$TEST_PRINCIPAL\")")
    echo "   Debug result: $DEBUG_RESULT"
    
    echo ""
    echo "3. Getting deposit info..."
    dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai getDepositInfo "(\"$ADDRESS\")"
    
    echo ""
    echo "Note: To complete the test:"
    echo "- Send ETH to $ADDRESS on mainnet"
    echo "- Run: dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai processSingleDeposit '(\"$ADDRESS\")'"
else
    echo "   ❌ Failed to generate address"
    echo "   Result: $RESULT"
fi
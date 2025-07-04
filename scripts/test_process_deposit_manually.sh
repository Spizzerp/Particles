#!/bin/bash

echo "🔍 Testing Manual Deposit Processing"
echo "===================================="
echo ""

DEPOSIT_ADDRESS="0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e"

echo "1. Checking deposit status..."
dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai getDepositInfo "(\"$DEPOSIT_ADDRESS\")"

echo ""
echo "2. Processing deposit using processSingleDeposit..."
RESULT=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai processSingleDeposit "(\"$DEPOSIT_ADDRESS\")" 2>&1)
echo "Result: $RESULT"

if [[ $RESULT == *"Insufficient funds"* ]]; then
    echo ""
    echo "3. Got 'Insufficient funds' error. Let's check debug logs..."
    echo ""
    echo "4. Trying with EIP-1559 version..."
    RESULT_EIP=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai processSingleDepositEIP1559 "(\"$DEPOSIT_ADDRESS\")" 2>&1)
    echo "Result: $RESULT_EIP"
fi

echo ""
echo "5. Checking canister logs for debug output..."
dfx canister --network ic logs 55iy2-vaaaa-aaaas-amn7a-cai | tail -50
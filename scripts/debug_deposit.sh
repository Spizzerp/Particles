#!/bin/bash

echo "🔍 Debugging Ethereum Deposit"
echo "============================"

CANISTER="icmw4-miaaa-aaaad-qhmmq-cai"

echo ""
echo "1. Checking pending deposits..."
dfx canister call $CANISTER getPendingDeposits --network ic

echo ""
echo "2. Getting pool address..."
POOL=$(dfx canister call $CANISTER getPoolAddress --network ic)
echo "Pool address: $POOL"

echo ""
echo "3. Attempting to process deposits..."
RESULT=$(dfx canister call $CANISTER processDepositAddresses --network ic)
echo "Result: $RESULT"

echo ""
echo "4. Checking pending deposits again..."
dfx canister call $CANISTER getPendingDeposits --network ic

echo ""
echo "📊 Deposit Details:"
echo "Address: 0xcde27445b04064788100a0f48c4d837ecd8c8e79"
echo "Amount: 0.01 ETH"
echo "Commitment: 0x8766fc75fb15e408d6600e8e86973f1daa69bd1d61ee2fa9142c71fc0b7c3a29"
echo ""
echo "💡 If processing returns empty array, possible issues:"
echo "1. Gas estimation failing"
echo "2. Transaction signing issues"
echo "3. Insufficient balance for gas"
echo "4. Contract call encoding issues"
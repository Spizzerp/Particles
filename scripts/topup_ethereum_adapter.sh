#!/bin/bash

echo "💰 Topping Up Ethereum Adapter Canister"
echo "======================================="
echo ""

CANISTER_ID="55iy2-vaaaa-aaaas-amn7a-cai"
CYCLES_TO_ADD="10000000000000"  # 10T cycles

echo "📍 Canister ID: $CANISTER_ID"
echo "💎 Cycles to add: 10T cycles (~$13 USD)"
echo ""

# Check current balance first
echo "📊 Current balance:"
dfx canister --network ic status $CANISTER_ID | grep Balance
echo ""

# Top up the canister
echo "🔄 Topping up canister..."
dfx canister --network ic deposit-cycles $CYCLES_TO_ADD $CANISTER_ID

# Check new balance
echo ""
echo "📊 New balance:"
dfx canister --network ic status $CANISTER_ID | grep Balance
echo ""

echo "✅ Top-up complete!"
echo ""
echo "🚀 Now you can try processing your deposit again:"
echo "dfx canister --network ic call $CANISTER_ID processSingleDeposit '(\"0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e\")'"
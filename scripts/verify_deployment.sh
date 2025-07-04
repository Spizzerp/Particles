#!/bin/bash

echo "🔍 Verifying Particle Fund Deployment"
echo "===================================="

ETHEREUM_ADAPTER="icmw4-miaaa-aaaad-qhmmq-cai"
FRONTEND="ilp5a-2aaaa-aaaad-qhmna-cai"

echo ""
echo "1️⃣ Checking EthereumAdapter..."
echo "Getting pool address..."
POOL=$(dfx canister call $ETHEREUM_ADAPTER getPoolAddress --ic 2>&1)
if [[ $POOL == *"0x"* ]]; then
    echo "✅ EthereumAdapter responding: $POOL"
else
    echo "❌ EthereumAdapter not responding properly"
fi

echo ""
echo "2️⃣ Testing deposit address generation..."
TEST_COMMITMENT="0x$(openssl rand -hex 32)"
RESULT=$(dfx canister call $ETHEREUM_ADAPTER getDepositAddress "(principal \"aaaaa-aa\", \"$TEST_COMMITMENT\", 10000000000000000)" --ic 2>&1)
if [[ $RESULT == *"ok"* ]]; then
    echo "✅ Deposit address generation working"
    ADDRESS=$(echo $RESULT | grep -o '0x[a-fA-F0-9]\{40\}')
    echo "   Generated address: $ADDRESS"
else
    echo "❌ Deposit address generation failed: $RESULT"
fi

echo ""
echo "3️⃣ Frontend Status..."
echo "URL: https://$FRONTEND.icp0.io/"
echo "Alternative URL: https://$FRONTEND.raw.icp0.io/"
echo ""
echo "Try accessing the frontend at one of these URLs."
echo "If it shows 'Service Unavailable', the deployment is still in progress."

echo ""
echo "4️⃣ Quick Checks Complete!"
echo ""
echo "📝 To test the full deposit flow:"
echo "1. Visit the frontend URL"
echo "2. Go to Deposit page"
echo "3. Select Ethereum → ETH → 0.01"
echo "4. Send test ETH to the generated address"
echo "5. Click 'I've Made the Deposit'"
echo ""
echo "Monitor with:"
echo "dfx canister call $ETHEREUM_ADAPTER processDepositAddresses --ic"
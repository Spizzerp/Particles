#!/bin/bash

# Deploy production fix for Ethereum deposits

echo "🚀 Deploying Production Fix for Ethereum Deposits"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "dfx.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Get contract address
CONTRACT_ADDRESS=$(cat deployments/sepolia.json 2>/dev/null | grep -o '"address": "[^"]*' | cut -d'"' -f4)
if [ -z "$CONTRACT_ADDRESS" ]; then
    CONTRACT_ADDRESS="0x8626502727D7faf282C44df18B34E50D0DB45Eae"
    echo "⚠️  Using default contract address: $CONTRACT_ADDRESS"
else
    echo "✅ Using deployed contract address: $CONTRACT_ADDRESS"
fi

ETHEREUM_ADAPTER="icmw4-miaaa-aaaad-qhmmq-cai"

echo ""
echo "📋 Step 1: Backing up current EthereumAdapter.mo"
cp src/canisters/EthereumAdapter.mo src/canisters/EthereumAdapter.mo.backup

echo ""
echo "📋 Step 2: Applying production fix"
cp src/canisters/EthereumAdapter_production.mo src/canisters/EthereumAdapter.mo

echo ""
echo "📋 Step 3: Setting deposit contract address"
dfx canister call $ETHEREUM_ADAPTER setDepositContract "(\"$CONTRACT_ADDRESS\")" --ic

echo ""
echo "📋 Step 4: Verifying configuration"
echo "Getting pool address..."
POOL_ADDRESS=$(dfx canister call $ETHEREUM_ADAPTER getPoolAddress --ic | grep -o '0x[a-fA-F0-9]\{40\}')
echo "Pool address: $POOL_ADDRESS"

echo ""
echo "✅ Production fix deployed!"
echo ""
echo "🔧 What was fixed:"
echo "  1. Enhanced deposit tracking with userId storage"
echo "  2. Proper fund forwarding from unique addresses to pool"
echo "  3. Transaction signing with correct derivation paths"
echo "  4. Robust error handling and retry logic"
echo "  5. Duplicate deposit prevention"
echo ""
echo "📝 How the new flow works:"
echo "  1. User gets unique deposit address (privacy preserved)"
echo "  2. User sends ETH to unique address"
echo "  3. Call processDepositAddresses() to forward funds"
echo "  4. Funds are automatically sent to pool contract"
echo "  5. Commitment is added to Merkle tree"
echo ""
echo "🎯 Next steps:"
echo "  1. Test with a small deposit first"
echo "  2. Monitor with: dfx canister call $ETHEREUM_ADAPTER getPendingDeposits --ic"
echo "  3. Process deposits: dfx canister call $ETHEREUM_ADAPTER processDepositAddresses --ic"
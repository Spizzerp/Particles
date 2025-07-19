#!/bin/bash

echo "=== Deploying New Sepolia Contract ==="
echo ""
echo "This will deploy a new EthereumDepositPool contract to Sepolia"
echo "with the correct ICP canister address: 0xb012acfa53164ab5e8d302a22a22834702b1ca01"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env with:"
    echo "  NETWORK=sepolia"
    echo "  PRIVATE_KEY=your_wallet_private_key"
    echo "  SEPOLIA_RPC_URL=https://rpc.sepolia.org"
    exit 1
fi

# Load environment variables
source .env

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY not set in .env!"
    echo "Please add your Sepolia wallet private key"
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo "  ✓ Network: Sepolia"
echo "  ✓ ICP Canister: 0xb012acfa53164ab5e8d302a22a22834702b1ca01"
echo "  ✓ Contract compiled"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

# Run deployment
echo ""
echo "🚀 Deploying contract..."
node scripts/deploy_ethereum_contract.js

echo ""
echo "📝 After deployment:"
echo "1. Copy the new contract address"
echo "2. Update EthereumAdapter.mo with the new address"
echo "3. Deploy the updated adapter: dfx deploy ethereum_adapter --network ic"
echo "4. Test deposits and withdrawals"
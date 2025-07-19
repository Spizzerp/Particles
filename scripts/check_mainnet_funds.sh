#!/bin/bash

echo "=== Particle Fund Mainnet Status Check ==="
echo ""

# Contract addresses
MAINNET_POOL="0x9b0721C174b103facEC1EeE435679Ae9C493163C"
ICP_CANISTER_EXPECTED="0xb012acfa53164ab5e8d302a22a22834702b1ca01"

echo "📍 Mainnet Pool Contract: $MAINNET_POOL"
echo "📍 Expected ICP Canister Address: $ICP_CANISTER_EXPECTED"
echo ""

echo "🔍 Check these on Etherscan:"
echo "   Pool Contract: https://etherscan.io/address/$MAINNET_POOL"
echo ""

echo "🔧 To verify ICP canister address:"
echo "   dfx canister --network ic call ethereum_adapter getICPCanisterEthAddress"
echo ""

echo "⚠️  IMPORTANT: The system is now configured for Sepolia testnet"
echo "   - No new mainnet deposits will be accepted"
echo "   - Test withdrawals on Sepolia before attempting mainnet recovery"
echo ""

echo "📋 Recovery Steps:"
echo "1. Deploy pool contract to Sepolia testnet"
echo "2. Test full deposit/withdrawal flow on testnet"
echo "3. Implement proper admin controls"
echo "4. Plan mainnet fund recovery strategy"
echo ""

echo "🛠️  Quick Commands:"
echo ""
echo "# Check network config"
echo "dfx canister --network ic call ethereum_adapter getNetworkConfig"
echo ""
echo "# Check if any deposits are stuck in temporary addresses"
echo "dfx canister --network ic call ethereum_adapter getAllDeposits"
echo ""
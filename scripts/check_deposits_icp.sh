#!/bin/bash

echo "🔍 Checking for Ethereum deposits on ICP..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Check if local replica is running
if ! dfx ping > /dev/null 2>&1; then
    echo -e "${YELLOW}Starting local replica...${NC}"
    dfx start --background
    sleep 5
fi

echo -e "\n${GREEN}1. Checking current deposit contract address:${NC}"
dfx canister call ethereum_adapter getDepositContract 2>/dev/null || echo "Contract not set"

echo -e "\n${GREEN}2. Checking for deposits:${NC}"
RESULT=$(dfx canister call ethereum_adapter checkDeposits 2>&1)

if [[ $RESULT == *"err"* ]]; then
    echo -e "${YELLOW}Note: Deposit checking will fail locally because:${NC}"
    echo "- EVM RPC canister (7hfb6-caaaa-aaaar-qadga-cai) doesn't exist locally"
    echo "- This would work on testnet with proper RPC canister"
    echo ""
    echo "For local testing, we need to:"
    echo "1. Deploy a mock EVM RPC canister, or"
    echo "2. Deploy to ICP testnet"
else
    echo "$RESULT"
fi

echo -e "\n${GREEN}3. Getting pool address:${NC}"
dfx canister call ethereum_adapter getPoolAddress

echo -e "\n${YELLOW}💡 To make deposits detectable:${NC}"
echo "1. Deploy to ICP testnet with EVM RPC canister"
echo "2. Or create a local mock of EVM RPC canister"
echo "3. Or modify EthereumAdapter to use direct HTTP outcalls"
#!/bin/bash

echo "🎮 Deploying to ICP Playground..."
echo "⚠️  Note: Playground canisters only live for 20 minutes!"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# First, update the key back to local for now
echo -e "${YELLOW}Updating ECDSA key for playground...${NC}"
sed -i '' 's/test_key_1/dfx_test_key/g' src/canisters/EthereumAdapter.mo

# Deploy to playground
echo -e "\n${GREEN}Deploying Ethereum Adapter to playground...${NC}"
dfx deploy ethereum_adapter --playground || {
    echo -e "${RED}Deployment failed.${NC}"
    exit 1
}

# Get the canister ID
CANISTER_ID=$(dfx canister id ethereum_adapter --playground)
echo -e "\n${GREEN}✅ Deployed to playground!${NC}"
echo "Canister ID: $CANISTER_ID"

# Set the deposit contract address
echo -e "\n${GREEN}Setting deposit contract address...${NC}"
dfx canister call ethereum_adapter setDepositContract '("0x9b0721C174b103facEC1EeE435679Ae9C493163C")' --playground

# Get pool address
echo -e "\n${GREEN}Getting pool address...${NC}"
POOL_ADDRESS=$(dfx canister call ethereum_adapter getPoolAddress --playground)
echo "Pool address: $POOL_ADDRESS"

echo -e "\n${YELLOW}⏰ Remember: This canister will be deleted in 20 minutes!${NC}"
echo -e "\nQuick tests to run:"
echo "1. Check deposits:"
echo "   dfx canister call ethereum_adapter checkDeposits --playground"
echo "2. Generate deposit address:"
echo "   dfx canister call ethereum_adapter getDepositAddress '(principal \"aaaaa-aa\")' --playground"

echo -e "\n${GREEN}Playground URL:${NC}"
echo "https://m7sm4-2iaaa-aaaah-qc6jq-cai.raw.ic0.app/?tag=$CANISTER_ID"
#!/bin/bash

echo "🚀 Deploying to ICP Testnet..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check current identity
CURRENT_IDENTITY=$(dfx identity whoami)
echo -e "${YELLOW}Current identity: $CURRENT_IDENTITY${NC}"

# Get cycles balance
echo -e "\n${GREEN}Checking cycles balance...${NC}"
dfx wallet --network testnet balance 2>/dev/null || {
    echo -e "${RED}No wallet found. Creating one...${NC}"
    dfx identity get-wallet --network testnet || {
        echo -e "${RED}Failed to get wallet. You may need to:${NC}"
        echo "1. Get cycles from: https://faucet.dfinity.org"
        echo "2. Or convert ICP to cycles"
        exit 1
    }
}

# Deploy the Ethereum adapter
echo -e "\n${GREEN}Deploying Ethereum Adapter to testnet...${NC}"
dfx deploy ethereum_adapter --network testnet --with-cycles 1000000000000 || {
    echo -e "${RED}Deployment failed. Check your cycles balance.${NC}"
    exit 1
}

# Get the canister ID
CANISTER_ID=$(dfx canister id ethereum_adapter --network testnet)
echo -e "\n${GREEN}✅ Deployed successfully!${NC}"
echo "Canister ID: $CANISTER_ID"

# Set the deposit contract address
echo -e "\n${GREEN}Setting deposit contract address...${NC}"
dfx canister call ethereum_adapter setDepositContract '("0x9b0721C174b103facEC1EeE435679Ae9C493163C")' --network testnet

# Get pool address
echo -e "\n${GREEN}Getting pool address...${NC}"
POOL_ADDRESS=$(dfx canister call ethereum_adapter getPoolAddress --network testnet)
echo "Pool address: $POOL_ADDRESS"

# Save deployment info
echo -e "\n${GREEN}Saving deployment info...${NC}"
cat > deployments/testnet-icp.json << EOF
{
  "network": "testnet",
  "ethereumAdapter": "$CANISTER_ID",
  "poolAddress": "$POOL_ADDRESS",
  "depositContract": "0x9b0721C174b103facEC1EeE435679Ae9C493163C",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo -e "\n${GREEN}🎉 Testnet deployment complete!${NC}"
echo -e "\nNext steps:"
echo "1. Test deposit detection:"
echo "   dfx canister call ethereum_adapter checkDeposits --network testnet"
echo "2. Monitor canister logs:"
echo "   dfx canister logs ethereum_adapter --network testnet"
echo "3. View on dashboard:"
echo "   https://dashboard.internetcomputer.org/canister/$CANISTER_ID"
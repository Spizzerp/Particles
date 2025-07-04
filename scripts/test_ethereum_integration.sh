#!/bin/bash

echo "🧪 Testing Ethereum Integration..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if local replica is running
if ! dfx ping > /dev/null 2>&1; then
    echo "Starting local ICP replica..."
    dfx start --background --clean
    sleep 5
fi

# Deploy canisters
echo -e "\n${YELLOW}Deploying canisters...${NC}"
dfx deploy ethereum_adapter

# Get canister ID
CANISTER_ID=$(dfx canister id ethereum_adapter)
echo "Ethereum Adapter Canister ID: $CANISTER_ID"

# Test 1: Generate deposit address for multiple users
echo -e "\n${GREEN}Test 1: Generate deposit addresses${NC}"
echo "Generating address for user 1..."
USER1_ADDR=$(dfx canister call ethereum_adapter getDepositAddress '(principal "aaaaa-aa")')
echo "User 1 address: $USER1_ADDR"

echo "Generating address for user 2..."
USER2_ADDR=$(dfx canister call ethereum_adapter getDepositAddress '(principal "2vxsx-fae")')
echo "User 2 address: $USER2_ADDR"

# Test 2: Get pool's Ethereum address
echo -e "\n${GREEN}Test 2: Get pool's Ethereum address${NC}"
POOL_ADDR=$(dfx canister call ethereum_adapter getPoolAddress)
echo "Pool address: $POOL_ADDR"

# Test 3: Set deposit contract (using a test address)
echo -e "\n${GREEN}Test 3: Set deposit contract address${NC}"
TEST_CONTRACT="0x742d35Cc6634C0532925a3b844Bc9e7595f7aBcd"
dfx canister call ethereum_adapter setDepositContract "(\"$TEST_CONTRACT\")"

# Test 4: Check deposits (should return empty initially)
echo -e "\n${GREEN}Test 4: Check for deposits${NC}"
dfx canister call ethereum_adapter checkDeposits

# Test 5: Simulate withdrawal (will fail without real setup)
echo -e "\n${GREEN}Test 5: Test withdrawal processing${NC}"
echo "Attempting withdrawal (expected to fail in local testing)..."
dfx canister call ethereum_adapter processWithdrawal '("0x742d35Cc6634C0532925a3b844Bc9e7595f7aBcd", 1000000000000000000, "0x1234567890abcdef")' || echo -e "${YELLOW}Expected failure - needs real Ethereum connection${NC}"

echo -e "\n${GREEN}✅ Basic tests completed!${NC}"

# Check if contract is deployed
if [ -f "deployments/sepolia.json" ]; then
    echo -e "\n${GREEN}Sepolia deployment found!${NC}"
    CONTRACT_ADDR=$(cat deployments/sepolia.json | grep -o '"address": "[^"]*' | cut -d'"' -f4)
    echo "Contract deployed at: $CONTRACT_ADDR"
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Update adapter with deployed contract:"
    echo "   dfx canister call ethereum_adapter setDepositContract '(\"$CONTRACT_ADDR\")'"
    echo "2. Send test deposit to contract"
    echo "3. Run: dfx canister call ethereum_adapter checkDeposits"
else
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Set up .env file with your private key and RPC URL"
    echo "2. Deploy contract: node scripts/deploy_ethereum_contract.js"
    echo "3. Update contract address in adapter"
    echo "4. Send test deposits and verify detection"
fi

echo -e "\n${YELLOW}Testing tips:${NC}"
echo "- Use Sepolia faucet for test ETH: https://sepoliafaucet.com/"
echo "- Monitor transactions: https://sepolia.etherscan.io/"
echo "- Check canister logs: dfx canister logs ethereum_adapter"
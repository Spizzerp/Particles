#!/bin/bash

echo "🔧 Setting up and testing EVM RPC with Alchemy..."

# Mainnet canister ID
CANISTER_ID="icmw4-miaaa-aaaad-qhmmq-cai"
NETWORK="ic"
API_KEY="zToG4FRFPBAVjiiQVc7uS"

# Set API key
echo -e "\n1️⃣ Setting Alchemy API key..."
dfx canister call $CANISTER_ID setAlchemyApiKey "(\"$API_KEY\")" --network $NETWORK

# Set deposit contract address
echo -e "\n2️⃣ Setting deposit contract address..."
dfx canister call $CANISTER_ID setDepositContract '("0x9b0721C174b103facEC1EeE435679Ae9C493163C")' --network $NETWORK

# Get pool address
echo -e "\n3️⃣ Getting pool address..."
dfx canister call $CANISTER_ID getPoolAddress --network $NETWORK

# Check deposits
echo -e "\n4️⃣ Checking for deposits..."
dfx canister call $CANISTER_ID checkDeposits --network $NETWORK

echo -e "\n✅ Setup and test complete"
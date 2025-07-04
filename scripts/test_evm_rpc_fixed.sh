#!/bin/bash

echo "🧪 Testing Fixed EVM RPC Implementation..."

# Local canister ID
CANISTER_ID="aovwi-4maaa-aaaaa-qaagq-cai"

# Set deposit contract address
echo -e "\n1️⃣ Setting deposit contract address..."
dfx canister call $CANISTER_ID setDepositContract '("0x9b0721C174b103facEC1EeE435679Ae9C493163C")'

# Get pool address
echo -e "\n2️⃣ Getting pool address..."
dfx canister call $CANISTER_ID getPoolAddress

# Check deposits
echo -e "\n3️⃣ Checking for deposits..."
dfx canister call $CANISTER_ID checkDeposits

echo -e "\n✅ Test complete"
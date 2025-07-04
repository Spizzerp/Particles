#!/bin/bash

echo "🌐 Testing HTTP Outcalls Implementation..."

# Set the canister ID (update if needed)
CANISTER_ID="icmw4-miaaa-aaaad-qhmmq-cai"
NETWORK="ic"

echo "📍 Testing with mainnet canister: $CANISTER_ID"

# Get pool address
echo -e "\n1️⃣ Getting pool address..."
dfx canister call $CANISTER_ID getPoolAddress --network $NETWORK

# Check deposits
echo -e "\n2️⃣ Checking for deposits..."
dfx canister call $CANISTER_ID checkDeposits --network $NETWORK

# Test withdrawal (with test data)
echo -e "\n3️⃣ Testing withdrawal processing..."
RECIPIENT="0x742d35Cc6634C0532925a3b844Bc9e7595f7F1eD"  # Test address
AMOUNT="100000000000000000"  # 0.1 ETH in wei
NULLIFIER="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

echo "Testing withdrawal to: $RECIPIENT"
echo "Amount: $AMOUNT wei (0.1 ETH)"

dfx canister call $CANISTER_ID processWithdrawal \
  "(\"$RECIPIENT\", $AMOUNT, \"$NULLIFIER\")" \
  --network $NETWORK

echo -e "\n✅ HTTP outcalls test complete"
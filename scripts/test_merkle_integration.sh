#!/bin/bash

echo "🌳 Testing Merkle Tree Integration"
echo "================================="

# Canister IDs
ETHEREUM_ADAPTER="icmw4-miaaa-aaaad-qhmmq-cai"
CRYPTO_COMPONENTS="bd3sg-teaaa-aaaaa-qaaba-cai"
NETWORK="ic"

# 1. Check current Merkle root
echo -e "\n1️⃣ Checking current Merkle root..."
dfx canister call $CRYPTO_COMPONENTS getCurrentMerkleRoot --network $NETWORK

# 2. Get leaf count
echo -e "\n2️⃣ Getting leaf count..."
dfx canister call $CRYPTO_COMPONENTS getLeafCount --network $NETWORK

# 3. Check deposits (this should now add to Merkle tree)
echo -e "\n3️⃣ Checking for deposits..."
dfx canister call $ETHEREUM_ADAPTER checkDeposits --network $NETWORK

# 4. Check Merkle root again
echo -e "\n4️⃣ Checking Merkle root after deposit check..."
dfx canister call $CRYPTO_COMPONENTS getCurrentMerkleRoot --network $NETWORK

# 5. Get leaf count again
echo -e "\n5️⃣ Getting leaf count after deposit check..."
dfx canister call $CRYPTO_COMPONENTS getLeafCount --network $NETWORK

# 6. Get Merkle root from Ethereum adapter
echo -e "\n6️⃣ Getting Merkle root via Ethereum adapter..."
dfx canister call $ETHEREUM_ADAPTER getCurrentMerkleRoot --network $NETWORK

echo -e "\n✅ Integration test complete!"
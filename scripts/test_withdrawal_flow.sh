#!/bin/bash

echo "🔄 Testing Complete Withdrawal Flow"
echo "=================================="

# Canister IDs
WITHDRAWAL_PROCESSOR="b77ix-eeaaa-aaaaa-qaada-cai" # local
CRYPTO_COMPONENTS="bd3sg-teaaa-aaaaa-qaaba-cai"   # local
ETHEREUM_ADAPTER="icmw4-miaaa-aaaad-qhmmq-cai"    # mainnet
NETWORK="local"

# Test data
NULLIFIER="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
RECIPIENT="0x742d35Cc6634C0532925a3b844Bc9e7595f7F1eD"
AMOUNT="10000000000000000" # 0.01 ETH in wei
TOKEN_ID="1"
CHAIN_ID="11155111" # Sepolia

echo -e "\n1️⃣ Getting current Merkle root..."
MERKLE_ROOT=$(dfx canister call $CRYPTO_COMPONENTS getCurrentMerkleRoot --network $NETWORK | tr -d '(opt "' | tr -d '")')
echo "Current Merkle root: $MERKLE_ROOT"

echo -e "\n2️⃣ Creating test PLONK proof..."
# This is a placeholder - in reality, you'd generate this client-side
PLONK_PROOF='record {
    lro = vec {
        record { "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"; "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321" };
        record { "0x1111111111111111111111111111111111111111111111111111111111111111"; "0x2222222222222222222222222222222222222222222222222222222222222222" };
        record { "0x3333333333333333333333333333333333333333333333333333333333333333"; "0x4444444444444444444444444444444444444444444444444444444444444444" }
    };
    z = record { "0x5555555555555555555555555555555555555555555555555555555555555555"; "0x6666666666666666666666666666666666666666666666666666666666666666" };
    h1 = record { "0x7777777777777777777777777777777777777777777777777777777777777777"; "0x8888888888888888888888888888888888888888888888888888888888888888" };
    h2 = record { "0x9999999999999999999999999999999999999999999999999999999999999999"; "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" };
    wire_values_at_z = vec { "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"; "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" };
    wire_values_at_z_omega = vec { "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" }
}'

echo -e "\n3️⃣ Initiating withdrawal..."
echo "Parameters:"
echo "- Nullifier: $NULLIFIER"
echo "- Recipient: $RECIPIENT"
echo "- Amount: $AMOUNT wei"
echo "- Merkle Root: $MERKLE_ROOT"

# Note: This will fail without a valid proof, but demonstrates the flow
dfx canister call $WITHDRAWAL_PROCESSOR initiateWithdrawal \
  "(\"$NULLIFIER\", \"$RECIPIENT\", $AMOUNT : nat, $TOKEN_ID : nat, $CHAIN_ID : nat, \"$MERKLE_ROOT\", $PLONK_PROOF)" \
  --network $NETWORK || echo "Expected failure - need valid PLONK proof"

echo -e "\n4️⃣ To complete the flow with a real proof:"
echo "1. Make a deposit to Ethereum contract"
echo "2. Run checkDeposits to add commitment to Merkle tree"
echo "3. Generate PLONK proof client-side with witness data"
echo "4. Submit proof to initiateWithdrawal"
echo "5. Withdrawal will be executed automatically on Ethereum"

echo -e "\n✅ Integration flow demonstrated!"
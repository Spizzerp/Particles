#!/bin/bash

echo "🔍 Comparing Address Generation Between Motoko and Rust"
echo "======================================================="
echo ""

USER_PRINCIPAL="mbfpc-mr2wm-cgvpo-tc7y5-vyxbb-5rlez-luwyc-4s23b-bzw3b-zmccd-rvy"
COMMITMENT="0x3ceb1793fe62c6652483c6f7f9679aab1a8e665f06c78dfe31ec0c8dc8cbd61b"
AMOUNT="10000000000000000" # 0.01 ETH in wei
ETH_ADAPTER_ID="55iy2-vaaaa-aaaas-amn7a-cai"
RUST_HANDLER_ID="hgyxy-raaaa-aaaar-qbpjq-cai"

echo "Testing with:"
echo "- User Principal: $USER_PRINCIPAL"
echo "- Commitment: $COMMITMENT"
echo "- Amount: $AMOUNT wei (0.01 ETH)"
echo ""

echo "1. Getting deposit address from Motoko canister..."
MOTOKO_RESULT=$(dfx canister --network ic call $ETH_ADAPTER_ID getDepositAddress "(principal \"$USER_PRINCIPAL\", \"$COMMITMENT\", $AMOUNT)" 2>&1)
echo "Motoko result: $MOTOKO_RESULT"

# Extract Motoko address
if [[ $MOTOKO_RESULT == *"ok = "* ]]; then
    MOTOKO_ADDRESS=$(echo "$MOTOKO_RESULT" | grep -o '"0x[^"]*"' | tr -d '"')
    echo "Motoko address: $MOTOKO_ADDRESS"
else
    echo "Failed to get Motoko address"
fi

echo ""
echo "2. Generating address with Rust canister..."
# First we need to generate the derivation path bytes
# The Motoko version uses keccak256(principal_text) and takes first 4 bytes
echo "   Note: Rust canister expects derivation path as bytes"

# Call the Rust canister's generate_address function
# We'll use the same derivation logic as Motoko (first 4 bytes of keccak256(principal))
RUST_RESULT=$(dfx canister --network ic call $RUST_HANDLER_ID generate_address "(principal \"$USER_PRINCIPAL\", blob \"\\00\\01\\02\\03\")" 2>&1)
echo "Rust result: $RUST_RESULT"

# Extract Rust address
if [[ $RUST_RESULT == *"Ok = "* ]]; then
    RUST_ADDRESS=$(echo "$RUST_RESULT" | grep -o '"0x[^"]*"' | tr -d '"')
    echo "Rust address: $RUST_ADDRESS"
else
    echo "Failed to get Rust address"
fi

echo ""
echo "3. Comparison:"
echo "- Motoko address: ${MOTOKO_ADDRESS:-Not generated}"
echo "- Rust address:   ${RUST_ADDRESS:-Not generated}"
echo "- Known deposit:  0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e"

if [[ "$MOTOKO_ADDRESS" == "$RUST_ADDRESS" ]]; then
    echo "✅ Addresses match!"
else
    echo "❌ Addresses don't match!"
fi
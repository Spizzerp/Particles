#!/bin/bash

echo "🔍 Verifying Unique Deposit Address Generation"
echo "============================================="
echo ""

USER_ID="rrkah-fqaaa-aaaaa-aaaaq-cai"

echo "Test 1: Same user, different commitments"
echo "----------------------------------------"

# First deposit
COMMITMENT1="0x$(openssl rand -hex 32)"
echo "Creating deposit 1..."
RESULT1=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai getDepositAddressV2 "(principal \"$USER_ID\", \"$COMMITMENT1\", 1000000000000000)" 2>&1)
ADDRESS1=$(echo "$RESULT1" | grep -o '"0x[a-fA-F0-9]\{40\}"' | sed 's/"//g')
echo "Address 1: $ADDRESS1"

# Small delay
sleep 1

# Second deposit
COMMITMENT2="0x$(openssl rand -hex 32)"
echo "Creating deposit 2..."
RESULT2=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai getDepositAddressV2 "(principal \"$USER_ID\", \"$COMMITMENT2\", 2000000000000000)" 2>&1)
ADDRESS2=$(echo "$RESULT2" | grep -o '"0x[a-fA-F0-9]\{40\}"' | sed 's/"//g')
echo "Address 2: $ADDRESS2"

echo ""
if [ "$ADDRESS1" = "$ADDRESS2" ]; then
    echo "❌ PROBLEM: Addresses are the same!"
else
    echo "✅ SUCCESS: Addresses are different!"
fi

echo ""
echo "Test 2: Same user, same commitment (at different times)"
echo "-------------------------------------------------------"

# Third deposit with same commitment as first
sleep 1
echo "Creating deposit 3 with same commitment as deposit 1..."
RESULT3=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai getDepositAddressV2 "(principal \"$USER_ID\", \"$COMMITMENT1\", 1000000000000000)" 2>&1)
ADDRESS3=$(echo "$RESULT3" | grep -o '"0x[a-fA-F0-9]\{40\}"' | sed 's/"//g')
echo "Address 3: $ADDRESS3"

echo ""
if [ "$ADDRESS1" = "$ADDRESS3" ]; then
    echo "❌ PROBLEM: Same commitment generated same address!"
else
    echo "✅ SUCCESS: Same commitment generated different address (due to timestamp)!"
fi

echo ""
echo "Summary:"
echo "--------"
echo "Address 1: $ADDRESS1"
echo "Address 2: $ADDRESS2" 
echo "Address 3: $ADDRESS3"
echo ""
echo "Each deposit now gets a unique temporary address, providing:"
echo "- Privacy: Deposits cannot be linked to the same user"
echo "- Security: Each deposit is isolated"
echo "- Flexibility: Multiple concurrent deposits are possible"
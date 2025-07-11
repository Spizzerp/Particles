#!/bin/bash

echo "🚀 Starting Deposit Migration with DFX Identity"
echo "=============================================="
echo ""

# Get total deposits
echo "📊 Getting total deposit count..."
TOTAL=$(dfx canister --network ic call deposit_manager getTotalDeposits | grep -o '[0-9]\+')
echo "Total deposits: $TOTAL"
echo ""

# Get old merkle root
echo "📍 Getting current merkle root..."
OLD_ROOT=$(dfx canister --network ic call deposit_manager getCurrentMerkleRoot | grep -o '0x[0-9a-fA-F]\+' || echo "None")
echo "Old root: $OLD_ROOT"
echo ""

# Migrate each deposit
echo "🔄 Starting migration..."
echo ""

SUCCESS=0
FAILED=0

for i in $(seq 0 $((TOTAL - 1))); do
    echo -n "Migrating deposit $i... "
    
    # Get deposit data
    DEPOSIT_DATA=$(dfx canister --network ic call deposit_manager getDeposit "($i)")
    
    # Extract fields using grep and sed
    USER=$(echo "$DEPOSIT_DATA" | grep -o 'principal "[^"]*"' | sed 's/principal "\([^"]*\)"/\1/')
    AMOUNT=$(echo "$DEPOSIT_DATA" | grep -o 'amount = [0-9]\+ :' | grep -o '[0-9]\+')
    TOKEN_ID=$(echo "$DEPOSIT_DATA" | grep -o 'tokenId = "[^"]*"' | sed 's/tokenId = "\([^"]*\)"/\1/')
    CHAIN_ID=$(echo "$DEPOSIT_DATA" | grep -o 'chainId = [0-9]\+ :' | grep -o '[0-9]\+')
    COMMITMENT=$(echo "$DEPOSIT_DATA" | grep -o 'commitment = "[^"]*"' | sed 's/commitment = "\([^"]*\)"/\1/')
    TIMESTAMP=$(echo "$DEPOSIT_DATA" | grep -o 'timestamp = -\?[0-9]\+ :' | grep -o '[-0-9]\+')
    
    # Call migrate function
    RESULT=$(dfx canister --network ic call deposit_manager_v2 migrateDeposit \
        "($i, principal \"$USER\", $AMOUNT, \"$TOKEN_ID\", $CHAIN_ID, \"$COMMITMENT\", $TIMESTAMP)" 2>&1)
    
    if echo "$RESULT" | grep -q "ok ="; then
        echo "✅ Success"
        ((SUCCESS++))
    else
        echo "❌ Failed: $RESULT"
        ((FAILED++))
    fi
    
    # Small delay
    sleep 0.1
done

echo ""
echo "📈 Migration Summary:"
echo "✅ Successful: $SUCCESS"
echo "❌ Failed: $FAILED"
echo ""

# Verify new merkle root
echo "🔍 Verifying Merkle root..."
NEW_ROOT=$(dfx canister --network ic call deposit_manager_v2 getCurrentMerkleRoot | grep -o '0x[0-9a-fA-F]\+')
echo "Old root: $OLD_ROOT"
echo "New root: $NEW_ROOT"

if [ "$OLD_ROOT" = "$NEW_ROOT" ]; then
    echo "✅ Merkle roots MATCH! Migration successful."
else
    echo "⚠️  Merkle roots DO NOT MATCH!"
    echo "This might be expected if the old tree had issues."
fi
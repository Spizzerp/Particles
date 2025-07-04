#!/bin/bash

echo "🔄 Checking Cycles for All Deposit-Related Canisters"
echo "===================================================="
echo ""

# Function to format cycles nicely
format_cycles() {
    local cycles=$1
    # Convert to T (trillion) cycles
    local tcycles=$(echo "scale=2; $cycles / 1000000000000" | bc)
    echo "${tcycles}T cycles"
}

# Check Ethereum Adapter
echo "1️⃣ Ethereum Adapter (55iy2-vaaaa-aaaas-amn7a-cai):"
RESULT=$(dfx canister --network ic status 55iy2-vaaaa-aaaas-amn7a-cai 2>&1)
if [[ $RESULT == *"Balance:"* ]]; then
    CYCLES=$(echo "$RESULT" | grep -E "Balance: [0-9]+ Cycles" | grep -oE "[0-9]+" | head -1)
    echo "   Balance: $(format_cycles $CYCLES)"
else
    echo "   ❌ Could not get status"
fi
echo ""

# Check EVM RPC canister
echo "2️⃣ EVM RPC Canister (7hfb6-caaaa-aaaar-qadga-cai):"
RESULT=$(dfx canister --network ic status 7hfb6-caaaa-aaaar-qadga-cai 2>&1)
if [[ $RESULT == *"Balance:"* ]]; then
    CYCLES=$(echo "$RESULT" | grep -E "Balance: [0-9]+ Cycles" | grep -oE "[0-9]+" | head -1)
    echo "   Balance: $(format_cycles $CYCLES)"
else
    echo "   ❌ Could not get status (this is a community canister)"
fi
echo ""

# Check Deposit Manager
echo "3️⃣ Deposit Manager (hhveh-piaaa-aaaaj-a2dga-cai):"
RESULT=$(dfx canister --network ic status hhveh-piaaa-aaaaj-a2dga-cai 2>&1)
if [[ $RESULT == *"Balance:"* ]]; then
    CYCLES=$(echo "$RESULT" | grep -E "Balance: [0-9]+ Cycles" | grep -oE "[0-9]+" | head -1)
    echo "   Balance: $(format_cycles $CYCLES)"
else
    echo "   ❌ Could not get status"
fi
echo ""

# Check Withdrawal Processor
echo "4️⃣ Withdrawal Processor (hauct-cqaaa-aaaaj-a2dgq-cai):"
RESULT=$(dfx canister --network ic status hauct-cqaaa-aaaaj-a2dgq-cai 2>&1)
if [[ $RESULT == *"Balance:"* ]]; then
    CYCLES=$(echo "$RESULT" | grep -E "Balance: [0-9]+ Cycles" | grep -oE "[0-9]+" | head -1)
    echo "   Balance: $(format_cycles $CYCLES)"
else
    echo "   ❌ Could not get status"
fi
echo ""

# Check Keccak256 canister
echo "5️⃣ Keccak256 Canister (hjxjp-uyaaa-aaaaj-a2dha-cai):"
RESULT=$(dfx canister --network ic status hjxjp-uyaaa-aaaaj-a2dha-cai 2>&1)
if [[ $RESULT == *"Balance:"* ]]; then
    CYCLES=$(echo "$RESULT" | grep -E "Balance: [0-9]+ Cycles" | grep -oE "[0-9]+" | head -1)
    echo "   Balance: $(format_cycles $CYCLES)"
else
    echo "   ❌ Could not get status"
fi
echo ""

echo "💡 Notes:"
echo "- Canisters need cycles for computation and HTTP outcalls"
echo "- HTTP outcalls cost ~260M cycles per request"
echo "- Low cycles (<1T) may cause failures"
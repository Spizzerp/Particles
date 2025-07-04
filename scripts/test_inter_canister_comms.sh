#!/bin/bash

echo "🔄 Testing Inter-Canister Communication"
echo "======================================="
echo ""

# Test 1: Check if Ethereum Adapter can call Keccak256 canister
echo "1️⃣ Testing Ethereum Adapter → Keccak256 communication..."
echo "   (This happens when generating deposit addresses)"

# Get deposit address (which internally calls keccak256)
TEST_PRINCIPAL="2vxsx-fae"  # Anonymous principal
TEST_COMMITMENT="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
TEST_AMOUNT="10000000000000000"  # 0.01 ETH in wei

echo "   Calling getDepositAddress..."
RESULT=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai getDepositAddress "(principal \"$TEST_PRINCIPAL\", \"$TEST_COMMITMENT\", $TEST_AMOUNT : nat)" 2>&1)

if [[ $RESULT == *"ok"* ]]; then
    echo "   ✅ Success! Generated address:"
    echo "   $RESULT"
else
    echo "   ❌ Failed with error:"
    echo "   $RESULT"
fi
echo ""

# Test 2: Check if Deposit Manager is accessible
echo "2️⃣ Testing Deposit Manager accessibility..."
echo "   Calling getContractState..."
RESULT=$(dfx canister --network ic call hhveh-piaaa-aaaaj-a2dga-cai getContractState '()' 2>&1)

if [[ $RESULT == *"record"* ]]; then
    echo "   ✅ Success! Can communicate with Deposit Manager"
    # Extract deposit count
    if [[ $RESULT =~ depositCount[[:space:]]*=[[:space:]]*([0-9]+) ]]; then
        echo "   Total deposits: ${BASH_REMATCH[1]}"
    fi
else
    echo "   ❌ Failed to communicate"
fi
echo ""

# Test 3: Check basic HTTP outcall capability
echo "3️⃣ Testing HTTP outcall capability..."
echo "   (Checking if canister can make external calls)"

# This tests the gas price fetching which uses HTTP outcalls
echo "   Calling getGasPrices..."
RESULT=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai getGasPrices '()' 2>&1)

if [[ $RESULT == *"ok"* ]] && [[ $RESULT == *"baseFee"* ]]; then
    echo "   ✅ Success! HTTP outcalls working"
    echo "   $RESULT" | grep -E "(baseFee|maxPriorityFee)" | head -2
else
    echo "   ❌ HTTP outcalls may be failing"
    echo "   $RESULT"
fi
echo ""

echo "📊 Summary:"
echo "- Low cycles (0.168T) in Ethereum Adapter may be causing HTTP outcall failures"
echo "- Each HTTP outcall costs ~260M cycles"
echo "- Consider topping up the Ethereum Adapter canister"
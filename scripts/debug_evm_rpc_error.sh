#!/bin/bash

echo "🔍 Debugging EVM RPC Error"
echo "=========================="
echo ""

# Test the nonce first
echo "1. Testing nonce retrieval for deposit address..."
NONCE_RESULT=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai testGetNonce '("0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e")' 2>&1)
echo "Nonce result: $NONCE_RESULT"

echo ""
echo "2. Checking latest canister logs for error details..."
dfx canister --network ic logs 55iy2-vaaaa-aaaas-amn7a-cai | tail -50 | grep -E "(Insufficient|insufficient|error|Error|fail|Failed)"
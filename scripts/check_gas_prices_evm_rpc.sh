#!/bin/bash

echo "🔍 Checking Current Gas Prices via EVM RPC"
echo "=========================================="
echo ""

# Call eth_feeHistory through EVM RPC canister
echo "Calling eth_feeHistory..."
RESULT=$(dfx canister --network ic call 7hfb6-caaaa-aaaar-qadga-cai eth_feeHistory '(
  variant { EthMainnet = opt vec { variant { PublicNode } } },
  opt record {
    responseSizeEstimate = opt 2048;
    responseConsensus = null
  },
  record {
    blockCount = 5;
    newestBlock = variant { Latest };
    rewardPercentiles = opt vec { 25 : nat8 }
  }
)')

echo "Raw result:"
echo "$RESULT"
echo ""

# Try to extract base fee from the result
if [[ $RESULT == *"baseFeePerGas"* ]]; then
    echo "✅ Successfully fetched fee history"
    # Extract the last base fee value
    if [[ $RESULT =~ baseFeePerGas[[:space:]]*=[[:space:]]*vec[[:space:]]*\{[^}]+\} ]]; then
        echo "Base fees found in response"
    fi
else
    echo "❌ Failed to fetch fee history"
fi
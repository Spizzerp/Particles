#!/bin/bash

echo "🧪 Testing direct EVM RPC call..."

# Test with the raw request format from the README
dfx canister call 7hfb6-caaaa-aaaar-qadga-cai request \
  '(variant {Chain=variant{EthSepolia=null}}, "{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}", 1000)' \
  --network ic

echo -e "\n📝 If this works, we need to use the 'request' method instead of typed methods"
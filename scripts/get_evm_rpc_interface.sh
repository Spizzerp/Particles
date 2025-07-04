#!/bin/bash

echo "📥 Getting EVM RPC canister interface..."

# Get the candid interface from the EVM RPC canister
dfx canister --network ic metadata 7hfb6-caaaa-aaaar-qadga-cai candid:service > src/canisters/evm_rpc.did

echo "✅ Interface saved to src/canisters/evm_rpc.did"
echo ""
echo "📄 Interface contents:"
cat src/canisters/evm_rpc.did | head -50
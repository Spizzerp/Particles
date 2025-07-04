#!/bin/bash

echo "🔄 Testing Multi-RPC Fallback System"
echo "===================================="

# Source the environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

# Test each RPC endpoint
echo ""
echo "📊 Testing RPC Endpoints:"
echo ""

# Primary: Alchemy
echo "1. Alchemy RPC:"
if [ ! -z "$VITE_ALCHEMY_API_KEY" ] && [ "$VITE_ALCHEMY_API_KEY" != "your_alchemy_api_key_here" ]; then
    ALCHEMY_URL="https://eth-sepolia.g.alchemy.com/v2/$VITE_ALCHEMY_API_KEY"
    echo "   URL: $ALCHEMY_URL"
    curl -s -X POST $ALCHEMY_URL \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r '.result' | xargs -I {} echo "   ✅ Block: {}"
else
    echo "   ⚠️  Not configured"
fi

echo ""

# Fallback 1: Ankr
echo "2. Ankr RPC:"
if [ ! -z "$VITE_ANKR_API_KEY" ] && [ "$VITE_ANKR_API_KEY" != "your_ankr_api_key_here" ]; then
    ANKR_URL="${VITE_ANKR_RPC_URL}${VITE_ANKR_API_KEY}"
    echo "   URL: $ANKR_URL"
    curl -s -X POST $ANKR_URL \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r '.result' | xargs -I {} echo "   ✅ Block: {}"
else
    echo "   ⚠️  Not configured"
fi

echo ""

# Fallback 2: Infura
echo "3. Infura RPC:"
if [ ! -z "$VITE_INFURA_PROJECT_ID" ] && [ "$VITE_INFURA_PROJECT_ID" != "your_infura_project_id_here" ]; then
    INFURA_URL="https://sepolia.infura.io/v3/$VITE_INFURA_PROJECT_ID"
    echo "   URL: $INFURA_URL"
    curl -s -X POST $INFURA_URL \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r '.result' | xargs -I {} echo "   ✅ Block: {}"
else
    echo "   ⚠️  Not configured"
fi

echo ""

# Fallback 3: Public RPC 1
echo "4. Public RPC 1 (Sepolia):"
PUBLIC_1="${VITE_PUBLIC_RPC_1:-https://rpc.sepolia.org}"
echo "   URL: $PUBLIC_1"
curl -s -X POST $PUBLIC_1 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r '.result' | xargs -I {} echo "   ✅ Block: {}"

echo ""

# Fallback 4: Public RPC 2
echo "5. Public RPC 2 (PublicNode):"
PUBLIC_2="${VITE_PUBLIC_RPC_2:-https://ethereum-sepolia.publicnode.com}"
echo "   URL: $PUBLIC_2"
curl -s -X POST $PUBLIC_2 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r '.result' | xargs -I {} echo "   ✅ Block: {}"

echo ""
echo "===================================="
echo "✅ RPC endpoint testing complete!"
echo ""

# Now test the canister's RPC fallback
echo "🔄 Testing canister RPC fallback..."
echo ""

# Get a pending deposit address to test with
PENDING_DEPOSITS=$(dfx canister call ethereum_adapter getPendingDeposits 2>/dev/null | grep -o '0x[a-fA-F0-9]\{40\}' | head -1)

if [ ! -z "$PENDING_DEPOSITS" ]; then
    echo "📍 Found pending deposit address: $PENDING_DEPOSITS"
    echo ""
    echo "🔄 Processing single deposit..."
    dfx canister call ethereum_adapter processSingleDeposit "(\"$PENDING_DEPOSITS\")"
else
    echo "ℹ️  No pending deposits found to test with"
fi

echo ""
echo "✅ Multi-RPC fallback test complete!"
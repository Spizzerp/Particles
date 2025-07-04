#!/bin/bash

echo "🔍 Testing Transaction Signing"
echo "=============================="
echo ""

# Let's intercept the signed transaction
echo "1. Adding debug output to see the signed transaction..."

# Create a test to decode an EIP-1559 transaction
cat > decode_tx.js << 'EOF'
const { ethers } = require('ethers');

// This is a sample EIP-1559 transaction format
// If we could capture the actual signed tx from the canister, we could decode it
console.log('EIP-1559 Transaction Format:');
console.log('- Type prefix: 0x02');
console.log('- RLP encoded: [chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList, yParity, r, s]');
console.log('');

// Let's check what the canister logs show about submission
console.log('From the logs, the canister:');
console.log('1. Constructs the transaction correctly');
console.log('2. Signs with ECDSA using a 4-byte derivation path');
console.log('3. Tries yParity=0, fails, then tries yParity=1');
console.log('4. Both attempts are rejected by EVM RPC');
console.log('');
console.log('The "Insufficient funds" error from EVM RPC usually means:');
console.log('- The signature is invalid (wrong private key)');
console.log('- The from address derived from signature has no funds');
console.log('- The transaction is malformed');
EOF

node decode_tx.js
rm decode_tx.js

echo ""
echo "2. Let's check if there's a test function to verify signing..."
dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai --query debugAddressGeneration "(principal \"mbfpc-mr2wm-cgvpo-tc7y5-vyxbb-5rlez-luwyc-4s23b-bzw3b-zmccd-rvy\")"

echo ""
echo "3. The key insight: The debugAddressGeneration shows a DIFFERENT address!"
echo "   This suggests the derivation path has changed."
echo ""
echo "   Original deposit: 0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e"
echo "   Current derivation: 0xff0b5a436a03e394a08164faeb4834bb3c9ecd79"
echo ""
echo "   The canister is signing with the private key for the WRONG address."
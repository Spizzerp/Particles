#!/bin/bash

echo "🔍 Debugging Transaction Structure"
echo "=================================="
echo ""

# First, let's check the logs to see the exact transaction details
echo "1. Checking recent transaction construction details from logs..."
dfx canister --network ic logs 55iy2-vaaaa-aaaas-amn7a-cai | tail -100 | grep -A2 -B2 "EIP-1559 Transaction details"

echo ""
echo "2. Let's also check the message hash and signing details..."
dfx canister --network ic logs 55iy2-vaaaa-aaaas-amn7a-cai | tail -100 | grep -E "(message hash|derivation path|ECDSA signing)"

echo ""
echo "3. Now let's create a test to see what a valid transaction should look like..."
cat > debug_tx_structure.js << 'EOF'
const { ethers } = require('ethers');

async function debugTransaction() {
    // Recreate what the canister is trying to do
    const depositAddress = '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e';
    const poolContract = '0x9b0721C174b103facEC1EeE435679Ae9C493163C';
    const commitment = '0x3ceb1793fe62c6652483c6f7f9679aab1a8e665f06c78dfe31ec0c8dc8cbd61b';
    
    // From logs: maxFeePerGas=1385046011, maxPriorityFeePerGas=77556031, gasLimit=65000
    const tx = {
        type: 2,
        chainId: 1,
        nonce: 0,
        to: poolContract,
        value: ethers.parseEther('0.01'),
        maxFeePerGas: 1385046011n,
        maxPriorityFeePerGas: 77556031n,
        gasLimit: 65000n,
        data: '0xb214faa5' + commitment.slice(2) // deposit(bytes32)
    };
    
    console.log('Transaction structure:');
    console.log('- From:', depositAddress);
    console.log('- To:', tx.to);
    console.log('- Value:', ethers.formatEther(tx.value), 'ETH');
    console.log('- Gas limit:', tx.gasLimit.toString());
    console.log('- Max fee per gas:', ethers.formatUnits(tx.maxFeePerGas, 'gwei'), 'gwei');
    console.log('- Max priority fee:', ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei'), 'gwei');
    console.log('- Max transaction cost:', ethers.formatEther(tx.gasLimit * tx.maxFeePerGas), 'ETH');
    console.log('- Data:', tx.data);
    console.log('- Data length:', (tx.data.length - 2) / 2, 'bytes');
    
    // Calculate total needed
    const totalNeeded = tx.value + (tx.gasLimit * tx.maxFeePerGas);
    console.log('\nTotal ETH needed:', ethers.formatEther(totalNeeded));
    console.log('Available:', '0.011 ETH');
    console.log('Sufficient?', totalNeeded <= ethers.parseEther('0.011'));
}

debugTransaction();
EOF

node debug_tx_structure.js
rm debug_tx_structure.js
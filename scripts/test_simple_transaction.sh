#!/bin/bash

echo "🔍 Testing Simple Transaction Submission"
echo "========================================"
echo ""

# Test with a simple value transfer (no contract call)
echo "1. Testing simple ETH transfer (no contract interaction)..."

cat > test_simple_tx.js << 'EOF'
const { ethers } = require('ethers');

async function testSimpleTransaction() {
    const provider = new ethers.JsonRpcProvider('https://ethereum.publicnode.com');
    
    // Create a test wallet (not real, just for signing)
    const testWallet = new ethers.Wallet('0x' + '1'.repeat(64), provider);
    
    // Simple transaction
    const tx = {
        type: 2, // EIP-1559
        to: '0x9b0721C174b103facEC1EeE435679Ae9C493163C',
        value: ethers.parseEther('0.01'),
        nonce: 0,
        maxFeePerGas: ethers.parseUnits('2', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
        gasLimit: 21000,
        chainId: 1
    };
    
    console.log('Transaction:', {
        ...tx,
        value: ethers.formatEther(tx.value) + ' ETH',
        maxFeePerGas: ethers.formatUnits(tx.maxFeePerGas, 'gwei') + ' gwei',
        maxPriorityFeePerGas: ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei') + ' gwei'
    });
    
    // Sign it
    const signedTx = await testWallet.signTransaction(tx);
    console.log('\nSigned transaction:', signedTx);
    
    // Parse to check fields
    const parsed = ethers.Transaction.from(signedTx);
    console.log('\nParsed transaction:');
    console.log('- From:', parsed.from);
    console.log('- To:', parsed.to);
    console.log('- Value:', ethers.formatEther(parsed.value));
    console.log('- Nonce:', parsed.nonce);
    console.log('- Gas limit:', parsed.gasLimit);
    console.log('- Max fee:', ethers.formatUnits(parsed.maxFeePerGas, 'gwei'), 'gwei');
    console.log('- Max priority:', ethers.formatUnits(parsed.maxPriorityFeePerGas, 'gwei'), 'gwei');
    console.log('- Chain ID:', parsed.chainId);
    console.log('- Type:', parsed.type);
    console.log('- yParity:', parsed.yParity);
}

testSimpleTransaction().catch(console.error);
EOF

node test_simple_tx.js

echo ""
echo "2. Now let's check what error we get from processSingleDepositEIP1559..."
echo "   This will help us understand the exact failure"

# Try to process again and capture full output
RESULT=$(dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai processSingleDepositEIP1559 '("0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e")' 2>&1)
echo "Result: $RESULT"

# Clean up
rm -f test_simple_tx.js
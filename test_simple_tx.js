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

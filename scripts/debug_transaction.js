const { ethers } = require('ethers');

// This script will help us understand what address would be recovered from a transaction

async function debugTransaction() {
    // Example transaction parameters
    const tx = {
        to: '0x8626502727D7faf282C44df18B34E50D0DB45Eae',
        value: ethers.parseEther('0.001'),
        data: '0x',
        nonce: 0,
        gasPrice: ethers.parseUnits('1', 'gwei'),
        gasLimit: 21000,
        chainId: 11155111 // Sepolia
    };
    
    console.log('Transaction parameters:');
    console.log({
        to: tx.to,
        value: ethers.formatEther(tx.value) + ' ETH',
        data: tx.data,
        nonce: tx.nonce,
        gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei') + ' gwei',
        gasLimit: tx.gasLimit.toString(),
        chainId: tx.chainId
    });
    
    // Create unsigned transaction
    const unsignedTx = {
        to: tx.to,
        value: tx.value,
        data: tx.data,
        nonce: tx.nonce,
        gasPrice: tx.gasPrice,
        gasLimit: tx.gasLimit,
        chainId: tx.chainId,
        type: 0 // Legacy transaction
    };
    
    // Serialize for signing
    const serialized = ethers.Transaction.from(unsignedTx).unsignedSerialized;
    console.log('\nUnsigned serialized:', serialized);
    
    // Hash for signing
    const hash = ethers.keccak256(serialized);
    console.log('Transaction hash for signing:', hash);
}

debugTransaction();
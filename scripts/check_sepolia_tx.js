const { ethers } = require('ethers');
require('dotenv').config();

async function checkTransaction() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const txHash = process.argv[2] || '0xe95eac86c4b8c3d4b93cae9bc00fcea181d85c00dcd352c61b5c97838f3691bd';
    
    console.log('Checking Sepolia transaction:', txHash);
    console.log('================================\n');
    
    try {
        const tx = await provider.getTransaction(txHash);
        if (tx) {
            console.log('Transaction found:');
            console.log('From:', tx.from);
            console.log('To:', tx.to);
            console.log('Value:', ethers.formatEther(tx.value), 'ETH');
            console.log('Block:', tx.blockNumber || 'Pending');
            console.log('Nonce:', tx.nonce);
            
            if (tx.blockNumber) {
                const receipt = await provider.getTransactionReceipt(txHash);
                console.log('\nReceipt:');
                console.log('Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed');
                console.log('Gas Used:', receipt.gasUsed.toString());
                console.log('Block Number:', receipt.blockNumber);
                console.log('Confirmations:', await provider.getBlockNumber() - receipt.blockNumber);
            } else {
                console.log('\nTransaction is still pending...');
            }
        } else {
            console.log('Transaction not found on Sepolia');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkTransaction();
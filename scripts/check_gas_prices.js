const { ethers } = require('ethers');
require('dotenv').config();

async function checkGasPrices() {
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
    
    try {
        // Get current gas price
        const gasPrice = await provider.getFeeData();
        console.log('Current gas prices:');
        console.log('Gas Price:', ethers.formatUnits(gasPrice.gasPrice, 'gwei'), 'gwei');
        console.log('Max Fee Per Gas:', ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei'), 'gwei');
        console.log('Max Priority Fee:', ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei'), 'gwei');
        
        // Get latest block
        const block = await provider.getBlock('latest');
        console.log('\nLatest block:', block.number);
        console.log('Base fee:', ethers.formatUnits(block.baseFeePerGas, 'gwei'), 'gwei');
        
        // Check pending transaction
        const txHash = '0xa306db74631bede4db2022afe90694ea6cb0fbf8634307531e609b8663a57f5f';
        const tx = await provider.getTransaction(txHash);
        if (tx) {
            console.log('\nPending transaction gas price:', ethers.formatUnits(tx.gasPrice || 0, 'gwei'), 'gwei');
            console.log('Nonce:', tx.nonce);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkGasPrices();
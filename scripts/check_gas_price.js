const { ethers } = require('ethers');

async function checkGasPrice() {
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
    
    try {
        const gasPrice = await provider.getFeeData();
        console.log('Current gas price data:');
        console.log('Gas Price:', ethers.formatUnits(gasPrice.gasPrice, 'gwei'), 'gwei');
        console.log('Max Fee Per Gas:', ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei'), 'gwei');
        console.log('Max Priority Fee:', ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei'), 'gwei');
        
        // Also get the latest block to see base fee
        const block = await provider.getBlock('latest');
        console.log('\nLatest block base fee:', ethers.formatUnits(block.baseFeePerGas, 'gwei'), 'gwei');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkGasPrice();
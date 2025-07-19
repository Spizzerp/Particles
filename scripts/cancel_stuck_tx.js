const { ethers } = require('ethers');
require('dotenv').config();

async function cancelStuckTransaction() {
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
    
    // The address that sent the stuck transaction
    const stuckAddress = '0x82378c861a383b4b7ff0705675579e9c250347cf';
    
    try {
        // Get current nonce (should be 0 since the pending tx has nonce 0)
        const nonce = await provider.getTransactionCount(stuckAddress, 'latest');
        console.log('Current nonce:', nonce);
        
        // Get pending nonce
        const pendingNonce = await provider.getTransactionCount(stuckAddress, 'pending');
        console.log('Pending nonce:', pendingNonce);
        
        if (pendingNonce > nonce) {
            console.log('Found stuck transaction with nonce:', nonce);
            console.log('To cancel, the canister would need to send a new transaction with:');
            console.log('- Same nonce:', nonce);
            console.log('- Higher gas price (at least 10% higher than the stuck tx)');
            console.log('- Can be 0 value to self to save funds');
            
            // Get current gas prices
            const feeData = await provider.getFeeData();
            console.log('\nRecommended gas prices for replacement:');
            console.log('Max Fee Per Gas:', ethers.formatUnits(feeData.maxFeePerGas * 12n / 10n, 'gwei'), 'gwei');
            console.log('Max Priority Fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas * 12n / 10n, 'gwei'), 'gwei');
        } else {
            console.log('No stuck transactions found');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

cancelStuckTransaction();
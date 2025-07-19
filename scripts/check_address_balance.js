const { ethers } = require('ethers');
require('dotenv').config();

async function checkBalance(addressToCheck) {
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
    
    console.log('Checking Sepolia balance for:', addressToCheck);
    
    try {
        const balance = await provider.getBalance(addressToCheck);
        console.log('Balance:', ethers.formatEther(balance), 'ETH');
        console.log('Balance (wei):', balance.toString());
        
        // Also check transaction count
        const txCount = await provider.getTransactionCount(addressToCheck);
        console.log('Transaction count:', txCount);
        
        return balance;
    } catch (error) {
        console.error('Error checking balance:', error.message);
        throw error;
    }
}

// Get address from command line or use default
const address = process.argv[2] || '0x82378c861a383b4b7ff0705675579e9c250347cf';
checkBalance(address).catch(console.error);
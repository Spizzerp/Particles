const { ethers } = require('ethers');
require('dotenv').config();

async function checkBalance() {
    const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.org');
    const address = '0x92Ab98722Fe2651FABf40683e8E690e7802aEb2e';
    
    console.log('Checking Sepolia balance for:', address);
    
    try {
        const balance = await provider.getBalance(address);
        console.log('Balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance > 0) {
            console.log('✅ Wallet has Sepolia ETH for deployment');
        } else {
            console.log('❌ Wallet needs Sepolia ETH');
            console.log('Get test ETH from: https://sepolia.dev/');
        }
    } catch (error) {
        console.error('Error checking balance:', error.message);
    }
}

checkBalance();
const { ethers } = require('ethers');
require('dotenv').config();

async function checkBalance() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const address = process.env.WALLET_ADDRESS;
    
    console.log('Checking balance for:', address);
    
    try {
        const balance = await provider.getBalance(address);
        const balanceInEth = ethers.formatEther(balance);
        
        console.log('Balance:', balanceInEth, 'ETH');
        
        if (parseFloat(balanceInEth) > 0) {
            console.log('✅ You have enough ETH to deploy!');
        } else {
            console.log('❌ You need test ETH. Visit: https://sepoliafaucet.com/');
        }
    } catch (error) {
        console.error('Error checking balance:', error.message);
    }
}

checkBalance();
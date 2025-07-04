const { ethers } = require('ethers');
require('dotenv').config();

async function sendGasTopup() {
    // Configuration
    const DEPOSIT_ADDRESS = '0xb3a8d136db6435ce022e24c34502cc442b7b5a0a';
    const AMOUNT = '0.005'; // Extra ETH for gas
    
    console.log('⛽ Sending Gas Top-up to Deposit Address');
    console.log('=======================================');
    
    try {
        // Connect to Sepolia
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log('📊 Transaction Details:');
        console.log(`   From: ${wallet.address}`);
        console.log(`   To: ${DEPOSIT_ADDRESS}`);
        console.log(`   Amount: ${AMOUNT} ETH (for gas)`);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log(`   Current Balance: ${ethers.formatEther(balance)} ETH`);
        
        // Send transaction
        console.log('\n🔄 Sending gas top-up...');
        const tx = await wallet.sendTransaction({
            to: DEPOSIT_ADDRESS,
            value: ethers.parseEther(AMOUNT)
        });
        
        console.log(`✅ Transaction sent!`);
        console.log(`📜 TX Hash: ${tx.hash}`);
        console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        console.log('\n⏳ Waiting for confirmation...');
        const receipt = await tx.wait();
        
        console.log(`✅ Transaction confirmed!`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
        
        console.log('\n🎉 Gas top-up successful! The deposit should now process.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

sendGasTopup();
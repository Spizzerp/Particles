const { ethers } = require('ethers');
require('dotenv').config();

async function sendTestDeposit() {
    // Configuration
    const DEPOSIT_ADDRESS = '0x3D0B1DC0Ce05576A220174d4a963F13eB7d82A3E';
    const AMOUNT = '0.012'; // ETH
    
    console.log('💸 Sending Test Deposit to Sepolia');
    console.log('==================================');
    
    try {
        // Connect to Sepolia
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log('📊 Wallet Details:');
        console.log(`   From: ${wallet.address}`);
        console.log(`   To: ${DEPOSIT_ADDRESS}`);
        console.log(`   Amount: ${AMOUNT} ETH`);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log(`   Current Balance: ${ethers.formatEther(balance)} ETH`);
        
        if (balance < ethers.parseEther(AMOUNT)) {
            throw new Error('Insufficient balance! Please get test ETH from a faucet.');
        }
        
        // Send transaction
        console.log('\n🔄 Sending transaction...');
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
        
        console.log('\n🎉 Deposit successful! Now click "I\'ve Made the Deposit" in the app.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('Insufficient balance')) {
            console.log('\n💡 Get test ETH from: https://sepoliafaucet.com/');
            console.log('   Enter this address:', process.env.WALLET_ADDRESS);
        }
    }
}

sendTestDeposit();
const { ethers } = require('ethers');
require('dotenv').config();

async function sendDeposit() {
    console.log('💸 Sending 0.005 ETH to Deposit Address');
    console.log('======================================\n');
    
    const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const depositAddress = '0x2ea11946ef768ad3d6879ab3f6b1d981f091b432';
    const amount = ethers.parseEther('0.002'); // Additional ETH for gas
    
    console.log('From:', wallet.address);
    console.log('To:', depositAddress);
    console.log('Amount:', '0.002 ETH (additional for gas)');
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('\nYour balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance < amount) {
        console.error('❌ Insufficient balance');
        return;
    }
    
    // Send transaction
    console.log('\n📤 Sending transaction...');
    
    try {
        const tx = await wallet.sendTransaction({
            to: depositAddress,
            value: amount
        });
        
        console.log('\n✅ Transaction sent!');
        console.log('📜 Hash:', tx.hash);
        console.log('🔗 View: https://etherscan.io/tx/' + tx.hash);
        
        console.log('\n⏳ Waiting for confirmation...');
        const receipt = await tx.wait();
        
        console.log('\n✅ Confirmed in block:', receipt.blockNumber);
        console.log('⛽ Gas used:', ethers.formatUnits(receipt.gasUsed, 'gwei'));
        
        console.log('\n🎉 Deposit sent successfully!');
        console.log('Next: Run "node scripts/process_mainnet_deposit.js" to forward to contract');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

sendDeposit();
const { ethers } = require('ethers');
require('dotenv').config();

async function sendDeposit() {
    // Sepolia testnet configuration
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
    
    // Create wallet from private key
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.error('Please set PRIVATE_KEY in your .env file');
        process.exit(1);
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Deposit address (generated with proper Keccak256)
    const depositAddress = '0x48f3cecedb8b4c6518bf78c201acddf31067d2d4';
    const amount = ethers.parseEther('0.01'); // 0.01 ETH
    
    console.log('Sending deposit...');
    console.log('From:', wallet.address);
    console.log('To:', depositAddress);
    console.log('Amount:', ethers.formatEther(amount), 'ETH');
    
    try {
        // Check balance first
        const balance = await provider.getBalance(wallet.address);
        console.log('Sender balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance < amount) {
            console.error('Insufficient balance!');
            process.exit(1);
        }
        
        // Send transaction
        const tx = await wallet.sendTransaction({
            to: depositAddress,
            value: amount,
            gasLimit: 21000
        });
        
        console.log('Transaction sent!');
        console.log('Transaction hash:', tx.hash);
        console.log('Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('Transaction confirmed!');
        console.log('Block number:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());
        
        // Check new balance of deposit address
        const depositBalance = await provider.getBalance(depositAddress);
        console.log('Deposit address balance:', ethers.formatEther(depositBalance), 'ETH');
        
    } catch (error) {
        console.error('Error sending transaction:', error);
    }
}

sendDeposit();
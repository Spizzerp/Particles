const { ethers } = require('ethers');
require('dotenv').config();

async function sendSepoliaETH(recipientAddress, amountInEth) {
    // Validate inputs
    if (!recipientAddress || !ethers.isAddress(recipientAddress)) {
        console.error('❌ Invalid recipient address');
        return;
    }

    if (!amountInEth || parseFloat(amountInEth) <= 0) {
        console.error('❌ Invalid amount');
        return;
    }

    // Setup
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log('📤 Sending Sepolia ETH');
    console.log('From:', wallet.address);
    console.log('To:', recipientAddress);
    console.log('Amount:', amountInEth, 'ETH');
    
    try {
        // Check sender balance
        const balance = await provider.getBalance(wallet.address);
        console.log('Sender balance:', ethers.formatEther(balance), 'ETH');
        
        const amountWei = ethers.parseEther(amountInEth);
        
        // Estimate gas
        const gasPrice = await provider.getFeeData();
        const gasLimit = 21000n; // Standard ETH transfer
        const gasCost = gasLimit * gasPrice.gasPrice;
        const totalCost = amountWei + gasCost;
        
        console.log('Gas estimate:', ethers.formatEther(gasCost), 'ETH');
        console.log('Total cost:', ethers.formatEther(totalCost), 'ETH');
        
        if (balance < totalCost) {
            console.error('❌ Insufficient balance for transaction + gas');
            return;
        }
        
        // Send transaction
        console.log('\n🚀 Sending transaction...');
        const tx = await wallet.sendTransaction({
            to: recipientAddress,
            value: amountWei,
            gasLimit: gasLimit,
            gasPrice: gasPrice.gasPrice
        });
        
        console.log('Transaction hash:', tx.hash);
        console.log('Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed!');
        console.log('Block:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());
        console.log(`View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        // Check new balance
        const newBalance = await provider.getBalance(wallet.address);
        console.log('\nNew sender balance:', ethers.formatEther(newBalance), 'ETH');
        
    } catch (error) {
        console.error('❌ Transaction failed:', error.message);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.log('Usage: node send_sepolia_eth.js <recipient_address> <amount_in_eth>');
    console.log('Example: node send_sepolia_eth.js 0xac96430a851703bc0f1704a8837cb96f69c94e88 0.0055');
    process.exit(1);
}

const [recipient, amount] = args;
sendSepoliaETH(recipient, amount);
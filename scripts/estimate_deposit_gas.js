const { ethers } = require('ethers');
require('dotenv').config();

async function estimateGas() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    const depositContract = '0x8626502727D7faf282C44df18B34E50D0DB45Eae';
    const depositAddress = '0x17f20304f4d77b10d484ca967f19784eea89ce8d';
    
    // Encode the deposit function call
    const iface = new ethers.Interface(['function deposit(bytes32 commitment)']);
    const commitment = '0x6fa35135a2dc4b2e205efae617a83eff383bfad6335daef094fe7b44d7a39d25';
    const callData = iface.encodeFunctionData('deposit', [commitment]);
    
    console.log('Estimating gas for deposit transaction...');
    console.log('From:', depositAddress);
    console.log('To:', depositContract);
    console.log('Value: 0.00988 ETH');
    console.log('Call data:', callData);
    
    try {
        const gasEstimate = await provider.estimateGas({
            from: depositAddress,
            to: depositContract,
            value: ethers.parseEther('0.00988'),
            data: callData
        });
        
        console.log('\nGas estimate:', gasEstimate.toString());
        console.log('Gas estimate (formatted):', Number(gasEstimate).toLocaleString());
        
        // Also check the nonce
        const nonce = await provider.getTransactionCount(depositAddress);
        console.log('\nCurrent nonce for deposit address:', nonce);
        
    } catch (error) {
        console.error('\nError estimating gas:', error.message);
        if (error.data) {
            console.error('Error data:', error.data);
        }
    }
}

estimateGas().catch(console.error);

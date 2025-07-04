const { ethers } = require('ethers');
require('dotenv').config();

async function checkGas() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    // Get current gas price
    const gasPrice = await provider.getFeeData();
    console.log('Current Sepolia Gas Data:');
    console.log('Gas Price:', ethers.formatUnits(gasPrice.gasPrice, 'gwei'), 'gwei');
    console.log('Max Fee Per Gas:', ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei'), 'gwei');
    console.log('Max Priority Fee:', ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei'), 'gwei');
    
    // Get latest block
    const block = await provider.getBlock('latest');
    console.log('\nLatest Block:');
    console.log('Block Number:', block.number);
    console.log('Base Fee:', ethers.formatUnits(block.baseFeePerGas, 'gwei'), 'gwei');
    
    // Check a specific address balance
    const depositAddress = '0x17f20304f4d77b10d484ca967f19784eea89ce8d';
    const balance = await provider.getBalance(depositAddress);
    console.log('\nDeposit Address Balance:');
    console.log('Address:', depositAddress);
    console.log('Balance:', ethers.formatEther(balance), 'ETH');
}

checkGas().catch(console.error);

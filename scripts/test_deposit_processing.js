const { ethers } = require('ethers');

async function checkDepositStatus() {
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
    
    const depositAddress = '0x48f3cecedb8b4c6518bf78c201acddf31067d2d4';
    const poolContract = '0x8626502727D7faf282C44df18B34E50D0DB45Eae';
    
    console.log('Checking deposit status...\n');
    
    // Check deposit address balance
    const depositBalance = await provider.getBalance(depositAddress);
    console.log('Deposit address:', depositAddress);
    console.log('Balance:', ethers.formatEther(depositBalance), 'ETH');
    
    // Check pool contract balance
    const poolBalance = await provider.getBalance(poolContract);
    console.log('\nPool contract:', poolContract);
    console.log('Balance:', ethers.formatEther(poolBalance), 'ETH');
    
    // Get latest block
    const blockNumber = await provider.getBlockNumber();
    console.log('\nCurrent block:', blockNumber);
    
    // Check transaction count (nonce) for deposit address
    const nonce = await provider.getTransactionCount(depositAddress);
    console.log('Deposit address nonce:', nonce);
}

checkDepositStatus();
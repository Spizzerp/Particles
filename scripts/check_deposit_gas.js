const { ethers } = require('ethers');
require('dotenv').config();

async function checkGas() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    // Check recent transactions to the deposit contract
    const contractAddress = '0x8626502727D7faf282C44df18B34E50D0DB45Eae';
    
    // Get recent transactions
    const latestBlock = await provider.getBlockNumber();
    console.log('Checking recent deposit transactions to:', contractAddress);
    console.log('Latest block:', latestBlock);
    
    // Look for recent deposit transactions
    for (let i = 0; i < 5; i++) {
        const block = await provider.getBlock(latestBlock - i, true);
        if (block && block.transactions) {
            for (const tx of block.transactions) {
                if (tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
                    if (tx.data && tx.data.startsWith('0xb214faa5')) { // deposit function
                        console.log('\nFound deposit transaction:');
                        console.log('  TX Hash:', tx.hash);
                        console.log('  From:', tx.from);
                        console.log('  Value:', ethers.formatEther(tx.value), 'ETH');
                        console.log('  Gas Limit:', tx.gasLimit.toString());
                        console.log('  Gas Price:', ethers.formatUnits(tx.gasPrice, 'gwei'), 'gwei');
                        
                        // Get receipt for actual gas used
                        const receipt = await provider.getTransactionReceipt(tx.hash);
                        if (receipt) {
                            console.log('  Gas Used:', receipt.gasUsed.toString());
                            console.log('  Status:', receipt.status === 1 ? 'Success' : 'Failed');
                        }
                    }
                }
            }
        }
    }
}

checkGas().catch(console.error);

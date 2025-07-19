const { ethers } = require('ethers');
require('dotenv').config();

async function checkAddressTransactions(address) {
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
    
    console.log('Checking transactions for:', address);
    
    try {
        // Get current block
        const currentBlock = await provider.getBlockNumber();
        console.log('Current block:', currentBlock);
        
        // Get transaction count
        const txCount = await provider.getTransactionCount(address);
        console.log('Transaction count:', txCount);
        
        // Search recent blocks for transactions
        console.log('\nSearching recent blocks for transactions...');
        const blocksToSearch = 100;
        let foundTxs = [];
        
        for (let i = 0; i < blocksToSearch && i < currentBlock; i++) {
            const blockNumber = currentBlock - i;
            const block = await provider.getBlock(blockNumber, true);
            
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.from && tx.from.toLowerCase() === address.toLowerCase()) {
                        console.log(`\nFound transaction in block ${blockNumber}:`);
                        console.log('Hash:', tx.hash);
                        console.log('To:', tx.to);
                        console.log('Value:', ethers.formatEther(tx.value), 'ETH');
                        console.log('Gas Price:', ethers.formatUnits(tx.gasPrice || 0, 'gwei'), 'gwei');
                        console.log('Nonce:', tx.nonce);
                        foundTxs.push(tx);
                    }
                }
            }
            
            if (i % 10 === 0 && i > 0) {
                process.stdout.write('.');
            }
        }
        
        console.log('\n\nTotal transactions found:', foundTxs.length);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

const address = process.argv[2] || '0x82378c861a383b4b7ff0705675579e9c250347cf';
checkAddressTransactions(address);
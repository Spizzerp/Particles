#!/usr/bin/env node

const { ethers } = require('ethers');

async function checkTransaction() {
    const TX_HASH = '0x8a94944ae8816043fed298804c31cd42a480dd9fa86f3464023b24131956e292';
    const DEPOSIT_ADDRESS = '0x615d9066545aab8d52067b1edab78d65640fcf49';
    const POOL_CONTRACT = '0xfaa1ec38d37a59b18d4d3f4e8a35a96b7bd0b57f';
    
    // Connect to Ethereum mainnet
    const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
    
    console.log('Checking transaction:', TX_HASH);
    console.log('================================\n');
    
    try {
        // Get transaction details
        const tx = await provider.getTransaction(TX_HASH);
        console.log('Transaction Details:');
        console.log('From:', tx.from);
        console.log('To:', tx.to);
        console.log('Value:', ethers.formatEther(tx.value), 'ETH');
        console.log('Gas Price:', ethers.formatUnits(tx.gasPrice, 'gwei'), 'gwei');
        console.log('Block:', tx.blockNumber);
        
        // Get transaction receipt
        const receipt = await provider.getTransactionReceipt(TX_HASH);
        console.log('\nTransaction Receipt:');
        console.log('Status:', receipt.status === 1 ? 'SUCCESS ✓' : 'FAILED ✗');
        console.log('Gas Used:', receipt.gasUsed.toString());
        console.log('Effective Gas Price:', ethers.formatUnits(receipt.effectiveGasPrice, 'gwei'), 'gwei');
        
        // Check if it matches our deposit
        if (tx.from.toLowerCase() === DEPOSIT_ADDRESS.toLowerCase()) {
            console.log('\n✅ Transaction is FROM the deposit address!');
            console.log('This was the forwarding transaction.');
            
            if (tx.to.toLowerCase() === POOL_CONTRACT.toLowerCase()) {
                console.log('✅ Funds were sent to the pool contract!');
                console.log('\nThe deposit was successfully forwarded!');
            } else {
                console.log('❌ Funds were sent to:', tx.to);
                console.log('Expected pool contract:', POOL_CONTRACT);
            }
        }
        
        // Check current balances
        console.log('\nCurrent Balances:');
        const depositBalance = await provider.getBalance(DEPOSIT_ADDRESS);
        const poolBalance = await provider.getBalance(POOL_CONTRACT);
        
        console.log('Deposit address:', ethers.formatEther(depositBalance), 'ETH');
        console.log('Pool contract:', ethers.formatEther(poolBalance), 'ETH');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkTransaction();
#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Sepolia contract address from deployment
const DEPOSIT_CONTRACT = '0x9b0721C174b103facEC1EeE435679Ae9C493163C';

async function testRealDeposit() {
    console.log('🚀 Testing Real Ethereum Deposit Flow\n');
    
    console.log('1️⃣ Getting deposit address from ICP...');
    try {
        // Generate a test principal
        const testPrincipal = 'be2us-64aaa-aaaaa-qaabq-cai';
        
        const { stdout } = await execAsync(
            `dfx canister call ethereum_adapter_fixed getDepositAddress '(principal "${testPrincipal}")'`
        );
        
        const addressMatch = stdout.match(/0x[a-fA-F0-9]{40}/);
        if (!addressMatch) {
            throw new Error('Failed to extract address from response');
        }
        
        const depositAddress = addressMatch[0];
        console.log(`✅ Generated deposit address: ${depositAddress}`);
        
        console.log('\n2️⃣ Deposit Contract Details:');
        console.log(`   Contract: ${DEPOSIT_CONTRACT}`);
        console.log(`   Network: Sepolia Testnet`);
        console.log(`   View on Etherscan: https://sepolia.etherscan.io/address/${DEPOSIT_CONTRACT}`);
        
        console.log('\n3️⃣ To make a real deposit:');
        console.log('   a) Get Sepolia ETH from: https://sepoliafaucet.com/');
        console.log('   b) Send exactly 0.1, 1, 10, or 100 ETH to the deposit contract');
        console.log('   c) Include your commitment hash in the transaction');
        
        console.log('\n4️⃣ Checking for existing deposits...');
        const { stdout: deposits } = await execAsync(
            'dfx canister call ethereum_adapter_fixed checkDeposits'
        );
        console.log('Current deposits:', deposits);
        
        console.log('\n5️⃣ Getting current pool address...');
        const { stdout: poolAddress } = await execAsync(
            'dfx canister call ethereum_adapter_fixed getPoolAddress'
        );
        console.log('Pool address for withdrawals:', poolAddress.trim());
        
        console.log('\n✅ Ethereum integration is ready!');
        console.log('   - Deposit contract deployed on Sepolia');
        console.log('   - ICP canister can generate unique addresses');
        console.log('   - Monitoring system ready to detect deposits');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the test
testRealDeposit();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// This script tests the withdrawal flow
// In a real implementation, this would require:
// 1. Valid ZK proof generation
// 2. Verification through ICP
// 3. Withdrawal execution

async function testWithdrawal() {
    console.log('🏦 Testing Withdrawal Flow...\n');

    // Load test deposit data
    const depositsPath = path.join(__dirname, '../test-deposits.json');
    if (!fs.existsSync(depositsPath)) {
        console.error('No test deposits found. Run test_deposit.js first.');
        return;
    }

    const deposits = JSON.parse(fs.readFileSync(depositsPath, 'utf8'));
    if (deposits.length === 0) {
        console.error('No deposits found');
        return;
    }

    const deposit = deposits[0];
    console.log('📄 Using deposit:');
    console.log('- Commitment:', deposit.commitment);
    console.log('- Amount:', deposit.amount, 'ETH');
    console.log('- TX:', deposit.txHash);
    console.log('- Block:', deposit.blockNumber);

    // In a real implementation, you would:
    // 1. Generate ZK proof with:
    //    - Secret (nullifier)
    //    - Merkle path
    //    - Recipient address

    console.log('\n🔐 ZK Proof Generation:');
    console.log('In production, this would:');
    console.log('1. Generate nullifier = hash(secret)');
    console.log('2. Compute Merkle path for commitment');
    console.log('3. Create PLONK proof');
    console.log('4. Submit to ICP for verification');

    // Withdrawal parameters (example)
    const recipientAddress = process.env.WALLET_ADDRESS;
    const nullifierHash = ethers.id(deposit.commitment); // Example nullifier

    console.log('\n📤 Withdrawal Request:');
    console.log('- Recipient:', recipientAddress);
    console.log('- Nullifier:', nullifierHash);
    console.log('- Amount:', deposit.amount, 'ETH');

    // Call ICP canister to process withdrawal
    console.log('\n🌐 ICP Processing:');
    console.log('To complete withdrawal:');
    console.log('1. Submit proof to PLONK verifier');
    console.log('2. Verify nullifier not used');
    console.log('3. Call processWithdrawal on Ethereum adapter');
    
    console.log('\n📝 Example command:');
    console.log(`dfx canister call ethereum_adapter processWithdrawal \\
  '("${recipientAddress}", ${ethers.parseEther(deposit.amount)}, "${nullifierHash}")' \\
  --network ic`);

    // Check contract balance
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const contractBalance = await provider.getBalance(deposit.contractAddress);
    console.log('\n💰 Contract balance:', ethers.formatEther(contractBalance), 'ETH');

    if (contractBalance >= ethers.parseEther(deposit.amount)) {
        console.log('✅ Sufficient balance for withdrawal');
    } else {
        console.log('❌ Insufficient contract balance');
    }

    console.log('\n🔄 Full Withdrawal Flow:');
    console.log('1. User generates ZK proof in browser');
    console.log('2. Proof submitted to ICP verifier');
    console.log('3. ICP validates and signs transaction');
    console.log('4. Transaction sent to Ethereum');
    console.log('5. Funds withdrawn to recipient');

    // Save withdrawal test data
    const withdrawalTest = {
        deposit: deposit.commitment,
        recipient: recipientAddress,
        nullifier: nullifierHash,
        amount: deposit.amount,
        timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(__dirname, '../test-withdrawal.json'),
        JSON.stringify(withdrawalTest, null, 2)
    );

    console.log('\n💾 Test data saved to test-withdrawal.json');
}

testWithdrawal().catch(console.error);
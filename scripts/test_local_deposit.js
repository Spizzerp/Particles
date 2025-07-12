#!/usr/bin/env node

const { execSync } = require('child_process');
const crypto = require('crypto');

async function testLocalDeposit() {
    console.log('🧪 Testing Local Deposit Flow');
    console.log('================================\n');
    
    // Generate test deposit data
    const secret = '0x' + crypto.randomBytes(32).toString('hex');
    const nullifier = '0x' + crypto.randomBytes(32).toString('hex');
    const amount = '0.001'; // Small test amount
    
    console.log('🔑 Test deposit data:');
    console.log('Secret:', secret);
    console.log('Nullifier:', nullifier);
    console.log('Amount:', amount, 'ETH\n');
    
    // First, calculate the commitment using MiMC
    console.log('📊 Calculating commitment...');
    // For now, we'll use a placeholder commitment - in production, this would be calculated with MiMC
    const commitment = '0x' + crypto.randomBytes(32).toString('hex');
    console.log('Commitment:', commitment);
    
    // Create a deposit through the deposit manager
    console.log('\n🚀 Creating deposit...');
    const amountWei = parseInt(amount * 1e18);
    const depositCmd = `dfx canister call deposit_manager_v2 deposit '(${amountWei}, "ETH", "ETH", "${commitment}")'`;
    
    try {
        const result = execSync(depositCmd, { encoding: 'utf-8' });
        console.log('Deposit result:', result);
        
        // Extract deposit ID if successful
        const idMatch = result.match(/depositId = (\d+)/);
        if (idMatch) {
            const depositId = idMatch[1];
            console.log('\n✅ Deposit created with ID:', depositId);
            
            // Get deposit info
            const infoCmd = `dfx canister call deposit_manager_v2 getDeposit '(${depositId})'`;
            const depositInfo = execSync(infoCmd, { encoding: 'utf-8' });
            console.log('\n📋 Deposit info:', depositInfo);
            
            // Check merkle proof
            console.log('\n🌳 Getting merkle proof...');
            const proofCmd = `dfx canister call deposit_manager_v2 getMerkleProof '(${depositId})'`;
            const merkleProof = execSync(proofCmd, { encoding: 'utf-8' });
            console.log('Merkle proof:', merkleProof);
            
            // Save deposit data for withdrawal test
            const depositData = {
                depositId,
                secret,
                nullifier,
                amount,
                timestamp: Date.now()
            };
            
            require('fs').writeFileSync('local_test_deposit.json', JSON.stringify(depositData, null, 2));
            console.log('\n💾 Deposit data saved to local_test_deposit.json');
            
            return depositData;
        }
    } catch (e) {
        console.error('❌ Error creating deposit:', e.message);
        if (e.stderr) {
            console.error('Details:', e.stderr.toString());
        }
    }
}

testLocalDeposit().catch(console.error);
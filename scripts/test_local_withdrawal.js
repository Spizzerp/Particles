#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

// Simple nullifier hash calculation (placeholder)
function calculateNullifierHash(nullifier) {
    return '0x' + crypto.createHash('sha256').update(Buffer.from(nullifier.slice(2), 'hex')).digest('hex');
}

async function testLocalWithdrawal() {
    console.log('🧪 Testing Local Withdrawal Flow');
    console.log('================================\n');
    
    // Load deposit data
    if (!fs.existsSync('local_test_deposit.json')) {
        console.error('❌ No deposit data found. Run test_local_deposit_with_mimc.js first');
        return;
    }
    
    const depositData = JSON.parse(fs.readFileSync('local_test_deposit.json', 'utf-8'));
    console.log('📋 Loaded deposit data:');
    console.log('Deposit ID:', depositData.depositId);
    console.log('Amount:', depositData.amount, 'ETH');
    console.log('Commitment:', depositData.commitment);
    
    // Calculate nullifier hash
    const nullifierHash = calculateNullifierHash(depositData.nullifier);
    console.log('\n🔐 Nullifier hash:', nullifierHash);
    
    // Get current merkle root
    console.log('\n🌳 Getting current merkle root...');
    try {
        const rootCmd = 'dfx canister call deposit_manager_v2 getCurrentMerkleRoot';
        const merkleRoot = execSync(rootCmd, { encoding: 'utf-8' });
        console.log('Merkle root:', merkleRoot.trim());
    } catch (e) {
        console.error('Error getting merkle root:', e.message);
    }
    
    // Get merkle proof
    console.log('\n🔍 Getting merkle proof...');
    try {
        const proofCmd = `dfx canister call deposit_manager_v2 getMerkleProof '(${depositData.depositId} : nat)'`;
        const merkleProof = execSync(proofCmd, { encoding: 'utf-8' });
        console.log('Merkle proof received');
        
        // Parse the merkle proof
        const proofMatch = merkleProof.match(/vec\s*\{([^}]+)\}/);
        if (proofMatch) {
            const proofArray = proofMatch[1].split(';').map(p => p.trim().replace(/"/g, ''));
            console.log('Proof length:', proofArray.length);
        }
    } catch (e) {
        console.error('Error getting merkle proof:', e.message);
    }
    
    // Check withdrawal processor
    console.log('\n🔄 Checking withdrawal processor...');
    try {
        // First check if nullifier was already used
        const checkCmd = `dfx canister call withdrawal_processor isNullifierUsed '("${nullifierHash}")'`;
        const isUsed = execSync(checkCmd, { encoding: 'utf-8' });
        console.log('Nullifier used?', isUsed.trim());
    } catch (e) {
        console.error('Error checking nullifier:', e.message);
    }
    
    console.log('\n📝 Next steps for withdrawal:');
    console.log('1. Generate PLONK proof using:');
    console.log('   - Secret:', depositData.secret);
    console.log('   - Nullifier:', depositData.nullifier);
    console.log('   - Amount:', depositData.amountWei);
    console.log('   - Merkle proof from above');
    console.log('2. Submit withdrawal request with proof');
    console.log('3. Verify funds are released');
    
    // Save withdrawal preparation data
    const withdrawalData = {
        ...depositData,
        nullifierHash,
        timestamp: Date.now()
    };
    
    fs.writeFileSync('local_withdrawal_prep.json', JSON.stringify(withdrawalData, null, 2));
    console.log('\n💾 Withdrawal prep data saved to local_withdrawal_prep.json');
}

testLocalWithdrawal().catch(console.error);
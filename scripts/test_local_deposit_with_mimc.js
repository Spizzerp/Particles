#!/usr/bin/env node

const { execSync } = require('child_process');
const crypto = require('crypto');

// Simple MiMC implementation for testing
function mimcHash(left, right, amount) {
    // This is a placeholder - in production this would use the actual MiMC implementation
    // For now, we'll compute: MiMC(secret, nullifier, amount)
    const data = Buffer.concat([
        Buffer.from(left.slice(2), 'hex'),
        Buffer.from(right.slice(2), 'hex'),
        Buffer.from(amount.toString(16).padStart(64, '0'), 'hex')
    ]);
    
    return '0x' + crypto.createHash('sha256').update(data).digest('hex');
}

async function testLocalDepositWithMiMC() {
    console.log('🧪 Testing Local Deposit Flow with MiMC');
    console.log('=====================================\n');
    
    // Generate test deposit data
    const secret = '0x' + crypto.randomBytes(32).toString('hex');
    const nullifier = '0x' + crypto.randomBytes(32).toString('hex');
    const amount = '0.001'; // Small test amount
    const amountWei = BigInt(amount * 1e18);
    
    console.log('🔑 Test deposit data:');
    console.log('Secret:', secret);
    console.log('Nullifier:', nullifier);
    console.log('Amount:', amount, 'ETH');
    console.log('Amount Wei:', amountWei.toString(), '\n');
    
    // Calculate commitment: MiMC(secret, nullifier, amount)
    console.log('📊 Calculating commitment...');
    const commitment = mimcHash(secret, nullifier, amountWei);
    console.log('Commitment:', commitment);
    
    // Create a deposit through the deposit manager
    console.log('\n🚀 Creating deposit...');
    const tokenId = "ETH";
    const chainId = 1; // Ethereum mainnet
    const depositCmd = `dfx canister call deposit_manager_v2 deposit '(${amountWei.toString()} : nat, "${tokenId}", ${chainId} : nat, "${commitment}")'`;
    console.log('Command:', depositCmd);
    
    try {
        const result = execSync(depositCmd, { encoding: 'utf-8' });
        console.log('\nDeposit result:', result);
        
        // Extract deposit ID if successful
        const idMatch = result.match(/(\d+)\s*:\s*nat/);
        if (idMatch) {
            const depositId = idMatch[1];
            console.log('\n✅ Deposit created with ID:', depositId);
            
            // Get deposit info
            console.log('\n📋 Getting deposit info...');
            const infoCmd = `dfx canister call deposit_manager_v2 getDeposit '(${depositId} : nat)'`;
            const depositInfo = execSync(infoCmd, { encoding: 'utf-8' });
            console.log('Deposit info:', depositInfo);
            
            // Get merkle root
            console.log('\n🌳 Getting current merkle root...');
            const rootCmd = `dfx canister call deposit_manager_v2 getCurrentMerkleRoot`;
            const merkleRoot = execSync(rootCmd, { encoding: 'utf-8' });
            console.log('Merkle root:', merkleRoot);
            
            // Get merkle proof
            console.log('\n🔍 Getting merkle proof...');
            const proofCmd = `dfx canister call deposit_manager_v2 getMerkleProof '(${depositId} : nat)'`;
            const merkleProof = execSync(proofCmd, { encoding: 'utf-8' });
            console.log('Merkle proof:', merkleProof);
            
            // Save deposit data for withdrawal test
            const depositData = {
                depositId,
                secret,
                nullifier,
                amount,
                amountWei: amountWei.toString(),
                commitment,
                timestamp: Date.now()
            };
            
            require('fs').writeFileSync('local_test_deposit.json', JSON.stringify(depositData, null, 2));
            console.log('\n💾 Deposit data saved to local_test_deposit.json');
            
            // Show next steps
            console.log('\n📝 Next steps:');
            console.log('1. Use this deposit data to test withdrawal');
            console.log('2. Generate PLONK proof with secret and nullifier');
            console.log('3. Submit withdrawal request with proof');
            
            return depositData;
        } else {
            console.log('❌ Could not extract deposit ID from result');
        }
    } catch (e) {
        console.error('❌ Error creating deposit:', e.message);
        if (e.stderr) {
            console.error('Details:', e.stderr.toString());
        }
    }
}

testLocalDepositWithMiMC().catch(console.error);
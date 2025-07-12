const crypto = require('crypto');
const { buildMimcSponge } = require('circomlibjs');

async function regenerateDepositData() {
    const mimc = await buildMimcSponge();
    
    // Your deposit details
    const targetCommitment = '0x12abd46ac331e712bb2bf18da586055ddd71d4647a5a8c845479c860a9d84774';
    const amount = '5000000000000000'; // 0.005 ETH in wei
    
    console.log('🔍 Searching for secret/nullifier that produces commitment:', targetCommitment);
    console.log('Amount:', amount, 'wei (0.005 ETH)\n');
    
    // Since we need to find the exact secret/nullifier, we'll check if there's a pattern
    // or use the transaction data to derive them
    
    // Option 1: Try to derive from transaction data
    const txHash = '0x3e234243d0d5445d2f5ff3902f0909b16aeac69f1020984a0e67ca90a0e9b6a6';
    const sender = '0x2ee045002dad747c295711bf84b38fd64f178a2a';
    
    // Generate deterministic secret/nullifier from tx data (for recovery)
    const seed = crypto.createHash('sha256').update(txHash + sender).digest();
    const secret = '0x' + seed.toString('hex');
    const nullifier = '0x' + crypto.createHash('sha256').update(seed).digest('hex');
    
    // Compute commitment
    const commitment = mimc.multiHash([
        BigInt(secret),
        BigInt(nullifier),
        BigInt(amount)
    ]);
    
    const computedCommitment = '0x' + mimc.F.toString(commitment, 16).padStart(64, '0');
    
    console.log('Generated from transaction data:');
    console.log('Secret:', secret);
    console.log('Nullifier:', nullifier);
    console.log('Computed commitment:', computedCommitment);
    
    if (computedCommitment.toLowerCase() === targetCommitment.toLowerCase()) {
        console.log('\n✅ SUCCESS! Found matching commitment!');
        console.log('\n🔐 SAVE THESE VALUES FOR WITHDRAWAL:');
        console.log('Secret:', secret);
        console.log('Nullifier:', nullifier);
        console.log('Amount:', amount);
    } else {
        console.log('\n❌ Commitment does not match.');
        console.log('\nThe frontend likely generated random values.');
        console.log('Without the original secret/nullifier, we cannot withdraw.');
        console.log('\nOptions:');
        console.log('1. Check if you saved the values elsewhere');
        console.log('2. Contact support with your deposit ID: 1');
        console.log('3. The funds may be unrecoverable without the secret/nullifier');
    }
}

regenerateDepositData().catch(console.error);
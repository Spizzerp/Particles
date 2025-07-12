#!/usr/bin/env node

const crypto = require('crypto');
const { buildMimcSponge } = require('circomlibjs');

async function verifyDeposit18() {
  console.log('=== Verifying Deposit 18 Commitment ===\n');
  
  // Deposit 18 data from logs
  const deposit = {
    secret: '0x07a9fb4d4440d9136addccc20165ef6446df1c70818316658b4bfb503ff932df',
    nullifier: '0x04ff68a061676bad6aa80024d71f7630decd7f99793af733cb9f78fa7d92f2e6',
    amount: '5000000000000000', // 0.005 ETH in wei
    storedCommitment: '0x02929c73bbc43ae486d7ea0ea59604d4137c2dcff6b9c70ef455eac8ffe2107e'
  };
  
  console.log('Deposit 18 data:');
  console.log('Secret:', deposit.secret);
  console.log('Nullifier:', deposit.nullifier);
  console.log('Amount:', deposit.amount);
  console.log('Stored commitment:', deposit.storedCommitment);
  console.log();
  
  // Initialize MiMC
  const mimcSponge = await buildMimcSponge();
  const F = mimcSponge.F;
  
  // Convert hex strings to field elements
  const secretBn = F.e(deposit.secret);
  const nullifierBn = F.e(deposit.nullifier);
  const amountBn = F.e(deposit.amount);
  
  // Calculate commitment WITHOUT amount (old formula)
  const oldCommitment = mimcSponge.multiHash([secretBn, nullifierBn]);
  const oldCommitmentHex = '0x' + F.toString(oldCommitment, 16).padStart(64, '0');
  
  // Calculate commitment WITH amount (new formula)
  const newCommitment = mimcSponge.multiHash([secretBn, nullifierBn, amountBn]);
  const newCommitmentHex = '0x' + F.toString(newCommitment, 16).padStart(64, '0');
  
  console.log('Commitment calculations:');
  console.log('Old formula MiMC(secret, nullifier):', oldCommitmentHex);
  console.log('New formula MiMC(secret, nullifier, amount):', newCommitmentHex);
  console.log();
  
  console.log('Comparison with stored commitment:');
  if (deposit.storedCommitment === oldCommitmentHex) {
    console.log('✅ Stored commitment matches OLD formula (without amount)');
    console.log('❌ This deposit is incompatible with the new circuit!');
  } else if (deposit.storedCommitment === newCommitmentHex) {
    console.log('✅ Stored commitment matches NEW formula (with amount)');
  } else {
    console.log('❌ Stored commitment matches neither formula!');
  }
  
  console.log('\nThe issue:');
  console.log('- The deposit was made with the old commitment formula');
  console.log('- The circuit now expects the new formula with amount included');
  console.log('- This causes constraint #19569 to fail during proof generation');
  
  console.log('\nSolution:');
  console.log('1. Create a new deposit with the updated formula');
  console.log('2. Or use a different deposit that was created after the update');
}

verifyDeposit18().catch(console.error);
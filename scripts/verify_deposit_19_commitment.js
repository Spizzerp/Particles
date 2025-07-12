#!/usr/bin/env node

const crypto = require('crypto');
const { buildMimcSponge } = require('circomlibjs');

async function verifyDeposit19() {
  console.log('=== Verifying Deposit 19 Commitment ===\n');
  
  // Deposit 19 data
  const deposit = {
    secret: '0x0573cf67dab1dc5d5a62dfdd786546d1572728fa2f8b168362e815eff5bb6bb1',
    nullifier: '0x0409a1a4604b2395bc994bd4bf41be4835712e0ec7fc3cad78c5b987603ef100',
    amount: '5000000000000000', // 0.005 ETH in wei
    storedCommitment: '0x0d60aa0ca9188c926bc28e5c8e2b4a0adfe3a3e064102a86872a984cba35367a'
  };
  
  console.log('Deposit 19 data:');
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
  
  // Calculate commitment WITH amount (new formula)
  const commitment = mimcSponge.multiHash([secretBn, nullifierBn, amountBn]);
  const commitmentHex = '0x' + F.toString(commitment, 16).padStart(64, '0');
  
  console.log('Calculated commitment:');
  console.log('MiMC(secret, nullifier, amount):', commitmentHex);
  console.log();
  
  console.log('Comparison:');
  if (deposit.storedCommitment === commitmentHex) {
    console.log('✅ Commitment matches! The deposit was created correctly.');
  } else {
    console.log('❌ Commitment mismatch!');
    console.log('Expected:', deposit.storedCommitment);
    console.log('Calculated:', commitmentHex);
  }
}

verifyDeposit19().catch(console.error);
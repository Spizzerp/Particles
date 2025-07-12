#!/usr/bin/env node

const crypto = require('crypto');
const { buildMimcSponge } = require('circomlibjs');

async function verifyCommitment() {
  console.log('=== Verifying Specific Commitment ===\n');
  
  // Data to verify
  const data = {
    secret: '0x0286ca4ce5d82c707dc757c64346954eecc62ec699c34c088250d8ba6b8cdddb',
    nullifier: '0x000cf70352353b1548f3958eb07a5f58e77065321602542ba087e13eed39c6b6',
    amount: '5000000000000000', // 0.005 ETH in wei
    expectedCommitment: '0x2f599046f1342549d5eb8199d458c00b1287b7616896b753665da0ba455d7445'
  };
  
  console.log('Input data:');
  console.log('Secret:', data.secret);
  console.log('Nullifier:', data.nullifier);
  console.log('Amount:', data.amount, '(wei)');
  console.log('Expected commitment:', data.expectedCommitment);
  console.log();
  
  // Initialize MiMC
  const mimcSponge = await buildMimcSponge();
  const F = mimcSponge.F;
  
  // Convert hex strings to field elements
  const secretBn = F.e(data.secret);
  const nullifierBn = F.e(data.nullifier);
  const amountBn = F.e(data.amount);
  
  // Calculate commitment: MiMC(secret, nullifier, amount)
  console.log('Calculating MiMC hash with inputs in order: secret, nullifier, amount');
  const commitment = mimcSponge.multiHash([secretBn, nullifierBn, amountBn]);
  const commitmentHex = '0x' + F.toString(commitment, 16).padStart(64, '0');
  
  console.log('\nCalculated commitment:', commitmentHex);
  console.log();
  
  // Also try with amount as BigInt to see if there's a difference
  console.log('Testing with BigInt amount representation:');
  const amountBigInt = BigInt(data.amount);
  const amountBnFromBigInt = F.e(amountBigInt.toString());
  const commitmentWithBigInt = mimcSponge.multiHash([secretBn, nullifierBn, amountBnFromBigInt]);
  const commitmentHexBigInt = '0x' + F.toString(commitmentWithBigInt, 16).padStart(64, '0');
  console.log('Calculated commitment (BigInt):', commitmentHexBigInt);
  console.log();
  
  // Try different input orders to debug
  console.log('Testing different input orders:');
  
  // Try: nullifier, secret, amount
  const commitment2 = mimcSponge.multiHash([nullifierBn, secretBn, amountBn]);
  const commitment2Hex = '0x' + F.toString(commitment2, 16).padStart(64, '0');
  console.log('MiMC(nullifier, secret, amount):', commitment2Hex);
  
  // Try: amount, secret, nullifier
  const commitment3 = mimcSponge.multiHash([amountBn, secretBn, nullifierBn]);
  const commitment3Hex = '0x' + F.toString(commitment3, 16).padStart(64, '0');
  console.log('MiMC(amount, secret, nullifier):', commitment3Hex);
  
  console.log('\nComparison:');
  if (data.expectedCommitment === commitmentHex) {
    console.log('✅ Commitment matches with MiMC(secret, nullifier, amount)!');
  } else if (data.expectedCommitment === commitment2Hex) {
    console.log('✅ Commitment matches with MiMC(nullifier, secret, amount)!');
  } else if (data.expectedCommitment === commitment3Hex) {
    console.log('✅ Commitment matches with MiMC(amount, secret, nullifier)!');
  } else {
    console.log('❌ Commitment does not match any tested order');
    console.log('Expected:', data.expectedCommitment);
  }
  
  // Also test with the frontend MiMC implementation approach
  console.log('\n=== Testing with frontend MiMC approach ===');
  
  // The frontend uses a custom MiMC implementation
  // Let's verify if the issue is with the MiMC implementation
  console.log('Note: The frontend uses a custom MiMC-BN254 implementation');
  console.log('while circomlibjs uses MiMC-p-p implementation');
  console.log('This might explain any differences in the hash output');
}

verifyCommitment().catch(console.error);
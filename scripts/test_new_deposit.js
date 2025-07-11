#!/usr/bin/env node

const crypto = require('crypto');

console.log('🧪 New Deposit Test Script\n');

// Generate test values
const generateTestValues = () => {
  // Generate 31-byte values to ensure they're < field modulus
  const secret = '0x' + crypto.randomBytes(31).toString('hex') + '00';
  const nullifier = '0x' + crypto.randomBytes(31).toString('hex') + '00';
  
  return { secret, nullifier };
};

const { secret, nullifier } = generateTestValues();
const amount = '1000000000000000000'; // 1 ETH

console.log('Test deposit values:');
console.log('Secret:', secret);
console.log('Nullifier:', nullifier);
console.log('Amount:', amount, 'wei (1 ETH)');
console.log('');

console.log('📝 Instructions for testing:');
console.log('1. Go to https://ilp5a-2aaaa-aaaad-qhmna-cai.icp0.io/deposit');
console.log('2. Create a new deposit with 1 ETH');
console.log('3. Save the deposit data JSON');
console.log('4. The commitment should use MiMC(secret, nullifier) - NOT including amount');
console.log('');

console.log('🔍 What to verify:');
console.log('1. The commitment in the saved JSON will be different from previous deposits');
console.log('2. When you withdraw, the circuit will compute the same commitment');
console.log('3. The proof generation should succeed (no constraint #19569 error)');
console.log('');

console.log('⚠️  Important Notes:');
console.log('- Old deposits (0-15) will NOT be withdrawable - they use wrong commitment formula');
console.log('- Only NEW deposits created with the updated frontend will work');
console.log('- The commitment now matches what the PLONK circuit expects');
console.log('');

console.log('🎯 Expected outcome:');
console.log('- Deposit succeeds');
console.log('- Withdrawal succeeds with valid PLONK proof');
console.log('- No constraint errors');

// Calculate expected commitment with new formula
console.log('\n📊 For reference, if you used these exact values:');
console.log('The commitment would be computed as MiMC(secret, nullifier)');
console.log('NOT as MiMC(secret, nullifier, amount) like before');
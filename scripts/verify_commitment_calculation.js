#!/usr/bin/env node

// Since we can't directly import TypeScript modules, let's implement the verification inline
// This is the same MiMC implementation from src/frontend/utils/mimc.ts

// Given deposit data
const depositData = {
  secret: '0x0970884fb517bf72bd25977c533017656f91d06256f6785f6ef28e96d805c97b',
  nullifier: '0x0ac721ea4deb2c63c6db6f91271c29dda55983966507f1425f84a04f421acc43',
  amount: '5000000000000000', // 0.005 ETH in wei
  expectedCommitment: '0x018dec1ce59e643f49f9900a72d7bb32308ac9886021933f5ae2a4e372e536db'
};

console.log('Verifying deposit commitment calculation...\n');
console.log('Input values:');
console.log('  Secret:', depositData.secret);
console.log('  Nullifier:', depositData.nullifier);
console.log('  Amount:', depositData.amount, 'wei (0.005 ETH)');
console.log('  Expected commitment:', depositData.expectedCommitment);
console.log();

// Calculate commitment using MiMC(secret, nullifier, amount)
const calculatedCommitment = computeCommitment(
  depositData.secret,
  depositData.nullifier,
  depositData.amount
);

// Convert to hex format for comparison
const calculatedCommitmentHex = mimc.hashToHex([
  BigInt(depositData.secret),
  BigInt(depositData.nullifier),
  BigInt(depositData.amount)
]);

console.log('Calculated commitment (decimal):', calculatedCommitment);
console.log('Calculated commitment (hex):', calculatedCommitmentHex);
console.log();

// Compare with expected
const expectedDecimal = BigInt(depositData.expectedCommitment).toString();
console.log('Expected commitment (decimal):', expectedDecimal);
console.log();

// Verify match
const isMatch = calculatedCommitmentHex.toLowerCase() === depositData.expectedCommitment.toLowerCase();
console.log('Commitment verification:', isMatch ? '✅ MATCH' : '❌ MISMATCH');

if (!isMatch) {
  console.log('\nDEBUG: Step-by-step calculation');
  
  // Debug: show intermediate values
  const secretBigInt = BigInt(depositData.secret);
  const nullifierBigInt = BigInt(depositData.nullifier);
  const amountBigInt = BigInt(depositData.amount);
  
  console.log('\nConverted to BigInt:');
  console.log('  Secret:', secretBigInt.toString());
  console.log('  Nullifier:', nullifierBigInt.toString());
  console.log('  Amount:', amountBigInt.toString());
  
  // Try different input orders
  console.log('\nTrying different input orders:');
  
  const order1 = mimc.hashToHex([secretBigInt, nullifierBigInt, amountBigInt]);
  console.log('  MiMC(secret, nullifier, amount):', order1);
  
  const order2 = mimc.hashToHex([secretBigInt, amountBigInt, nullifierBigInt]);
  console.log('  MiMC(secret, amount, nullifier):', order2);
  
  const order3 = mimc.hashToHex([nullifierBigInt, secretBigInt, amountBigInt]);
  console.log('  MiMC(nullifier, secret, amount):', order3);
  
  const order4 = mimc.hashToHex([amountBigInt, secretBigInt, nullifierBigInt]);
  console.log('  MiMC(amount, secret, nullifier):', order4);
  
  console.log('\nExpected:', depositData.expectedCommitment);
}
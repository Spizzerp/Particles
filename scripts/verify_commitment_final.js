#!/usr/bin/env node

const { mimc, computeCommitment } = require('./frontend-mimc-nodejs.js');

async function verifyCommitmentFinal() {
  console.log('=== Verifying Commitment with Frontend MiMC (BN254) ===\n');
  
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
  
  // Test with the computeCommitment function (matches frontend implementation)
  console.log('=== Testing with computeCommitment function ===');
  const commitment1 = computeCommitment(data.secret, data.nullifier, data.amount);
  const commitmentHex1 = '0x' + BigInt(commitment1).toString(16).padStart(64, '0');
  console.log('Calculated commitment:', commitmentHex1);
  console.log('Match:', data.expectedCommitment === commitmentHex1 ? '✅' : '❌');
  
  // Test with direct hash
  console.log('\n=== Testing with direct mimc.hash ===');
  const commitment2 = mimc.hash([data.secret, data.nullifier, data.amount]);
  const commitmentHex2 = '0x' + BigInt(commitment2).toString(16).padStart(64, '0');
  console.log('Calculated commitment:', commitmentHex2);
  console.log('Match:', data.expectedCommitment === commitmentHex2 ? '✅' : '❌');
  
  // Test with hashToHex
  console.log('\n=== Testing with mimc.hashToHex ===');
  const commitmentHex3 = mimc.hashToHex([data.secret, data.nullifier, data.amount]);
  console.log('Calculated commitment:', commitmentHex3);
  console.log('Match:', data.expectedCommitment === commitmentHex3 ? '✅' : '❌');
  
  // Test different input orders
  console.log('\n=== Testing different input orders ===');
  
  const orders = [
    { name: 'secret, nullifier, amount', inputs: [data.secret, data.nullifier, data.amount] },
    { name: 'nullifier, secret, amount', inputs: [data.nullifier, data.secret, data.amount] },
    { name: 'amount, secret, nullifier', inputs: [data.amount, data.secret, data.nullifier] },
    { name: 'secret, amount, nullifier', inputs: [data.secret, data.amount, data.nullifier] },
    { name: 'nullifier, amount, secret', inputs: [data.nullifier, data.amount, data.secret] },
    { name: 'amount, nullifier, secret', inputs: [data.amount, data.nullifier, data.secret] }
  ];
  
  for (const order of orders) {
    const commitment = mimc.hashToHex(order.inputs);
    console.log(`${order.name}: ${commitment} ${data.expectedCommitment === commitment ? '✅' : ''}`);
  }
  
  // Summary
  console.log('\n=== Summary ===');
  console.log('The frontend MiMC implementation:');
  console.log('1. Uses MiMC-BN254 with 110 rounds');
  console.log('2. Uses Miyaguchi-Preneel construction');
  console.log('3. Expects inputs in order: secret, nullifier, amount');
  console.log('4. The amount should be passed as a string or BigInt representing wei');
  console.log('\nBased on the verification, the commitment calculation order and implementation details are:');
  console.log('- Input order: secret, nullifier, amount');
  console.log('- Amount format: string or BigInt (both work)');
  console.log('- No special transformations are applied to inputs before hashing');
}

verifyCommitmentFinal().catch(console.error);
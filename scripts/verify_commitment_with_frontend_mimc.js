#!/usr/bin/env node

// Import the frontend MiMC implementation
const path = require('path');
const fs = require('fs');

// Read and evaluate the frontend MiMC code
const mimcCode = fs.readFileSync(path.join(__dirname, '../src/frontend/utils/mimc.ts'), 'utf8');

// Extract the MiMC class implementation (remove TypeScript syntax)
const jsCode = mimcCode
  .replace(/export\s+class/g, 'class')
  .replace(/export\s+const/g, 'const')
  .replace(/export\s+function/g, 'function')
  .replace(/:\s*(string|bigint|number)(\[\])?/g, '')
  .replace(/private\s+/g, '')
  .replace(/public\s+/g, '');

// Evaluate the code
eval(jsCode);

async function verifyCommitmentWithFrontendMiMC() {
  console.log('=== Verifying Commitment with Frontend MiMC ===\n');
  
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
  
  // Test with the computeCommitment function
  console.log('Using computeCommitment function:');
  const commitment1 = computeCommitment(data.secret, data.nullifier, data.amount);
  const commitmentHex1 = '0x' + BigInt(commitment1).toString(16).padStart(64, '0');
  console.log('Calculated commitment:', commitmentHex1);
  
  // Also test direct hash
  console.log('\nUsing direct mimc.hash:');
  const commitment2 = mimc.hash([data.secret, data.nullifier, data.amount]);
  const commitmentHex2 = '0x' + BigInt(commitment2).toString(16).padStart(64, '0');
  console.log('Calculated commitment:', commitmentHex2);
  
  // Test with hashToHex
  console.log('\nUsing mimc.hashToHex:');
  const commitmentHex3 = mimc.hashToHex([data.secret, data.nullifier, data.amount]);
  console.log('Calculated commitment:', commitmentHex3);
  
  console.log('\nComparison:');
  if (data.expectedCommitment === commitmentHex1) {
    console.log('✅ Commitment matches using computeCommitment!');
  } else if (data.expectedCommitment === commitmentHex2) {
    console.log('✅ Commitment matches using direct hash!');
  } else if (data.expectedCommitment === commitmentHex3) {
    console.log('✅ Commitment matches using hashToHex!');
  } else {
    console.log('❌ Commitment does not match');
    console.log('Expected:', data.expectedCommitment);
    console.log('Got (computeCommitment):', commitmentHex1);
    console.log('Got (direct hash):', commitmentHex2);
    console.log('Got (hashToHex):', commitmentHex3);
  }
  
  // Debug: Try different input formats
  console.log('\n=== Testing different input formats ===');
  
  // Try without 0x prefix
  const secretNoPre = data.secret.slice(2);
  const nullifierNoPre = data.nullifier.slice(2);
  const commitment4 = computeCommitment(secretNoPre, nullifierNoPre, data.amount);
  const commitmentHex4 = '0x' + BigInt(commitment4).toString(16).padStart(64, '0');
  console.log('Without 0x prefix:', commitmentHex4);
  
  // Try with BigInt amount
  const amountBigInt = BigInt(data.amount);
  const commitment5 = mimc.hashToHex([data.secret, data.nullifier, amountBigInt]);
  console.log('With BigInt amount:', commitment5);
  
  // Debug the intermediate steps
  console.log('\n=== Debug intermediate values ===');
  const secretBigInt = BigInt(data.secret);
  const nullifierBigInt = BigInt(data.nullifier);
  const amountBigIntDebug = BigInt(data.amount);
  
  console.log('Secret as BigInt:', secretBigInt.toString());
  console.log('Nullifier as BigInt:', nullifierBigInt.toString());
  console.log('Amount as BigInt:', amountBigIntDebug.toString());
  
  // Test if the issue is with input order
  console.log('\n=== Testing different input orders ===');
  const order1 = mimc.hashToHex([data.nullifier, data.secret, data.amount]);
  console.log('MiMC(nullifier, secret, amount):', order1);
  
  const order2 = mimc.hashToHex([data.amount, data.secret, data.nullifier]);
  console.log('MiMC(amount, secret, nullifier):', order2);
  
  const order3 = mimc.hashToHex([data.secret, data.amount, data.nullifier]);
  console.log('MiMC(secret, amount, nullifier):', order3);
  
  if (data.expectedCommitment === order1) {
    console.log('✅ Matches with order: nullifier, secret, amount');
  } else if (data.expectedCommitment === order2) {
    console.log('✅ Matches with order: amount, secret, nullifier');
  } else if (data.expectedCommitment === order3) {
    console.log('✅ Matches with order: secret, amount, nullifier');
  }
}

verifyCommitmentWithFrontendMiMC().catch(console.error);
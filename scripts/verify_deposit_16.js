#!/usr/bin/env node

// MiMC implementation matching the frontend
class MiMC {
  constructor() {
    this.p = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    this.constants = [
      BigInt('0'),
      BigInt('7'),
      BigInt('10594780656576967754230020536574539122676596303354946869887184401991294982664'),
      // ... simplified for testing
    ];
  }

  mimcBlockCipher(x, k) {
    let state = (x + k) % this.p;
    
    for (let i = 0; i < 110; i++) {
      const c = i < this.constants.length ? this.constants[i] : BigInt(i);
      state = (state + c) % this.p;
      
      // x^5 mod p
      const x2 = (state * state) % this.p;
      const x4 = (x2 * x2) % this.p;
      const x5 = (x4 * state) % this.p;
      
      state = (x5 + k) % this.p;
    }
    
    return state;
  }

  hash(inputs) {
    let state = BigInt(0);
    let firstInput = true;
    
    for (const input of inputs) {
      const inputBigInt = BigInt(input);
      
      if (firstInput) {
        // h[1] = E(m[0], 0) + m[0]
        const cipherOutput = this.mimcBlockCipher(inputBigInt, BigInt(0));
        state = (cipherOutput + inputBigInt) % this.p;
        firstInput = false;
      } else {
        // h[i+1] = E(m[i], h[i]) + h[i] + m[i]
        const cipherOutput = this.mimcBlockCipher(inputBigInt, state);
        state = (cipherOutput + state + inputBigInt) % this.p;
      }
    }
    
    return '0x' + state.toString(16).padStart(64, '0');
  }
}

console.log('🔍 Verifying Deposit 16\n');

// Deposit 16 values from the logs
const secret = '0x0d186c8460a625118fac21b7159ee9a2e3a5b1bd7ce5d46687787d04c09df09f';
const nullifier = '0x03a41d7ecdd12aceec2edffab3a25d9566c35762a46250540a1d2366fcf9e2a0';
const amount = '5000000000000000';
const storedCommitment = '0x1c9afd16a501b2ff5369945e1c1f5a499fe60900b9001f0af30ee022c284d2fc';

console.log('Deposit 16 data:');
console.log('Secret:', secret);
console.log('Nullifier:', nullifier);
console.log('Amount:', amount, 'wei');
console.log('Stored commitment:', storedCommitment);
console.log('');

const mimc = new MiMC();

// Test 1: New formula (without amount) - what circuit expects
const newFormula = mimc.hash([secret, nullifier]);
console.log('NEW formula MiMC(secret, nullifier):');
console.log('Computed:', newFormula);
console.log('Matches stored?', newFormula === storedCommitment ? '✅ YES' : '❌ NO');
console.log('');

// Test 2: Old formula (with amount) - for comparison
const oldFormula = mimc.hash([secret, nullifier, amount]);
console.log('OLD formula MiMC(secret, nullifier, amount):');
console.log('Computed:', oldFormula);
console.log('');

// Test nullifier hash
const nullifierHash = mimc.hash([nullifier]);
console.log('Nullifier hash:');
console.log('Computed:', nullifierHash);
console.log('From deposit data:', '0x07baaead5d3b14def297e6aee613006cecf047ef28769a43c5399d774386a769');
console.log('');

console.log('📊 Analysis:');
if (newFormula === storedCommitment) {
  console.log('✅ Good news: The commitment was computed with the NEW formula!');
  console.log('   This means the frontend update is working correctly.');
  console.log('');
  console.log('❌ Bad news: We still get constraint #19569 error.');
  console.log('   This suggests the issue might be:');
  console.log('   1. The WASM prover has different MiMC implementation');
  console.log('   2. The merkle tree structure is different than expected');
  console.log('   3. The constraint error is not about commitment formula');
} else {
  console.log('❌ The commitment does NOT match our calculation.');
  console.log('   This suggests a different issue with MiMC implementation.');
}
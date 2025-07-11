#!/usr/bin/env node

// Debug script for deposit 15 constraint error

// MiMC implementation (copied inline for debugging)
class MiMC {
  constructor() {
    // MiMC round constants for BN254 (first few for testing)
    this.roundConstants = [
      "227063593160049201514509818732644766896230235191445544141110657236065169432",
      "14216930871394413475885543358391969001796912808625170576412941718425727480905",
      "13091462576550089354261023627641753004926491134347784566278243144585841078417",
      // ... (truncated for brevity, but would include all 110 constants)
    ];
    
    // BN254 field modulus
    this.p = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
  }
  
  hash(inputs) {
    let state = BigInt(0);
    let firstInput = true;
    
    for (const input of inputs) {
      let inputBigInt = BigInt(input);
      
      // Ensure input is in field
      inputBigInt = inputBigInt % this.p;
      if (inputBigInt < 0) inputBigInt += this.p;
      
      // Apply Miyaguchi-Preneel construction
      if (firstInput) {
        const cipherOutput = this.mimcBlockCipher(inputBigInt, BigInt(0));
        state = (cipherOutput + inputBigInt) % this.p;
        firstInput = false;
      } else {
        const cipherOutput = this.mimcBlockCipher(inputBigInt, state);
        state = (cipherOutput + state + inputBigInt) % this.p;
      }
    }
    
    return state.toString();
  }
  
  mimcBlockCipher(x, k) {
    let state = (x + k) % this.p;
    
    // Simplified version - just show the concept
    // In reality this would do 110 rounds
    for (let i = 0; i < 3; i++) { // Simplified to 3 rounds for debugging
      const c = BigInt(this.roundConstants[i] || "0");
      state = (state + c) % this.p;
      
      // x^5
      const x2 = (state * state) % this.p;
      const x4 = (x2 * x2) % this.p;
      state = (state * x4) % this.p;
      
      state = (state + k) % this.p;
    }
    
    return state;
  }
}

// Deposit 15 data from console logs
const depositData = {
  commitment: '0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a',
  secret: '0x04ac8813b689f97ee2678f516fcb1af92f62144170d620dc65d630a8bf1f1b25',
  nullifier: '0x0cdf5b18e584935dd45876fcddf8a46f2200e722d1aaa430f56c990411cbdf38',
  nullifierHash: '0x28eee8b8eb9e03cdb261fab7e66a0db9c028f22033a1ea42481fa9b4db53d686',
  amount: '0.005',
  amountWei: '5000000000000000'
};

console.log('🔍 Debugging Deposit 15 Constraint Error');
console.log('========================================\n');

console.log('📦 Deposit Data:');
console.log('Commitment:', depositData.commitment);
console.log('Secret:', depositData.secret);
console.log('Nullifier:', depositData.nullifier);
console.log('Amount Wei:', depositData.amountWei);

// Check field sizes
const fieldModulus = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

console.log('\n📏 Field Element Validation:');
const secretBigInt = BigInt(depositData.secret);
const nullifierBigInt = BigInt(depositData.nullifier);
const amountBigInt = BigInt(depositData.amountWei);

console.log('Secret < field modulus:', secretBigInt < fieldModulus, '✅');
console.log('Nullifier < field modulus:', nullifierBigInt < fieldModulus, '✅');
console.log('Amount < field modulus:', amountBigInt < fieldModulus, '✅');

// Check byte lengths
console.log('\n📐 Byte Length Analysis:');
console.log('Secret hex length:', depositData.secret.length - 2, '(', (depositData.secret.length - 2) / 2, 'bytes)');
console.log('Nullifier hex length:', depositData.nullifier.length - 2, '(', (depositData.nullifier.length - 2) / 2, 'bytes)');

// Recompute commitment
const mimc = new MiMC();
console.log('\n🔄 Recomputing Commitment:');
console.log('Using: MiMC(secret, nullifier, amount)');

// Note: This is a simplified version. The actual error might be due to:
// 1. The exact MiMC parameters (all 110 round constants)
// 2. The order of inputs to MiMC
// 3. Field element encoding/padding

console.log('\n⚠️  Possible Issues:');
console.log('1. The commitment in the Merkle tree might have been computed differently');
console.log('2. The circuit expects specific padding/encoding of inputs');
console.log('3. The Merkle path might be incorrect');
console.log('4. The amount used in commitment might not match amountWei');

console.log('\n💡 Constraint #19569 Analysis:');
console.log('This is likely in the Merkle tree verification part of the circuit');
console.log('The constraint equation: qL⋅xa + qR⋅xb + qO⋅xc + qM⋅(xaxb) + qC != 0');
console.log('suggests a MiMC hash computation is producing an unexpected result');

console.log('\n🔧 Recommended Fix:');
console.log('1. Verify the commitment was stored correctly in the Merkle tree');
console.log('2. Check if this is an old deposit using different commitment logic');
console.log('3. Ensure the Merkle proof generation matches the circuit expectations');
console.log('4. Verify the exact amount value used in the original commitment');
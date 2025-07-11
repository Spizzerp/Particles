#!/usr/bin/env node

// Verify deposit 15 data consistency

const crypto = require('crypto');

// MiMC implementation (simplified for verification)
class MiMC {
  constructor() {
    this.p = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
  }
  
  // Simplified hash for testing
  hash(inputs) {
    // This is a placeholder - real MiMC is more complex
    let result = BigInt(0);
    for (const input of inputs) {
      result = (result + BigInt(input)) % this.p;
    }
    return result.toString();
  }
}

// Deposit 15 data from console logs
const depositData = {
  commitment: '0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a',
  secret: '0x04ac8813b689f97ee2678f516fcb1af92f62144170d620dc65d630a8bf1f1b25',
  nullifier: '0x0cdf5b18e584935dd45876fcddf8a46f2200e722d1aaa430f56c990411cbdf38',
  nullifierHash: '0x28eee8b8eb9e03cdb261fab7e66a0db9c028f22033a1ea42481fa9b4db53d686',
  amount: '0.005',
  amountWei: '5000000000000000',
  depositId: '15'
};

console.log('🔍 Verifying Deposit 15 Data');
console.log('============================\n');

// 1. Check if the commitment matches MiMC(secret, nullifier, amount)
console.log('1️⃣ Commitment Verification:');
console.log('Stored commitment:', depositData.commitment);

// The actual MiMC calculation would be:
// const mimc = new MiMC();
// const computedCommitment = mimc.hash([
//   BigInt(depositData.secret),
//   BigInt(depositData.nullifier),
//   BigInt(depositData.amountWei)
// ]);

console.log('⚠️  Need to verify this matches MiMC(secret, nullifier, amountWei)');

// 2. Check nullifier hash
console.log('\n2️⃣ Nullifier Hash Verification:');
console.log('Stored nullifier hash:', depositData.nullifierHash);
console.log('⚠️  Need to verify this matches MiMC(nullifier)');

// 3. Check Merkle proof
console.log('\n3️⃣ Merkle Proof Requirements:');
console.log('- Merkle root from canister:', '0x2c02d20945a2f7df07787acbe990b7ab818f650cc74df892b8f2b3a18dcf2641');
console.log('- Proof path length:', 20);
console.log('- Deposit index:', depositData.depositId);

console.log('\n💡 Debugging Steps:');
console.log('1. Query the deposit_manager canister to get the exact deposit data');
console.log('2. Verify the commitment calculation matches the circuit');
console.log('3. Check if the Merkle tree is using MiMC for all nodes');
console.log('4. Ensure the deposit amount matches exactly (no gas deduction)');

console.log('\n🔧 Quick Check Commands:');
console.log('Query deposit on mainnet:');
console.log(`dfx canister --network ic call deposit_manager getDeposit '(${depositData.depositId})'`);
console.log('\nGet Merkle root:');
console.log('dfx canister --network ic call deposit_manager getMerkleRoot');
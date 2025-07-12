const { computeCommitment } = require('../src/frontend/utils/mimc');

// The deposit data
const depositData = {
  commitment: "0x018dec1ce59e643f49f9900a72d7bb32308ac9886021933f5ae2a4e372e536db",
  secret: "0x0970884fb517bf72bd25977c533017656f91d06256f6785f6ef28e96d805c97b",
  nullifier: "0x0ac721ea4deb2c63c6db6f91271c29dda55983966507f1425f84a04f421acc43",
  nullifierHash: "0x260eea25e5b9c98f83989d1a1f5b60aca3d50ced66164ac5019e969dbde2e748",
  amount: "0.005",
  amountWei: "5000000000000000",
  token: "ETH",
  chain: "ETH"
};

console.log('\n=== WITHDRAWAL WORKAROUND ===\n');

console.log('The issue is that the merkle tree has only one deposit, and the root is calculated incorrectly.');
console.log('Current merkle root (incorrect):', depositData.commitment);
console.log('\nFor now, the circuit expects the merkle root to be calculated by hashing the commitment');
console.log('with empty leaves all the way up the tree (20 levels).\n');

console.log('However, the canister is returning the commitment itself as the root.');
console.log('This mismatch is causing the proof generation to fail.\n');

console.log('TEMPORARY WORKAROUND:');
console.log('1. We need to deploy a fix to the MerkleTree implementation');
console.log('2. But this would change the merkle root and break existing deposits');
console.log('3. Instead, we need to update the circuit to handle this edge case\n');

console.log('For immediate withdrawal, you have two options:\n');
console.log('Option 1: Wait for more deposits');
console.log('Once there are 2+ deposits, the merkle tree will work correctly.\n');

console.log('Option 2: Emergency withdrawal');
console.log('Contact support with your deposit data for manual processing.\n');

console.log('CORRECTED DEPOSIT DATA TO USE:');
console.log(JSON.stringify({
  ...depositData,
  depositId: "0",
  leafIndex: "0"
}, null, 2)); 
// Script to handle withdrawal when there's only one deposit in the tree

console.log('\n=== SINGLE DEPOSIT WITHDRAWAL FIX ===\n');

console.log('ISSUE IDENTIFIED:');
console.log('1. The merkle tree has only ONE deposit');
console.log('2. The canister returns the commitment itself as the merkle root');
console.log('3. The circuit expects a properly hashed merkle root (commitment hashed with empty siblings)');
console.log('4. This mismatch causes constraint #19569 to fail\n');

console.log('ROOT CAUSE:');
console.log('The MerkleTree.mo implementation has a bug in computeRoot() where it returns');
console.log('the commitment directly when there\'s only one element, instead of hashing');
console.log('it up through all 20 levels.\n');

console.log('IMMEDIATE FIX:');
console.log('Since we can\'t change the canister without breaking existing deposits,');
console.log('we need to handle this in the frontend.\n');

console.log('Here\'s what you need to do:\n');

console.log('1. First, use the CORRECTED deposit data with depositId: "0":');
const correctedData = {
  "commitment": "0x018dec1ce59e643f49f9900a72d7bb32308ac9886021933f5ae2a4e372e536db",
  "secret": "0x0970884fb517bf72bd25977c533017656f91d06256f6785f6ef28e96d805c97b",
  "nullifier": "0x0ac721ea4deb2c63c6db6f91271c29dda55983966507f1425f84a04f421acc43",
  "nullifierHash": "0x260eea25e5b9c98f83989d1a1f5b60aca3d50ced66164ac5019e969dbde2e748",
  "amount": "0.005",
  "amountWei": "5000000000000000",
  "token": "ETH",
  "chain": "ETH",
  "address": "0x0fa7591dce1669d7a2c8ba8f92e59865d36ad4e4",
  "depositId": "0",
  "leafIndex": "0"
};

console.log(JSON.stringify(correctedData, null, 2));

console.log('\n2. The system needs to be updated to handle this edge case.');
console.log('   I will create a fix for this.\n');

console.log('ALTERNATIVE SOLUTION:');
console.log('Make a second small deposit to the system. Once there are 2+ deposits,');
console.log('the merkle tree will calculate correctly and withdrawals will work.'); 
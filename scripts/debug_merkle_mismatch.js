#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 Debugging Merkle Tree Mismatch\n');

// Get all deposits
console.log('1. Fetching all deposits from canister...');
const depositsResult = execSync('dfx canister --network ic call deposit_manager_v2 getAllDeposits', { encoding: 'utf8' });
console.log('Total deposits:', (depositsResult.match(/commitment = /g) || []).length);

// Get commitments in order
console.log('\n2. Getting commitments in order...');
const commitmentsResult = execSync('dfx canister --network ic call deposit_manager_v2 getCommitmentsInOrder', { encoding: 'utf8' });
const commitments = commitmentsResult.match(/0x[0-9a-f]+/g) || [];
console.log('Commitments:', commitments.length);

// Check for duplicates
const uniqueCommitments = [...new Set(commitments)];
console.log('Unique commitments:', uniqueCommitments.length);

// Find deposit 15's commitment
console.log('\n3. Checking deposit 15...');
if (commitments[14] && commitments[15]) {
  console.log('Commitment at index 14:', commitments[14]);
  console.log('Commitment at index 15:', commitments[15]);
  console.log('Same commitment?', commitments[14] === commitments[15]);
}

// Get merkle proof for deposit 15
console.log('\n4. Getting merkle proof for deposit 15...');
const proofResult = execSync('dfx canister --network ic call deposit_manager_v2 getMerkleProof "(15)"', { encoding: 'utf8' });
const proofElements = proofResult.match(/0x[0-9a-f]+/g) || [];
console.log('Proof elements:', proofElements.length);
console.log('First 5 elements:');
proofElements.slice(0, 5).forEach((el, i) => {
  console.log(`  [${i}]: ${el}`);
});

// Count zeros in proof
const zeros = proofElements.filter(el => el === '0x0000000000000000000000000000000000000000000000000000000000000000');
console.log(`\nZeros in proof: ${zeros.length} out of ${proofElements.length}`);

// Check tree structure
console.log('\n5. Tree structure analysis:');
console.log('Tree depth: 20');
console.log('Max capacity: 2^20 =', Math.pow(2, 20));
console.log('Current leaves: 16');
console.log('Tree levels needed for 16 leaves: 4 (2^4 = 16)');
console.log('Expected zeros in proof: 16 (levels 4-19)');

console.log('\n6. Recommendations:');
console.log('The issue appears to be that:');
console.log('- The canister builds a sparse tree with 16 leaves at depth 20');
console.log('- The WASM prover might expect a different tree structure');
console.log('- Deposits 14 and 15 have the same commitment, which is unusual');
console.log('\nPossible solutions:');
console.log('1. Check if the WASM expects a different tree depth');
console.log('2. Verify the commitment generation is correct');
console.log('3. Check if the circuit expects a specific tree structure');
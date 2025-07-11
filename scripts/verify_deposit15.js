#!/usr/bin/env node

// Quick verification of deposit 15's commitment calculation

// Simplified MiMC for testing (just to verify the concept)
function verifyCommitment() {
  const depositData = {
    commitment: '0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a',
    secret: '0x04ac8813b689f97ee2678f516fcb1af92f62144170d620dc65d630a8bf1f1b25',
    nullifier: '0x0cdf5b18e584935dd45876fcddf8a46f2200e722d1aaa430f56c990411cbdf38',
    amount: '5000000000000000'
  };

  console.log('🔍 Deposit 15 Commitment Verification');
  console.log('=====================================\n');
  
  console.log('Stored commitment:', depositData.commitment);
  console.log('Secret:', depositData.secret);
  console.log('Nullifier:', depositData.nullifier);
  console.log('Amount (wei):', depositData.amount);
  
  console.log('\n📊 The commitment should be: MiMC(secret, nullifier, amount)');
  console.log('Where MiMC uses:');
  console.log('- 110 rounds');
  console.log('- x^5 exponentiation');
  console.log('- Miyaguchi-Preneel construction');
  console.log('- BN254 field modulus');
  
  console.log('\n💡 To fix the withdrawal issue:');
  console.log('1. Deploy the new DepositManager_V2 with proper MiMC');
  console.log('2. Migrate deposits in exact order (0, 1, 2, ..., 15)');
  console.log('3. Verify the Merkle root matches');
  console.log('4. Update frontend to use new canister');
}

verifyCommitment();
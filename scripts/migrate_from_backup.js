#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

// Load backup data
const deposits = JSON.parse(fs.readFileSync('deposits_backup_manual.json', 'utf8'));

console.log('🚀 Migrating from backup file');
console.log('============================\n');

let successCount = 0;
let failCount = 0;

for (const deposit of deposits) {
  const id = deposit.id;
  const principal = deposit.user.__principal__;
  const amount = deposit.amount;
  const tokenId = deposit.tokenId;
  const chainId = deposit.chainId;
  const commitment = deposit.commitment;
  const timestamp = deposit.timestamp;
  
  process.stdout.write(`Migrating deposit ${id}... `);
  
  const cmd = `dfx canister --network ic call deposit_manager_v2 migrateDeposit '(${id}, principal "${principal}", ${amount}, "${tokenId}", ${chainId}, "${commitment}", ${timestamp})'`;
  
  try {
    const result = execSync(cmd, { encoding: 'utf8' });
    if (result.includes('ok =')) {
      console.log('✅');
      successCount++;
    } else {
      console.log('❌', result);
      failCount++;
    }
  } catch (error) {
    console.log('❌', error.message);
    failCount++;
  }
}

console.log('\n📈 Migration Summary:');
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${failCount}`);

// Check final Merkle root
console.log('\n🔍 Checking Merkle root...');
const newRoot = execSync('dfx canister --network ic call deposit_manager_v2 getCurrentMerkleRoot', { encoding: 'utf8' });
console.log('New root:', newRoot.trim());
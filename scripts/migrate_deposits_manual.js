#!/usr/bin/env node

const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const fs = require('fs');

// Configuration
const MAINNET_URL = 'https://ic0.app';
const OLD_CANISTER_ID = 'hhveh-piaaa-aaaaj-a2dga-cai'; // Current deposit_manager
const NEW_CANISTER_ID = 'rfun2-iaaaa-aaaac-qa7wq-cai'; // deposit_manager_v2

// IDL for old canister
const oldCanisterIDL = ({ IDL }) => {
  const Deposit = IDL.Record({
    id: IDL.Nat,
    user: IDL.Principal,
    amount: IDL.Nat,
    tokenId: IDL.Text,
    chainId: IDL.Nat,
    commitment: IDL.Text,
    timestamp: IDL.Int,
    leafIndex: IDL.Nat,
  });
  
  return IDL.Service({
    getDeposit: IDL.Func([IDL.Nat], [IDL.Opt(Deposit)], ['query']),
    getTotalDeposits: IDL.Func([], [IDL.Nat], ['query']),
    getCurrentMerkleRoot: IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
  });
};

// IDL for new canister
const newCanisterIDL = ({ IDL }) => {
  const DepositResult = IDL.Record({
    depositId: IDL.Nat,
    leafIndex: IDL.Nat,
    merkleRoot: IDL.Text,
  });
  
  return IDL.Service({
    migrateDeposit: IDL.Func([
      IDL.Nat,        // id
      IDL.Principal,  // user
      IDL.Nat,        // amount
      IDL.Text,       // tokenId
      IDL.Nat,        // chainId
      IDL.Text,       // commitment
      IDL.Int,        // timestamp
    ], [IDL.Variant({ ok: DepositResult, err: IDL.Text })], []),
    getCurrentMerkleRoot: IDL.Func([], [IDL.Text], ['query']),
    getCommitmentsInOrder: IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
  });
};

async function main() {
  console.log('🚀 Starting Manual Deposit Migration');
  console.log('===================================\n');

  // Create agents
  const agent = new HttpAgent({ host: MAINNET_URL });
  
  const oldCanister = Actor.createActor(oldCanisterIDL, {
    agent,
    canisterId: OLD_CANISTER_ID,
  });

  const newCanister = Actor.createActor(newCanisterIDL, {
    agent,
    canisterId: NEW_CANISTER_ID,
  });

  try {
    // Step 1: Get total number of deposits
    console.log('📊 Getting total deposit count...');
    const totalDeposits = await oldCanister.getTotalDeposits();
    console.log(`Total deposits: ${totalDeposits}\n`);

    // Step 2: Fetch deposits one by one
    console.log('📥 Fetching deposits individually...');
    const deposits = [];
    
    for (let i = 0; i < Number(totalDeposits); i++) {
      process.stdout.write(`Fetching deposit ${i}... `);
      const depositOpt = await oldCanister.getDeposit(i);
      
      if (depositOpt.length > 0 && depositOpt[0]) {
        deposits.push(depositOpt[0]);
        console.log('✅');
      } else {
        console.log('❌ Not found');
      }
    }
    
    console.log(`\nFetched ${deposits.length} deposits successfully\n`);

    // Save backup
    fs.writeFileSync(
      'deposits_backup_manual.json',
      JSON.stringify(deposits, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      , 2)
    );
    console.log('💾 Saved backup to deposits_backup_manual.json\n');

    // Step 3: Get current Merkle root
    const oldRootResult = await oldCanister.getCurrentMerkleRoot();
    const oldRoot = oldRootResult[0] || 'None';
    console.log('📍 Current Merkle Root:', oldRoot, '\n');

    // Step 4: Migrate deposits in order
    console.log('🔄 Starting migration...\n');
    
    const migrationResults = [];
    let successCount = 0;
    let errorCount = 0;

    // Sort by ID to ensure order
    deposits.sort((a, b) => Number(a.id) - Number(b.id));

    for (const deposit of deposits) {
      process.stdout.write(`Migrating deposit ${deposit.id}... `);
      
      try {
        const result = await newCanister.migrateDeposit(
          deposit.id,
          deposit.user,
          deposit.amount,
          deposit.tokenId,
          deposit.chainId,
          deposit.commitment,
          deposit.timestamp
        );

        if ('ok' in result) {
          successCount++;
          migrationResults.push({
            depositId: Number(deposit.id),
            status: 'success',
            leafIndex: Number(result.ok.leafIndex),
            merkleRoot: result.ok.merkleRoot,
          });
          console.log('✅ Success (leaf index:', Number(result.ok.leafIndex) + ')');
        } else {
          errorCount++;
          migrationResults.push({
            depositId: Number(deposit.id),
            status: 'error',
            error: result.err,
          });
          console.log('❌ Error:', result.err);
        }
      } catch (error) {
        errorCount++;
        migrationResults.push({
          depositId: Number(deposit.id),
          status: 'error',
          error: error.message,
        });
        console.log('❌ Error:', error.message);
      }

      // Add small delay to avoid overwhelming the canister
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);

    // Step 5: Verify Merkle root
    console.log('\n🔍 Verifying Merkle root...');
    const newRoot = await newCanister.getCurrentMerkleRoot();
    console.log('Old root:', oldRoot);
    console.log('New root:', newRoot);
    
    if (oldRoot === newRoot) {
      console.log('✅ Merkle roots MATCH! Migration successful.');
    } else {
      console.log('⚠️  Merkle roots DO NOT MATCH!');
      console.log('This might be expected if the old tree had issues.');
      
      // Get commitments to debug
      const newCommitments = await newCanister.getCommitmentsInOrder();
      console.log(`\nNew canister has ${newCommitments.length} commitments`);
      
      // Check deposit 15 specifically
      const deposit15 = deposits.find(d => Number(d.id) === 15);
      if (deposit15) {
        console.log('\n📍 Deposit 15:');
        console.log(`  Commitment: ${deposit15.commitment}`);
        console.log(`  Position in new tree: ${newCommitments.indexOf(deposit15.commitment)}`);
      }
    }

    // Save results
    fs.writeFileSync(
      'migration_results_manual.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        oldCanisterId: OLD_CANISTER_ID,
        newCanisterId: NEW_CANISTER_ID,
        totalDeposits: deposits.length,
        successCount,
        errorCount,
        oldRoot,
        newRoot,
        results: migrationResults,
      }, null, 2)
    );
    console.log('\n💾 Saved migration results to migration_results_manual.json');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  }
}

main().catch(console.error);
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
    getAllDeposits: IDL.Func([], [IDL.Vec(Deposit)], ['query']),
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
  console.log('🚀 Starting Deposit Migration');
  console.log('============================\n');

  // Create agents
  const agent = new HttpAgent({ host: MAINNET_URL });
  
  const oldCanister = Actor.createActor(oldCanisterIDL, {
    agent,
    canisterId: OLD_CANISTER_ID,
  });

  // Note: Update NEW_CANISTER_ID after deployment
  if (NEW_CANISTER_ID === 'YOUR_NEW_CANISTER_ID') {
    console.error('❌ Please update NEW_CANISTER_ID with the deployed canister ID');
    return;
  }

  const newCanister = Actor.createActor(newCanisterIDL, {
    agent,
    canisterId: NEW_CANISTER_ID,
  });

  try {
    // Step 1: Fetch all deposits from old canister
    console.log('📊 Fetching deposits from old canister...');
    const deposits = await oldCanister.getAllDeposits();
    console.log(`Found ${deposits.length} deposits\n`);

    // Step 2: Sort by ID to ensure consistent ordering
    deposits.sort((a, b) => Number(a.id) - Number(b.id));
    
    // Save backup
    fs.writeFileSync(
      'deposits_backup.json',
      JSON.stringify(deposits, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      , 2)
    );
    console.log('💾 Saved backup to deposits_backup.json\n');

    // Step 3: Get current Merkle root
    const oldRootResult = await oldCanister.getCurrentMerkleRoot();
    const oldRoot = oldRootResult[0] || 'None';
    console.log('📍 Current Merkle Root:', oldRoot, '\n');

    // Step 4: Migrate deposits in order
    console.log('🔄 Starting migration...\n');
    
    const migrationResults = [];
    let successCount = 0;
    let errorCount = 0;

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
            depositId: deposit.id,
            status: 'success',
            leafIndex: result.ok.leafIndex,
            merkleRoot: result.ok.merkleRoot,
          });
          console.log('✅ Success (leaf index:', result.ok.leafIndex + ')');
        } else {
          errorCount++;
          migrationResults.push({
            depositId: deposit.id,
            status: 'error',
            error: result.err,
          });
          console.log('❌ Error:', result.err);
        }
      } catch (error) {
        errorCount++;
        migrationResults.push({
          depositId: deposit.id,
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
      
      // Save for debugging
      fs.writeFileSync(
        'migration_debug.json',
        JSON.stringify({
          oldRoot,
          newRoot,
          deposits: deposits.map(d => ({
            id: d.id.toString(),
            commitment: d.commitment,
            leafIndex: d.leafIndex.toString(),
          })),
          newCommitments,
          migrationResults,
        }, null, 2)
      );
      console.log('💾 Saved debug info to migration_debug.json');
    }

    // Save migration results
    fs.writeFileSync(
      'migration_results.json',
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
    console.log('\n💾 Saved migration results to migration_results.json');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  }
}

// Helper to create migration method in new canister (add to DepositManager_V2.mo)
const MIGRATION_METHOD = `
    // Migration method - remove after migration is complete
    public shared(msg) func migrateDeposit(
        id: Nat,
        user: Principal,
        amount: Nat,
        tokenId: Text,
        chainId: Nat,
        commitment: Text,
        timestamp: Int
    ) : async Result.Result<Types.DepositResult, Text> {
        // Only allow migration from deployer or old canister
        // Add access control as needed
        
        // Ensure deposits are added in order
        if (id != nextDepositId) {
            return #err("Deposits must be migrated in order. Expected ID: " # Nat.toText(nextDepositId));
        };
        
        let leafIndex = merkleTree.addCommitment(commitment);
        
        let deposit : Types.Deposit = {
            id = id;
            user = user;
            amount = amount;
            tokenId = tokenId;
            chainId = chainId;
            commitment = commitment;
            timestamp = timestamp;
            leafIndex = leafIndex;
        };
        
        deposits.put(id, deposit);
        nextDepositId += 1;
        
        // Update user deposits
        switch (userDeposits.get(user)) {
            case null {
                userDeposits.put(user, [id]);
            };
            case (?existingDeposits) {
                userDeposits.put(user, Array.append(existingDeposits, [id]));
            };
        };
        
        #ok({
            depositId = id;
            leafIndex = leafIndex;
            merkleRoot = merkleTree.getRoot();
        })
    };
`;

console.log('\n📝 Migration method to add to DepositManager_V2.mo:');
console.log(MIGRATION_METHOD);

main().catch(console.error);
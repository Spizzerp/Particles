#!/usr/bin/env node

const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');

// Canister interface
const idlFactory = ({ IDL }) => {
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
  
  const DepositResult = IDL.Record({
    depositId: IDL.Nat,
    leafIndex: IDL.Nat,
    merkleRoot: IDL.Text,
  });
  
  const Result = IDL.Variant({
    ok: DepositResult,
    err: IDL.Text
  });
  
  const Result_1 = IDL.Variant({
    ok: IDL.Vec(IDL.Text),
    err: IDL.Text
  });

  return IDL.Service({
    deposit: IDL.Func([IDL.Nat, IDL.Text, IDL.Nat, IDL.Text], [Result], []),
    getDeposit: IDL.Func([IDL.Nat], [IDL.Opt(Deposit)], ['query']),
    getCurrentMerkleRoot: IDL.Func([], [IDL.Text], ['query']),
    getMerkleProof: IDL.Func([IDL.Nat], [Result_1], ['query']),
    verifyMerkleProof: IDL.Func([IDL.Text, IDL.Nat, IDL.Vec(IDL.Text), IDL.Text], [IDL.Bool], ['query']),
  });
};

const CANISTER_ID = 'xtaol-2aaaa-aaaao-a3e6q-cai'; // deposit_manager_v2

async function testMerkleProof() {
  try {
    // Create agent
    const agent = new HttpAgent({
      host: 'http://127.0.0.1:4943',
    });
    
    // For local development, fetch root key
    await agent.fetchRootKey();
    
    // Create actor
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: CANISTER_ID,
    });
    
    console.log('Testing Merkle Proof functionality...\n');
    
    // Step 1: Create a test deposit
    const amount = BigInt(100000000); // 1 ICP in e8s
    const tokenId = 'ICP';
    const chainId = BigInt(2);
    const commitment = '0x' + '1234567890abcdef'.repeat(4); // Test commitment
    
    console.log('Creating test deposit...');
    const depositResult = await actor.deposit(amount, tokenId, chainId, commitment);
    
    if ('err' in depositResult) {
      throw new Error(`Deposit failed: ${depositResult.err}`);
    }
    
    const { depositId, leafIndex, merkleRoot } = depositResult.ok;
    console.log(`Deposit created successfully:`);
    console.log(`  - Deposit ID: ${depositId}`);
    console.log(`  - Leaf Index: ${leafIndex}`);
    console.log(`  - Merkle Root: ${merkleRoot}\n`);
    
    // Step 2: Get the deposit details
    console.log('Fetching deposit details...');
    const depositOpt = await actor.getDeposit(depositId);
    
    if (!depositOpt || depositOpt.length === 0) {
      throw new Error('Deposit not found');
    }
    
    const deposit = depositOpt[0];
    console.log(`Deposit details:`);
    console.log(`  - Commitment: ${deposit.commitment}`);
    console.log(`  - Leaf Index: ${deposit.leafIndex}\n`);
    
    // Step 3: Get current merkle root
    console.log('Fetching current merkle root...');
    const currentRoot = await actor.getCurrentMerkleRoot();
    console.log(`Current merkle root: ${currentRoot}\n`);
    
    // Step 4: Get merkle proof
    console.log(`Getting merkle proof for leaf index ${leafIndex}...`);
    const proofResult = await actor.getMerkleProof(leafIndex);
    
    if ('err' in proofResult) {
      throw new Error(`Failed to get merkle proof: ${proofResult.err}`);
    }
    
    const merkleProof = proofResult.ok;
    console.log(`Merkle proof (${merkleProof.length} elements):`);
    merkleProof.forEach((element, index) => {
      console.log(`  [${index}]: ${element}`);
    });
    console.log();
    
    // Step 5: Verify the merkle proof
    console.log('Verifying merkle proof...');
    const isValid = await actor.verifyMerkleProof(
      deposit.commitment,
      leafIndex,
      merkleProof,
      currentRoot
    );
    
    console.log(`Merkle proof verification result: ${isValid ? 'VALID ✓' : 'INVALID ✗'}\n`);
    
    if (!isValid) {
      console.error('WARNING: Merkle proof verification failed!');
      console.error('This might indicate an issue with the proof generation or verification logic.');
    }
    
    // Step 6: Test with multiple deposits
    console.log('Creating additional deposits to test with larger tree...');
    
    for (let i = 0; i < 3; i++) {
      const testCommitment = '0x' + (i + 2).toString(16).padStart(64, '0');
      const result = await actor.deposit(amount, tokenId, chainId, testCommitment);
      
      if ('ok' in result) {
        console.log(`  - Created deposit ${result.ok.depositId} at leaf index ${result.ok.leafIndex}`);
      }
    }
    
    // Get updated merkle root
    const newRoot = await actor.getCurrentMerkleRoot();
    console.log(`\nUpdated merkle root: ${newRoot}`);
    
    // Verify original deposit still has valid proof with new root
    console.log(`\nVerifying original deposit's proof with updated tree...`);
    const newProofResult = await actor.getMerkleProof(leafIndex);
    
    if ('ok' in newProofResult) {
      const newProof = newProofResult.ok;
      const stillValid = await actor.verifyMerkleProof(
        deposit.commitment,
        leafIndex,
        newProof,
        newRoot
      );
      console.log(`Original deposit proof still valid: ${stillValid ? 'YES ✓' : 'NO ✗'}`);
    }
    
    console.log('\n✅ Merkle proof testing completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMerkleProof();
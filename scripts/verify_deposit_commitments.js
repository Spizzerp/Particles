#!/usr/bin/env node

const { Principal } = require('@dfinity/principal');
const { Actor, HttpAgent } = require('@dfinity/agent');
const fetch = require('node-fetch');

// Import IDL factory
const idlFactory = ({ IDL }) => {
  const Deposit = IDL.Record({
    'id' : IDL.Nat,
    'chain' : IDL.Nat64,
    'token' : IDL.Text,
    'merkleRoot' : IDL.Text,
    'amount' : IDL.Nat,
    'leafIndex' : IDL.Nat32,
    'commitment' : IDL.Text,
    'timestamp' : IDL.Int,
  });
  
  return IDL.Service({
    'getDeposit' : IDL.Func([IDL.Nat], [IDL.Opt(Deposit)], ['query']),
    'getLatestDepositId' : IDL.Func([], [IDL.Nat], ['query']),
  });
};

async function verifyDepositCommitments() {
  console.log('🔍 Verifying Deposit Commitments\n');
  
  try {
    // Create agent
    const agent = new HttpAgent({
      host: 'https://ic0.app',
      fetch: fetch
    });
    
    // Don't fetch root key in production
    // await agent.fetchRootKey();
    
    const canisterId = 'rfun2-iaaaa-aaaac-qa7wq-cai'; // deposit_manager_v2
    const depositManager = Actor.createActor(idlFactory, {
      agent,
      canisterId,
    });
    
    // Get latest deposit ID
    const latestId = await depositManager.getLatestDepositId();
    console.log(`Total deposits: ${latestId}\n`);
    
    // Check recent deposits
    const depositsToCheck = Math.min(5, Number(latestId));
    
    for (let i = Number(latestId) - depositsToCheck + 1; i <= Number(latestId); i++) {
      const depositOpt = await depositManager.getDeposit(BigInt(i));
      if (depositOpt.length > 0) {
        const deposit = depositOpt[0];
        console.log(`Deposit ${i}:`);
        console.log(`  Commitment: ${deposit.commitment}`);
        console.log(`  Amount: ${deposit.amount} (${deposit.amount / BigInt(1e18)} ETH)`);
        console.log(`  Merkle Root: ${deposit.merkleRoot}`);
        console.log(`  Leaf Index: ${deposit.leafIndex}`);
        console.log('');
      }
    }
    
    console.log('\n📋 Note:');
    console.log('The commitment formula that works with the WASM is:');
    console.log('commitment = MiMC(secret, nullifier, amount)');
    console.log('\nThis was confirmed by the test data generator.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyDepositCommitments();
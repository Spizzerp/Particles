#!/usr/bin/env node

// Script to rebuild and verify Merkle tree for mainnet deposits

const { Principal } = require('@dfinity/principal');
const { Actor, HttpAgent } = require('@dfinity/agent');

// Import the MiMC implementation
const { MiMC } = require('../dist/assets/index-C3kwAfNs.js'); // Adjust path as needed

async function main() {
  console.log('🌳 Rebuilding Merkle Tree for Mainnet Deposits');
  console.log('=============================================\n');

  // Setup agent for mainnet
  const agent = new HttpAgent({ host: 'https://ic0.app' });
  
  // Deposit Manager canister ID
  const canisterId = 'hhveh-piaaa-aaaaj-a2dga-cai';
  
  // Simple IDL for the queries we need
  const idl = ({ IDL }) => {
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
      getAllDeposits: IDL.Func([], [IDL.Vec(Deposit)], ['query']),
      getCurrentMerkleRoot: IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    });
  };

  const actor = Actor.createActor(idl, { agent, canisterId });

  try {
    // Get all deposits
    console.log('Fetching all deposits...');
    const deposits = await actor.getAllDeposits();
    console.log(`Found ${deposits.length} deposits\n`);

    // Sort by ID to ensure consistent ordering
    deposits.sort((a, b) => Number(a.id) - Number(b.id));

    // Extract commitments
    const commitments = deposits.map(d => d.commitment);
    console.log('Commitments in order:');
    commitments.forEach((c, i) => {
      console.log(`  ${i}: ${c}`);
    });

    // Build Merkle tree using MiMC
    console.log('\n🔨 Building Merkle Tree with MiMC...');
    const mimc = new MiMC();
    
    // Convert to field elements
    let currentLevel = commitments.map(c => {
      const cleanHex = c.replace('0x', '');
      return BigInt('0x' + cleanHex).toString();
    });

    // Build tree level by level
    const treeDepth = 20;
    let level = 0;
    
    while (level < treeDepth) {
      // Pad level to power of 2
      const levelSize = Math.pow(2, treeDepth - level);
      while (currentLevel.length < levelSize) {
        currentLevel.push("0");
      }
      
      // Build next level
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : "0";
        const parent = mimc.hash([left, right]);
        nextLevel.push(parent);
      }
      
      currentLevel = nextLevel;
      level++;
      
      if (currentLevel.length === 1) {
        break;
      }
    }

    const computedRoot = '0x' + BigInt(currentLevel[0]).toString(16).padStart(64, '0');
    console.log('\n✅ Computed Merkle Root:', computedRoot);

    // Get stored root
    const storedRoot = await actor.getCurrentMerkleRoot();
    console.log('📦 Stored Merkle Root:  ', storedRoot[0] || 'None');

    if (storedRoot[0] === computedRoot) {
      console.log('\n✅ Merkle roots MATCH!');
    } else {
      console.log('\n❌ Merkle roots DO NOT MATCH!');
      console.log('\nThis explains the PLONK proof failure.');
      console.log('The stored root was computed with a different tree structure.');
    }

    // Find deposit 15 specifically
    const deposit15 = deposits.find(d => Number(d.id) === 15);
    if (deposit15) {
      console.log('\n📍 Deposit 15 Details:');
      console.log(`  Commitment: ${deposit15.commitment}`);
      console.log(`  Position in tree: ${commitments.indexOf(deposit15.commitment)}`);
      console.log(`  Expected position: 15`);
      
      if (commitments.indexOf(deposit15.commitment) !== 15) {
        console.log('\n⚠️  WARNING: Deposit 15 is not at index 15 in the tree!');
        console.log('This will cause proof generation to fail.');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Note: This is a simplified version. You'll need to:
// 1. Install @dfinity/agent and @dfinity/principal
// 2. Adjust the import path for MiMC
// 3. Or copy the MiMC implementation directly into this script

console.log('\n📝 To fix the issue:');
console.log('1. Ensure deposits are processed in order');
console.log('2. Rebuild the Merkle tree with all deposits');
console.log('3. Update the stored root on the canister');
console.log('4. Use consistent ordering when generating proofs');

main().catch(console.error);
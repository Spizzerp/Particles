const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const crypto = require('crypto');
require('dotenv').config();

// IDL for the ethereum_adapter canister
const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'getDepositAddress': IDL.Func(
      [IDL.Principal, IDL.Text, IDL.Nat],
      [IDL.Variant({ 'ok': IDL.Text, 'err': IDL.Text })],
      []
    ),
  });
};

async function generateDepositAddress() {
  console.log('🔐 Generating deposit address...\n');

  try {
    // Configuration
    const canisterId = '55iy2-vaaaa-aaaas-amn7a-cai'; // ethereum_adapter canister ID
    const host = 'https://ic0.app';
    
    // Create agent
    const agent = new HttpAgent({ host });
    
    // Create actor
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId,
    });

    // Generate random values for deposit
    // Principal.fromUint8Array expects max 29 bytes
    const randomBytes = crypto.randomBytes(20);
    const userId = Principal.fromUint8Array(randomBytes);
    const commitment = '0x' + crypto.randomBytes(32).toString('hex');
    const amount = 10000000000000000n; // 0.01 ETH in wei

    console.log('📊 Deposit parameters:');
    console.log(`   User ID: ${userId.toText()}`);
    console.log(`   Commitment: ${commitment}`);
    console.log(`   Amount: 0.01 ETH`);
    console.log('');

    // Call the canister
    console.log('🔄 Calling ethereum_adapter...');
    const result = await actor.getDepositAddress(userId, commitment, amount);

    if ('ok' in result) {
      console.log('✅ Success!');
      console.log(`   Deposit address: ${result.ok}`);
      console.log('\n💡 Next steps:');
      console.log(`   1. Send 0.01 ETH to: ${result.ok}`);
      console.log('   2. Wait for confirmation');
      console.log('   3. Click "I\'ve Made the Deposit" in the app');
    } else {
      console.error('❌ Error:', result.err);
    }

  } catch (error) {
    console.error('❌ Failed to generate deposit address:', error.message);
  }
}

generateDepositAddress();
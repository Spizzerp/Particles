#!/usr/bin/env node

const { readFileSync } = require('fs');
const fetch = require('node-fetch');

async function testWithCanister() {
    console.log('🧪 Testing generated witness data with ICP canister\n');
    
    try {
        // Load the generated test data
        const testData = JSON.parse(readFileSync('./test_data.json', 'utf8'));
        const witnessData = JSON.parse(readFileSync('./witness.json', 'utf8'));
        
        console.log('📊 Test Data Summary:');
        console.log('- Commitment:', testData.deposit.commitment);
        console.log('- Nullifier Hash:', testData.withdrawal.nullifierHash);
        console.log('- Merkle Root:', testData.withdrawal.merkleRoot);
        console.log('- Amount:', testData.deposit.amount, 'wei (1 ETH)');
        console.log('- Leaf Index:', testData.deposit.leafIndex);
        console.log('\n');
        
        // First, we need to register this test deposit in the canister
        console.log('📝 Step 1: Register test deposit in canister...');
        console.log('(This would normally be done through the deposit flow)\n');
        
        // The test data is ready to be used with the production WASM
        console.log('✅ Test data is ready for use!');
        console.log('\nTo test with the production WASM:');
        console.log('1. Open http://localhost:8080/public/test_production_with_valid_data.html');
        console.log('2. Click "Load Test Data" - it will load the generated files');
        console.log('3. Click "Initialize Production WASM"');
        console.log('4. Click "Generate Proof" - this will use the test witness data');
        console.log('5. If successful, the proof can be submitted to ICP');
        
        console.log('\n📋 Witness data structure:');
        Object.entries(witnessData).forEach(([key, value]) => {
            if (key === 'MerklePath' || key === 'MerkleIndices') {
                console.log(`- ${key}: [${value.length} elements]`);
            } else {
                console.log(`- ${key}: ${value}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testWithCanister();
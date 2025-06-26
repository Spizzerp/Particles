const { Actor, HttpAgent } = require('@dfinity/agent');
const fs = require('fs');

// Read the PLONK verification key
const vkBytes = Array.from(fs.readFileSync('./circuits/build/plonk_vk.bin'));

// IDL for the PLONK verifier canister
const plonkVerifierIDL = ({ IDL }) => {
    return IDL.Service({
        'plonk_verify': IDL.Func([IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8)], [IDL.Bool], []),
        'verify_bytes': IDL.Func([IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8), IDL.Bool], [IDL.Bool], []),
    });
};

async function testPlonkVerifier() {
    console.log('=== Testing PLONK Verifier Directly ===\n');
    
    // Create agent
    const agent = new HttpAgent({ host: 'http://localhost:8000' });
    await agent.fetchRootKey();
    
    // Create actor for PLONK verifier
    const plonkActor = Actor.createActor(plonkVerifierIDL, {
        agent,
        canisterId: 'asrmz-lmaaa-aaaaa-qaaeq-cai'
    });
    
    console.log('Verification key size:', vkBytes.length, 'bytes');
    
    // Create a minimal test case
    console.log('\nTest 1: Minimal valid witness');
    const minimalWitness = [
        // Header: 1 public input, 0 secret, vector length 1
        0, 0, 0, 1,  // public_len
        0, 0, 0, 0,  // secret_len  
        0, 0, 0, 1,  // vector_len
        // One 32-byte field element
        ...Array(32).fill(0)
    ];
    
    // Create a dummy proof (520 bytes)
    const dummyProof = Array(520).fill(0);
    
    try {
        console.log('Calling verifier with minimal witness...');
        const result = await plonkActor.plonk_verify(
            vkBytes,
            dummyProof,
            minimalWitness
        );
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error.message);
        
        // Check if it's a capacity overflow
        if (error.message.includes('capacity overflow')) {
            console.error('\n❌ Still getting capacity overflow with minimal witness!');
            console.error('This suggests the issue might be in the verification key or proof format.');
        }
    }
    
    // Test 2: With actual witness format
    console.log('\n\nTest 2: Actual witness format (7 public inputs)');
    const actualWitness = [
        // Header
        0, 0, 0, 7,  // public_len = 7
        0, 0, 0, 0,  // secret_len = 0
        0, 0, 0, 7,  // vector_len = 7
        // 7 x 32-byte field elements
        ...Array(7 * 32).fill(0)
    ];
    
    try {
        console.log('Calling verifier with 7 public inputs...');
        const result = await plonkActor.plonk_verify(
            vkBytes,
            dummyProof,
            actualWitness
        );
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    // Test 3: Check the verification key format
    console.log('\n\nTest 3: Verification key analysis');
    console.log('VK bytes length:', vkBytes.length);
    console.log('First 16 bytes:', vkBytes.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // Read the VK structure
    const buffer = Buffer.from(vkBytes);
    const size = buffer.readBigUInt64BE(0);
    const nbPublicVariables = buffer.readBigUInt64BE(72);
    
    console.log('Circuit size:', size.toString());
    console.log('Number of public variables:', nbPublicVariables.toString());
    
    if (Number(nbPublicVariables) !== 7) {
        console.error('\n❌ VK expects', nbPublicVariables, 'public variables but we have 7!');
    }
}

testPlonkVerifier().catch(console.error); 
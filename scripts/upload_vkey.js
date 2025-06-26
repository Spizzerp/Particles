const { readFileSync } = require('fs');
const { Actor, HttpAgent } = require('@dfinity/agent');
const fs = require('fs');

// IDL factory
const idlFactory = ({ IDL }) => {
    const Result = IDL.Variant({
        'ok': IDL.Null,
        'err': IDL.Text,
    });
    
    return IDL.Service({
        'setPlonkVerificationKey': IDL.Func([IDL.Vec(IDL.Nat8)], [Result], []),
    });
};

async function uploadVerificationKey() {
    // Read the PLONK verification key
    const vkPath = './circuits/build/plonk_vk.bin';
    console.log(`Reading PLONK verification key from ${vkPath}...`);
    const vkBytes = Array.from(fs.readFileSync(vkPath));
    console.log(`Verification key size: ${vkBytes.length} bytes`);
    
    // Create agent
    const agent = new HttpAgent({
        host: 'http://localhost:8000',
    });
    
    // Fetch root key for local development
    await agent.fetchRootKey();
    
    // Create actor for withdrawal processor
    const canisterId = 'a3shf-5eaaa-aaaaa-qaafa-cai';
    const withdrawalProcessor = Actor.createActor(idlFactory, {
        agent,
        canisterId,
    });
    
    console.log('Uploading verification key to withdrawal processor...');
    
    try {
        const result = await withdrawalProcessor.setPlonkVerificationKey(vkBytes);
        
        if ('ok' in result) {
            console.log('✅ Verification key uploaded successfully!');
        } else {
            console.error('❌ Failed to upload:', result.err);
        }
    } catch (error) {
        console.error('❌ Error uploading verification key:', error);
    }
}

uploadVerificationKey().catch(console.error);
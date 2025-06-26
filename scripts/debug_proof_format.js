const { Actor, HttpAgent } = require('@dfinity/agent');
const fs = require('fs');

// Read test data
const witnessData = JSON.parse(fs.readFileSync('./witness.json', 'utf8'));

// IDL factory matching the Motoko canister
const idlFactory = ({ IDL }) => {
    const PlonkProof = IDL.Record({
        'lro': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
        'z': IDL.Tuple(IDL.Text, IDL.Text),
        'h': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
        'batched_proof': IDL.Record({
            'h': IDL.Tuple(IDL.Text, IDL.Text),
            'claimed_values': IDL.Vec(IDL.Text),
        }),
        'zshifted_proof': IDL.Record({
            'h': IDL.Tuple(IDL.Text, IDL.Text),
            'claimed_value': IDL.Text,
        }),
        'bsb22_commitments': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    });
    
    const Result = IDL.Variant({
        'ok': IDL.Nat,
        'err': IDL.Text,
    });
    
    return IDL.Service({
        'initiateWithdrawal': IDL.Func([
            IDL.Text, // nullifier
            IDL.Text, // recipient
            IDL.Nat,  // amount
            IDL.Text, // tokenId
            IDL.Nat,  // chainId
            IDL.Text, // merkleRoot
            PlonkProof, // proof
        ], [Result], []),
    });
};

// Helper to convert decimal to hex
function decimalToHex(decimalStr) {
    if (decimalStr === "0") return "0x0000000000000000000000000000000000000000000000000000000000000000";
    const bigInt = BigInt(decimalStr);
    let hex = bigInt.toString(16);
    hex = hex.padStart(64, '0');
    return '0x' + hex;
}

async function testWithMockProof() {
    console.log('\n=== Testing with Simplified Mock Proof ===\n');
    
    // Create a minimal valid PLONK proof structure
    const mockProof = {
        lro: [
            ["0x" + "1".repeat(64), "0x" + "0".repeat(64)],
            ["0x" + "2".repeat(64), "0x" + "0".repeat(64)],
            ["0x" + "3".repeat(64), "0x" + "0".repeat(64)]
        ],
        z: ["0x" + "4".repeat(64), "0x" + "0".repeat(64)],
        h: [
            ["0x" + "5".repeat(64), "0x" + "0".repeat(64)],
            ["0x" + "6".repeat(64), "0x" + "0".repeat(64)],
            ["0x" + "7".repeat(64), "0x" + "0".repeat(64)]
        ],
        batched_proof: {
            h: ["0x" + "8".repeat(64), "0x" + "0".repeat(64)],
            claimed_values: [
                "0x" + "9".repeat(64),
                "0x" + "a".repeat(64)
            ]
        },
        zshifted_proof: {
            h: ["0x" + "b".repeat(64), "0x" + "0".repeat(64)],
            claimed_value: "0x" + "c".repeat(64)
        },
        bsb22_commitments: []
    };
    
    // Create agent
    const agent = new HttpAgent({
        host: 'http://localhost:8000',
    });
    
    await agent.fetchRootKey();
    
    // Create actor
    const canisterId = 'a3shf-5eaaa-aaaaa-qaafa-cai';
    const withdrawalProcessor = Actor.createActor(idlFactory, {
        agent,
        canisterId,
    });
    
    // Prepare inputs
    const inputs = {
        nullifierHash: decimalToHex(witnessData.NullifierHash),
        recipient: witnessData.Recipient,
        amount: BigInt(witnessData.Amount),
        tokenId: "ETH",
        chainId: 1,
        merkleRoot: decimalToHex(witnessData.MerkleRoot)
    };
    
    console.log('Inputs:');
    console.log('- Nullifier Hash:', inputs.nullifierHash);
    console.log('- Recipient:', inputs.recipient);
    console.log('- Amount:', inputs.amount.toString());
    console.log('- Merkle Root:', inputs.merkleRoot);
    
    try {
        const result = await withdrawalProcessor.initiateWithdrawal(
            inputs.nullifierHash,
            inputs.recipient,
            inputs.amount,
            inputs.tokenId,
            inputs.chainId,
            inputs.merkleRoot,
            mockProof
        );
        
        console.log('\nResult:', result);
        
        if ('err' in result) {
            console.log('\nError details:', result.err);
            
            // Check if it's still the decode error
            if (result.err.includes('Failed to decode proof')) {
                console.log('\nThe canister is still having issues decoding the proof structure.');
                console.log('This suggests a mismatch between the IDL definition and the Motoko implementation.');
            } else if (result.err.includes('Failed to serialize proof')) {
                console.log('\nThe proof passed IDL validation but failed during serialization.');
                console.log('Check PlonkIntegration.mo serializeProof function.');
            } else if (result.err.includes('PLONK verification failed')) {
                console.log('\nGood! The proof structure is being accepted.');
                console.log('The error is now in the actual verification, which is expected with a mock proof.');
            }
        }
        
    } catch (error) {
        console.error('\nCall failed:', error);
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
    }
}

// Run the test
testWithMockProof().catch(console.error); 
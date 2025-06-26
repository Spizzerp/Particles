const { Actor, HttpAgent } = require('@dfinity/agent');
const { readFileSync } = require('fs');

// IDL factory for withdrawal processor
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
            IDL.Nat,  // chainId (should be nat, not text!)
            IDL.Text, // merkleRoot
            PlonkProof, // proof
        ], [Result], []),
    });
};

async function testWithdrawal() {
    try {
        // Load witness data
        const witnessData = JSON.parse(readFileSync('./witness.json', 'utf8'));
        
        console.log('Loaded witness data');
        console.log('Merkle Root:', witnessData.MerkleRoot);
        console.log('Nullifier Hash:', witnessData.NullifierHash);
        
        // Create a mock proof for testing
        const mockProof = {
            lro: [
                ["0x1234567890abcdef", "0xfedcba0987654321"],
                ["0x1234567890abcdef", "0xfedcba0987654321"],
                ["0x1234567890abcdef", "0xfedcba0987654321"]
            ],
            z: ["0x1234567890abcdef", "0xfedcba0987654321"],
            h: [
                ["0x1234567890abcdef", "0xfedcba0987654321"],
                ["0x1234567890abcdef", "0xfedcba0987654321"],
                ["0x1234567890abcdef", "0xfedcba0987654321"]
            ],
            batched_proof: {
                h: ["0x1234567890abcdef", "0xfedcba0987654321"],
                claimed_values: ["0x1", "0x2", "0x3"]
            },
            zshifted_proof: {
                h: ["0x1234567890abcdef", "0xfedcba0987654321"],
                claimed_value: "0x1234"
            },
            bsb22_commitments: []
        };
        
        // Create agent
        const agent = new HttpAgent({
            host: 'http://localhost:8000',
        });
        
        // Fetch root key for local development
        await agent.fetchRootKey();
        
        // Create actor
        const canisterId = 'a3shf-5eaaa-aaaaa-qaafa-cai';
        const withdrawalProcessor = Actor.createActor(idlFactory, {
            agent,
            canisterId,
        });
        
        console.log('\nSubmitting withdrawal with params:');
        console.log('- NullifierHash:', witnessData.NullifierHash);
        console.log('- Recipient:', witnessData.Recipient);
        console.log('- Amount:', witnessData.Amount);
        console.log('- TokenId: ETH');
        console.log('- ChainId: 1');
        console.log('- MerkleRoot:', witnessData.MerkleRoot);
        
        const result = await withdrawalProcessor.initiateWithdrawal(
            witnessData.NullifierHash,
            witnessData.Recipient,
            BigInt(witnessData.Amount),
            "ETH",
            1, // Ethereum mainnet chain ID
            witnessData.MerkleRoot,
            mockProof
        );
        
        if ('ok' in result) {
            console.log('✅ Withdrawal submitted successfully!');
            console.log('Withdrawal ID:', result.ok.toString());
        } else {
            console.log('❌ Error:', result.err);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testWithdrawal();
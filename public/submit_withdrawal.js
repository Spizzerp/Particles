// Import ICP modules (will be loaded via script tag with type="module")
import { Actor, HttpAgent } from '@dfinity/agent';

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
            IDL.Nat,  // chainId (nat, not text!)
            IDL.Text, // merkleRoot
            PlonkProof, // proof
        ], [Result], []),
    });
};

// Function to submit proof to ICP
window.submitWithdrawalToICP = async (proofData, inputs) => {
    try {
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
        
        console.log('Submitting withdrawal with:', {
            nullifierHash: inputs.nullifierHash,
            recipient: inputs.recipient,
            amount: inputs.amount,
            merkleRoot: inputs.merkleRoot,
            proofKeys: Object.keys(proofData)
        });
        
        // Submit withdrawal
        const result = await withdrawalProcessor.initiateWithdrawal(
            inputs.nullifierHash,
            inputs.recipient,
            BigInt(inputs.amount),
            "ETH",
            1, // Ethereum mainnet chain ID
            inputs.merkleRoot,
            proofData
        );
        
        return result;
    } catch (error) {
        console.error('ICP submission error:', error);
        throw error;
    }
};
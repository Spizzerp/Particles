// This file provides ICP integration without ES modules
// It will be loaded as a regular script

// We'll use the global dfinity agent if available
(async function() {
    // Wait for page to load
    if (document.readyState !== 'loading') {
        initializeICP();
    } else {
        document.addEventListener('DOMContentLoaded', initializeICP);
    }
    
    async function initializeICP() {
        try {
            // Check if @dfinity/agent is available globally (from CDN)
            if (!window.dfinity || !window.dfinity.agent) {
                console.error('Dfinity agent not loaded. Loading from CDN...');
                
                // Dynamically load from CDN
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@dfinity/agent@2.1.1/dist/index.js';
                script.onload = () => {
                    console.log('Dfinity agent loaded from CDN');
                    setupWithdrawalFunction();
                };
                document.head.appendChild(script);
            } else {
                setupWithdrawalFunction();
            }
        } catch (error) {
            console.error('Failed to initialize ICP integration:', error);
        }
    }
    
    function setupWithdrawalFunction() {
        const { Actor, HttpAgent } = window.agent || window.dfinity.agent || {};
        
        if (!Actor || !HttpAgent) {
            console.error('Actor or HttpAgent not available');
            return;
        }
        
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
                    IDL.Nat,  // chainId
                    IDL.Text, // merkleRoot
                    PlonkProof, // proof
                ], [Result], []),
            });
        };
        
        // Make submission function available globally
        window.submitWithdrawalToICP = async (proofData, inputs) => {
            try {
                const agent = new HttpAgent({
                    host: 'http://localhost:8000',
                });
                
                await agent.fetchRootKey();
                
                const canisterId = 'a3shf-5eaaa-aaaaa-qaafa-cai';
                const withdrawalProcessor = Actor.createActor(idlFactory, {
                    agent,
                    canisterId,
                });
                
                console.log('Submitting withdrawal with:', {
                    nullifierHash: inputs.NullifierHash,
                    recipient: inputs.Recipient,
                    amount: inputs.Amount,
                    merkleRoot: inputs.MerkleRoot
                });
                
                const result = await withdrawalProcessor.initiateWithdrawal(
                    inputs.NullifierHash,
                    inputs.Recipient,
                    BigInt(inputs.Amount),
                    "ETH",
                    1, // Ethereum mainnet
                    inputs.MerkleRoot,
                    proofData
                );
                
                return result;
            } catch (error) {
                console.error('ICP submission error:', error);
                throw error;
            }
        };
        
        console.log('ICP integration loaded successfully');
        window.icpIntegrationLoaded = true;
    }
})();
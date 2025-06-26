const http = require('http');
const { Actor, HttpAgent } = require('@dfinity/agent');

const PORT = 8081;

// IDL factory
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

// Helper to pad Ethereum addresses to 32 bytes
function padAddressTo32Bytes(address) {
    let cleanAddr = address.startsWith('0x') ? address.substring(2) : address;
    // Ethereum addresses are 20 bytes (40 hex chars)
    // Pad with leading zeros to make 32 bytes (64 hex chars)
    const padding = 64 - cleanAddr.length;
    const padded = '0'.repeat(padding) + cleanAddr;
    return '0x' + padded;
}

const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.method === 'POST' && req.url === '/submit-withdrawal') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { proofData, inputs } = data;
                
                console.log('\nReceived withdrawal submission:');
                console.log('- Nullifier Hash:', inputs.NullifierHash, `(${inputs.NullifierHash.length} chars)`);
                console.log('- Recipient:', inputs.Recipient, `(${inputs.Recipient.length} chars)`);
                console.log('- Amount:', inputs.Amount, `(${String(inputs.Amount).length} chars)`);
                console.log('- Merkle Root:', inputs.MerkleRoot, `(${inputs.MerkleRoot.length} chars)`);
                console.log('- Relayer:', inputs.Relayer, `(${inputs.Relayer ? inputs.Relayer.length : 0} chars)`);
                console.log('- Fee:', inputs.Fee, `(${String(inputs.Fee).length} chars)`);
                console.log('- Refund:', inputs.Refund, `(${String(inputs.Refund).length} chars)`);
                
                // Pad addresses to 32 bytes
                const paddedRecipient = padAddressTo32Bytes(inputs.Recipient);
                const paddedRelayer = padAddressTo32Bytes(inputs.Relayer || "0x0000000000000000000000000000000000000000");
                
                console.log('\nPadded addresses:');
                console.log('- Padded Recipient:', paddedRecipient, `(${paddedRecipient.length} chars)`);
                console.log('- Padded Relayer:', paddedRelayer, `(${paddedRelayer.length} chars)`);
                
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
                
                console.log('\nParsing proof structure...');
                const parsedProof = {
                    lro: proofData.lro,
                    z: proofData.z,
                    h: proofData.h,
                    batched_proof: proofData.batched_proof,
                    zshifted_proof: proofData.zshifted_proof,
                    bsb22_commitments: proofData.bsb22_commitments || []
                };
                
                // Debug log the proof structure
                console.log('\nProof structure:');
                console.log('- LRO points:', parsedProof.lro.length);
                console.log('- H points:', parsedProof.h.length);
                console.log('- Batched values:', parsedProof.batched_proof.claimed_values.length);
                parsedProof.batched_proof.claimed_values.forEach((val, i) => {
                    console.log(`  Batched value ${i}: ${val} (length: ${val.length})`);
                });
                console.log('- BSB22 commitments:', parsedProof.bsb22_commitments.length);

                console.log('\nPreparing canister call...');
                
                // Debug numeric values
                console.log('\nNumeric values as BigInt:');
                console.log('- Amount BigInt:', BigInt(inputs.Amount).toString());
                console.log('- Fee:', inputs.Fee);
                console.log('- Refund:', inputs.Refund);
                
                // Submit withdrawal
                const result = await withdrawalProcessor.initiateWithdrawal(
                    inputs.NullifierHash,
                    paddedRecipient,  // Use padded recipient
                    BigInt(inputs.Amount),
                    "ETH",
                    1, // Ethereum mainnet
                    inputs.MerkleRoot,
                    parsedProof
                );
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                
                if ('ok' in result) {
                    console.log('✅ Withdrawal submitted successfully!');
                    console.log('Withdrawal ID:', result.ok.toString());
                    res.end(JSON.stringify({ 
                        success: true, 
                        withdrawalId: result.ok.toString() 
                    }));
                } else {
                    console.log('❌ Error:', result.err);
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: result.err 
                    }));
                }
                
            } catch (error) {
                console.error('Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: error.message 
                }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`ICP Proxy Server running on http://localhost:${PORT}`);
    console.log('Submit withdrawals to: http://localhost:8081/submit-withdrawal');
});
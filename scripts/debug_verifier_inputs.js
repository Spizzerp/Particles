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

// Helper to pad addresses
function padAddressTo32Bytes(address) {
    let cleanAddr = address.startsWith('0x') ? address.substring(2) : address;
    const padding = 64 - cleanAddr.length;
    const padded = '0'.repeat(padding) + cleanAddr;
    return '0x' + padded;
}

// Simulate witness serialization
function simulateWitnessSerialization() {
    console.log('=== Debugging Witness Serialization ===\n');
    
    // These are the inputs being sent to the canister
    const nullifierHash = decimalToHex(witnessData.NullifierHash);
    const recipient = padAddressTo32Bytes(witnessData.Recipient);
    const amount = witnessData.Amount;
    const merkleRoot = decimalToHex(witnessData.MerkleRoot);
    
    console.log('Inputs to canister:');
    console.log('- NullifierHash:', nullifierHash);
    console.log('- Recipient (padded):', recipient);
    console.log('- Amount:', amount);
    console.log('- MerkleRoot:', merkleRoot);
    
    // What the canister will create as public inputs
    const publicInputs = [
        merkleRoot,
        nullifierHash,
        recipient, // Already padded by proxy
        decimalToHex(amount),
        padAddressTo32Bytes("0x0000000000000000000000000000000000000000"), // relayer
        "0x0000000000000000000000000000000000000000000000000000000000000000", // fee
        "0x0000000000000000000000000000000000000000000000000000000000000000"  // refund
    ];
    
    console.log('\nPublic inputs array (what verifier will see):');
    publicInputs.forEach((input, i) => {
        const cleanHex = input.startsWith('0x') ? input.substring(2) : input;
        const byteLength = cleanHex.length / 2;
        console.log(`${i}: ${input.substring(0, 20)}... (${byteLength} bytes, ${cleanHex.length} hex chars)`);
        if (byteLength !== 32) {
            console.error('  ❌ ERROR: Not 32 bytes!');
        }
    });
    
    // Simulate witness encoding
    const numPublic = publicInputs.length;
    const witnessHeader = new Uint8Array(12);
    const view = new DataView(witnessHeader.buffer);
    
    // Write header
    view.setUint32(0, numPublic, false); // big-endian
    view.setUint32(4, 0, false);        // no secret inputs
    view.setUint32(8, numPublic, false); // vector length
    
    console.log('\nWitness header bytes:', Array.from(witnessHeader));
    console.log('Header interpretation:');
    console.log('- Public inputs:', view.getUint32(0, false));
    console.log('- Secret inputs:', view.getUint32(4, false));
    console.log('- Vector length:', view.getUint32(8, false));
    
    // Calculate total size
    const totalSize = 12 + (numPublic * 32);
    console.log(`\nTotal witness size: ${totalSize} bytes`);
}

simulateWitnessSerialization(); 
const { Actor, HttpAgent } = require('@dfinity/agent');
const fs = require('fs');

// Read test data
const witnessData = JSON.parse(fs.readFileSync('./witness.json', 'utf8'));

// Helper to convert decimal to hex
function decimalToHex(decimalStr) {
    if (decimalStr === "0") return "0x0000000000000000000000000000000000000000000000000000000000000000";
    const bigInt = BigInt(decimalStr);
    let hex = bigInt.toString(16);
    hex = hex.padStart(64, '0');
    return '0x' + hex;
}

// Simulate what the canister is doing
function simulateWitnessSerialization() {
    console.log('Simulating witness serialization...\n');
    
    // The public inputs as the canister sees them
    const publicInputs = [
        decimalToHex(witnessData.MerkleRoot),     // merkleRoot
        decimalToHex(witnessData.NullifierHash),  // nullifierHash
        witnessData.Recipient,                     // recipient (already hex)
        decimalToHex(witnessData.Amount),          // amount
        "0x0000000000000000000000000000000000000000", // relayer (zero address) - THIS IS ONLY 42 chars!
        "0x0000000000000000000000000000000000000000000000000000000000000000", // fee (32 bytes)
        "0x0000000000000000000000000000000000000000000000000000000000000000"  // refund (32 bytes)
    ];
    
    console.log('Public inputs:');
    publicInputs.forEach((input, i) => {
        console.log(`${i}: ${input} (length: ${input.length})`);
    });
    
    // Check hex decoding
    console.log('\nChecking hex decoding:');
    publicInputs.forEach((input, i) => {
        let cleanHex = input.startsWith('0x') ? input.substring(2) : input;
        const byteLength = cleanHex.length / 2;
        console.log(`Input ${i}: ${byteLength} bytes`);
        
        if (byteLength !== 32) {
            console.error(`  ❌ ERROR: Expected 32 bytes, got ${byteLength} bytes!`);
        }
    });
    
    // Simulate the witness header
    const numPublic = publicInputs.length;
    console.log('\nWitness header:');
    console.log(`Number of public inputs: ${numPublic}`);
    console.log(`Header bytes: [0, 0, 0, ${numPublic}, 0, 0, 0, 0, 0, 0, 0, ${numPublic}]`);
    
    // Calculate total expected size
    const headerSize = 12;
    const dataSize = numPublic * 32;
    const totalSize = headerSize + dataSize;
    console.log(`\nTotal witness size: ${totalSize} bytes (${headerSize} header + ${dataSize} data)`);
}

simulateWitnessSerialization(); 
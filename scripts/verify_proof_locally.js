const fs = require('fs');

// Function to simulate exactly what the ICP canister does
function simulateICPVerification() {
    console.log('=== Simulating ICP Canister Verification ===\n');
    
    // Read the witness data (same as what the test HTML uses)
    const witnessData = JSON.parse(fs.readFileSync('./witness.json', 'utf8'));
    
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
    
    // Prepare public inputs exactly as the canister does
    const publicInputs = [
        decimalToHex(witnessData.MerkleRoot),     // merkleRoot
        decimalToHex(witnessData.NullifierHash),  // nullifierHash
        padAddressTo32Bytes(witnessData.Recipient), // recipient (padded)
        decimalToHex(witnessData.Amount),         // amount
        padAddressTo32Bytes("0x0000000000000000000000000000000000000000"), // relayer (padded)
        "0x0000000000000000000000000000000000000000000000000000000000000000", // fee
        "0x0000000000000000000000000000000000000000000000000000000000000000"  // refund
    ];
    
    console.log('Public inputs:');
    publicInputs.forEach((input, i) => {
        console.log(`  ${i}: ${input} (${input.length} chars)`);
    });
    
    // Simulate witness serialization exactly as PlonkIntegration.mo does it
    function serializeWitness(publicInputs) {
        const buffer = [];
        
        // Write witness header FIRST (12 bytes total)
        const numPublic = publicInputs.length;
        
        // 4 bytes: number of public inputs (big-endian)
        buffer.push((numPublic >> 24) & 0xFF);
        buffer.push((numPublic >> 16) & 0xFF);
        buffer.push((numPublic >> 8) & 0xFF);
        buffer.push(numPublic & 0xFF);
        
        // 4 bytes: number of secret inputs (always 0)
        buffer.push(0, 0, 0, 0);
        
        // 4 bytes: vector length (same as public inputs)
        buffer.push((numPublic >> 24) & 0xFF);
        buffer.push((numPublic >> 16) & 0xFF);
        buffer.push((numPublic >> 8) & 0xFF);
        buffer.push(numPublic & 0xFF);
        
        console.log('\nWitness header:');
        console.log(`  Public inputs count: ${numPublic}`);
        console.log(`  Header bytes: [${buffer.slice(0, 12).join(', ')}]`);
        
        // Then add each public input (32 bytes each)
        let invalidInputs = [];
        publicInputs.forEach((input, i) => {
            const cleanHex = input.startsWith('0x') ? input.substring(2) : input;
            
            if (cleanHex.length !== 64) {
                invalidInputs.push({index: i, input: input, length: cleanHex.length});
            }
            
            // Convert hex to bytes
            for (let j = 0; j < 64; j += 2) {
                const byte = parseInt(cleanHex.substr(j, 2), 16);
                buffer.push(byte);
            }
        });
        
        if (invalidInputs.length > 0) {
            console.error('\n❌ INVALID INPUTS FOUND:');
            invalidInputs.forEach(({index, input, length}) => {
                console.error(`  Input ${index}: Expected 64 hex chars, got ${length}`);
                console.error(`    Value: ${input}`);
            });
        }
        
        return buffer;
    }
    
    const witnessBytes = serializeWitness(publicInputs);
    console.log(`\nTotal witness size: ${witnessBytes.length} bytes`);
    console.log(`Expected size: 12 (header) + ${publicInputs.length} * 32 = ${12 + publicInputs.length * 32} bytes`);
    
    if (witnessBytes.length !== 12 + publicInputs.length * 32) {
        console.error('❌ Witness size mismatch!');
    }
    
    // Simulate how the Rust verifier reads the witness
    console.log('\nSimulating Rust verifier witness parsing:');
    let offset = 0;
    
    // Read 4-byte values
    function readU32(bytes, offset) {
        return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | 
               (bytes[offset + 2] << 8) | bytes[offset + 3];
    }
    
    const publicLen = readU32(witnessBytes, 0);
    const secretLen = readU32(witnessBytes, 4);
    const vectorLen = readU32(witnessBytes, 8);
    
    console.log(`  public_len: ${publicLen}`);
    console.log(`  secret_len: ${secretLen}`);
    console.log(`  vector_len: ${vectorLen}`);
    
    if (publicLen !== vectorLen) {
        console.error(`  ❌ ERROR: public_len (${publicLen}) != vector_len (${vectorLen})`);
    }
    
    if (publicLen > 100 || vectorLen > 100) {
        console.error(`  ❌ ERROR: Unreasonably large values - likely endianness issue or data corruption`);
    }
    
    // Check if we have enough bytes for the public inputs
    const expectedDataBytes = vectorLen * 32;
    const actualDataBytes = witnessBytes.length - 12;
    
    console.log(`\n  Expected data bytes: ${expectedDataBytes}`);
    console.log(`  Actual data bytes: ${actualDataBytes}`);
    
    if (expectedDataBytes > actualDataBytes) {
        console.error(`  ❌ ERROR: Not enough data! This would cause capacity overflow.`);
    }
    
    // Debug: Show the first few field elements
    console.log('\nFirst field element bytes:');
    if (witnessBytes.length >= 44) {
        const firstElement = witnessBytes.slice(12, 44);
        const hex = firstElement.map(b => b.toString(16).padStart(2, '0')).join('');
        console.log(`  Hex: 0x${hex}`);
        console.log(`  Matches merkleRoot: ${('0x' + hex) === publicInputs[0]}`);
    }
    
    console.log('\n✅ Local simulation complete. Check for errors above.');
}

simulateICPVerification(); 
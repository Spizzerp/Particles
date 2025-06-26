const fs = require('fs');

function analyzeVKFormat() {
    console.log('=== Analyzing PLONK Verification Key Format ===\n');
    
    const vkBytes = fs.readFileSync('./circuits/build/plonk_vk.bin');
    console.log('Total VK size:', vkBytes.length, 'bytes');
    
    // Check first few values
    let offset = 0;
    
    // Read as different interpretations
    console.log('\nFirst 64 bytes as hex:');
    console.log(vkBytes.slice(0, 64).toString('hex').match(/.{2}/g).join(' '));
    
    // Try reading as big-endian u64
    console.log('\nFirst value as BE u64:', vkBytes.readBigUInt64BE(0));
    
    // Try reading as little-endian u64  
    console.log('First value as LE u64:', vkBytes.readBigUInt64LE(0));
    
    // Try reading as big-endian u32
    console.log('\nFirst few values as BE u32:');
    for (let i = 0; i < 8; i++) {
        const val = vkBytes.readUInt32BE(i * 4);
        console.log(`  Offset ${i * 4}: ${val}`);
    }
    
    // The gnark format typically has a header
    console.log('\nChecking for gnark header format:');
    
    // Common gnark serialization patterns
    const magic = vkBytes.readUInt32BE(0);
    console.log('Possible magic number:', magic.toString(16));
    
    // Check if it's a length-prefixed format
    const possibleLen1 = vkBytes.readUInt32BE(0);
    const possibleLen2 = vkBytes.readUInt32LE(0);
    console.log('As BE length:', possibleLen1);
    console.log('As LE length:', possibleLen2);
    
    // The 0x8000 could be a version or field size indicator
    console.log('\nAnalyzing 0x8000 pattern:');
    console.log('0x8000 = ', 0x8000, '(decimal)');
    console.log('0x00008000 = ', 0x00008000, '(decimal)');
    
    // Check if it's field elements (32 bytes each)
    console.log('\nFirst few 32-byte chunks:');
    for (let i = 0; i < 3; i++) {
        const chunk = vkBytes.slice(i * 32, (i + 1) * 32);
        console.log(`Chunk ${i}: ${chunk.toString('hex').substring(0, 64)}...`);
    }
    
    // The actual issue might be that the VK needs a different format
    console.log('\n⚠️  The verification key format might not match what the verifier expects.');
    console.log('The verifier might be expecting a different serialization format.');
}

analyzeVKFormat(); 
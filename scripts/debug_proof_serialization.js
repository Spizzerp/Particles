// Debug script to understand proof serialization issue

// Simulate what happens when the proof is serialized
function debugProofSerialization() {
    console.log('=== Debugging PLONK Proof Serialization ===\n');
    
    // Example proof structure from the logs
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
            // THIS IS THE KEY - the claimed values from the actual proof
            claimed_values: [
                "0x1234567890abcdef",  // This might be only 8 bytes!
                "0xabcdef1234567890",  // Not 32 bytes
                "0x" + "9".repeat(64), // Some might be 32 bytes
                "0x" + "a".repeat(64),
                "0x" + "b".repeat(64),
                "0x" + "c".repeat(64)
            ]
        },
        zshifted_proof: {
            h: ["0x" + "d".repeat(64), "0x" + "0".repeat(64)],
            claimed_value: "0x" + "e".repeat(64)
        },
        bsb22_commitments: []
    };
    
    // Simulate proof serialization
    console.log('Proof structure:');
    console.log('- LRO: 3 points × 32 bytes = 96 bytes');
    console.log('- Z: 1 point × 32 bytes = 32 bytes');
    console.log('- H: 3 points × 32 bytes = 96 bytes');
    console.log('- Batched H: 1 point × 32 bytes = 32 bytes');
    console.log('- Batched values length: 4 bytes');
    console.log('- Batched values: ' + mockProof.batched_proof.claimed_values.length + ' values');
    
    // Check each claimed value
    console.log('\nChecking claimed values:');
    mockProof.batched_proof.claimed_values.forEach((value, i) => {
        const cleanHex = value.startsWith('0x') ? value.substring(2) : value;
        const byteLength = cleanHex.length / 2;
        console.log(`  Value ${i}: ${value.substring(0, 20)}... (${byteLength} bytes)`);
        if (byteLength !== 32) {
            console.error(`    ❌ ERROR: Expected 32 bytes, got ${byteLength} bytes!`);
        }
    });
    
    // Calculate sizes
    const fixedSize = 96 + 32 + 96 + 32 + 4; // LRO + Z + H + batched_h + length
    const claimedValuesSize = mockProof.batched_proof.claimed_values.length * 32;
    const zshiftedSize = 32 + 32; // h + value
    const bsb22LengthSize = 4;
    const totalSize = fixedSize + claimedValuesSize + zshiftedSize + bsb22LengthSize;
    
    console.log('\nSize calculation:');
    console.log('- Fixed components: ' + fixedSize + ' bytes');
    console.log('- Claimed values: ' + claimedValuesSize + ' bytes');
    console.log('- Z shifted: ' + zshiftedSize + ' bytes');
    console.log('- BSB22 length: ' + bsb22LengthSize + ' bytes');
    console.log('- Total: ' + totalSize + ' bytes');
    
    // The real issue might be in PlonkIntegration.mo serializeProof
    console.log('\n⚠️  Key Issue:');
    console.log('The PlonkIntegration.mo serializeProof function expects ALL');
    console.log('claimed values to be 32 bytes, but the proof from WASM might');
    console.log('have claimed values of different sizes!');
    
    // Check what happens with padding
    console.log('\nPadding simulation:');
    mockProof.batched_proof.claimed_values.forEach((value, i) => {
        const cleanHex = value.startsWith('0x') ? value.substring(2) : value;
        const bytes = Buffer.from(cleanHex, 'hex');
        console.log(`Value ${i}: ${bytes.length} bytes -> padded to 32 bytes`);
        if (bytes.length > 32) {
            console.error('  ❌ Value too large to fit in 32 bytes!');
        }
    });
}

debugProofSerialization(); 
// Test witness encoding to debug the capacity overflow issue

function testWitnessEncoding() {
    const numPublic = 7; // We have 7 public inputs
    
    // Motoko code is doing this:
    // buffer.add(Nat8.fromNat(numPublic / 16777216 % 256)); // >> 24
    // buffer.add(Nat8.fromNat(numPublic / 65536 % 256));    // >> 16
    // buffer.add(Nat8.fromNat(numPublic / 256 % 256));      // >> 8
    // buffer.add(Nat8.fromNat(numPublic % 256));            // & 0xFF
    
    console.log('Testing witness encoding for numPublic =', numPublic);
    console.log('');
    
    // What Motoko is doing:
    const byte1 = Math.floor(numPublic / 16777216) % 256;
    const byte2 = Math.floor(numPublic / 65536) % 256;
    const byte3 = Math.floor(numPublic / 256) % 256;
    const byte4 = numPublic % 256;
    
    console.log('Motoko encoding:');
    console.log('Byte 1 (>> 24):', byte1, '(0x' + byte1.toString(16).padStart(2, '0') + ')');
    console.log('Byte 2 (>> 16):', byte2, '(0x' + byte2.toString(16).padStart(2, '0') + ')');
    console.log('Byte 3 (>> 8):', byte3, '(0x' + byte3.toString(16).padStart(2, '0') + ')');
    console.log('Byte 4 (& 0xFF):', byte4, '(0x' + byte4.toString(16).padStart(2, '0') + ')');
    
    // Reconstruct the value to verify
    const reconstructed = (byte1 << 24) | (byte2 << 16) | (byte3 << 8) | byte4;
    console.log('\nReconstructed value:', reconstructed);
    
    // What it should be (proper big-endian encoding)
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0, numPublic, false); // false = big-endian
    const correctBytes = new Uint8Array(buffer);
    
    console.log('\nCorrect big-endian encoding:');
    console.log('Byte 1:', correctBytes[0], '(0x' + correctBytes[0].toString(16).padStart(2, '0') + ')');
    console.log('Byte 2:', correctBytes[1], '(0x' + correctBytes[1].toString(16).padStart(2, '0') + ')');
    console.log('Byte 3:', correctBytes[2], '(0x' + correctBytes[2].toString(16).padStart(2, '0') + ')');
    console.log('Byte 4:', correctBytes[3], '(0x' + correctBytes[3].toString(16).padStart(2, '0') + ')');
    
    // Test with a larger number to see the issue
    console.log('\n\nTesting with larger number (469286168):');
    const largeNum = 469286168;
    
    const large1 = Math.floor(largeNum / 16777216) % 256;
    const large2 = Math.floor(largeNum / 65536) % 256;
    const large3 = Math.floor(largeNum / 256) % 256;
    const large4 = largeNum % 256;
    
    console.log('Would encode as:', [large1, large2, large3, large4]);
    
    // Check what bytes would decode to this value
    const decoded = (large1 << 24) | (large2 << 16) | (large3 << 8) | large4;
    console.log('Decodes to:', decoded);
}

testWitnessEncoding(); 
// Debug witness endianness issue

function debugWitnessEndianness() {
    console.log('=== Debugging Witness Endianness ===\n');
    
    const numPublic = 7;
    
    // Big-endian encoding (what Motoko is doing)
    console.log('Big-endian encoding (Motoko):');
    const be1 = Math.floor(numPublic / 16777216) % 256; // >> 24
    const be2 = Math.floor(numPublic / 65536) % 256;    // >> 16
    const be3 = Math.floor(numPublic / 256) % 256;      // >> 8
    const be4 = numPublic % 256;                         // & 0xFF
    console.log(`Bytes: [${be1}, ${be2}, ${be3}, ${be4}]`);
    
    // What the Rust code might be reading
    const beValue = (be1 << 24) | (be2 << 16) | (be3 << 8) | be4;
    console.log(`Value when read as big-endian: ${beValue}`);
    
    // Little-endian encoding (what Rust might expect)
    console.log('\nLittle-endian encoding (Rust default):');
    const le1 = numPublic % 256;                         // & 0xFF
    const le2 = Math.floor(numPublic / 256) % 256;      // >> 8
    const le3 = Math.floor(numPublic / 65536) % 256;    // >> 16
    const le4 = Math.floor(numPublic / 16777216) % 256; // >> 24
    console.log(`Bytes: [${le1}, ${le2}, ${le3}, ${le4}]`);
    
    const leValue = (le4 << 24) | (le3 << 16) | (le2 << 8) | le1;
    console.log(`Value when read as little-endian: ${leValue}`);
    
    // The actual problem - reading big-endian bytes as little-endian
    console.log('\nThe issue:');
    console.log('If we write [0, 0, 0, 7] (big-endian) but read as little-endian:');
    const wrongValue = (7 << 24) | (0 << 16) | (0 << 8) | 0;
    console.log(`We get: ${wrongValue} (117440512)`);
    
    // Testing with the error values
    console.log('\nError values from logs:');
    console.log('public_len: 469286168');
    console.log('As hex: 0x' + (469286168).toString(16));
    console.log('Bytes (BE): ' + [
        (469286168 >> 24) & 0xFF,
        (469286168 >> 16) & 0xFF,
        (469286168 >> 8) & 0xFF,
        469286168 & 0xFF
    ]);
    
    // The bytes that would produce this when read wrong
    console.log('\nIf the bytes were [24, 1, 248, 28] and read as LE:');
    const testValue = (28 << 24) | (248 << 16) | (1 << 8) | 24;
    console.log(`We get: ${testValue}`);
}

debugWitnessEndianness(); 
const crypto = require('crypto');
const { ethers } = require('ethers');

console.log('🔍 Testing Key Decompression Issue');
console.log('==================================\n');

// The compressed public key from IC
const compressedKeyHex = '035783e1a6acd15000a6dbacf91b5da33a7e0755714b6329764dd12f04b37f4982';
console.log('Compressed key:', compressedKeyHex);

// What the current code is doing (WRONG):
// It's hashing the compressed key directly
const wrongHash = ethers.keccak256('0x' + compressedKeyHex);
const wrongAddress = '0x' + wrongHash.slice(-40);
console.log('\nCurrent behavior (hashing compressed key):');
console.log('Address:', wrongAddress);
console.log('Match with 0xff0b5a436a03e394a08164faeb4834bb3c9ecd79?', 
    wrongAddress.toLowerCase() === '0xff0b5a436a03e394a08164faeb4834bb3c9ecd79');

console.log('\nThe problem:');
console.log('1. IC returns compressed public keys (33 bytes)');
console.log('2. publicKeyToEthereumAddress checks if key[0] == 0x04 (uncompressed)');
console.log('3. For compressed keys (0x02/0x03), it uses them as-is');
console.log('4. This produces wrong addresses');

console.log('\nTo fix this, we need to:');
console.log('1. Detect compressed keys (33 bytes, starting with 0x02/0x03)');
console.log('2. Decompress them to get full x,y coordinates');
console.log('3. Hash the uncompressed coordinates (64 bytes, no prefix)');

// The real issue is that the old deposit might have been created
// when the system worked differently or there was a bug
console.log('\nThe deposit address 0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e');
console.log('was created with older code that might have:');
console.log('- Used uncompressed keys');
console.log('- Had a different bug in address generation');
console.log('- Used a different derivation method entirely');
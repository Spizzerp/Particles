const { ethers } = require('ethers');
const crypto = require('crypto');

console.log('🔍 Testing Public Key Format Issues');
console.log('===================================\n');

// The issue is in publicKeyToEthereumAddress function:
// It checks if key[0] == 0x04 (uncompressed) and removes it
// But it doesn't handle compressed keys (0x02 or 0x03) properly

console.log('The function does:');
console.log('1. If publicKey[0] == 0x04: Remove first byte and use next 64 bytes');
console.log('2. Else: Use publicKey as-is');
console.log('3. Then: keccak256(key) and take last 20 bytes\n');

console.log('Problem:');
console.log('- Compressed keys (33 bytes starting with 0x02/0x03) need decompression');
console.log('- Using compressed key directly in keccak256 gives wrong address');
console.log('- This explains why the same derivation path produces different addresses\n');

// Example compressed public key (33 bytes)
const compressedKey = '0x02' + 'a'.repeat(64); // Dummy compressed key
const uncompressedKey = '0x04' + 'a'.repeat(128); // Dummy uncompressed key

console.log('Example:');
console.log('- Compressed key length:', (compressedKey.length - 2) / 2, 'bytes');
console.log('- Uncompressed key length:', (uncompressedKey.length - 2) / 2, 'bytes');

console.log('\nLikely scenario:');
console.log('1. Old code might have received uncompressed keys from ECDSA');
console.log('2. New code might receive compressed keys');
console.log('3. Or the function is inconsistently applied in different contexts');
console.log('4. This causes address mismatch even with same derivation path\n');

console.log('Solution:');
console.log('We need to check what format the ECDSA canister returns and ensure');
console.log('publicKeyToEthereumAddress properly handles both compressed and uncompressed keys.');
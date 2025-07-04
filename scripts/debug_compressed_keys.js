const { ethers } = require('ethers');
const secp256k1 = require('secp256k1');

console.log('🔍 Testing Compressed Key Handling');
console.log('===================================\n');

// The public key from IC ECDSA
const compressedKeyHex = '035783e1a6acd15000a6dbacf91b5da33a7e0755714b6329764dd12f04b37f4982';
const compressedKey = Buffer.from(compressedKeyHex, 'hex');

console.log('Compressed key:', compressedKeyHex);
console.log('Length:', compressedKey.length, 'bytes');
console.log('Prefix:', '0x' + compressedKey[0].toString(16));

// Decompress the key
const uncompressedKey = secp256k1.publicKeyConvert(compressedKey, false);
const uncompressedHex = uncompressedKey.toString('hex');
console.log('\nUncompressed key:', uncompressedHex);
console.log('Length:', uncompressedKey.length, 'bytes');

// Remove the 0x04 prefix (Ethereum uses raw x,y coordinates)
const rawKey = uncompressedKey.slice(1);
const rawKeyHex = rawKey.toString('hex');
console.log('\nRaw key (without 0x04):', rawKeyHex);

// Hash it
const hash = ethers.keccak256('0x' + rawKeyHex);
console.log('\nKeccak256 hash:', hash);

// Take last 20 bytes for address
const address = '0x' + hash.slice(-40);
console.log('Ethereum address:', address);

console.log('\n📊 Comparison:');
console.log('Expected address: 0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e');
console.log('Generated address:', address);
console.log('Current wrong address: 0xff0b5a436a03e394a08164faeb4834bb3c9ecd79');

// Let's also test what happens if we hash the compressed key directly
const wrongHash = ethers.keccak256('0x' + compressedKeyHex);
const wrongAddress = '0x' + wrongHash.slice(-40);
console.log('\nIf we hash compressed key directly:');
console.log('Wrong address:', wrongAddress);
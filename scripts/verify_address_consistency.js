const { ethers } = require('ethers');
const secp256k1 = require('secp256k1');

console.log('🔍 Verifying Address Generation Consistency');
console.log('==========================================\n');

// Test data from IC
const compressedKeyHex = '0347a42f5b48946919fae9802cce29056cd816618c6cbc3700d182b8ee1d9b0372';
const expectedAddressProper = '0x72c6d8ba80161bceb5af799ccb2928bce20d2ffe';

console.log('Input:');
console.log('- Compressed public key:', compressedKeyHex);
console.log('- Expected address (proper):', expectedAddressProper);

// Decompress the key
const compressed = Buffer.from(compressedKeyHex, 'hex');
const uncompressed = secp256k1.publicKeyConvert(compressed, false);

console.log('\nDecompression:');
console.log('- Uncompressed key:', uncompressed.toString('hex'));
console.log('- Length:', uncompressed.length, 'bytes');

// Remove 0x04 prefix
const rawKey = uncompressed.slice(1);
console.log('- Raw key (no prefix):', rawKey.toString('hex'));

// Hash it
const hash = ethers.keccak256('0x' + rawKey.toString('hex'));
console.log('\nHashing:');
console.log('- Keccak256 hash:', hash);

// Take last 20 bytes
const address = '0x' + hash.slice(-40);
console.log('- Ethereum address:', address);

console.log('\n✅ Verification:');
console.log('- Expected:', expectedAddressProper);
console.log('- Generated:', address);
console.log('- Match:', address.toLowerCase() === expectedAddressProper.toLowerCase());

// Also test what happens with compressed key directly (legacy/buggy)
const hashCompressed = ethers.keccak256('0x' + compressedKeyHex);
const addressCompressed = '0x' + hashCompressed.slice(-40);
console.log('\n📊 Legacy method (hashing compressed):');
console.log('- Address:', addressCompressed);

console.log('\n📝 Summary:');
console.log('The proper implementation correctly decompresses the key before hashing.');
console.log('This produces consistent, correct Ethereum addresses.');
console.log('The legacy method (hashing compressed keys) produces different addresses.');
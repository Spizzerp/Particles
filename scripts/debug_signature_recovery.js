const { ethers } = require('ethers');
const crypto = require('crypto');

// The issue: Migration finds correct derivation but signature recovers wrong address
console.log('🔍 Debugging Signature Recovery Issue');
console.log('=====================================\n');

console.log('The Problem:');
console.log('- Migration finds derivation that generates: 0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e');
console.log('- But signed transaction recovers from: 0xff0b5a436a03E394A08164FaEB4834Bb3C9ecd79\n');

console.log('In Ethereum, the "from" address is NOT included in the transaction.');
console.log('Instead, it\'s recovered from the signature using ecrecover.\n');

console.log('This means:');
console.log('1. The migration correctly finds a derivation path that generates the expected public key/address');
console.log('2. But when we sign with that derivation path, the signature doesn\'t match');
console.log('3. This suggests the public key derivation is working, but something is wrong with:');
console.log('   - How we\'re converting the public key to an address');
console.log('   - Or there\'s a mismatch in the key material\n');

console.log('Hypothesis:');
console.log('The publicKeyToEthereumAddress function might be:');
console.log('1. Using compressed vs uncompressed public keys inconsistently');
console.log('2. Applying keccak256 to different representations of the public key');
console.log('3. The old code might have had a bug that we\'re now trying to replicate\n');

// Let's verify the address recovery process
const signedTx = '0x02f8950180840e42073584bab9996c82fde8949b0721c174b103facec1eee435679ae9c493163c872386f26fc10000a4b214faa53ceb1793fe62c6652483c6f7f9679aab1a8e665f06c78dfe31ec0c8dc8cbd61bc080a076c2dcc0ec1974d91472c13965f4de5e3291555ac123ec17aa7e96ff549fe5bda071672625c61828c0431da05db659ac3f7c7084fd047137aa8e514c620b91f59c';

try {
    const tx = ethers.Transaction.from(signedTx);
    console.log('Recovered from address:', tx.from);
    console.log('Expected address:', '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e');
    
    // Extract signature components
    console.log('\nSignature components:');
    console.log('- r:', tx.r);
    console.log('- s:', tx.s);
    console.log('- yParity:', tx.yParity);
    
    // The signature is deterministic (same input = same output)
    // So if we're getting a different recovered address, it means:
    // - We're signing with a different private key
    // - Which means the ECDSA derivation is producing a different key
    // - Even though the public key -> address conversion shows the right address
    
    console.log('\nConclusion:');
    console.log('The issue is likely in the publicKeyToEthereumAddress function.');
    console.log('It might be showing the "correct" address during checking,');
    console.log('but the actual ECDSA key being used for signing is different.');
} catch (error) {
    console.error('Error:', error.message);
}
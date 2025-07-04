const { ethers } = require('ethers');

// The signed transaction hex from the logs
const signedTxHex = '0x02f89501808404bddec984a84fdd3982c350949b0721c174b103facec1eee435679ae9c493163c872386f26fc10000a4b214faa53ceb1793fe62c6652483c6f7f9679aab1a8e665f06c78dfe31ec0c8dc8cbd61bc080a077897fc394ae5d0eeebbfb17d00718dad3fba1341d0c7d9067db90754c476e6ea030b1a8bc038cdf1bc5cdbb3f802024e397b13a3c09a3054504e125a35fa184d9';

console.log('🔍 Decoding Signed Transaction');
console.log('==============================\n');

try {
    // Parse the transaction
    const tx = ethers.Transaction.from(signedTxHex);
    
    console.log('Transaction Details:');
    console.log('- Type:', tx.type);
    console.log('- Chain ID:', tx.chainId);
    console.log('- From (signer):', tx.from);
    console.log('- To:', tx.to);
    console.log('- Value:', ethers.formatEther(tx.value), 'ETH');
    console.log('- Nonce:', tx.nonce);
    console.log('- Gas Limit:', tx.gasLimit);
    console.log('- Max Fee Per Gas:', ethers.formatUnits(tx.maxFeePerGas, 'gwei'), 'gwei');
    console.log('- Max Priority Fee:', ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei'), 'gwei');
    console.log('- Data:', tx.data);
    console.log('- yParity:', tx.yParity);
    
    console.log('\n📊 Analysis:');
    console.log('- Expected from address: 0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e');
    console.log('- Actual from address:  ', tx.from);
    console.log('- Match?', tx.from.toLowerCase() === '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e'.toLowerCase());
    
    if (tx.from.toLowerCase() !== '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e'.toLowerCase()) {
        console.log('\n❌ PROBLEM IDENTIFIED:');
        console.log('The transaction is being signed by a different address!');
        console.log('This explains the "Insufficient funds" error - the signing address has no balance.');
    }
    
    // Decode the data to verify the commitment
    console.log('\n📦 Call Data Analysis:');
    const methodId = tx.data.slice(0, 10);
    const commitment = '0x' + tx.data.slice(10);
    console.log('- Method ID:', methodId, '(deposit function)');
    console.log('- Commitment:', commitment);
    
} catch (error) {
    console.error('Error decoding transaction:', error.message);
}

// Also decode the yParity=1 version
console.log('\n\n🔍 Decoding yParity=1 version:');
const signedTxHexV1 = '0x02f8950180840e42073584bab9996c82fde8949b0721c174b103facec1eee435679ae9c493163c872386f26fc10000a4b214faa53ceb1793fe62c6652483c6f7f9679aab1a8e665f06c78dfe31ec0c8dc8cbd61bc001a076c2dcc0ec1974d91472c13965f4de5e3291555ac123ec17aa7e96ff549fe5bda071672625c61828c0431da05db659ac3f7c7084fd047137aa8e514c620b91f59c';

try {
    const txV1 = ethers.Transaction.from(signedTxHexV1);
    console.log('- From address with yParity=1:', txV1.from);
} catch (error) {
    console.error('Error:', error.message);
}
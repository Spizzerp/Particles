const { ethers } = require('ethers');

// V2 transaction hex from logs
const txHex = '0x02f895018084085aac9b845abbab0582c350949b0721c174b103facec1eee435679ae9c493163c872386f26fc10000a4b214faa5f7afdf497a429c2ba04ca036887e517e74ab351a46a45e0e4ee04f8d6c49223dc080a06bf6b0fa0a5ea0e3d0c99ff62b6a86bd4e268407921768fd52e8fa548acd3e07a0552001bfb8b004a80a89d12036838c16b5b49a25688697dd9014752ab9d40bd3';

try {
    // Parse the transaction
    const tx = ethers.Transaction.from(txHex);
    
    console.log('Transaction Details:');
    console.log('Type:', tx.type);
    console.log('Chain ID:', tx.chainId);
    console.log('Nonce:', tx.nonce);
    console.log('Max Fee Per Gas:', tx.maxFeePerGas?.toString(), 'wei');
    console.log('Max Priority Fee:', tx.maxPriorityFeePerGas?.toString(), 'wei');
    console.log('Gas Limit:', tx.gasLimit);
    console.log('To:', tx.to);
    console.log('Value:', tx.value.toString(), 'wei (', ethers.formatEther(tx.value), 'ETH)');
    console.log('Data:', tx.data);
    
    // Recover the signer address
    const signingAddress = tx.from;
    console.log('\nSigning Address:', signingAddress);
    console.log('Expected Address: 0x48ba0213c0f015da9499f8bf442894ebc9a5c3d7');
    console.log('Match:', signingAddress?.toLowerCase() === '0x48ba0213c0f015da9499f8bf442894ebc9a5c3d7'.toLowerCase());
    
    // Decode the commitment from the data
    if (tx.data.startsWith('0xb214faa5')) {
        const commitment = '0x' + tx.data.slice(10);
        console.log('\nCommitment being sent:', commitment);
    }
} catch (error) {
    console.error('Error decoding transaction:', error);
}
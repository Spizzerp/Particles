const { ethers } = require('ethers');

async function testNonce() {
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
    const address = '0x48f3cecedb8b4c6518bf78c201acddf31067d2d4';
    
    try {
        // Test getting nonce
        const nonce = await provider.getTransactionCount(address);
        console.log('Address:', address);
        console.log('Nonce:', nonce);
        
        // Also test with 'latest' block
        const nonceLatest = await provider.getTransactionCount(address, 'latest');
        console.log('Nonce (latest):', nonceLatest);
        
        // Test the actual RPC call format
        const rpcResult = await provider.send('eth_getTransactionCount', [address, 'latest']);
        console.log('RPC Result:', rpcResult);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testNonce();
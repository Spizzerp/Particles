const { ethers } = require('ethers');
require('dotenv').config();

async function checkSpecificDeposit() {
    console.log('🔍 Checking specific deposit address...\n');

    // Your deposit address
    const depositAddress = '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e';
    
    // Mainnet pool contract
    const poolContract = '0x9b0721C174b103facEC1EeE435679Ae9C493163C';
    
    // Connect to mainnet
    const provider = new ethers.JsonRpcProvider(
        process.env.MAINNET_RPC_URL || 'https://ethereum.publicnode.com'
    );
    
    console.log('📍 Deposit Address:', depositAddress);
    console.log('📍 Pool Contract:', poolContract);
    console.log('🌐 Network: Ethereum Mainnet\n');
    
    try {
        // 1. Check balance
        const balance = await provider.getBalance(depositAddress);
        console.log('💰 Current Balance:', ethers.formatEther(balance), 'ETH');
        
        // 2. Check transaction count
        const nonce = await provider.getTransactionCount(depositAddress);
        console.log('📊 Transaction Count (Nonce):', nonce);
        
        // 3. Get transaction history
        console.log('\n📜 Checking recent transactions...');
        const latestBlock = await provider.getBlockNumber();
        
        // Check last 1000 blocks (roughly 3.5 hours)
        const fromBlock = latestBlock - 1000;
        
        // Get incoming transactions
        const logs = await provider.getLogs({
            fromBlock: fromBlock,
            toBlock: 'latest',
            topics: [
                ethers.id('Transfer(address,address,uint256)'),
                null,
                ethers.zeroPadValue(depositAddress, 32)
            ]
        });
        
        if (logs.length > 0) {
            console.log(`Found ${logs.length} incoming transfers`);
        }
        
        // 4. Check if address has any ETH to forward
        if (balance > 0n) {
            console.log('\n✅ Address has funds to forward!');
            
            // Calculate gas costs
            const feeData = await provider.getFeeData();
            console.log('\n⛽ Current Gas Prices:');
            console.log('- Gas Price:', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'gwei');
            console.log('- Max Fee Per Gas:', ethers.formatUnits(feeData.maxFeePerGas, 'gwei'), 'gwei');
            console.log('- Max Priority Fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'), 'gwei');
            
            // Estimate forwarding cost
            const gasLimit = 100000n; // Conservative estimate
            const maxCost = gasLimit * feeData.maxFeePerGas;
            
            console.log('\n💸 Forwarding Cost Estimate:');
            console.log('- Gas Limit:', gasLimit.toString());
            console.log('- Max Cost:', ethers.formatEther(maxCost), 'ETH');
            
            const forwardableAmount = balance - maxCost;
            if (forwardableAmount > 0n) {
                console.log('- Forwardable Amount:', ethers.formatEther(forwardableAmount), 'ETH');
                console.log('\n✅ Sufficient balance for forwarding');
            } else {
                console.log('\n❌ Insufficient balance for gas costs');
                console.log('Need at least:', ethers.formatEther(maxCost), 'ETH for gas');
            }
        } else {
            console.log('\n⚠️  No funds in deposit address');
        }
        
        // 5. Check Etherscan
        console.log('\n📊 View on Etherscan:');
        console.log(`https://etherscan.io/address/${depositAddress}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the check
checkSpecificDeposit().catch(console.error);
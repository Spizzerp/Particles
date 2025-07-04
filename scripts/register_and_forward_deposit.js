const { ethers } = require('ethers');
require('dotenv').config();

async function registerAndForwardDeposit() {
    console.log('📋 Manual Deposit Registration and Forwarding\n');
    
    const depositAddress = '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e';
    const poolContract = '0x9b0721C174b103facEC1EeE435679Ae9C493163C';
    
    console.log('📍 Deposit Address:', depositAddress);
    console.log('📍 Pool Contract:', poolContract);
    
    // Connect to mainnet
    const provider = new ethers.JsonRpcProvider(
        process.env.MAINNET_RPC_URL || 'https://ethereum.publicnode.com'
    );
    
    try {
        // Check current balance
        const balance = await provider.getBalance(depositAddress);
        console.log('💰 Current Balance:', ethers.formatEther(balance), 'ETH\n');
        
        if (balance === 0n) {
            console.log('❌ No funds to forward');
            return;
        }
        
        // Get current gas prices
        const feeData = await provider.getFeeData();
        console.log('⛽ Gas Prices:');
        console.log('- Max Fee Per Gas:', ethers.formatUnits(feeData.maxFeePerGas, 'gwei'), 'gwei');
        console.log('- Max Priority Fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'), 'gwei\n');
        
        // Calculate forwarding parameters
        const gasLimit = 65000n; // Standard for deposit function
        const maxGasCost = gasLimit * feeData.maxFeePerGas;
        
        // Amount to forward (0.01 ETH typical deposit)
        const depositAmount = ethers.parseEther('0.01');
        const totalNeeded = depositAmount + maxGasCost;
        
        console.log('💸 Transaction Details:');
        console.log('- Deposit Amount:', ethers.formatEther(depositAmount), 'ETH');
        console.log('- Max Gas Cost:', ethers.formatEther(maxGasCost), 'ETH');
        console.log('- Total Needed:', ethers.formatEther(totalNeeded), 'ETH');
        
        if (balance < totalNeeded) {
            console.log('\n❌ Insufficient balance for deposit + gas');
            console.log('Need:', ethers.formatEther(totalNeeded - balance), 'ETH more');
            return;
        }
        
        console.log('\n✅ Sufficient balance for forwarding');
        
        // Generate a sample commitment (in production, this should come from the user)
        const commitment = ethers.keccak256(ethers.toUtf8Bytes('test_commitment_' + Date.now()));
        console.log('\n🔐 Using commitment:', commitment);
        
        // Encode deposit function call
        const iface = new ethers.Interface(['function deposit(bytes32 commitment) payable']);
        const callData = iface.encodeFunctionData('deposit', [commitment]);
        
        console.log('\n📦 Encoded call data:', callData);
        
        // To actually forward, you need the private key
        console.log('\n⚠️  To complete the forwarding:');
        console.log('1. The deposit address must be registered in the EthereumAdapter canister');
        console.log('2. Call: dfx canister --network ic call ethereum_adapter processDepositAddresses');
        console.log('3. Or manually forward using the deposit address private key\n');
        
        console.log('📋 Manual forwarding transaction parameters:');
        console.log(JSON.stringify({
            from: depositAddress,
            to: poolContract,
            value: depositAmount.toString(),
            data: callData,
            gasLimit: gasLimit.toString(),
            maxFeePerGas: feeData.maxFeePerGas.toString(),
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
            type: 2
        }, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

registerAndForwardDeposit().catch(console.error);
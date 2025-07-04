const { ethers } = require('ethers');
require('dotenv').config();

async function debugDepositFailure() {
    console.log('🔍 Debugging Deposit Transaction Failure on Sepolia...\n');

    // Connect to Sepolia
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com');
    
    // Example deposit address from your system
    const depositAddress = '0x48f3cecedb8b4c6518bf78c201acddf31067d2d4';
    const poolContract = '0x8626502727D7faf282C44df18B34E50D0DB45Eae';
    
    console.log('📍 Checking deposit address:', depositAddress);
    console.log('📍 Pool contract:', poolContract);
    
    try {
        // 1. Check current balance
        const balance = await provider.getBalance(depositAddress);
        console.log('\n💰 Current balance:', ethers.formatEther(balance), 'ETH');
        
        // 2. Check transaction count (nonce)
        const nonce = await provider.getTransactionCount(depositAddress);
        console.log('📊 Current nonce:', nonce);
        
        // 3. Get current gas prices
        const feeData = await provider.getFeeData();
        console.log('\n⛽ Current Gas Prices:');
        console.log('- Gas Price (legacy):', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'gwei');
        console.log('- Max Fee Per Gas (EIP-1559):', ethers.formatUnits(feeData.maxFeePerGas, 'gwei'), 'gwei');
        console.log('- Max Priority Fee (EIP-1559):', ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'), 'gwei');
        
        // 4. Get latest block info
        const block = await provider.getBlock('latest');
        console.log('- Base Fee Per Gas:', ethers.formatUnits(block.baseFeePerGas, 'gwei'), 'gwei');
        console.log('- Block number:', block.number);
        
        // 5. Estimate gas for a deposit transaction
        console.log('\n🧮 Estimating gas for deposit transaction...');
        
        // Create test transaction data
        const depositAmount = ethers.parseEther('0.01'); // 0.01 ETH
        const testCommitment = '0x' + '0'.repeat(64); // Test commitment
        
        // Encode the deposit function call
        const iface = new ethers.Interface(['function deposit(bytes32 commitment) payable']);
        const callData = iface.encodeFunctionData('deposit', [testCommitment]);
        
        try {
            // Try to estimate gas for the transaction
            const estimatedGas = await provider.estimateGas({
                from: depositAddress,
                to: poolContract,
                value: depositAmount,
                data: callData
            });
            console.log('✅ Estimated gas:', estimatedGas.toString());
            
            // Calculate costs
            const gasCostLegacy = estimatedGas * feeData.gasPrice;
            const gasCostEIP1559 = estimatedGas * feeData.maxFeePerGas;
            
            console.log('\n💸 Transaction costs:');
            console.log('- Legacy tx gas cost:', ethers.formatEther(gasCostLegacy), 'ETH');
            console.log('- EIP-1559 tx max gas cost:', ethers.formatEther(gasCostEIP1559), 'ETH');
            console.log('- Deposit amount:', ethers.formatEther(depositAmount), 'ETH');
            console.log('- Total needed (EIP-1559):', ethers.formatEther(depositAmount + gasCostEIP1559), 'ETH');
            
            if (balance < depositAmount + gasCostEIP1559) {
                console.log('\n❌ INSUFFICIENT BALANCE!');
                console.log('Need to add:', ethers.formatEther((depositAmount + gasCostEIP1559) - balance), 'ETH');
            } else {
                console.log('\n✅ Balance is sufficient for transaction');
            }
            
        } catch (estimateError) {
            console.log('❌ Gas estimation failed:', estimateError.message);
            
            // Try a static call to see if there's a revert reason
            try {
                await provider.call({
                    from: depositAddress,
                    to: poolContract,
                    value: depositAmount,
                    data: callData
                });
            } catch (callError) {
                console.log('❌ Static call failed:', callError.message);
                if (callError.data) {
                    console.log('Error data:', callError.data);
                }
            }
        }
        
        // 6. Check if contract accepts the deposit amount
        console.log('\n🔍 Checking contract requirements...');
        
        // Try to read minimum deposit from contract (if available)
        try {
            const contractCode = await provider.getCode(poolContract);
            if (contractCode === '0x') {
                console.log('❌ No contract deployed at pool address!');
            } else {
                console.log('✅ Contract is deployed');
                
                // Try to read MIN_DEPOSIT if it's public
                const poolContractInterface = new ethers.Contract(
                    poolContract,
                    ['function MIN_DEPOSIT() view returns (uint256)'],
                    provider
                );
                
                try {
                    const minDeposit = await poolContractInterface.MIN_DEPOSIT();
                    console.log('Minimum deposit:', ethers.formatEther(minDeposit), 'ETH');
                    
                    if (depositAmount < minDeposit) {
                        console.log('❌ Deposit amount is below minimum!');
                    }
                } catch (e) {
                    console.log('ℹ️  Could not read MIN_DEPOSIT (might not be public)');
                }
            }
        } catch (error) {
            console.log('Error checking contract:', error.message);
        }
        
        // 7. Network recommendations
        console.log('\n📋 Recommendations:');
        console.log('1. Sepolia typically works well with EIP-1559 transactions');
        console.log('2. Use maxFeePerGas = baseFee * 2 + maxPriorityFeePerGas for reliability');
        console.log('3. Set maxPriorityFeePerGas to at least 2 gwei on Sepolia');
        console.log('4. Always add 20% buffer to gas estimates');
        
        // 8. Example transaction parameters
        const recommendedMaxFee = block.baseFeePerGas * 2n + feeData.maxPriorityFeePerGas;
        console.log('\n💡 Recommended transaction parameters:');
        console.log('- Type: 2 (EIP-1559)');
        console.log('- Max Priority Fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'), 'gwei');
        console.log('- Max Fee Per Gas:', ethers.formatUnits(recommendedMaxFee, 'gwei'), 'gwei');
        console.log('- Gas Limit: 100000 (with buffer)');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

// Run the debug script
debugDepositFailure().catch(console.error);
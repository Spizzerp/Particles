const { ethers } = require('ethers');

async function debugTransaction() {
    console.log('🔍 Debugging Transaction Submission\n');
    
    const provider = new ethers.JsonRpcProvider('https://ethereum.publicnode.com');
    
    // Transaction details from the canister
    const depositAddress = '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e';
    const poolContract = '0x9b0721C174b103facEC1EeE435679Ae9C493163C';
    const depositAmount = ethers.parseEther('0.01');
    const commitment = '0x3ceb1793fe62c6652483c6f7f9679aab1a8e665f06c78dfe31ec0c8dc8cbd61b';
    
    try {
        // Get current balance
        const balance = await provider.getBalance(depositAddress);
        console.log('💰 Current Balance:', ethers.formatEther(balance), 'ETH');
        
        // Get current nonce
        const nonce = await provider.getTransactionCount(depositAddress);
        console.log('🔢 Current Nonce:', nonce);
        
        // Get current gas prices
        const feeData = await provider.getFeeData();
        const block = await provider.getBlock('latest');
        
        console.log('\n⛽ Gas Prices:');
        console.log('- Base Fee:', ethers.formatUnits(block.baseFeePerGas, 'gwei'), 'gwei');
        console.log('- Priority Fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'), 'gwei');
        
        // Calculate fees like the canister does
        const maxPriorityFee = feeData.maxPriorityFeePerGas;
        const maxFeePerGas = block.baseFeePerGas + maxPriorityFee + (block.baseFeePerGas / 10n); // 10% buffer
        
        console.log('- Max Fee (with buffer):', ethers.formatUnits(maxFeePerGas, 'gwei'), 'gwei');
        
        // Build the transaction
        const iface = new ethers.Interface(['function deposit(bytes32) payable']);
        const callData = iface.encodeFunctionData('deposit', [commitment]);
        
        const gasLimit = 65000n;
        const maxGasCost = maxFeePerGas * gasLimit;
        
        console.log('\n📊 Transaction Cost Analysis:');
        console.log('- Gas Limit:', gasLimit.toString());
        console.log('- Max Gas Cost:', ethers.formatEther(maxGasCost), 'ETH');
        console.log('- Deposit Amount:', ethers.formatEther(depositAmount), 'ETH');
        console.log('- Total Required:', ethers.formatEther(depositAmount + maxGasCost), 'ETH');
        
        // Create the transaction
        const tx = {
            type: 2, // EIP-1559
            to: poolContract,
            value: depositAmount,
            data: callData,
            nonce: nonce,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFee,
            gasLimit: gasLimit,
            chainId: 1
        };
        
        console.log('\n📝 Transaction Object:');
        console.log({
            type: tx.type,
            to: tx.to,
            value: ethers.formatEther(tx.value) + ' ETH',
            nonce: tx.nonce,
            maxFeePerGas: ethers.formatUnits(tx.maxFeePerGas, 'gwei') + ' gwei',
            maxPriorityFeePerGas: ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei') + ' gwei',
            gasLimit: tx.gasLimit.toString(),
            chainId: tx.chainId,
            dataLength: tx.data.length + ' bytes'
        });
        
        // Estimate gas to see if there's an issue
        console.log('\n🔮 Estimating gas...');
        try {
            // Create a wallet to sign (won't actually send)
            const wallet = new ethers.Wallet('0x' + '1'.repeat(64), provider);
            const signedTx = await wallet.signTransaction(tx);
            console.log('✅ Transaction can be signed');
            
            // Try to estimate gas from the deposit address
            const gasEstimate = await provider.estimateGas({
                from: depositAddress,
                to: poolContract,
                value: depositAmount,
                data: callData
            });
            console.log('✅ Gas estimate:', gasEstimate.toString());
        } catch (error) {
            console.log('❌ Error:', error.message);
            if (error.message.includes('insufficient funds')) {
                console.log('\n⚠️  The RPC is reporting insufficient funds!');
                console.log('This might be because the gas estimation includes the value.');
                
                // Try without value to see if gas estimation works
                try {
                    const gasEstimateNoValue = await provider.estimateGas({
                        from: depositAddress,
                        to: poolContract,
                        value: 0n,
                        data: callData
                    });
                    console.log('✅ Gas estimate (without value):', gasEstimateNoValue.toString());
                } catch (e) {
                    console.log('❌ Still fails without value:', e.message);
                }
            }
        }
        
        // Check if balance is exactly what we think
        const balanceWei = balance.toString();
        const requiredWei = (depositAmount + maxGasCost).toString();
        console.log('\n🔢 Exact Wei Values:');
        console.log('- Balance:', balanceWei, 'wei');
        console.log('- Required:', requiredWei, 'wei');
        console.log('- Difference:', (BigInt(balanceWei) - BigInt(requiredWei)).toString(), 'wei');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugTransaction();
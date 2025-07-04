const { ethers } = require('ethers');

async function estimateGas() {
    console.log('📊 Estimating Gas for Mainnet Deposit\n');
    
    const provider = new ethers.JsonRpcProvider('https://ethereum.publicnode.com');
    
    // Your deposit details
    const depositAddress = '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e';
    const poolContract = '0x9b0721C174b103facEC1EeE435679Ae9C493163C';
    const depositAmount = ethers.parseEther('0.01');
    
    try {
        // Get current balance
        const balance = await provider.getBalance(depositAddress);
        console.log('💰 Current Balance:', ethers.formatEther(balance), 'ETH');
        
        // Get current gas prices
        const feeData = await provider.getFeeData();
        console.log('\n⛽ Current Gas Prices:');
        console.log('- Gas Price (Legacy):', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'gwei');
        console.log('- Max Fee Per Gas:', ethers.formatUnits(feeData.maxFeePerGas, 'gwei'), 'gwei');
        console.log('- Max Priority Fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'), 'gwei');
        
        // Get base fee from latest block
        const block = await provider.getBlock('latest');
        console.log('- Base Fee:', ethers.formatUnits(block.baseFeePerGas, 'gwei'), 'gwei');
        
        // Calculate with 10% buffer (same as contract)
        const maxFeeWithBuffer = block.baseFeePerGas + feeData.maxPriorityFeePerGas + (block.baseFeePerGas / 10n);
        console.log('- Max Fee with 10% buffer:', ethers.formatUnits(maxFeeWithBuffer, 'gwei'), 'gwei');
        
        // Estimate gas for deposit
        const iface = new ethers.Interface(['function deposit(bytes32) payable']);
        const callData = iface.encodeFunctionData('deposit', ['0x3ceb1793fe62c6652483c6f7f9679aab1a8e665f06c78dfe31ec0c8dc8cbd61b']);
        
        console.log('\n📐 Transaction Estimates:');
        const gasLimit = 65000n; // Same as contract
        console.log('- Gas Limit:', gasLimit.toString());
        
        const maxGasCost = maxFeeWithBuffer * gasLimit;
        console.log('- Max Gas Cost:', ethers.formatEther(maxGasCost), 'ETH');
        console.log('- Deposit Amount:', ethers.formatEther(depositAmount), 'ETH');
        
        const totalRequired = depositAmount + maxGasCost;
        console.log('- Total Required:', ethers.formatEther(totalRequired), 'ETH');
        
        const remainingAfterGas = balance - maxGasCost;
        console.log('\n💸 Balance Analysis:');
        console.log('- Have:', ethers.formatEther(balance), 'ETH');
        console.log('- Need:', ethers.formatEther(totalRequired), 'ETH');
        
        if (balance >= totalRequired) {
            console.log('✅ Sufficient balance!');
        } else {
            const shortage = totalRequired - balance;
            console.log('❌ Insufficient! Short by:', ethers.formatEther(shortage), 'ETH');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

estimateGas();
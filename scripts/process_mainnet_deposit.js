const { execSync } = require('child_process');
const { ethers } = require('ethers');
const fs = require('fs');

async function processMainnetDeposit() {
    console.log('🔄 Processing Mainnet Deposit');
    console.log('==============================\n');
    
    // Load deposit info
    if (!fs.existsSync('mainnet-deposit-info.json')) {
        console.error('❌ No deposit info found. Run create_mainnet_deposit_v2.js first');
        return;
    }
    
    const depositInfo = JSON.parse(fs.readFileSync('mainnet-deposit-info.json', 'utf-8'));
    console.log('📍 Deposit Address:', depositInfo.address);
    console.log('💰 Expected Amount:', depositInfo.amountEth, 'ETH');
    console.log('📜 Contract:', depositInfo.contractAddress);
    
    // Check balance first
    const provider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/zToG4FRFPBAVjiiQVc7uS');
    
    console.log('\n🔍 Checking deposit address balance...');
    const balance = await provider.getBalance(depositInfo.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance === 0n) {
        console.log('⏳ No funds detected yet. Please send 0.005 ETH to the address.');
        return;
    }
    
    // Check contract balance before
    console.log('\n📊 Checking contract balance before processing...');
    const contractBalanceBefore = await provider.getBalance(depositInfo.contractAddress);
    console.log('Contract balance:', ethers.formatEther(contractBalanceBefore), 'ETH');
    
    // Process the deposit
    console.log('\n🚀 Processing deposit with V2...');
    const cmd = `dfx canister --network ic call ethereum_adapter processSingleDepositV2 '("${depositInfo.address}")'`;
    
    try {
        const result = execSync(cmd, { encoding: 'utf-8' });
        console.log('\nResult:', result);
        
        // Check if successful
        if (result.includes('ok')) {
            console.log('\n✅ Deposit processed successfully!');
            
            // Extract transaction hash if available
            const txMatch = result.match(/0x[a-fA-F0-9]{64}/);
            if (txMatch) {
                const txHash = txMatch[0];
                console.log('📜 Transaction Hash:', txHash);
                console.log('🔗 View on Etherscan: https://etherscan.io/tx/' + txHash);
                
                // Wait a bit and check contract balance
                console.log('\n⏳ Waiting for confirmation...');
                await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds
                
                const contractBalanceAfter = await provider.getBalance(depositInfo.contractAddress);
                console.log('\n📊 Contract balance after:', ethers.formatEther(contractBalanceAfter), 'ETH');
                
                const difference = contractBalanceAfter - contractBalanceBefore;
                if (difference > 0) {
                    console.log('💰 Amount forwarded:', ethers.formatEther(difference), 'ETH');
                }
            }
        } else {
            console.log('⚠️ Processing result:', result);
        }
    } catch (error) {
        console.error('❌ Error processing deposit:', error.message);
        if (error.stderr) {
            console.error('Details:', error.stderr.toString());
        }
    }
}

processMainnetDeposit().catch(console.error);
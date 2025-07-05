const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

async function createMainnetDeposit() {
    console.log('🌐 Creating Mainnet Deposit Address (0.005 ETH)');
    console.log('=====================================\n');
    
    // Generate random commitment
    const commitment = '0x' + crypto.randomBytes(32).toString('hex');
    console.log('📝 Commitment:', commitment);
    
    // Use a simple test principal - we can use the anonymous principal for testing
    // In production, each user would have their own principal
    const principal = 'aaaaa-aa'; // Anonymous principal
    
    // Amount in wei (0.005 ETH)
    const amountWei = '5000000000000000'; // 0.005 * 10^18
    
    console.log('💰 Amount: 0.005 ETH');
    console.log('🔢 Amount (wei):', amountWei);
    console.log('🆔 Principal:', principal);
    
    // Call getDepositAddressV2
    const cmd = `dfx canister --network ic call ethereum_adapter getDepositAddressV2 '(principal "${principal}", "${commitment}", ${amountWei})'`;
    
    console.log('\n🔄 Generating deposit address...\n');
    
    try {
        const result = execSync(cmd, { encoding: 'utf-8' });
        console.log('Raw result:', result);
        
        // Parse the address from the result
        const match = result.match(/ok = "([^"]+)"/);
        if (match) {
            const address = match[1];
            console.log('\n✅ Deposit Address Generated!');
            console.log('📍 Address:', address);
            console.log('\n⚡ Send exactly 0.005 ETH to this address on Ethereum Mainnet');
            console.log('🔗 Etherscan: https://etherscan.io/address/' + address);
            
            // Save deposit info
            const depositInfo = {
                address,
                commitment,
                principal,
                amountWei,
                amountEth: '0.005',
                network: 'mainnet',
                contractAddress: '0xe09A374Ac0Bc64061Ca839Cd3312e0d86E94Df51',
                timestamp: new Date().toISOString()
            };
            
            fs.writeFileSync(
                'mainnet-deposit-info.json',
                JSON.stringify(depositInfo, null, 2)
            );
            
            console.log('\n💾 Deposit info saved to mainnet-deposit-info.json');
            console.log('\n📋 Next steps:');
            console.log('1. Send exactly 0.005 ETH to', address);
            console.log('2. Wait for 12 confirmations (~3 minutes)');
            console.log('3. Run: node scripts/process_mainnet_deposit.js');
            
            return address;
        } else {
            console.error('❌ Failed to parse address from result');
            console.error('Result:', result);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.stderr) {
            console.error('Stderr:', error.stderr.toString());
        }
    }
}

createMainnetDeposit();
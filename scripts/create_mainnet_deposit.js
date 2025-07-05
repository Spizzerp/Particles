const { execSync } = require('child_process');
const crypto = require('crypto');

async function createMainnetDeposit() {
    console.log('🌐 Creating Mainnet Deposit Address (0.005 ETH)');
    console.log('=====================================\n');
    
    // Generate random commitment
    const commitment = '0x' + crypto.randomBytes(32).toString('hex');
    console.log('📝 Commitment:', commitment);
    
    // Generate a random principal using dfx
    const principalResult = execSync('dfx identity new temp_deposit_' + Date.now() + ' 2>&1 && dfx identity use temp_deposit_' + Date.now() + ' 2>&1 && dfx identity get-principal', { encoding: 'utf-8' });
    const principalMatch = principalResult.match(/([a-z0-9\-]+)/g);
    const principal = principalMatch[principalMatch.length - 1];
    
    // Switch back to default identity
    execSync('dfx identity use default 2>&1');
    
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
                principalHex,
                amountWei,
                amountEth: '0.005',
                network: 'mainnet',
                timestamp: new Date().toISOString()
            };
            
            require('fs').writeFileSync(
                'mainnet-deposit-info.json',
                JSON.stringify(depositInfo, null, 2)
            );
            
            console.log('\n💾 Deposit info saved to mainnet-deposit-info.json');
            console.log('\n📋 Next steps:');
            console.log('1. Send 0.005 ETH to', address);
            console.log('2. Wait for confirmation (12 blocks recommended)');
            console.log('3. Run: node scripts/process_mainnet_deposit.js');
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
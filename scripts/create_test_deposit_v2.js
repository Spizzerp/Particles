const { execSync } = require('child_process');

console.log('🔍 Creating Test Deposit Wallet with V2');
console.log('======================================\n');

// Test parameters
const testUserId = 'rrkah-fqaaa-aaaaa-aaaaq-cai'; // Test principal
const testCommitment = '0x' + '1'.repeat(64); // Test commitment hash
const testAmount = '10000000000000000'; // 0.01 ETH in wei

console.log('Test Parameters:');
console.log('- User ID:', testUserId);
console.log('- Commitment:', testCommitment);
console.log('- Amount:', testAmount, 'wei (0.01 ETH)\n');

console.log('1️⃣ Creating deposit address using getDepositAddressV2...');

try {
    // Call the canister
    const cmd = `dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai getDepositAddressV2 '(principal "${testUserId}", "${testCommitment}", ${testAmount})'`;
    console.log('Command:', cmd);
    
    const result = execSync(cmd, { encoding: 'utf-8' });
    console.log('\nResult:', result);
    
    // Extract address from result
    const addressMatch = result.match(/"(0x[a-fA-F0-9]{40})"/);
    if (addressMatch) {
        const address = addressMatch[1];
        console.log('\n✅ Successfully created deposit address:', address);
        
        console.log('\n2️⃣ Retrieving deposit info to verify structure...');
        const infoCmd = `dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai getDepositInfo '("${address}")'`;
        const infoResult = execSync(infoCmd, { encoding: 'utf-8' });
        console.log('\nDeposit Info:', infoResult);
        
        console.log('\n3️⃣ Testing address generation consistency...');
        const debugCmd = `dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai debugAddressGeneration '(principal "${testUserId}")'`;
        const debugResult = execSync(debugCmd, { encoding: 'utf-8' });
        console.log('\nDebug Info:', debugResult);
        
        console.log('\n4️⃣ Wallet Structure Summary:');
        console.log('- Deposit Address:', address);
        console.log('- Associated User:', testUserId);
        console.log('- Commitment Hash:', testCommitment);
        console.log('- Expected Amount:', testAmount, 'wei');
        console.log('- Status: Unprocessed (waiting for deposit)');
        
        console.log('\n📋 Next Steps:');
        console.log(`1. Send exactly 0.01 ETH to ${address} on Ethereum mainnet`);
        console.log(`2. Wait for confirmation`);
        console.log(`3. Run: dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai processSingleDeposit '("${address}")'`);
        console.log(`4. The funds should forward to pool contract: 0x9b0721C174b103facEC1EeE435679Ae9C493163C`);
        
    } else {
        console.log('❌ Failed to extract address from result');
    }
    
} catch (error) {
    console.error('Error:', error.message);
    if (error.stdout) console.log('Stdout:', error.stdout.toString());
    if (error.stderr) console.log('Stderr:', error.stderr.toString());
}
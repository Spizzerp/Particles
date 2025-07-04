const { execSync } = require('child_process');

async function testUniqueAddresses() {
    console.log('🔍 Testing Unique Address Generation');
    console.log('====================================\n');

    const testUserId = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
    const addresses = [];

    console.log('Creating 3 deposits for the same user...\n');

    for (let i = 1; i <= 3; i++) {
    try {
        // Different commitment for each deposit
        const commitment = '0x' + i.toString().repeat(64);
        const amount = (i * 1000000000000000).toString(); // 0.001, 0.002, 0.003 ETH
        
        console.log(`Deposit ${i}:`);
        console.log(`- Commitment: ${commitment.substring(0, 10)}...`);
        console.log(`- Amount: ${amount} wei`);
        
        // Small delay to ensure different timestamps
        if (i > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Create deposit address
        const cmd = `dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai getDepositAddressV2 '(principal "${testUserId}", "${commitment}", ${amount})'`;
        const result = execSync(cmd, { encoding: 'utf-8' });
        
        // Extract address
        const addressMatch = result.match(/"(0x[a-fA-F0-9]{40})"/);
        if (addressMatch) {
            const address = addressMatch[1];
            addresses.push(address);
            console.log(`- Address: ${address}`);
            console.log('✅ Success\n');
        } else {
            console.log('❌ Failed to extract address\n');
        }
        
    } catch (error) {
        console.error(`Error creating deposit ${i}:`, error.message);
    }
}

console.log('\n📊 Results:');
console.log('===========');
console.log(`Total addresses generated: ${addresses.length}`);
console.log(`Unique addresses: ${new Set(addresses).size}`);

if (new Set(addresses).size === addresses.length) {
    console.log('\n✅ SUCCESS: Each deposit got a unique address!');
    console.log('This provides:');
    console.log('- Privacy: Deposits are not linkable to the same user');
    console.log('- Security: Each deposit is isolated');
    console.log('- Flexibility: Multiple concurrent deposits possible');
} else {
    console.log('\n❌ PROBLEM: Some addresses are duplicated!');
    console.log('Addresses:', addresses);
}

console.log('\n📋 Address List:');
addresses.forEach((addr, i) => {
    console.log(`${i + 1}. ${addr}`);
});

}

testUniqueAddresses().catch(console.error);
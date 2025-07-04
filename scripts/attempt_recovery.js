const { execSync } = require('child_process');

async function attemptRecovery() {
    console.log('🔍 Attempting to recover stuck funds...\n');
    
    const stuckAddress = '0x48ba0213c0f015da9499f8bf442894ebc9a5c3d7';
    const newAddress = '0x5afd9090294d6cd15d438e7c74c3eef12e5a09d7';
    
    console.log(`From: ${stuckAddress}`);
    console.log(`To:   ${newAddress}`);
    console.log('\nStored timestamp: 1751616799854273422');
    console.log('This is: 2025-07-04T08:13:19.854Z\n');
    
    // The address generation likely happened within a few milliseconds before storage
    // Let's try a range of timestamps
    const storedTimestamp = 1751616799854273422n;
    
    console.log('Trying different timestamp offsets...\n');
    
    // Try timestamps up to 1 second before (1,000,000 microseconds)
    for (let offset = 0n; offset <= 1000000n; offset += 1000n) {
        const tryTimestamp = storedTimestamp - offset;
        
        if (offset % 100000n === 0n) {
            console.log(`Trying offset -${offset} (timestamp: ${tryTimestamp})`);
        }
        
        // We would need to call a canister function that tries this specific timestamp
        // For now, let's just show what we're attempting
    }
    
    console.log('\nTo implement recovery, we need a canister function that:');
    console.log('1. Takes the stuck address as input');
    console.log('2. Tries different timestamps around the stored value');
    console.log('3. For each timestamp, derives the address');
    console.log('4. When it finds a match, uses that derivation path to sign');
    console.log('5. Transfers the funds to a new address');
}

attemptRecovery().catch(console.error);
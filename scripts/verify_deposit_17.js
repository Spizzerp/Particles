const { MiMC } = require('../src/frontend/utils/mimc');

async function verifyDeposit17() {
    console.log('=== Verifying Deposit 17 ===\n');
    
    // Data from the logs
    const depositData = {
        secret: '0x0ce3125eeb7d1a12b209a21a6eac37f002e6adb91ffc0f05bb46c26574d720cf',
        nullifier: '0x078e421fd072896bdbc7c63205afdf5798e9b6b2861825a0af0f8742fa9f5b26',
        amount: '5000000000000000', // 0.005 ETH in wei
        expectedCommitment: '0x23a7666a0abe1ce426db649a370350e8b1d77bcf58c0357393e563992b42e153'
    };
    
    console.log('Deposit data:');
    console.log('Secret:', depositData.secret);
    console.log('Nullifier:', depositData.nullifier);
    console.log('Amount:', depositData.amount, 'wei');
    console.log('Expected commitment:', depositData.expectedCommitment);
    console.log();
    
    // Initialize MiMC
    const mimc = new MiMC();
    await mimc.initialize();
    
    // Calculate commitment using the correct formula
    const secretBn = BigInt(depositData.secret);
    const nullifierBn = BigInt(depositData.nullifier);
    const amountBn = BigInt(depositData.amount);
    
    console.log('BigInt values:');
    console.log('Secret:', secretBn.toString());
    console.log('Nullifier:', nullifierBn.toString());
    console.log('Amount:', amountBn.toString());
    console.log();
    
    // Calculate commitment
    const commitment = mimc.hash([secretBn, nullifierBn, amountBn]);
    const commitmentHex = '0x' + commitment.toString(16).padStart(64, '0');
    
    console.log('Calculated commitment:', commitmentHex);
    console.log('Expected commitment:  ', depositData.expectedCommitment);
    console.log('Match:', commitmentHex.toLowerCase() === depositData.expectedCommitment.toLowerCase() ? '✅ YES' : '❌ NO');
    console.log();
    
    // Also calculate nullifier hash
    const nullifierHash = mimc.hash([nullifierBn]);
    const nullifierHashHex = '0x' + nullifierHash.toString(16).padStart(64, '0');
    console.log('Nullifier hash:', nullifierHashHex);
    
    // Check if this matches the circuit's expected format
    console.log('\n=== Checking Value Formats ===');
    console.log('Secret length:', depositData.secret.length - 2, 'hex chars =', (depositData.secret.length - 2) / 2, 'bytes');
    console.log('Nullifier length:', depositData.nullifier.length - 2, 'hex chars =', (depositData.nullifier.length - 2) / 2, 'bytes');
    
    // Check if values are within field
    const fieldModulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    console.log('\nField checks:');
    console.log('Secret < field modulus:', secretBn < fieldModulus ? '✅' : '❌');
    console.log('Nullifier < field modulus:', nullifierBn < fieldModulus ? '✅' : '❌');
    console.log('Amount < field modulus:', amountBn < fieldModulus ? '✅' : '❌');
}

verifyDeposit17().catch(console.error);
const crypto = require('crypto');

// MiMC implementation for testing
function mimcHash(inputs) {
    // BN254 field modulus
    const FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    
    // Simple hash for testing - in production this would be the full MiMC
    let result = BigInt(0);
    for (let input of inputs) {
        const value = BigInt(input);
        // Simple combination for testing
        result = (result + value) % FIELD_MODULUS;
        // Mix it up a bit
        result = (result * result) % FIELD_MODULUS;
    }
    
    return result;
}

function debugDeposit17() {
    console.log('=== Debugging Deposit 17 Constraint Error ===\n');
    
    // Values from the logs
    const secret = '0x0ce3125eeb7d1a12b209a21a6eac37f002e6adb91ffc0f05bb46c26574d720cf';
    const nullifier = '0x078e421fd072896bdbc7c63205afdf5798e9b6b2861825a0af0f8742fa9f5b26';
    const amount = '5000000000000000';
    const depositCommitment = '0x23a7666a0abe1ce426db649a370350e8b1d77bcf58c0357393e563992b42e153';
    
    console.log('Input values:');
    console.log('Secret:', secret);
    console.log('Nullifier:', nullifier);
    console.log('Amount:', amount);
    console.log('Deposit commitment:', depositCommitment);
    console.log();
    
    // Check byte lengths
    console.log('Value sizes:');
    console.log('Secret: ', (secret.length - 2) / 2, 'bytes');
    console.log('Nullifier:', (nullifier.length - 2) / 2, 'bytes');
    console.log();
    
    // The constraint error values
    const constraintA = BigInt('1985294771856793126513302278846007092491122253589506715424588092816417061220');
    const constraintB = BigInt('2845278316954798553715484425206192133365199433155299723810277581142403580168');
    
    console.log('Constraint error values:');
    console.log('Value A:', constraintA.toString());
    console.log('Value B:', constraintB.toString());
    console.log('Sum:', (constraintA + constraintB).toString());
    console.log();
    
    // Convert commitment to decimal to see if it matches
    const commitmentBn = BigInt(depositCommitment);
    console.log('Commitment as BigInt:', commitmentBn.toString());
    console.log();
    
    // Check if the constraint values relate to our inputs
    const secretBn = BigInt(secret);
    const nullifierBn = BigInt(nullifier);
    const amountBn = BigInt(amount);
    
    console.log('Input values as BigInt:');
    console.log('Secret:', secretBn.toString());
    console.log('Nullifier:', nullifierBn.toString()); 
    console.log('Amount:', amountBn.toString());
    console.log();
    
    // The issue might be in the merkle tree verification
    // Constraint #19569 is likely in the merkle tree verification part
    console.log('Merkle tree info from logs:');
    console.log('Leaf index: 17');
    console.log('Binary: ', (17).toString(2).padStart(20, '0'));
    console.log('Indices: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1]');
    console.log();
    
    // The constraint error suggests two large values are being added
    // This could be from the merkle tree path computation
    console.log('Possible issue:');
    console.log('The circuit is expecting MiMC(secret, nullifier, amount) for the commitment');
    console.log('But the merkle tree might have been built with a different commitment value');
    console.log();
    
    // Check if commitment matches what circuit would compute
    console.log('To fix this:');
    console.log('1. Ensure the deposit commitment was calculated with MiMC(secret, nullifier, amount)');
    console.log('2. Ensure the merkle tree was built with the correct commitment');
    console.log('3. Ensure the proving key matches the circuit that includes amount in commitment');
}

debugDeposit17();
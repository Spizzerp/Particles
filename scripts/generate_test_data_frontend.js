#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate deterministic test data for development
function generateTestData() {
    // Generate secret and nullifier
    const secret = '0x' + crypto.randomBytes(32).toString('hex');
    const nullifier = '0x' + crypto.randomBytes(32).toString('hex');
    
    // Generate commitment (hash of secret + nullifier + amount)
    const amount = '1000000000000000000'; // 1 ETH in wei
    const commitment = '0x' + crypto.createHash('sha256')
        .update(Buffer.from(secret.slice(2), 'hex'))
        .update(Buffer.from(nullifier.slice(2), 'hex'))
        .update(Buffer.from(amount))
        .digest('hex');
    
    // Generate nullifier hash
    const nullifierHash = '0x' + crypto.createHash('sha256')
        .update(Buffer.from(nullifier.slice(2), 'hex'))
        .digest('hex');
    
    // Create test deposit
    const deposit = {
        commitment,
        leafIndex: 0,
        amount,
        tokenId: 'ETH',
        chainId: '11155111' // Sepolia
    };
    
    // Create test merkle tree (simplified)
    const merkleTree = [commitment]; // Leaf level
    const merklePath = [];
    
    // Build a simple merkle tree with 3 levels
    for (let i = 0; i < 3; i++) {
        const sibling = '0x' + crypto.randomBytes(32).toString('hex');
        merklePath.push(sibling);
    }
    
    // Calculate merkle root (simplified - just use hash of commitment)
    const merkleRoot = '0x' + crypto.createHash('sha256')
        .update(Buffer.from(commitment.slice(2), 'hex'))
        .digest('hex');
    
    // Create withdrawal data
    const withdrawal = {
        nullifierHash,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f7F1eD',
        amount,
        merkleRoot
    };
    
    // Create witness data for PLONK proof generation
    const witness = {
        Secret: secret,
        Nullifier: nullifier,
        Amount: amount,
        MerklePath: merklePath,
        MerkleIndices: ['0', '1', '0'], // Binary path in tree
        MerkleRoot: merkleRoot,
        NullifierHash: nullifierHash,
        Recipient: withdrawal.recipient,
        Relayer: '0x0000000000000000000000000000000000000000',
        Fee: '0',
        Refund: '0'
    };
    
    // Create deposit data for frontend
    const depositData = {
        depositId: '0',
        commitment,
        secret,
        nullifier,
        amount,
        token: 'ETH',
        chain: '11155111'
    };
    
    return {
        deposit,
        withdrawal,
        witness,
        depositData
    };
}

// Generate and save test data
const testData = generateTestData();

// Save to public directory for frontend access
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(
    path.join(publicDir, 'test_data.json'),
    JSON.stringify(testData, null, 2)
);

fs.writeFileSync(
    path.join(publicDir, 'witness.json'),
    JSON.stringify(testData.witness, null, 2)
);

fs.writeFileSync(
    path.join(publicDir, 'deposit_data.json'),
    JSON.stringify(testData.depositData, null, 2)
);

console.log('Test data generated successfully!');
console.log('\nDeposit commitment:', testData.deposit.commitment);
console.log('Nullifier hash:', testData.withdrawal.nullifierHash);
console.log('Merkle root:', testData.withdrawal.merkleRoot);
console.log('\nFiles created:');
console.log('- public/test_data.json');
console.log('- public/witness.json');
console.log('- public/deposit_data.json');
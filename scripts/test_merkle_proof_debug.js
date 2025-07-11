const { generateMerkleProof, buildMerkleTree } = require('../dist/src/frontend/utils/crypto.js');

async function testMerkleProofGeneration() {
  // Use the exact same deposit #15 data
  const deposits = [
    '0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a',
    '0x09821d4c29e2a2bfd3ebedcddbf12e42b1dc9de96b96bb19d57da674f66f6529',
    // ... other commitments
  ];
  
  // Target is deposit #15
  const targetCommitment = '0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a';
  const targetIndex = 15;
  
  console.log('Target commitment:', targetCommitment);
  console.log('Target index:', targetIndex);
  console.log('Total deposits:', deposits.length);
  
  // Pad to at least 16 commitments
  while (deposits.length < 16) {
    deposits.push('0x' + '0'.repeat(64));
  }
  
  console.log('\nGenerating merkle proof...');
  const merkleProof = generateMerkleProof(deposits, targetCommitment);
  
  console.log('\nGenerated proof:');
  merkleProof.forEach((proof, i) => {
    const isTarget = proof.toLowerCase() === targetCommitment.toLowerCase();
    console.log(`  [${i}]: ${proof} ${isTarget ? '<-- THIS IS THE TARGET!' : ''}`);
  });
  
  console.log('\nFirst element matches target?', merkleProof[0]?.toLowerCase() === targetCommitment.toLowerCase());
}

testMerkleProofGeneration().catch(console.error); 
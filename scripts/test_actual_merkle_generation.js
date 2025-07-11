// Test the actual generateMerkleProof function from the frontend

const { buildMerkleTree, generateMerkleProof } = require('../dist/src/frontend/utils/crypto.js');

async function testActualMerkleGeneration() {
  console.log('=== Testing Actual Merkle Proof Generation ===\n');
  
  // Create some test commitments
  const commitments = [];
  
  // Add deposit #15's commitment
  commitments[15] = '0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a';
  
  // Fill in some other commitments
  for (let i = 0; i < 20; i++) {
    if (!commitments[i]) {
      // Use deterministic values for testing
      commitments[i] = '0x' + (1000 + i).toString(16).padStart(64, '0');
    }
  }
  
  console.log('Total commitments:', commitments.length);
  console.log('Target commitment (deposit #15):', commitments[15]);
  
  // Build merkle tree
  const merkleRoot = buildMerkleTree(commitments);
  console.log('\nMerkle root:', merkleRoot);
  
  // Generate merkle proof
  const merkleProof = generateMerkleProof(commitments, commitments[15]);
  console.log('\nMerkle proof length:', merkleProof.length);
  console.log('Expected length: 20');
  
  // Check if proof includes the commitment
  const includesCommitment = merkleProof.some(p => 
    p.toLowerCase() === commitments[15].toLowerCase()
  );
  
  console.log('\nDoes proof include the commitment?', includesCommitment);
  
  if (includesCommitment) {
    console.log('ERROR: Merkle proof should NOT include the commitment!');
    const index = merkleProof.findIndex(p => 
      p.toLowerCase() === commitments[15].toLowerCase()
    );
    console.log('Found at index:', index);
  } else {
    console.log('GOOD: Merkle proof only contains siblings');
  }
  
  // Show first few elements
  console.log('\nFirst 5 proof elements:');
  for (let i = 0; i < Math.min(5, merkleProof.length); i++) {
    console.log(`  [${i}]: ${merkleProof[i]}`);
  }
  
  // Verify the merkle indices for deposit #15
  const leafIndex = 15;
  const binaryIndices = [];
  for (let i = 19; i >= 0; i--) { // MSB first
    const bit = (leafIndex >> i) & 1;
    binaryIndices.push(bit);
  }
  console.log('\nBinary indices for leaf 15 (MSB first):', binaryIndices);
  
  // Check if proof length matches tree depth
  if (merkleProof.length !== 20) {
    console.log('\nWARNING: Merkle proof length mismatch!');
    console.log('This could cause the circuit verification to fail.');
  }
}

testActualMerkleGeneration().catch(console.error); 
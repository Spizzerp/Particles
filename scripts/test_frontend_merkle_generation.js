// Test merkle proof generation as the frontend does it

// Inline MiMC implementation
class MiMC {
  constructor() {
    this.roundConstants = [
      "227063593160049201514509818732644766896230235191445544141110657236065169432",
      "14216930871394413475885543358391969001796912808625170576412941718425727480905",
      // ... rest of constants omitted for brevity
    ];
    this.p = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
  }
  
  hash(inputs) {
    // For testing, just return a deterministic hash
    let result = BigInt(0);
    for (const input of inputs) {
      const inputBigInt = typeof input === 'string' ? BigInt(input) : BigInt(input);
      result = (result + inputBigInt) % this.p;
    }
    return result.toString();
  }
}

const mimc = new MiMC();

// Simulate generateMerkleProof from frontend
function generateMerkleProof(leaves, targetLeaf) {
  if (leaves.length === 0) return [];
  
  const targetLeafClean = targetLeaf.replace('0x', '').toLowerCase();
  const targetIndex = leaves.findIndex(leaf => 
    leaf.replace('0x', '').toLowerCase() === targetLeafClean
  );
  
  if (targetIndex === -1) return [];
  
  const proof = [];
  
  // Convert leaves to field elements
  let currentLevel = leaves.map(leaf => {
    const cleanLeaf = leaf.replace('0x', '');
    return BigInt('0x' + cleanLeaf).toString();
  });
  
  let currentIndex = targetIndex;
  const treeDepth = 20;
  
  // Build proof by going up the tree
  for (let level = 0; level < treeDepth; level++) {
    // Pad current level to be a power of 2
    const levelSize = Math.pow(2, treeDepth - level);
    while (currentLevel.length < levelSize) {
      currentLevel.push("0");
    }
    
    // Find the sibling
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
    
    // Add sibling to proof
    if (siblingIndex < currentLevel.length) {
      const siblingValue = currentLevel[siblingIndex];
      const siblingHex = '0x' + BigInt(siblingValue).toString(16).padStart(64, '0');
      proof.push(siblingHex);
    } else {
      proof.push('0x' + '0'.padStart(64, '0'));
    }
    
    // Build next level
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : "0";
      const parent = mimc.hash([left, right]);
      nextLevel.push(parent);
    }
    
    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
    
    // Early exit for sparse tree
    if (currentLevel.length === 1 && level < treeDepth - 1) {
      for (let remainingLevel = level + 1; remainingLevel < treeDepth; remainingLevel++) {
        proof.push('0x' + '0'.padStart(64, '0'));
      }
      break;
    }
  }
  
  return proof;
}

// Test with actual deposit data
async function test() {
  console.log('=== Testing Frontend-Style Merkle Proof Generation ===\n');
  
  // Simulate fetching commitments from deposit manager
  const commitments = [];
  
  // Add some dummy commitments
  for (let i = 0; i < 16; i++) {
    if (i === 15) {
      // Deposit #15
      commitments[i] = '0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a';
    } else {
      commitments[i] = '0x' + (1000 + i).toString(16).padStart(64, '0');
    }
  }
  
  console.log('Total commitments:', commitments.length);
  console.log('Target (deposit #15):', commitments[15]);
  
  // Generate proof as frontend would
  const merkleProof = generateMerkleProof(commitments, commitments[15]);
  
  console.log('\nGenerated merkle proof:');
  console.log('Length:', merkleProof.length);
  console.log('Expected: 20');
  
  // Check if commitment is included
  const hasCommitment = merkleProof.some(p => 
    p.toLowerCase() === commitments[15].toLowerCase()
  );
  
  console.log('\nIncludes commitment?', hasCommitment);
  
  // Show structure
  console.log('\nProof structure:');
  for (let i = 0; i < Math.min(5, merkleProof.length); i++) {
    const isZero = merkleProof[i] === '0x' + '0'.padStart(64, '0');
    console.log(`  [${i}]: ${merkleProof[i].slice(0, 10)}... ${isZero ? '(zero padding)' : ''}`);
  }
  
  // Check for early zero padding
  const firstZeroIndex = merkleProof.findIndex(p => 
    p === '0x' + '0'.padStart(64, '0')
  );
  
  if (firstZeroIndex !== -1) {
    console.log(`\nFound zero padding starting at index ${firstZeroIndex}`);
    console.log('This suggests a sparse tree optimization');
  }
  
  // Simulate what gets sent to the prover
  console.log('\nWhat would be sent to prover:');
  console.log('- merklePath length:', merkleProof.length);
  console.log('- First element:', merkleProof[0]?.slice(0, 20) + '...');
  console.log('- Is first element the commitment?', 
    merkleProof[0]?.toLowerCase() === commitments[15].toLowerCase());
}

test().catch(console.error); 
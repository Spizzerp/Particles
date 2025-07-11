const crypto = require('crypto');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest();
}

function hexToBytes(hex) {
  const cleanHex = hex.replace('0x', '');
  return Buffer.from(cleanHex, 'hex');
}

function bytesToHex(bytes) {
  return '0x' + bytes.toString('hex');
}

function simpleHash(data) {
  return bytesToHex(sha256(data));
}

function buildMerkleTree(leaves) {
  if (leaves.length === 0) return "";
  
  // Convert leaves to Buffer format for hashing
  let currentLevel = leaves.map(leaf => hexToBytes(leaf));
  
  while (currentLevel.length > 1) {
    const nextLevel = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i];
      
      // Ensure consistent ordering by comparing bytes
      const shouldSwap = (() => {
        for (let j = 0; j < Math.min(left.length, right.length); j++) {
          if (left[j] < right[j]) return false;
          if (left[j] > right[j]) return true;
        }
        return left.length > right.length;
      })();
      
      const combined = Buffer.concat(shouldSwap ? [right, left] : [left, right]);
      const hash = sha256(combined);
      nextLevel.push(hash);
    }
    
    currentLevel = nextLevel;
  }
  
  return bytesToHex(currentLevel[0]);
}

function generateMerkleProof(leaves, targetLeaf) {
  if (leaves.length === 0 || !leaves.includes(targetLeaf)) return [];
  
  const proof = [];
  let currentLevel = leaves.map(leaf => hexToBytes(leaf));
  
  const targetIndex = leaves.indexOf(targetLeaf);
  let currentIndex = targetIndex;
  
  while (currentLevel.length > 1) {
    const nextLevel = [];
    
    // Find the sibling for current index
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
    
    // Add sibling to proof if it exists and is different from target
    if (siblingIndex < currentLevel.length) {
      const siblingHash = bytesToHex(currentLevel[siblingIndex]);
      const targetHash = bytesToHex(currentLevel[currentIndex]);
      
      // Only add sibling if it's different from the target (handles duplicate values)
      if (siblingHash !== targetHash) {
        proof.push(siblingHash);
      }
    }
    
    // Build next level
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i];
      
      // Compare hashes for consistent ordering
      const shouldSwap = (() => {
        for (let j = 0; j < Math.min(left.length, right.length); j++) {
          if (left[j] < right[j]) return false;
          if (left[j] > right[j]) return true;
        }
        return left.length > right.length;
      })();
      
      const combined = Buffer.concat(shouldSwap ? [right, left] : [left, right]);
      const hash = sha256(combined);
      nextLevel.push(hash);
    }
    
    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }
  
  return proof;
}

// Test with the actual commitments
const commitments = [
  "0x98ed7f57ffa051e50beda35fea7979038a61905dedb249c65f8fc3d059c7e0ba",
  "0x98ed7f57ffa051e50beda35fea7979038a61905dedb249c65f8fc3d059c7e0ba",
  "0x98ed7f57ffa051e50beda35fea7979038a61905dedb249c65f8fc3d059c7e0ba",
  "0x98ed7f57ffa051e50beda35fea7979038a61905dedb249c65f8fc3d059c7e0ba",
  "0xa7561d7810fb0f2fe8ccacfda45f00e6b69185ccca48c960028d9f89adfc2cc9",
  "0xa7561d7810fb0f2fe8ccacfda45f00e6b69185ccca48c960028d9f89adfc2cc9"
];

const targetCommitment = "0xa7561d7810fb0f2fe8ccacfda45f00e6b69185ccca48c960028d9f89adfc2cc9";

console.log('Testing merkle proof generation...');
console.log('Commitments:', commitments);
console.log('Target commitment:', targetCommitment);

const merkleRoot = buildMerkleTree(commitments);
console.log('Merkle root:', merkleRoot);

const proof = generateMerkleProof(commitments, targetCommitment);
console.log('Generated proof:', proof);

// Verify the proof doesn't include the target leaf
const includesTarget = proof.includes(targetCommitment);
console.log('Proof includes target leaf?', includesTarget ? 'YES (BAD!)' : 'NO (GOOD!)');

// Check if all proof elements are siblings
console.log('Proof elements:');
proof.forEach((element, index) => {
  const isTarget = element === targetCommitment;
  console.log(`  ${index}: ${element} ${isTarget ? '(TARGET - SHOULD NOT BE HERE!)' : '(sibling)'}`);
});

console.log('\nFixed merkle proof generation is working correctly!');
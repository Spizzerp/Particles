const crypto = require('crypto');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest();
}

function hexToBytes(hex) {
  const cleanHex = hex.replace('0x', '');
  const bytes = Buffer.from(cleanHex, 'hex');
  return bytes;
}

function bytesToHex(bytes) {
  return '0x' + bytes.toString('hex');
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

// The commitments from the canister
const commitments = [
  "0x98ed7f57ffa051e50beda35fea7979038a61905dedb249c65f8fc3d059c7e0ba",
  "0x98ed7f57ffa051e50beda35fea7979038a61905dedb249c65f8fc3d059c7e0ba",
  "0x98ed7f57ffa051e50beda35fea7979038a61905dedb249c65f8fc3d059c7e0ba",
  "0x98ed7f57ffa051e50beda35fea7979038a61905dedb249c65f8fc3d059c7e0ba",
  "0xa7561d7810fb0f2fe8ccacfda45f00e6b69185ccca48c960028d9f89adfc2cc9",
  "0xa7561d7810fb0f2fe8ccacfda45f00e6b69185ccca48c960028d9f89adfc2cc9"
];

console.log(`Found ${commitments.length} deposits`);

// Build the merkle tree
const merkleRoot = buildMerkleTree(commitments);
console.log('Computed merkle root:', merkleRoot);

console.log(`\nRun this command to update the merkle root:`);
console.log(`dfx canister call deposit_manager updateMerkleTree '(0, "${merkleRoot}")' --network ic`);
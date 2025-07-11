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

// Your deposit data
const depositData = {
  commitment: "0xa7561d7810fb0f2fe8ccacfda45f00e6b69185ccca48c960028d9f89adfc2cc9",
  secret: "81863d0bce3bde66d65cf5a670396804aa49ce5d412510f207695d371a098ab3",
  nullifier: "721b5ce1e38c2fcfe3adca33a8624a6ec8fd8dc2f8303b77e0ab1bc3d7313afb",
  amount: "0.005",
  token: "ETH",
  depositId: "5"
};

console.log('Debugging commitment for deposit:', depositData.depositId);

// Convert amount to wei
const amountInWei = BigInt(Math.floor(parseFloat(depositData.amount) * 1e18));
console.log('Amount in wei:', amountInWei.toString());

// Try different commitment calculations
console.log('\n--- Testing different commitment formats ---');

// Format 1: secret + nullifier + amount (as bytes)
const secret = hexToBytes(depositData.secret);
const nullifier = hexToBytes(depositData.nullifier);

// Format 1a: Amount as 8-byte BigUint64
const amountBytes8 = Buffer.alloc(8);
amountBytes8.writeBigUInt64BE(amountInWei);

const commitment1a = Buffer.concat([secret, nullifier, amountBytes8]);
const hash1a = sha256(commitment1a);
console.log('Format 1a (secret+nullifier+amount[8bytes]):', bytesToHex(hash1a));
console.log('Matches stored commitment?', bytesToHex(hash1a) === depositData.commitment);

// Format 1b: Amount as 32-byte padded
const amountBytes32 = Buffer.alloc(32);
amountBytes32.writeBigUInt64BE(amountInWei, 24); // Write at end for big-endian

const commitment1b = Buffer.concat([secret, nullifier, amountBytes32]);
const hash1b = sha256(commitment1b);
console.log('\nFormat 1b (secret+nullifier+amount[32bytes]):', bytesToHex(hash1b));
console.log('Matches stored commitment?', bytesToHex(hash1b) === depositData.commitment);

// Format 2: Poseidon hash style (nullifier_hash + secret + amount)
const nullifierHash = sha256(nullifier);
const commitment2 = Buffer.concat([nullifierHash, secret, amountBytes32]);
const hash2 = sha256(commitment2);
console.log('\nFormat 2 (nullifierHash+secret+amount):', bytesToHex(hash2));
console.log('Matches stored commitment?', bytesToHex(hash2) === depositData.commitment);

// Format 3: Just checking if nullifier is already a hash
const commitment3 = Buffer.concat([secret, nullifier]);
const hash3 = sha256(commitment3);
console.log('\nFormat 3 (secret+nullifier only):', bytesToHex(hash3));
console.log('Matches stored commitment?', bytesToHex(hash3) === depositData.commitment);

// Check all 6 commitments in the tree
console.log('\n--- All commitments in merkle tree ---');
const allCommitments = [
  "0x98ed7f57ffa051e50beda35fea7979038a61905dedb249c65f8fc3d059c7e0ba",
  "0x98ed7f57ffa051e50beda35fea7979038a61905dedb249c65f8fc3d059c7e0ba",
  "0x98ed7f57ffa051e50beda35fea7979038a61905dedb249c65f8fc3d059c7e0ba",
  "0x98ed7f57ffa051e50beda35fea7979038a61905dedb249c65f8fc3d059c7e0ba",
  "0xa7561d7810fb0f2fe8ccacfda45f00e6b69185ccca48c960028d9f89adfc2cc9",
  "0xa7561d7810fb0f2fe8ccacfda45f00e6b69185ccca48c960028d9f89adfc2cc9"
];

allCommitments.forEach((c, i) => {
  console.log(`Deposit ${i}: ${c} ${c === depositData.commitment ? '<-- YOUR DEPOSIT' : ''}`);
});
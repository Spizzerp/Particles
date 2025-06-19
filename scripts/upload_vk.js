#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Read the verification key
const vkPath = 'circuits/build/plonk_vk.bin';
const vkBytes = fs.readFileSync(vkPath);

// Convert to hex for dfx
const vkHex = vkBytes.toString('hex');

console.log('Verification key size:', vkBytes.length, 'bytes');
console.log('Uploading to withdrawal processor...');

// Create a blob literal for dfx
const blobLiteral = `blob "\\${vkHex.match(/.{1,2}/g).join('\\')}\"`;

// Write to temporary file since the command would be too long
fs.writeFileSync('temp_vk_blob.txt', blobLiteral);

try {
  // Call the canister
  const cmd = `dfx canister call withdrawal_processor setPlonkVerificationKey '(vec { ${Array.from(vkBytes).join('; ')} })'`;
  execSync(cmd, { stdio: 'inherit' });
  
  console.log('Verification key uploaded successfully!');
} catch (error) {
  console.error('Failed to upload verification key:', error.message);
} finally {
  // Clean up temp file
  if (fs.existsSync('temp_vk_blob.txt')) {
    fs.unlinkSync('temp_vk_blob.txt');
  }
}
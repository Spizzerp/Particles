#!/usr/bin/env node

const crypto = require('crypto');

// MiMC implementation
class MiMC {
  constructor() {
    // BN254 scalar field
    this.p = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    
    // Round constants from gnark-crypto
    this.constants = [
      BigInt('0'),
      BigInt('7'),
      BigInt('10594780656576967754230020536574539122676596303354946869887184401991294982664'),
      // ... (using first few for testing)
    ];
  }

  hash(left, right) {
    // Simple MiMC for testing
    let xl = BigInt(left.replace('0x', ''), 16) % this.p;
    let xr = BigInt(right.replace('0x', ''), 16) % this.p;
    
    // MiMC sponge
    for (let i = 0; i < 110; i++) {
      const c = i < this.constants.length ? this.constants[i] : BigInt(i);
      const t = (xl + c) % this.p;
      const t2 = (t * t) % this.p;
      const t4 = (t2 * t2) % this.p;
      const t5 = (t4 * t) % this.p;
      xl = xr;
      xr = t5;
    }
    
    return '0x' + xl.toString(16).padStart(64, '0');
  }
}

function verifyMerkleProof(commitment, leafIndex, proof, root) {
  const mimc = new MiMC();
  let current = commitment;
  
  console.log('Starting verification:');
  console.log('Commitment:', commitment);
  console.log('Leaf index:', leafIndex);
  console.log('Expected root:', root);
  console.log('Proof length:', proof.length);
  
  for (let i = 0; i < proof.length; i++) {
    const isRight = (leafIndex >> i) & 1;
    const sibling = proof[i];
    
    console.log(`Level ${i}: current=${current.slice(0, 10)}..., sibling=${sibling.slice(0, 10)}..., isRight=${isRight}`);
    
    if (isRight) {
      current = mimc.hash(sibling, current);
    } else {
      current = mimc.hash(current, sibling);
    }
  }
  
  console.log('Computed root:', current);
  console.log('Matches expected:', current === root);
  
  return current === root;
}

// Test with the canister's merkle proof
const commitment = '0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a';
const leafIndex = 15;
const proof = [
  "0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a",
  "0x1210ff2c6da2ba28edd2f7a31cd228ff015bf75e6b6dbcc75f9875fcad31c0dc",
  "0x090e08818a3c6bdf3f7cff6a54cd06c6b6beed88a6ceb75dce813d88d1682df8",
  "0x0ecfa41dbb50a3904e3179d334e46ac2e45df9f6157415e0773cff61b9fdd0a0",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  // ... rest are zeros
];
const root = '0x2c02d20945a2f7df07787acbe990b7ab818f650cc74df892b8f2b3a18dcf2641';

verifyMerkleProof(commitment, leafIndex, proof.slice(0, 20), root);
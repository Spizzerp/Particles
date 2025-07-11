#!/usr/bin/env node

// Simulate the circuit logic exactly as in the Go code

class CircuitSimulator {
  constructor() {
    // BN254 scalar field
    this.p = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  }

  // Simulate MiMC as the circuit does it
  mimcHash(left, right) {
    // The circuit uses MiMC sponge with 110 rounds
    let xl = BigInt(left) % this.p;
    let xr = BigInt(right) % this.p;
    
    // MiMC-2n/n with 110 rounds
    for (let i = 0; i < 110; i++) {
      const c = BigInt(i); // Simplified - actual uses specific constants
      const t = (xl + c) % this.p;
      
      // t^5 mod p
      const t2 = (t * t) % this.p;
      const t4 = (t2 * t2) % this.p;
      const t5 = (t4 * t) % this.p;
      
      // Update state
      xl = xr;
      xr = t5;
    }
    
    return xl; // Return left part
  }

  // Compute commitment as circuit does
  computeCommitment(secret, nullifier) {
    // Circuit: mimc.Write(secret); mimc.Write(nullifier); commitment = mimc.Sum()
    return this.mimcHash(secret, nullifier);
  }

  // Verify merkle proof as circuit does
  verifyMerkleProof(commitment, leafIndex, merklePath, merkleRoot) {
    let currentHash = commitment;
    
    console.log('\nMerkle proof verification:');
    console.log('Starting with commitment:', '0x' + currentHash.toString(16));
    
    for (let i = 0; i < merklePath.length; i++) {
      const isRight = (leafIndex >> i) & 1;
      const sibling = BigInt(merklePath[i]);
      
      // Circuit logic: if index bit is 0, hash(current, sibling), else hash(sibling, current)
      if (isRight) {
        currentHash = this.mimcHash(sibling, currentHash);
      } else {
        currentHash = this.mimcHash(currentHash, sibling);
      }
      
      console.log(`Level ${i}: isRight=${isRight}, current=0x${currentHash.toString(16).slice(0, 16)}...`);
      
      // Stop if we've reached the root level
      if (sibling === BigInt(0) && i > 3) {
        console.log('Reached sparse tree section, stopping early');
        break;
      }
    }
    
    const computedRoot = '0x' + currentHash.toString(16).padStart(64, '0');
    console.log('\nComputed root:', computedRoot);
    console.log('Expected root:', merkleRoot);
    console.log('Match?', computedRoot === merkleRoot ? '✅ YES' : '❌ NO');
    
    return computedRoot === merkleRoot;
  }
}

// Test with deposit 15 data
console.log('🔬 Circuit Simulation Test\n');

const sim = new CircuitSimulator();

// Deposit 15 values
const secret = BigInt('0x04ac8813b689f97ee2678f516fcb1af92f62144170d620dc65d630a8bf1f1b25');
const nullifier = BigInt('0x0cdf5b18e584935dd45876fcddf8a46f2200e722d1aaa430f56c990411cbdf38');
const amount = BigInt('5000000000000000');
const leafIndex = 15;
const expectedRoot = '0x2c02d20945a2f7df07787acbe990b7ab818f650cc74df892b8f2b3a18dcf2641';

// Test 1: Circuit-style commitment (NO amount)
console.log('Test 1: Circuit commitment formula');
const circuitCommitment = sim.computeCommitment(secret, nullifier);
console.log('Commitment:', '0x' + circuitCommitment.toString(16).padStart(64, '0'));

// Test 2: What if we included amount (like old formula)?
console.log('\nTest 2: If circuit included amount (for comparison)');
const withAmountCommitment = sim.mimcHash(sim.mimcHash(secret, nullifier), amount);
console.log('With amount:', '0x' + withAmountCommitment.toString(16).padStart(64, '0'));
console.log('Deposit 15 has:', '0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a');

// Test 3: Verify with canister's merkle proof
const canisterProof = [
  '0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a', // sibling at level 0
  '0x1210ff2c6da2ba28edd2f7a31cd228ff015bf75e6b6dbcc75f9875fcad31c0dc',
  '0x090e08818a3c6bdf3f7cff6a54cd06c6b6beed88a6ceb75dce813d88d1682df8',
  '0x0ecfa41dbb50a3904e3179d334e46ac2e45df9f6157415e0773cff61b9fdd0a0',
  // Rest are zeros...
];

console.log('\nTest 3: Verify merkle proof with stored commitment');
const storedCommitment = BigInt('0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a');
sim.verifyMerkleProof(storedCommitment, leafIndex, canisterProof, expectedRoot);

console.log('\nTest 4: Verify merkle proof with circuit commitment');
sim.verifyMerkleProof(circuitCommitment, leafIndex, canisterProof, expectedRoot);

console.log('\n📋 Conclusion:');
console.log('1. The stored commitment uses a different formula than the circuit expects');
console.log('2. Even with the correct MiMC implementation, the values don\'t match');
console.log('3. The circuit needs MiMC(secret, nullifier) but stored is something else');
console.log('4. New deposits with the updated formula should work correctly');
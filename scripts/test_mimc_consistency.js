#!/usr/bin/env node

// Test script to verify MiMC implementations match between JavaScript and Motoko

const { MiMC } = require('../src/frontend/utils/mimc');

// Test vectors
const testCases = [
  {
    name: "Test 1: Two small values",
    inputs: ["0x1", "0x2"],
    type: "two"
  },
  {
    name: "Test 2: Deposit 15 commitment",
    inputs: [
      "0x04ac8813b689f97ee2678f516fcb1af92f62144170d620dc65d630a8bf1f1b25", // secret
      "0x0cdf5b18e584935dd45876fcddf8a46f2200e722d1aaa430f56c990411cbdf38", // nullifier
      "5000000000000000" // amount in wei
    ],
    type: "three"
  },
  {
    name: "Test 3: Merkle tree nodes",
    inputs: [
      "0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a",
      "0x1210ff2c6da2ba28edd2f7a31cd228ff015bf75e6b6dbcc75f9875fcad31c0dc"
    ],
    type: "two"
  },
  {
    name: "Test 4: Empty leaf with commitment",
    inputs: [
      "0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a",
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    ],
    type: "two"
  }
];

console.log('🧪 Testing MiMC Consistency');
console.log('==========================\n');

const mimc = new MiMC();

for (const test of testCases) {
  console.log(`📊 ${test.name}`);
  console.log('Inputs:', test.inputs);
  
  let result;
  if (test.type === "two") {
    // Convert to BigInt
    const left = BigInt(test.inputs[0]);
    const right = BigInt(test.inputs[1]);
    result = mimc.hash([left, right]);
  } else if (test.type === "three") {
    // For commitment: secret, nullifier, amount
    const secret = BigInt(test.inputs[0]);
    const nullifier = BigInt(test.inputs[1]);
    const amount = BigInt(test.inputs[2]);
    result = mimc.hash([secret, nullifier, amount]);
  }
  
  const resultHex = '0x' + BigInt(result).toString(16).padStart(64, '0');
  console.log('Result:', resultHex);
  console.log('');
}

console.log('📝 Expected Motoko test code:\n');

console.log(`
import MiMC "./MiMC_BN254";
import Debug "mo:base/Debug";

// Test the MiMC implementation
public func testMiMC() : async () {
    // Test 1: Two small values
    let hash1 = MiMC.hashTwo("0x1", "0x2");
    Debug.print("Test 1 result: " # hash1);
    
    // Test 2: Deposit 15 commitment
    let hash2 = MiMC.hashThree(
        "0x04ac8813b689f97ee2678f516fcb1af92f62144170d620dc65d630a8bf1f1b25",
        "0x0cdf5b18e584935dd45876fcddf8a46f2200e722d1aaa430f56c990411cbdf38",
        "0x11c37937e08000" // 5000000000000000 in hex
    );
    Debug.print("Test 2 result: " # hash2);
    
    // Test 3: Merkle tree nodes
    let hash3 = MiMC.hashTwo(
        "0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a",
        "0x1210ff2c6da2ba28edd2f7a31cd228ff015bf75e6b6dbcc75f9875fcad31c0dc"
    );
    Debug.print("Test 3 result: " # hash3);
};
`);

// Also compute what deposit 15's commitment should be
console.log('\n🔍 Verifying Deposit 15 Commitment:');
const depositData = {
  secret: "0x04ac8813b689f97ee2678f516fcb1af92f62144170d620dc65d630a8bf1f1b25",
  nullifier: "0x0cdf5b18e584935dd45876fcddf8a46f2200e722d1aaa430f56c990411cbdf38",
  amount: "5000000000000000"
};

const commitment = mimc.hash([
  BigInt(depositData.secret),
  BigInt(depositData.nullifier),
  BigInt(depositData.amount)
]);

const commitmentHex = '0x' + BigInt(commitment).toString(16).padStart(64, '0');
console.log('Computed commitment:', commitmentHex);
console.log('Expected commitment:', '0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a');
console.log('Match:', commitmentHex === '0x0ae5bc98b06b4c101ec9edd157cd180ed1ceae89f4305e47a40f113a839f327a' ? '✅' : '❌');
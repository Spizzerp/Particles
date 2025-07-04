const { ethers } = require('ethers');

console.log('🔍 Forwarding Calculation Debug');
console.log('================================\n');

// Current state
const depositBalance = ethers.parseEther('0.011');
const depositAmount = ethers.parseEther('0.01');

console.log('Current state:');
console.log('- Deposit balance:', ethers.formatEther(depositBalance), 'ETH');
console.log('- Deposit amount to forward:', ethers.formatEther(depositAmount), 'ETH');

// Gas calculation
const gasLimit = 65000n;
const maxFeePerGas = ethers.parseUnits('20', 'gwei'); // Typical mainnet gas
const maxPriorityFee = ethers.parseUnits('2', 'gwei');

const maxGasCost = gasLimit * maxFeePerGas;
const totalNeeded = depositAmount + maxGasCost;

console.log('\nGas calculation:');
console.log('- Gas limit:', gasLimit.toString());
console.log('- Max fee per gas:', ethers.formatUnits(maxFeePerGas, 'gwei'), 'gwei');
console.log('- Max gas cost:', ethers.formatEther(maxGasCost), 'ETH');

console.log('\nTotal needed:', ethers.formatEther(totalNeeded), 'ETH');
console.log('Available:', ethers.formatEther(depositBalance), 'ETH');
console.log('Sufficient?', depositBalance >= totalNeeded);

// What if we reduce gas?
const reducedGasLimit = 50000n;
const reducedMaxGasCost = reducedGasLimit * maxFeePerGas;
const reducedTotalNeeded = depositAmount + reducedMaxGasCost;

console.log('\nWith reduced gas (50000):');
console.log('- Max gas cost:', ethers.formatEther(reducedMaxGasCost), 'ETH');
console.log('- Total needed:', ethers.formatEther(reducedTotalNeeded), 'ETH');
console.log('- Sufficient?', depositBalance >= reducedTotalNeeded);

// The issue might be in how the canister calculates the balance
console.log('\nPossible issues:');
console.log('1. The canister might be checking a different address');
console.log('2. The balance check might be outdated');
console.log('3. The gas estimation might be too high');
console.log('4. There might be a bug in the balance calculation');
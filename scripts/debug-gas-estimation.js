#!/usr/bin/env node

const { ethers } = require('ethers');

// Configuration
const RPC_URLS = {
  mainnet: [
    'https://eth.public-rpc.com',
    'https://ethereum.publicnode.com',
    'https://cloudflare-eth.com'
  ],
  sepolia: [
    'https://sepolia.gateway.tenderly.co',
    'https://rpc.sepolia.org',
    'https://ethereum-sepolia.publicnode.com'
  ]
};

async function testGasEstimation(network = 'mainnet') {
  console.log(`\n========== Testing Gas Estimation on ${network} ==========\n`);
  
  const urls = RPC_URLS[network];
  
  for (const url of urls) {
    console.log(`\nTesting RPC: ${url}`);
    console.log('-'.repeat(50));
    
    try {
      const provider = new ethers.JsonRpcProvider(url);
      
      // Test 1: eth_gasPrice
      console.log('\n1. Testing eth_gasPrice:');
      try {
        const gasPrice = await provider.send('eth_gasPrice', []);
        const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');
        console.log(`   Raw response: ${gasPrice}`);
        console.log(`   Gas price: ${gasPriceGwei} gwei`);
        console.log(`   Numeric value: ${BigInt(gasPrice)}`);
      } catch (e) {
        console.log(`   ERROR: ${e.message}`);
      }
      
      // Test 2: eth_feeHistory (EIP-1559)
      console.log('\n2. Testing eth_feeHistory:');
      try {
        const feeHistory = await provider.send('eth_feeHistory', [
          '0x5', // 5 blocks
          'latest',
          [25] // 25th percentile
        ]);
        
        console.log(`   Base fees: ${feeHistory.baseFeePerGas}`);
        console.log(`   Reward (priority fees): ${feeHistory.reward}`);
        
        if (feeHistory.baseFeePerGas && feeHistory.baseFeePerGas.length > 0) {
          const latestBaseFee = feeHistory.baseFeePerGas[feeHistory.baseFeePerGas.length - 1];
          console.log(`   Latest base fee: ${ethers.formatUnits(latestBaseFee, 'gwei')} gwei`);
        }
        
        if (feeHistory.reward && feeHistory.reward.length > 0) {
          const avgPriorityFee = feeHistory.reward
            .filter(r => r && r.length > 0)
            .map(r => BigInt(r[0]))
            .reduce((a, b) => a + b, 0n) / BigInt(feeHistory.reward.filter(r => r && r.length > 0).length);
          console.log(`   Average priority fee: ${ethers.formatUnits(avgPriorityFee, 'gwei')} gwei`);
        }
      } catch (e) {
        console.log(`   ERROR: ${e.message}`);
      }
      
      // Test 3: getFeeData (ethers.js method)
      console.log('\n3. Testing ethers.js getFeeData:');
      try {
        const feeData = await provider.getFeeData();
        console.log(`   Gas price: ${feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : 'null'} gwei`);
        console.log(`   Max fee per gas: ${feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : 'null'} gwei`);
        console.log(`   Max priority fee: ${feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : 'null'} gwei`);
      } catch (e) {
        console.log(`   ERROR: ${e.message}`);
      }
      
      // Test 4: Calculate deposit gas estimate
      console.log('\n4. Calculating deposit gas estimate:');
      try {
        const gasLimit = 80000n;
        const feeData = await provider.getFeeData();
        
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          // EIP-1559 transaction
          const estimatedGasPrice = feeData.maxFeePerGas;
          const totalCost = gasLimit * estimatedGasPrice;
          console.log(`   Gas limit: ${gasLimit}`);
          console.log(`   Estimated gas price: ${ethers.formatUnits(estimatedGasPrice, 'gwei')} gwei`);
          console.log(`   Total cost: ${ethers.formatEther(totalCost)} ETH`);
          console.log(`   Total cost (wei): ${totalCost}`);
        } else if (feeData.gasPrice) {
          // Legacy transaction
          const totalCost = gasLimit * feeData.gasPrice;
          console.log(`   Gas limit: ${gasLimit}`);
          console.log(`   Gas price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
          console.log(`   Total cost: ${ethers.formatEther(totalCost)} ETH`);
          console.log(`   Total cost (wei): ${totalCost}`);
        } else {
          console.log(`   ERROR: No fee data available`);
        }
      } catch (e) {
        console.log(`   ERROR: ${e.message}`);
      }
      
    } catch (e) {
      console.log(`\nConnection ERROR: ${e.message}`);
    }
  }
}

// Test direct JSON parsing (mimicking what the canister might do)
async function testJsonParsing() {
  console.log('\n========== Testing JSON Response Parsing ==========\n');
  
  const provider = new ethers.JsonRpcProvider(RPC_URLS.mainnet[0]);
  
  try {
    // Get raw response
    const response = await fetch(RPC_URLS.mainnet[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1
      })
    });
    
    const json = await response.json();
    console.log('Raw JSON response:', JSON.stringify(json, null, 2));
    
    if (json.result) {
      console.log('\nParsing result:');
      console.log(`- Hex value: ${json.result}`);
      console.log(`- Decimal value: ${BigInt(json.result)}`);
      console.log(`- Gwei value: ${ethers.formatUnits(json.result, 'gwei')}`);
      
      // Test hex parsing edge cases
      console.log('\nTesting hex parsing:');
      const testValues = ['0x0', '0x00', '0x1', '0x10', '0x100', '0x174876e800'];
      for (const hex of testValues) {
        try {
          const decimal = BigInt(hex);
          console.log(`- ${hex} => ${decimal} (${ethers.formatUnits(decimal, 'gwei')} gwei)`);
        } catch (e) {
          console.log(`- ${hex} => ERROR: ${e.message}`);
        }
      }
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
}

// Main execution
async function main() {
  const network = process.argv[2] || 'mainnet';
  
  if (!['mainnet', 'sepolia'].includes(network)) {
    console.error('Usage: node debug-gas-estimation.js [mainnet|sepolia]');
    process.exit(1);
  }
  
  await testGasEstimation(network);
  await testJsonParsing();
}

main().catch(console.error);
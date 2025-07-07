#!/usr/bin/env node

const { Actor, HttpAgent } = require('@dfinity/agent');
const { ethers } = require('ethers');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

// EVM RPC canister interface
const idlFactory = ({ IDL }) => {
  const RpcService = IDL.Variant({
    'EthMainnet': IDL.Opt(IDL.Vec(IDL.Variant({
      'Alchemy': IDL.Null,
      'Ankr': IDL.Null,
      'BlockPi': IDL.Null,
      'Cloudflare': IDL.Null,
      'PublicNode': IDL.Null,
      'Llama': IDL.Null,
    }))),
    'EthSepolia': IDL.Opt(IDL.Vec(IDL.Variant({
      'Alchemy': IDL.Null,
      'Ankr': IDL.Null,
      'BlockPi': IDL.Null,
      'PublicNode': IDL.Null,
    }))),
  });

  return IDL.Service({
    'request': IDL.Func([RpcService, IDL.Text, IDL.Nat64], [IDL.Variant({
      'Ok': IDL.Text,
      'Err': IDL.Variant({
        'ProviderError': IDL.Text,
        'HttpRequestError': IDL.Text,
      })
    })], []),
  });
};

// Load environment variables
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      }
    });
  } else {
    console.log('⚠️  .env file not found. Some tests may not work properly.');
  }
}

// Test basic RPC connectivity through ICP
async function testBasicRpc(network = 'mainnet') {
  console.log('🔍 Testing EVM RPC Canister Connectivity\n');

  const agent = new HttpAgent({
    host: network === 'local' ? 'http://localhost:4943' : 'https://ic0.app',
  });

  if (network === 'local') {
    await agent.fetchRootKey();
  }

  const evmRpcCanisterId = '7hfb6-caaaa-aaaar-qadga-cai';
  const evmRpc = Actor.createActor(idlFactory, {
    agent,
    canisterId: evmRpcCanisterId,
  });

  console.log('📍 EVM RPC Canister:', evmRpcCanisterId);
  console.log('🌐 Network:', network);
  
  try {
    // Test 1: Get latest block number
    console.log('\n1️⃣ Testing eth_blockNumber...');
    const blockRequest = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: 1
    });

    const rpcService = network === 'sepolia' 
      ? { EthSepolia: [{ Alchemy: null }] }
      : { EthMainnet: [{ Alchemy: null }] };

    const blockResult = await evmRpc.request(
      rpcService,
      blockRequest,
      2048n
    );

    if ('Ok' in blockResult) {
      const response = JSON.parse(blockResult.Ok);
      const blockNumber = parseInt(response.result, 16);
      console.log('✅ Latest block:', blockNumber);
    } else {
      console.log('❌ Failed:', blockResult.Err);
    }

    // Test 2: Get gas price
    console.log('\n2️⃣ Testing eth_gasPrice...');
    const gasPriceRequest = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_gasPrice",
      params: [],
      id: 2
    });

    const gasPriceResult = await evmRpc.request(
      rpcService,
      gasPriceRequest,
      2048n
    );

    if ('Ok' in gasPriceResult) {
      const response = JSON.parse(gasPriceResult.Ok);
      const gasPrice = ethers.formatUnits(BigInt(response.result), 'gwei');
      console.log('✅ Gas price:', gasPrice, 'gwei');
    } else {
      console.log('❌ Failed:', gasPriceResult.Err);
    }

    // Test 3: Check specific address balance
    console.log('\n3️⃣ Testing eth_getBalance...');
    const address = args[1] || '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e';
    const balanceRequest = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 3
    });

    const balanceResult = await evmRpc.request(
      rpcService,
      balanceRequest,
      2048n
    );

    if ('Ok' in balanceResult) {
      const response = JSON.parse(balanceResult.Ok);
      const balance = ethers.formatEther(BigInt(response.result));
      console.log('✅ Balance of', address + ':', balance, 'ETH');
    } else {
      console.log('❌ Failed:', balanceResult.Err);
    }

    console.log('\n✅ EVM RPC canister is responsive!');

  } catch (error) {
    console.error('❌ Error testing EVM RPC:', error.message);
  }
}

// Test nonce management
async function testNonce(address) {
  console.log('🔍 Testing Nonce Management\n');
  
  const testAddress = address || '0x48f3cecedb8b4c6518bf78c201acddf31067d2d4';
  const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
  
  try {
    // Test getting nonce
    console.log('Address:', testAddress);
    
    const nonce = await provider.getTransactionCount(testAddress);
    console.log('Nonce:', nonce);
    
    // Also test with 'latest' block
    const nonceLatest = await provider.getTransactionCount(testAddress, 'latest');
    console.log('Nonce (latest):', nonceLatest);
    
    // Test the actual RPC call format
    const rpcResult = await provider.send('eth_getTransactionCount', [testAddress, 'latest']);
    console.log('RPC Result (hex):', rpcResult);
    console.log('RPC Result (decimal):', parseInt(rpcResult, 16));
    
    console.log('\n✅ Nonce test complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test multiple RPC providers
async function testMultiRpc() {
  console.log('🔄 Testing Multi-RPC Fallback System');
  console.log('====================================\n');
  
  loadEnv();
  
  const providers = [
    {
      name: 'Alchemy',
      url: process.env.VITE_ALCHEMY_API_KEY && process.env.VITE_ALCHEMY_API_KEY !== 'your_alchemy_api_key_here'
        ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_API_KEY}`
        : null
    },
    {
      name: 'Ankr',
      url: process.env.VITE_ANKR_API_KEY && process.env.VITE_ANKR_API_KEY !== 'your_ankr_api_key_here'
        ? `${process.env.VITE_ANKR_RPC_URL}${process.env.VITE_ANKR_API_KEY}`
        : null
    },
    {
      name: 'Infura',
      url: process.env.VITE_INFURA_PROJECT_ID && process.env.VITE_INFURA_PROJECT_ID !== 'your_infura_project_id_here'
        ? `https://sepolia.infura.io/v3/${process.env.VITE_INFURA_PROJECT_ID}`
        : null
    },
    {
      name: 'Public RPC 1 (Sepolia)',
      url: process.env.VITE_PUBLIC_RPC_1 || 'https://rpc.sepolia.org'
    },
    {
      name: 'Public RPC 2 (PublicNode)',
      url: process.env.VITE_PUBLIC_RPC_2 || 'https://ethereum-sepolia.publicnode.com'
    }
  ];
  
  console.log('📊 Testing RPC Endpoints:\n');
  
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    console.log(`${i + 1}. ${provider.name}:`);
    
    if (!provider.url) {
      console.log('   ⚠️  Not configured\n');
      continue;
    }
    
    console.log(`   URL: ${provider.url}`);
    
    try {
      const ethProvider = new ethers.JsonRpcProvider(provider.url);
      const blockNumber = await ethProvider.getBlockNumber();
      console.log(`   ✅ Block: ${blockNumber}`);
      
      // Also test gas price
      const gasPrice = await ethProvider.getGasPrice();
      console.log(`   ⚡ Gas: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('====================================');
  console.log('✅ RPC endpoint testing complete!\n');
}

// Test canister operations
async function testCanister(operation = 'all') {
  console.log('🧪 Testing Canister Operations\n');
  
  const network = args[1] || 'local';
  const canisterId = network === 'ic' 
    ? 'icmw4-miaaa-aaaad-qhmmq-cai' 
    : 'aovwi-4maaa-aaaaa-qaagq-cai';
  
  console.log('📍 Canister ID:', canisterId);
  console.log('🌐 Network:', network);
  
  const networkFlag = network === 'ic' ? '--network ic' : '';
  
  try {
    if (operation === 'all' || operation === 'contract') {
      console.log('\n1️⃣ Setting deposit contract address...');
      execSync(`dfx canister call ${canisterId} setDepositContract '("0x9b0721C174b103facEC1EeE435679Ae9C493163C")' ${networkFlag}`, { stdio: 'inherit' });
    }
    
    if (operation === 'all' || operation === 'pool') {
      console.log('\n2️⃣ Getting pool address...');
      execSync(`dfx canister call ${canisterId} getPoolAddress ${networkFlag}`, { stdio: 'inherit' });
    }
    
    if (operation === 'all' || operation === 'deposits') {
      console.log('\n3️⃣ Checking for deposits...');
      execSync(`dfx canister call ${canisterId} checkDeposits ${networkFlag}`, { stdio: 'inherit' });
    }
    
    if (operation === 'withdrawal' || (operation === 'all' && network === 'ic')) {
      console.log('\n4️⃣ Testing withdrawal processing...');
      const recipient = args[2] || '0x742d35Cc6634C0532925a3b844Bc9e7595f7F1eD';
      const amount = args[3] || '100000000000000000'; // 0.1 ETH
      const nullifier = args[4] || '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      console.log(`Testing withdrawal to: ${recipient}`);
      console.log(`Amount: ${amount} wei (${ethers.formatEther(amount)} ETH)`);
      
      execSync(`dfx canister call ${canisterId} processWithdrawal "(\"${recipient}\", ${amount}, \"${nullifier}\")" ${networkFlag}`, { stdio: 'inherit' });
    }
    
    console.log('\n✅ Canister test complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test direct RPC call
async function testDirectRpc() {
  console.log('🧪 Testing direct EVM RPC call...\n');
  
  try {
    execSync(`dfx canister call 7hfb6-caaaa-aaaar-qadga-cai request '(variant {Chain=variant{EthSepolia=null}}, "{\\"jsonrpc\\":\\"2.0\\",\\"method\\":\\"eth_blockNumber\\",\\"params\\":[],\\"id\\":1}", 1000)' --network ic`, { stdio: 'inherit' });
    console.log('\n✅ Direct RPC call successful!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Help message
function showHelp() {
  console.log(`
🔧 EVM RPC Test Suite
====================

Usage: node test-evm-rpc.js <command> [options]

Commands:
  basic [network]              Test basic RPC connectivity through ICP
                              network: mainnet, sepolia, local (default: mainnet)
                              
  nonce [address]             Test nonce management for an address
                              
  multi                       Test multiple RPC providers
  
  canister [operation] [net]  Test canister operations
                              operation: all, contract, pool, deposits, withdrawal
                              net: local, ic (default: local)
                              
  direct                      Test direct RPC call to EVM RPC canister
  
  all                         Run all tests
  
  help                        Show this help message

Examples:
  node test-evm-rpc.js basic sepolia
  node test-evm-rpc.js nonce 0x742d35Cc6634C0532925a3b844Bc9e7595f7F1eD
  node test-evm-rpc.js multi
  node test-evm-rpc.js canister withdrawal ic
  node test-evm-rpc.js all
`);
}

// Main execution
async function main() {
  console.log('');
  
  switch(command) {
    case 'basic':
      await testBasicRpc(args[1] || 'mainnet');
      break;
      
    case 'nonce':
      await testNonce(args[1]);
      break;
      
    case 'multi':
      await testMultiRpc();
      break;
      
    case 'canister':
      await testCanister(args[1] || 'all');
      break;
      
    case 'direct':
      await testDirectRpc();
      break;
      
    case 'all':
      console.log('🚀 Running all tests...\n');
      console.log('=' .repeat(50) + '\n');
      
      await testBasicRpc('mainnet');
      console.log('\n' + '=' .repeat(50) + '\n');
      
      await testNonce();
      console.log('\n' + '=' .repeat(50) + '\n');
      
      await testMultiRpc();
      console.log('\n' + '=' .repeat(50) + '\n');
      
      await testCanister('all');
      console.log('\n' + '=' .repeat(50) + '\n');
      
      await testDirectRpc();
      break;
      
    case 'help':
    default:
      showHelp();
      break;
  }
}

// Run the tests
main().catch(console.error);
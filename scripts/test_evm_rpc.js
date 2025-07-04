const { Actor, HttpAgent } = require('@dfinity/agent');
const { ethers } = require('ethers');

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

async function testEvmRpc() {
  console.log('🔍 Testing EVM RPC Canister Connectivity\n');

  const agent = new HttpAgent({
    host: 'https://ic0.app',
  });

  const evmRpcCanisterId = '7hfb6-caaaa-aaaar-qadga-cai';
  const evmRpc = Actor.createActor(idlFactory, {
    agent,
    canisterId: evmRpcCanisterId,
  });

  console.log('📍 EVM RPC Canister:', evmRpcCanisterId);
  
  try {
    // Test 1: Get latest block number
    console.log('\n1️⃣ Testing eth_blockNumber...');
    const blockRequest = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: 1
    });

    const blockResult = await evmRpc.request(
      { EthMainnet: [{ Alchemy: null }] },
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
      { EthMainnet: [{ Alchemy: null }] },
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
    console.log('\n3️⃣ Testing eth_getBalance for deposit address...');
    const address = '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e';
    const balanceRequest = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 3
    });

    const balanceResult = await evmRpc.request(
      { EthMainnet: [{ Alchemy: null }] },
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

testEvmRpc().catch(console.error);
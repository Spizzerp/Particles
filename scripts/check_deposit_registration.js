const { ethers } = require('ethers');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { idlFactory } = require('../src/declarations/ethereum_adapter');
require('dotenv').config();

async function checkDepositRegistration() {
    console.log('🔍 Checking deposit address registration...\n');

    const depositAddress = '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e';
    
    // Setup IC agent
    const agent = new HttpAgent({
        host: 'https://ic0.app',
    });
    
    // For mainnet, remove this line:
    // await agent.fetchRootKey();
    
    // Get canister ID (you'll need to update this with your mainnet canister ID)
    const canisterId = process.env.ETHEREUM_ADAPTER_CANISTER_ID || 'YOUR_MAINNET_CANISTER_ID';
    
    if (canisterId === 'YOUR_MAINNET_CANISTER_ID') {
        console.log('❌ Please update the ETHEREUM_ADAPTER_CANISTER_ID in your .env file');
        console.log('You can find it by running: dfx canister --network ic id ethereum_adapter');
        return;
    }
    
    console.log('📍 Ethereum Adapter Canister:', canisterId);
    console.log('📍 Deposit Address:', depositAddress);
    
    try {
        // Create actor
        const ethereumAdapter = Actor.createActor(idlFactory, {
            agent,
            canisterId,
        });
        
        // Check if this is a valid deposit address
        console.log('\n📊 Checking deposit info...');
        
        // Try to get deposit info if there's such a method
        // This depends on your canister's interface
        
        // Connect to Ethereum to check balance
        const provider = new ethers.JsonRpcProvider(
            process.env.MAINNET_RPC_URL || 'https://ethereum.publicnode.com'
        );
        
        const balance = await provider.getBalance(depositAddress);
        console.log('💰 Current Balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance > 0n) {
            console.log('\n✅ Address has funds ready for forwarding');
            console.log('\n📋 Next steps:');
            console.log('1. Run: dfx canister --network ic call ethereum_adapter processDepositAddresses');
            console.log('2. Or use the process_mainnet_deposits.sh script');
            console.log('3. Monitor the transaction on Etherscan');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkDepositRegistration().catch(console.error);
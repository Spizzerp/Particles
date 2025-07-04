import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory as ethereumAdapterIdl } from '../.dfx/ic/canisters/ethereum_adapter/service.did.js';
import dotenv from 'dotenv';

dotenv.config();

const IC_HOST = 'https://ic0.app';
const ETHEREUM_ADAPTER_ID = 'icmw4-miaaa-aaaad-qhmmq-cai';

async function debugDepositProcessing() {
    console.log('🔍 Debugging Deposit Processing\n');
    
    // Create agent
    const agent = new HttpAgent({ host: IC_HOST });
    
    // Create actor
    const ethereumAdapter = Actor.createActor(ethereumAdapterIdl, {
        agent,
        canisterId: ETHEREUM_ADAPTER_ID,
    });
    
    try {
        // Get pending deposits
        console.log('📋 Fetching pending deposits...');
        const pendingDeposits = await ethereumAdapter.getPendingDeposits();
        
        if (pendingDeposits.length === 0) {
            console.log('❌ No pending deposits found');
            return;
        }
        
        console.log(`✅ Found ${pendingDeposits.length} pending deposits:\n`);
        
        for (const [address, info] of pendingDeposits) {
            console.log(`📍 Address: ${address}`);
            console.log(`   Commitment: ${info.commitment}`);
            console.log(`   Amount: ${info.amount} wei (${Number(info.amount) / 1e18} ETH)`);
            console.log(`   User ID: ${info.userId.toText()}`);
            console.log(`   Timestamp: ${new Date(Number(info.timestamp) / 1e6).toISOString()}`);
            console.log(`   Processed: ${info.processed}\n`);
        }
        
        // Get deposit contract address
        console.log('📄 Getting deposit contract address...');
        const depositContract = await ethereumAdapter.getDepositContract();
        console.log(`Deposit Contract: ${depositContract}\n`);
        
        if (!depositContract || depositContract === '') {
            console.log('❌ Deposit contract not set!');
            console.log('Run: dfx canister call ethereum_adapter setDepositContract \'("0xYOUR_CONTRACT_ADDRESS")\'');
            return;
        }
        
        // Try to process deposits
        console.log('🔄 Attempting to process deposits...');
        const result = await ethereumAdapter.processDepositAddresses();
        
        if ('ok' in result) {
            console.log(`✅ Processing result: ${result.ok.length} transactions processed`);
            if (result.ok.length > 0) {
                console.log('Transaction hashes:');
                result.ok.forEach((txHash, index) => {
                    console.log(`  ${index + 1}. ${txHash}`);
                });
            }
        } else {
            console.log(`❌ Processing failed: ${result.err}`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

debugDepositProcessing().catch(console.error); 
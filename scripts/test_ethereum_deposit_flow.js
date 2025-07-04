#!/usr/bin/env node

const { ethers } = require('ethers');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const crypto = require('crypto');

// Configuration
const DEPOSIT_MANAGER_CANISTER = 'hhveh-piaaa-aaaaj-a2dga-cai';
const ETHEREUM_ADAPTER_CANISTER = '55iy2-vaaaa-aaaas-amn7a-cai';
const WITHDRAWAL_PROCESSOR_CANISTER = 'hauct-cqaaa-aaaaj-a2dgq-cai';
const IC_HOST = 'https://ic0.app';
const SEPOLIA_RPC = 'https://sepolia.infura.io/v3/190d463dfdef42a69b97da04cfaf658b';

// Test wallet (YOU MUST HAVE SEPOLIA ETH IN THIS WALLET)
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '';

async function main() {
    if (!TEST_PRIVATE_KEY) {
        console.error('❌ Please set TEST_PRIVATE_KEY environment variable');
        console.log('Example: TEST_PRIVATE_KEY=your_private_key node test_ethereum_deposit_flow.js');
        return;
    }

    console.log('🧪 Testing Ethereum Deposit Flow');
    console.log('================================\n');

    // Connect to Ethereum
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    const wallet = new ethers.Wallet(TEST_PRIVATE_KEY, provider);
    const userAddress = await wallet.getAddress();
    console.log('📍 Test wallet address:', userAddress);

    // Check balance
    const balance = await wallet.getBalance();
    console.log('💰 Wallet balance:', ethers.utils.formatEther(balance), 'ETH');

    if (balance.lt(ethers.utils.parseEther('0.02'))) {
        console.error('❌ Insufficient balance. Need at least 0.02 ETH for test');
        return;
    }

    // Connect to IC
    const agent = new HttpAgent({ host: IC_HOST });
    
    // Create Ethereum Adapter actor
    const ethereumAdapterIDL = ({ IDL }) => {
        return IDL.Service({
            getDepositAddress: IDL.Func([IDL.Principal, IDL.Text, IDL.Nat], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
            processDepositAddresses: IDL.Func([], [IDL.Variant({ ok: IDL.Vec(IDL.Text), err: IDL.Text })], []),
            getPendingDeposits: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Record({
                commitment: IDL.Text,
                amount: IDL.Nat,
                timestamp: IDL.Int,
                userId: IDL.Principal,
                processed: IDL.Bool,
            })))], ['query']),
            getDepositInfo: IDL.Func([IDL.Text], [IDL.Opt(IDL.Record({
                commitment: IDL.Text,
                amount: IDL.Nat,
                timestamp: IDL.Int,
                userId: IDL.Principal,
                processed: IDL.Bool,
            }))], ['query']),
        });
    };

    const ethereumAdapter = Actor.createActor(ethereumAdapterIDL, {
        agent,
        canisterId: ETHEREUM_ADAPTER_CANISTER,
    });

    // Generate deposit data
    const secret = crypto.randomBytes(32);
    const nullifier = crypto.randomBytes(32);
    const amount = ethers.utils.parseEther('0.01');
    
    // Create commitment
    const commitment = ethers.utils.keccak256(
        ethers.utils.concat([secret, nullifier, ethers.utils.zeroPad(amount, 32)])
    );
    
    console.log('\n📝 Deposit Details:');
    console.log('  Amount:', ethers.utils.formatEther(amount), 'ETH');
    console.log('  Commitment:', commitment);
    console.log('  Secret:', '0x' + secret.toString('hex'));
    console.log('  Nullifier:', '0x' + nullifier.toString('hex'));

    // Generate unique deposit address
    console.log('\n🔄 Generating unique deposit address...');
    const userId = Principal.fromText('aaaaa-aa'); // Test principal
    
    try {
        const addressResult = await ethereumAdapter.getDepositAddress(
            userId,
            commitment,
            BigInt(amount.toString())
        );

        if ('err' in addressResult) {
            console.error('❌ Failed to generate address:', addressResult.err);
            return;
        }

        const depositAddress = addressResult.ok;
        console.log('✅ Deposit address:', depositAddress);

        // Check pending deposits before
        console.log('\n📋 Checking pending deposits...');
        const pendingBefore = await ethereumAdapter.getPendingDeposits();
        console.log('  Pending deposits:', pendingBefore.length);

        // Send ETH to deposit address
        console.log('\n💸 Sending ETH to deposit address...');
        const tx = await wallet.sendTransaction({
            to: depositAddress,
            value: amount,
        });

        console.log('📤 Transaction sent:', tx.hash);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

        // Wait a bit for the transaction to be indexed
        console.log('\n⏳ Waiting 10 seconds for transaction to be indexed...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Check deposit info
        console.log('\n🔍 Checking deposit status...');
        const depositInfo = await ethereumAdapter.getDepositInfo(depositAddress);
        if (depositInfo[0]) {
            console.log('✅ Deposit registered:');
            console.log('  Commitment:', depositInfo[0].commitment);
            console.log('  Amount:', depositInfo[0].amount.toString());
            console.log('  Processed:', depositInfo[0].processed);
        }

        // Process deposits
        console.log('\n🔄 Processing deposit addresses...');
        const processResult = await ethereumAdapter.processDepositAddresses();

        if ('err' in processResult) {
            console.error('❌ Failed to process deposits:', processResult.err);
        } else {
            console.log('✅ Processed transactions:', processResult.ok);
            
            if (processResult.ok.length > 0) {
                console.log('\n🎉 Success! Deposit has been forwarded to the pool.');
                console.log('   Transaction hash:', processResult.ok[0]);
                
                // Save deposit note
                const depositNote = {
                    commitment,
                    secret: '0x' + secret.toString('hex'),
                    nullifier: '0x' + nullifier.toString('hex'),
                    amount: ethers.utils.formatEther(amount),
                    depositTx: tx.hash,
                    forwardTx: processResult.ok[0],
                    timestamp: new Date().toISOString()
                };
                
                console.log('\n💾 Deposit Note (save this for withdrawal):');
                console.log(JSON.stringify(depositNote, null, 2));
            }
        }

        // Check final status
        console.log('\n📋 Final deposit status:');
        const pendingAfter = await ethereumAdapter.getPendingDeposits();
        console.log('  Pending deposits:', pendingAfter.length);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main().catch(console.error);
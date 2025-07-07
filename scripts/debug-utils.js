#!/usr/bin/env node

const { ethers } = require('ethers');
const crypto = require('crypto');
const { Command } = require('commander');
const { secp256k1 } = require('ethereum-cryptography/secp256k1');
const { keccak256 } = require('ethereum-cryptography/keccak');
const { toHex } = require('ethereum-cryptography/utils');
require('dotenv').config();

// Setup command line interface
const program = new Command();

program
    .name('debug-utils')
    .description('Consolidated debugging utilities for Particle Fund')
    .version('1.0.0');

/**
 * Debug transaction analysis
 */
program
    .command('tx-analyze')
    .description('Analyze transaction parameters and signing')
    .option('-t, --to <address>', 'Target address', '0x8626502727D7faf282C44df18B34E50D0DB45Eae')
    .option('-v, --value <eth>', 'Value in ETH', '0.001')
    .option('-n, --nonce <number>', 'Transaction nonce', '0')
    .option('-g, --gas-price <gwei>', 'Gas price in gwei', '1')
    .option('-l, --gas-limit <number>', 'Gas limit', '21000')
    .option('-c, --chain-id <number>', 'Chain ID (11155111 for Sepolia)', '11155111')
    .action(async (options) => {
        console.log('🔍 Transaction Analysis');
        console.log('======================\n');
        
        const tx = {
            to: options.to,
            value: ethers.parseEther(options.value),
            data: '0x',
            nonce: parseInt(options.nonce),
            gasPrice: ethers.parseUnits(options.gasPrice, 'gwei'),
            gasLimit: BigInt(options.gasLimit),
            chainId: parseInt(options.chainId),
            type: 0 // Legacy transaction
        };
        
        console.log('Transaction parameters:');
        console.log({
            to: tx.to,
            value: ethers.formatEther(tx.value) + ' ETH',
            data: tx.data,
            nonce: tx.nonce,
            gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei') + ' gwei',
            gasLimit: tx.gasLimit.toString(),
            chainId: tx.chainId
        });
        
        // Create unsigned transaction
        const unsignedTx = ethers.Transaction.from(tx);
        const serialized = unsignedTx.unsignedSerialized;
        console.log('\nUnsigned serialized:', serialized);
        
        // Hash for signing
        const hash = ethers.keccak256(serialized);
        console.log('Transaction hash for signing:', hash);
        
        // Show what would need to be signed
        console.log('\n📝 To sign this transaction:');
        console.log('1. Take the hash:', hash);
        console.log('2. Sign with ECDSA private key');
        console.log('3. The signature will determine the "from" address via ecrecover');
    });

/**
 * Decode signed transaction
 */
program
    .command('tx-decode <signedTx>')
    .description('Decode a signed transaction hex string')
    .option('-e, --expected <address>', 'Expected from address for comparison')
    .action(async (signedTx, options) => {
        console.log('🔍 Decoding Signed Transaction');
        console.log('==============================\n');
        
        try {
            // Remove 0x prefix if present
            if (signedTx.startsWith('0x')) {
                signedTx = signedTx.slice(2);
            }
            signedTx = '0x' + signedTx;
            
            // Parse the transaction
            const tx = ethers.Transaction.from(signedTx);
            
            console.log('Transaction Details:');
            console.log('- Type:', tx.type);
            console.log('- Chain ID:', tx.chainId);
            console.log('- From (signer):', tx.from);
            console.log('- To:', tx.to);
            console.log('- Value:', tx.value ? ethers.formatEther(tx.value) : '0', 'ETH');
            console.log('- Nonce:', tx.nonce);
            console.log('- Gas Limit:', tx.gasLimit);
            
            if (tx.type === 2) {
                console.log('- Max Fee Per Gas:', ethers.formatUnits(tx.maxFeePerGas, 'gwei'), 'gwei');
                console.log('- Max Priority Fee:', ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei'), 'gwei');
            } else {
                console.log('- Gas Price:', ethers.formatUnits(tx.gasPrice, 'gwei'), 'gwei');
            }
            
            console.log('- Data:', tx.data);
            
            // Signature components
            console.log('\n📊 Signature Analysis:');
            console.log('- r:', tx.r);
            console.log('- s:', tx.s);
            if (tx.type === 0) {
                console.log('- v:', tx.v);
            } else {
                console.log('- yParity:', tx.yParity);
            }
            
            if (options.expected) {
                console.log('\n✅ Address Comparison:');
                console.log('- Expected from:', options.expected);
                console.log('- Actual from:  ', tx.from);
                console.log('- Match?', tx.from.toLowerCase() === options.expected.toLowerCase() ? '✅ YES' : '❌ NO');
                
                if (tx.from.toLowerCase() !== options.expected.toLowerCase()) {
                    console.log('\n⚠️  PROBLEM IDENTIFIED:');
                    console.log('The transaction is being signed by a different address!');
                    console.log('This could mean:');
                    console.log('1. Wrong private key is being used');
                    console.log('2. Key derivation path is incorrect');
                    console.log('3. The signing process has an issue');
                }
            }
            
            // Decode call data if present
            if (tx.data && tx.data !== '0x') {
                console.log('\n📦 Call Data Analysis:');
                const methodId = tx.data.slice(0, 10);
                console.log('- Method ID:', methodId);
                
                // Common method IDs
                const knownMethods = {
                    '0xb214faa5': 'deposit(bytes32)',
                    '0xa9059cbb': 'transfer(address,uint256)',
                    '0x23b872dd': 'transferFrom(address,address,uint256)'
                };
                
                if (knownMethods[methodId]) {
                    console.log('- Method:', knownMethods[methodId]);
                    
                    if (methodId === '0xb214faa5') {
                        const commitment = '0x' + tx.data.slice(10);
                        console.log('- Commitment:', commitment);
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Error decoding transaction:', error.message);
            console.error('Make sure the input is a valid signed transaction hex string');
        }
    });

/**
 * Debug signature recovery
 */
program
    .command('sig-recovery')
    .description('Debug signature recovery issues')
    .option('-t, --tx <signedTx>', 'Signed transaction to analyze')
    .option('-e, --expected <address>', 'Expected recovery address')
    .option('-m, --message <hex>', 'Message that was signed')
    .option('-s, --signature <hex>', 'Signature to verify')
    .action(async (options) => {
        console.log('🔍 Debugging Signature Recovery');
        console.log('===============================\n');
        
        if (options.tx) {
            try {
                const tx = ethers.Transaction.from(options.tx);
                
                console.log('Transaction Signature Analysis:');
                console.log('- Recovered from:', tx.from);
                console.log('- Expected from:', options.expected || 'Not specified');
                console.log('- Match?', options.expected ? 
                    (tx.from.toLowerCase() === options.expected.toLowerCase() ? '✅ YES' : '❌ NO') : 
                    'N/A');
                
                console.log('\nSignature Components:');
                console.log('- r:', tx.r);
                console.log('- s:', tx.s);
                console.log('- v/yParity:', tx.type === 0 ? tx.v : tx.yParity);
                
                console.log('\n📋 Common Issues:');
                console.log('1. Wrong private key used for signing');
                console.log('2. Incorrect message hash');
                console.log('3. Wrong chain ID in EIP-155 transactions');
                console.log('4. Compressed vs uncompressed public key issues');
                
            } catch (error) {
                console.error('Error analyzing transaction:', error.message);
            }
        }
        
        if (options.message && options.signature) {
            console.log('\n🔐 Direct Signature Recovery:');
            try {
                const msgHash = ethers.keccak256(options.message);
                const sig = ethers.Signature.from(options.signature);
                const recoveredAddress = ethers.recoverAddress(msgHash, sig);
                
                console.log('- Message hash:', msgHash);
                console.log('- Recovered address:', recoveredAddress);
                if (options.expected) {
                    console.log('- Expected address:', options.expected);
                    console.log('- Match?', recoveredAddress.toLowerCase() === options.expected.toLowerCase() ? '✅ YES' : '❌ NO');
                }
            } catch (error) {
                console.error('Error recovering from signature:', error.message);
            }
        }
    });

/**
 * Debug compressed/uncompressed key issues
 */
program
    .command('key-debug <publicKey>')
    .description('Debug compressed/uncompressed public key issues')
    .option('-e, --expected <address>', 'Expected Ethereum address')
    .action(async (publicKey, options) => {
        console.log('🔍 Public Key Analysis');
        console.log('=====================\n');
        
        try {
            // Remove 0x prefix if present
            if (publicKey.startsWith('0x')) {
                publicKey = publicKey.slice(2);
            }
            
            const keyBuffer = Buffer.from(publicKey, 'hex');
            console.log('Input key:', publicKey);
            console.log('Key length:', keyBuffer.length, 'bytes');
            console.log('Key prefix:', '0x' + keyBuffer[0].toString(16));
            
            let uncompressedKey;
            
            // Check if compressed or uncompressed
            if (keyBuffer.length === 33) {
                console.log('\n📊 Key type: COMPRESSED');
                console.log('Decompressing...');
                
                // Use secp256k1 to decompress
                try {
                    // Convert to uncompressed format
                    const point = secp256k1.ProjectivePoint.fromHex(publicKey);
                    const uncompressedHex = point.toRawBytes(false);
                    uncompressedKey = Buffer.from(uncompressedHex);
                    
                    console.log('Uncompressed key:', uncompressedKey.toString('hex'));
                    console.log('Uncompressed length:', uncompressedKey.length, 'bytes');
                } catch (e) {
                    console.error('Failed to decompress key:', e.message);
                    return;
                }
            } else if (keyBuffer.length === 65) {
                console.log('\n📊 Key type: UNCOMPRESSED');
                uncompressedKey = keyBuffer;
            } else {
                console.error('❌ Invalid public key length. Expected 33 (compressed) or 65 (uncompressed) bytes');
                return;
            }
            
            // Calculate Ethereum address
            console.log('\n🔐 Address Calculation:');
            
            // Method 1: Using raw coordinates (remove 0x04 prefix)
            const rawKey = uncompressedKey.slice(1);
            const hash1 = Buffer.from(keccak256(rawKey));
            const address1 = '0x' + hash1.slice(-20).toString('hex');
            console.log('Method 1 (raw coordinates):', address1);
            
            // Method 2: Using ethers (for comparison)
            try {
                const address2 = ethers.computeAddress('0x' + uncompressedKey.toString('hex'));
                console.log('Method 2 (ethers.js):      ', address2);
            } catch (e) {
                console.log('Method 2 (ethers.js): Failed -', e.message);
            }
            
            if (options.expected) {
                console.log('\n✅ Address Comparison:');
                console.log('Expected address:', options.expected);
                console.log('Match Method 1?', address1.toLowerCase() === options.expected.toLowerCase() ? '✅ YES' : '❌ NO');
            }
            
            // Test what happens with wrong approaches
            console.log('\n⚠️  Common Mistakes:');
            
            // Mistake 1: Hashing compressed key directly
            const wrongHash1 = Buffer.from(keccak256(keyBuffer));
            const wrongAddress1 = '0x' + wrongHash1.slice(-20).toString('hex');
            console.log('If hashing compressed directly:', wrongAddress1);
            
            // Mistake 2: Including 0x04 prefix
            if (uncompressedKey[0] === 0x04) {
                const wrongHash2 = Buffer.from(keccak256(uncompressedKey));
                const wrongAddress2 = '0x' + wrongHash2.slice(-20).toString('hex');
                console.log('If including 0x04 prefix:      ', wrongAddress2);
            }
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    });

/**
 * Debug failed deposits
 */
program
    .command('deposit-debug')
    .description('Debug failed deposit transactions')
    .option('-a, --address <address>', 'Deposit address to check')
    .option('-p, --pool <address>', 'Pool contract address', '0x8626502727D7faf282C44df18B34E50D0DB45Eae')
    .option('-n, --network <name>', 'Network name (mainnet/sepolia)', 'sepolia')
    .option('-v, --value <eth>', 'Deposit amount in ETH', '0.01')
    .action(async (options) => {
        console.log('🔍 Debugging Deposit Failure');
        console.log('===========================\n');
        
        // Select RPC based on network
        let rpcUrl;
        if (options.network === 'mainnet') {
            rpcUrl = process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com';
        } else if (options.network === 'sepolia') {
            rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
        } else {
            console.error('❌ Unknown network:', options.network);
            return;
        }
        
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        console.log('🌐 Network:', options.network);
        console.log('📡 RPC URL:', rpcUrl);
        
        if (!options.address) {
            console.error('❌ Please provide a deposit address with -a flag');
            return;
        }
        
        const depositAddress = options.address;
        const poolContract = options.pool;
        const depositAmount = ethers.parseEther(options.value);
        
        console.log('\n📍 Addresses:');
        console.log('- Deposit address:', depositAddress);
        console.log('- Pool contract:', poolContract);
        console.log('- Deposit amount:', ethers.formatEther(depositAmount), 'ETH');
        
        try {
            // 1. Check balances
            console.log('\n💰 Balance Check:');
            const balance = await provider.getBalance(depositAddress);
            console.log('- Current balance:', ethers.formatEther(balance), 'ETH');
            
            // 2. Check nonce
            const nonce = await provider.getTransactionCount(depositAddress);
            console.log('- Current nonce:', nonce);
            
            // 3. Get gas prices
            console.log('\n⛽ Gas Prices:');
            const feeData = await provider.getFeeData();
            const block = await provider.getBlock('latest');
            
            console.log('- Current block:', block.number);
            console.log('- Base fee:', ethers.formatUnits(block.baseFeePerGas, 'gwei'), 'gwei');
            console.log('- Max priority fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'), 'gwei');
            console.log('- Suggested max fee:', ethers.formatUnits(feeData.maxFeePerGas, 'gwei'), 'gwei');
            
            // 4. Check contract
            console.log('\n📋 Contract Check:');
            const code = await provider.getCode(poolContract);
            if (code === '0x') {
                console.log('❌ No contract at pool address!');
                return;
            }
            console.log('✅ Contract exists');
            
            // 5. Estimate gas
            console.log('\n🧮 Gas Estimation:');
            const iface = new ethers.Interface(['function deposit(bytes32 commitment) payable']);
            const testCommitment = '0x' + '1'.repeat(64);
            const callData = iface.encodeFunctionData('deposit', [testCommitment]);
            
            try {
                const gasEstimate = await provider.estimateGas({
                    from: depositAddress,
                    to: poolContract,
                    value: depositAmount,
                    data: callData
                });
                console.log('✅ Gas estimate:', gasEstimate.toString());
                
                // Calculate costs
                const maxGasCost = gasEstimate * feeData.maxFeePerGas;
                const totalNeeded = depositAmount + maxGasCost;
                
                console.log('\n💸 Cost Analysis:');
                console.log('- Deposit amount:', ethers.formatEther(depositAmount), 'ETH');
                console.log('- Max gas cost:', ethers.formatEther(maxGasCost), 'ETH');
                console.log('- Total needed:', ethers.formatEther(totalNeeded), 'ETH');
                console.log('- Current balance:', ethers.formatEther(balance), 'ETH');
                
                if (balance >= totalNeeded) {
                    console.log('✅ Balance is sufficient');
                } else {
                    const deficit = totalNeeded - balance;
                    console.log('❌ Insufficient balance!');
                    console.log('- Deficit:', ethers.formatEther(deficit), 'ETH');
                }
                
            } catch (error) {
                console.log('❌ Gas estimation failed:', error.message);
                
                // Try static call for more info
                try {
                    await provider.call({
                        from: depositAddress,
                        to: poolContract,
                        value: depositAmount,
                        data: callData
                    });
                } catch (callError) {
                    console.log('❌ Static call failed:', callError.message);
                    
                    // Try to decode revert reason
                    if (callError.data) {
                        try {
                            const reason = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + callError.data.slice(10));
                            console.log('Revert reason:', reason[0]);
                        } catch (e) {
                            console.log('Raw error data:', callError.data);
                        }
                    }
                }
            }
            
            // 6. Check minimum deposit
            console.log('\n🔍 Contract Requirements:');
            try {
                const poolInterface = new ethers.Contract(
                    poolContract,
                    ['function MIN_DEPOSIT() view returns (uint256)'],
                    provider
                );
                
                const minDeposit = await poolInterface.MIN_DEPOSIT();
                console.log('- Minimum deposit:', ethers.formatEther(minDeposit), 'ETH');
                
                if (depositAmount < minDeposit) {
                    console.log('❌ Deposit amount is below minimum!');
                } else {
                    console.log('✅ Deposit amount meets minimum');
                }
            } catch (e) {
                console.log('- Cannot read MIN_DEPOSIT (may not be public)');
            }
            
            // 7. Recommendations
            console.log('\n💡 Recommendations:');
            const safeMaxFee = block.baseFeePerGas * 2n + ethers.parseUnits('2', 'gwei');
            console.log('1. Use EIP-1559 transactions for better reliability');
            console.log('2. Set maxPriorityFeePerGas:', ethers.formatUnits(ethers.parseUnits('2', 'gwei'), 'gwei'), 'gwei');
            console.log('3. Set maxFeePerGas:', ethers.formatUnits(safeMaxFee, 'gwei'), 'gwei');
            console.log('4. Add 20% buffer to gas estimates');
            console.log('5. Ensure balance covers: deposit + (gasLimit * maxFeePerGas)');
            
            // 8. Example transaction
            console.log('\n📝 Example Transaction:');
            console.log({
                type: 2,
                from: depositAddress,
                to: poolContract,
                value: ethers.formatEther(depositAmount) + ' ETH',
                data: callData,
                nonce: nonce,
                gasLimit: '100000',
                maxPriorityFeePerGas: ethers.formatUnits(ethers.parseUnits('2', 'gwei'), 'gwei') + ' gwei',
                maxFeePerGas: ethers.formatUnits(safeMaxFee, 'gwei') + ' gwei',
                chainId: options.network === 'mainnet' ? 1 : 11155111
            });
            
        } catch (error) {
            console.error('\n❌ Error:', error.message);
        }
    });

/**
 * Combined debug command
 */
program
    .command('full-debug')
    .description('Run all debug checks for a transaction')
    .requiredOption('-t, --tx <signedTx>', 'Signed transaction hex')
    .option('-n, --network <name>', 'Network name', 'sepolia')
    .action(async (options) => {
        console.log('🔍 Full Transaction Debug');
        console.log('========================\n');
        
        // First decode the transaction
        console.log('Step 1: Decoding transaction...\n');
        try {
            const tx = ethers.Transaction.from(options.tx);
            
            // Show all transaction details
            console.log('Transaction Details:');
            console.log('- Type:', tx.type);
            console.log('- From:', tx.from);
            console.log('- To:', tx.to);
            console.log('- Value:', tx.value ? ethers.formatEther(tx.value) : '0', 'ETH');
            console.log('- Chain ID:', tx.chainId);
            
            // Check signature
            console.log('\nStep 2: Signature Analysis...\n');
            console.log('- r:', tx.r);
            console.log('- s:', tx.s);
            console.log('- v/yParity:', tx.type === 0 ? tx.v : tx.yParity);
            
            // Connect to network and check address
            console.log('\nStep 3: Network checks...\n');
            
            const rpcUrl = options.network === 'mainnet' ? 
                process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com' :
                process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
                
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            
            const balance = await provider.getBalance(tx.from);
            const nonce = await provider.getTransactionCount(tx.from);
            
            console.log('From address status:');
            console.log('- Balance:', ethers.formatEther(balance), 'ETH');
            console.log('- Nonce:', nonce);
            console.log('- Transaction nonce:', tx.nonce);
            
            if (tx.nonce < nonce) {
                console.log('⚠️  WARNING: Transaction nonce is already used!');
            } else if (tx.nonce > nonce) {
                console.log('⚠️  WARNING: Transaction nonce is too high (gap in sequence)');
            }
            
            // Check if transaction can be sent
            console.log('\nStep 4: Transaction viability...\n');
            
            const feeData = await provider.getFeeData();
            let gasCost;
            
            if (tx.type === 2) {
                gasCost = tx.gasLimit * tx.maxFeePerGas;
                console.log('Max gas cost:', ethers.formatEther(gasCost), 'ETH');
            } else {
                gasCost = tx.gasLimit * tx.gasPrice;
                console.log('Gas cost:', ethers.formatEther(gasCost), 'ETH');
            }
            
            const totalCost = (tx.value || 0n) + gasCost;
            console.log('Total cost:', ethers.formatEther(totalCost), 'ETH');
            
            if (balance < totalCost) {
                console.log('❌ INSUFFICIENT FUNDS!');
                console.log('Need:', ethers.formatEther(totalCost - balance), 'more ETH');
            } else {
                console.log('✅ Sufficient balance for transaction');
            }
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
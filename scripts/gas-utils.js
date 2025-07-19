const { ethers } = require('ethers');
require('dotenv').config();

// Network configurations
const NETWORKS = {
    mainnet: {
        name: 'Ethereum Mainnet',
        rpc: 'https://ethereum.publicnode.com',
        defaultContract: '0x9b0721C174b103facEC1EeE435679Ae9C493163C',
        defaultDepositAddress: '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e'
    },
    sepolia: {
        name: 'Sepolia Testnet',
        rpc: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com',
        defaultContract: '0xd72114Ae0a3E80B921Ca26aB522F9Fa656a6c2e1',
        defaultDepositAddress: '0x17f20304f4d77b10d484ca967f19784eea89ce8d'
    }
};

// Function selector for deposit function
const DEPOSIT_SELECTOR = '0xb214faa5';

// Command line arguments parser
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        command: args[0] || 'help',
        network: 'sepolia',
        address: null,
        contract: null,
        amount: '0.01',
        commitment: '0x3ceb1793fe62c6652483c6f7f9679aab1a8e665f06c78dfe31ec0c8dc8cbd61b',
        blocks: 5
    };

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];
        
        switch (arg) {
            case '--network':
            case '-n':
                options.network = nextArg || 'mainnet';
                i++;
                break;
            case '--address':
            case '-a':
                options.address = nextArg;
                i++;
                break;
            case '--contract':
            case '-c':
                options.contract = nextArg;
                i++;
                break;
            case '--amount':
                options.amount = nextArg;
                i++;
                break;
            case '--commitment':
                options.commitment = nextArg;
                i++;
                break;
            case '--blocks':
                options.blocks = parseInt(nextArg) || 5;
                i++;
                break;
        }
    }

    return options;
}

// Show help information
function showHelp() {
    console.log(`
Gas Utilities - Ethereum Gas Price and Estimation Tool

Usage: node gas-utils.js <command> [options]

Commands:
  price        Check current gas prices
  estimate     Estimate gas for a deposit transaction
  history      Check recent deposit transactions
  balance      Check address balance and gas requirements
  help         Show this help message

Options:
  -n, --network <network>     Network to use (mainnet, sepolia) [default: mainnet]
  -a, --address <address>     Address to check or use for estimation
  -c, --contract <address>    Contract address [uses network default]
  --amount <eth>              Amount to deposit in ETH [default: 0.01]
  --commitment <hex>          Commitment hash for deposit [default: example hash]
  --blocks <number>           Number of blocks to check for history [default: 5]

Examples:
  node gas-utils.js price
  node gas-utils.js price -n sepolia
  node gas-utils.js estimate --amount 0.01
  node gas-utils.js history -n sepolia --blocks 10
  node gas-utils.js balance -a 0x123... -n mainnet
`);
}

// Check current gas prices
async function checkGasPrice(provider, network) {
    console.log(`📊 Gas Prices on ${NETWORKS[network].name}\n`);
    
    try {
        const feeData = await provider.getFeeData();
        console.log('⛽ Current Gas Prices:');
        console.log('- Gas Price (Legacy):', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'gwei');
        console.log('- Max Fee Per Gas:', ethers.formatUnits(feeData.maxFeePerGas, 'gwei'), 'gwei');
        console.log('- Max Priority Fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'), 'gwei');
        
        // Get latest block for base fee
        const block = await provider.getBlock('latest');
        console.log('- Base Fee:', ethers.formatUnits(block.baseFeePerGas, 'gwei'), 'gwei');
        console.log('\n📦 Latest Block:');
        console.log('- Block Number:', block.number);
        console.log('- Timestamp:', new Date(block.timestamp * 1000).toISOString());
        
        // Calculate with 10% buffer (same as contract)
        const maxFeeWithBuffer = block.baseFeePerGas + feeData.maxPriorityFeePerGas + (block.baseFeePerGas / 10n);
        console.log('\n💡 Recommended:');
        console.log('- Max Fee with 10% buffer:', ethers.formatUnits(maxFeeWithBuffer, 'gwei'), 'gwei');
        
    } catch (error) {
        console.error('❌ Error checking gas prices:', error.message);
    }
}

// Estimate gas for deposit
async function estimateGas(provider, options) {
    const network = options.network;
    const contractAddress = options.contract || NETWORKS[network].defaultContract;
    const fromAddress = options.address || NETWORKS[network].defaultDepositAddress;
    const depositAmount = ethers.parseEther(options.amount);
    
    console.log(`📐 Estimating Gas for Deposit on ${NETWORKS[network].name}\n`);
    console.log('📝 Transaction Details:');
    console.log('- From:', fromAddress);
    console.log('- To (Contract):', contractAddress);
    console.log('- Deposit Amount:', options.amount, 'ETH');
    console.log('- Commitment:', options.commitment);
    
    try {
        // Encode the deposit function call
        const iface = new ethers.Interface(['function deposit(bytes32 commitment) payable']);
        const callData = iface.encodeFunctionData('deposit', [options.commitment]);
        
        // Get current gas prices
        const feeData = await provider.getFeeData();
        const block = await provider.getBlock('latest');
        
        console.log('\n⛽ Current Gas Prices:');
        console.log('- Base Fee:', ethers.formatUnits(block.baseFeePerGas, 'gwei'), 'gwei');
        console.log('- Max Priority Fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'), 'gwei');
        
        // Estimate gas
        let gasEstimate;
        try {
            gasEstimate = await provider.estimateGas({
                from: fromAddress,
                to: contractAddress,
                value: depositAmount,
                data: callData
            });
            console.log('\n📊 Gas Estimation:');
            console.log('- Estimated Gas:', gasEstimate.toString());
            console.log('- Estimated Gas (formatted):', Number(gasEstimate).toLocaleString());
        } catch (estimateError) {
            console.log('\n⚠️  Gas estimation failed, using default: 65,000');
            gasEstimate = 65000n;
        }
        
        // Calculate costs
        const maxFeeWithBuffer = block.baseFeePerGas + feeData.maxPriorityFeePerGas + (block.baseFeePerGas / 10n);
        const maxGasCost = maxFeeWithBuffer * gasEstimate;
        const totalRequired = depositAmount + maxGasCost;
        
        console.log('\n💰 Cost Analysis:');
        console.log('- Max Gas Cost:', ethers.formatEther(maxGasCost), 'ETH');
        console.log('- Deposit Amount:', ethers.formatEther(depositAmount), 'ETH');
        console.log('- Total Required:', ethers.formatEther(totalRequired), 'ETH');
        
        // Check balance if address is provided
        if (fromAddress) {
            const balance = await provider.getBalance(fromAddress);
            console.log('\n💸 Balance Check:');
            console.log('- Current Balance:', ethers.formatEther(balance), 'ETH');
            
            if (balance >= totalRequired) {
                console.log('✅ Sufficient balance for transaction!');
            } else {
                const shortage = totalRequired - balance;
                console.log('❌ Insufficient balance! Short by:', ethers.formatEther(shortage), 'ETH');
            }
        }
        
        // Check nonce
        const nonce = await provider.getTransactionCount(fromAddress);
        console.log('\n🔢 Account Info:');
        console.log('- Current Nonce:', nonce);
        
    } catch (error) {
        console.error('\n❌ Error estimating gas:', error.message);
        if (error.data) {
            console.error('Error data:', error.data);
        }
    }
}

// Check recent deposit transactions
async function checkDepositHistory(provider, options) {
    const network = options.network;
    const contractAddress = options.contract || NETWORKS[network].defaultContract;
    const blocksToCheck = options.blocks;
    
    console.log(`📜 Recent Deposit History on ${NETWORKS[network].name}\n`);
    console.log('🔍 Search Parameters:');
    console.log('- Contract:', contractAddress);
    console.log('- Blocks to check:', blocksToCheck);
    
    try {
        const latestBlock = await provider.getBlockNumber();
        console.log('- Latest block:', latestBlock);
        console.log('\n📋 Recent Deposits:');
        
        let foundCount = 0;
        
        for (let i = 0; i < blocksToCheck; i++) {
            const blockNumber = latestBlock - i;
            const block = await provider.getBlock(blockNumber, true);
            
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
                        if (tx.data && tx.data.startsWith(DEPOSIT_SELECTOR)) {
                            foundCount++;
                            console.log(`\n[${foundCount}] Deposit Transaction:`);
                            console.log('  📦 Block:', blockNumber);
                            console.log('  🔗 TX Hash:', tx.hash);
                            console.log('  👤 From:', tx.from);
                            console.log('  💰 Value:', ethers.formatEther(tx.value), 'ETH');
                            console.log('  ⛽ Gas Limit:', tx.gasLimit.toString());
                            console.log('  💸 Gas Price:', ethers.formatUnits(tx.gasPrice || tx.maxFeePerGas, 'gwei'), 'gwei');
                            
                            // Get receipt for actual gas used
                            try {
                                const receipt = await provider.getTransactionReceipt(tx.hash);
                                if (receipt) {
                                    console.log('  ✅ Gas Used:', receipt.gasUsed.toString());
                                    console.log('  📊 Status:', receipt.status === 1 ? 'Success' : 'Failed');
                                    const actualCost = receipt.gasUsed * receipt.effectiveGasPrice;
                                    console.log('  💵 Actual Cost:', ethers.formatEther(actualCost), 'ETH');
                                }
                            } catch (receiptError) {
                                console.log('  ⚠️  Could not fetch receipt');
                            }
                        }
                    }
                }
            }
        }
        
        if (foundCount === 0) {
            console.log('\nNo deposit transactions found in the last', blocksToCheck, 'blocks');
        } else {
            console.log(`\n✅ Found ${foundCount} deposit transaction(s)`);
        }
        
    } catch (error) {
        console.error('\n❌ Error checking history:', error.message);
    }
}

// Check balance and gas requirements
async function checkBalance(provider, options) {
    const network = options.network;
    const address = options.address || NETWORKS[network].defaultDepositAddress;
    const depositAmount = ethers.parseEther(options.amount);
    
    console.log(`💳 Balance Check on ${NETWORKS[network].name}\n`);
    
    try {
        const balance = await provider.getBalance(address);
        console.log('📊 Account Details:');
        console.log('- Address:', address);
        console.log('- Balance:', ethers.formatEther(balance), 'ETH');
        
        // Get gas prices
        const feeData = await provider.getFeeData();
        const block = await provider.getBlock('latest');
        
        // Calculate gas requirements
        const gasLimit = 65000n; // Standard deposit gas limit
        const maxFeeWithBuffer = block.baseFeePerGas + feeData.maxPriorityFeePerGas + (block.baseFeePerGas / 10n);
        const maxGasCost = maxFeeWithBuffer * gasLimit;
        const totalRequired = depositAmount + maxGasCost;
        
        console.log('\n💰 For deposit of', options.amount, 'ETH:');
        console.log('- Deposit Amount:', ethers.formatEther(depositAmount), 'ETH');
        console.log('- Max Gas Cost:', ethers.formatEther(maxGasCost), 'ETH');
        console.log('- Total Required:', ethers.formatEther(totalRequired), 'ETH');
        
        console.log('\n📈 Balance Analysis:');
        if (balance >= totalRequired) {
            const remaining = balance - totalRequired;
            console.log('✅ Sufficient balance!');
            console.log('- Remaining after deposit:', ethers.formatEther(remaining), 'ETH');
        } else {
            const shortage = totalRequired - balance;
            console.log('❌ Insufficient balance!');
            console.log('- Short by:', ethers.formatEther(shortage), 'ETH');
        }
        
        // Get transaction count
        const nonce = await provider.getTransactionCount(address);
        console.log('\n🔢 Transaction Count:', nonce);
        
    } catch (error) {
        console.error('\n❌ Error checking balance:', error.message);
    }
}

// Main function
async function main() {
    const options = parseArgs();
    
    if (options.command === 'help') {
        showHelp();
        return;
    }
    
    // Validate network
    if (!NETWORKS[options.network]) {
        console.error(`❌ Invalid network: ${options.network}`);
        console.log('Valid networks: mainnet, sepolia');
        return;
    }
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(NETWORKS[options.network].rpc);
    
    // Execute command
    switch (options.command) {
        case 'price':
            await checkGasPrice(provider, options.network);
            break;
        case 'estimate':
            await estimateGas(provider, options);
            break;
        case 'history':
            await checkDepositHistory(provider, options);
            break;
        case 'balance':
            await checkBalance(provider, options);
            break;
        default:
            console.error(`❌ Unknown command: ${options.command}`);
            console.log('Run "node gas-utils.js help" for usage information');
    }
}

// Run the script
main().catch(console.error);
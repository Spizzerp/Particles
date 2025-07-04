const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load contract ABI
const contractJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../contracts/build/contracts/EthereumDepositPool.sol/EthereumDepositPool.json'), 'utf8')
);

// Load deployment info
const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../deployments/sepolia.json'), 'utf8')
);

async function testEIP1559Deposit() {
    console.log('🧪 Testing EIP-1559 Ethereum Deposit...\n');

    // Connect to provider
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Connect to contract
    const contract = new ethers.Contract(
        deployment.address,
        contractJson.abi,
        wallet
    );

    console.log('📍 Contract:', deployment.address);
    console.log('💰 Wallet:', wallet.address);
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💎 Balance:', ethers.formatEther(balance), 'ETH\n');

    // Get current gas prices for EIP-1559
    const feeData = await provider.getFeeData();
    console.log('⛽ Gas Prices (EIP-1559):');
    console.log('- Max Fee Per Gas:', ethers.formatUnits(feeData.maxFeePerGas, 'gwei'), 'gwei');
    console.log('- Max Priority Fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'), 'gwei');
    
    // Get latest block to see base fee
    const block = await provider.getBlock('latest');
    console.log('- Current Base Fee:', ethers.formatUnits(block.baseFeePerGas, 'gwei'), 'gwei\n');

    // Generate a test commitment (in production, this would come from ZK circuit)
    const randomBytes = ethers.randomBytes(32);
    const commitment = ethers.hexlify(randomBytes);
    
    console.log('🔐 Commitment:', commitment);
    
    // Test deposit amount (0.01 ETH - minimum accepted amount)
    const depositAmount = ethers.parseEther('0.01');
    
    try {
        console.log('\n📤 Sending EIP-1559 deposit transaction...');
        console.log('Amount: 0.01 ETH');
        
        // Send deposit transaction with EIP-1559 parameters
        const tx = await contract.deposit(commitment, {
            value: depositAmount,
            // EIP-1559 parameters
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            gasLimit: 100000, // Set explicit gas limit
            type: 2 // Explicitly set transaction type to EIP-1559
        });
        
        console.log('Transaction hash:', tx.hash);
        console.log('Transaction type:', tx.type);
        console.log('⏳ Waiting for confirmation...');
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        console.log('\n✅ Deposit successful!');
        console.log('Block number:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());
        console.log('Effective gas price:', ethers.formatUnits(receipt.effectiveGasPrice, 'gwei'), 'gwei');
        
        // Check for Deposit event
        const depositEvent = receipt.logs.find(log => {
            try {
                const parsed = contract.interface.parseLog(log);
                return parsed.name === 'Deposit';
            } catch {
                return false;
            }
        });
        
        if (depositEvent) {
            const parsed = contract.interface.parseLog(depositEvent);
            console.log('\n📊 Deposit Event:');
            console.log('- Commitment:', parsed.args.commitment);
            console.log('- Amount:', ethers.formatEther(parsed.args.amount), 'ETH');
            console.log('- Sender:', parsed.args.sender);
            console.log('- Timestamp:', new Date(Number(parsed.args.timestamp) * 1000).toISOString());
        }
        
        console.log('\n🎉 EIP-1559 deposit complete!');
        console.log('View on Etherscan:', `https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        // Save deposit info for reference
        const depositInfo = {
            commitment,
            amount: '0.01',
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            timestamp: new Date().toISOString(),
            contractAddress: deployment.address,
            transactionType: 'EIP-1559',
            effectiveGasPrice: receipt.effectiveGasPrice.toString()
        };
        
        const depositsPath = path.join(__dirname, '../test-deposits-eip1559.json');
        let deposits = [];
        if (fs.existsSync(depositsPath)) {
            deposits = JSON.parse(fs.readFileSync(depositsPath, 'utf8'));
        }
        deposits.push(depositInfo);
        fs.writeFileSync(depositsPath, JSON.stringify(deposits, null, 2));
        
        console.log('\n💾 Deposit info saved to test-deposits-eip1559.json');
        console.log('\nNext steps:');
        console.log('1. Deploy the EIP-1559 version of EthereumAdapter:');
        console.log('   dfx deploy ethereum_adapter --argument "()"');
        console.log('2. Test processing the deposit with EIP-1559:');
        console.log('   dfx canister call ethereum_adapter processSingleDepositEIP1559 \'("YOUR_DEPOSIT_ADDRESS")\'');
        
    } catch (error) {
        console.error('\n❌ Deposit failed:', error.message);
        if (error.data) {
            console.error('Error data:', error.data);
        }
        if (error.transaction) {
            console.error('Transaction:', error.transaction);
        }
    }
}

// Run the test
testEIP1559Deposit().catch(console.error);
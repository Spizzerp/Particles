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

async function testDeposit() {
    console.log('🧪 Testing Ethereum Deposit...\n');

    // Connect to provider
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
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

    // Generate a test commitment (in production, this would come from ZK circuit)
    // For testing, we'll use a random 32-byte value
    const randomBytes = ethers.randomBytes(32);
    const commitment = ethers.hexlify(randomBytes);
    
    console.log('🔐 Commitment:', commitment);
    
    // Test deposit amount (0.1 ETH - smallest accepted amount)
    const depositAmount = ethers.parseEther('0.1');
    
    try {
        console.log('\n📤 Sending deposit transaction...');
        console.log('Amount: 0.1 ETH');
        
        // Send deposit transaction
        const tx = await contract.deposit(commitment, {
            value: depositAmount,
            gasLimit: 100000 // Set explicit gas limit
        });
        
        console.log('Transaction hash:', tx.hash);
        console.log('⏳ Waiting for confirmation...');
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        console.log('\n✅ Deposit successful!');
        console.log('Block number:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());
        
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
        
        console.log('\n🎉 Deposit complete!');
        console.log('View on Etherscan:', `https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        // Save deposit info for reference
        const depositInfo = {
            commitment,
            amount: '0.1',
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            timestamp: new Date().toISOString(),
            contractAddress: deployment.address
        };
        
        const depositsPath = path.join(__dirname, '../test-deposits.json');
        let deposits = [];
        if (fs.existsSync(depositsPath)) {
            deposits = JSON.parse(fs.readFileSync(depositsPath, 'utf8'));
        }
        deposits.push(depositInfo);
        fs.writeFileSync(depositsPath, JSON.stringify(deposits, null, 2));
        
        console.log('\n💾 Deposit info saved to test-deposits.json');
        console.log('\nNext steps:');
        console.log('1. Check if ICP detected the deposit:');
        console.log('   dfx canister call ethereum_adapter checkDeposits');
        console.log('2. Use this commitment for withdrawal testing:', commitment);
        
    } catch (error) {
        console.error('\n❌ Deposit failed:', error.message);
        if (error.data) {
            console.error('Error data:', error.data);
        }
    }
}

// Run the test
testDeposit().catch(console.error);
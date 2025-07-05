const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const NETWORK = process.env.NETWORK || 'sepolia';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = NETWORK === 'mainnet' 
    ? (process.env.MAINNET_RPC_URL || process.env.RPC_URL)
    : (process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY');

// Network configs
const networks = {
    sepolia: {
        chainId: 11155111,
        name: 'Sepolia Testnet'
    },
    mainnet: {
        chainId: 1,
        name: 'Ethereum Mainnet'
    }
};

async function deployContract() {
    if (!PRIVATE_KEY) {
        console.error('Please set PRIVATE_KEY environment variable');
        process.exit(1);
    }

    console.log(`Deploying to ${networks[NETWORK].name}...`);

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('Deployer address:', wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('Deployer balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance === 0n) {
        console.error('Deployer has no ETH balance');
        process.exit(1);
    }

    // Read contract artifacts (you'll need to compile first)
    const contractPath = path.join(__dirname, '../contracts/build/contracts/EthereumDepositPool.sol/EthereumDepositPool.json');
    
    if (!fs.existsSync(contractPath)) {
        console.error('Contract not compiled. Run: npx hardhat compile');
        process.exit(1);
    }
    
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    
    // Deploy contract
    console.log('Deploying contract...');
    
    // ICP canister's derived Ethereum address from threshold ECDSA
    const icpCanisterAddress = '0xb012acfa53164ab5e8d302a22a22834702b1ca01';
    
    const factory = new ethers.ContractFactory(
        contractJson.abi,
        contractJson.bytecode,
        wallet
    );
    
    const contract = await factory.deploy(icpCanisterAddress);
    
    console.log('Transaction hash:', contract.deploymentTransaction().hash);
    console.log('Waiting for confirmation...');
    
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log('Contract deployed at:', contractAddress);
    
    // Save deployment info
    const deployment = {
        network: NETWORK,
        chainId: networks[NETWORK].chainId,
        address: contractAddress,
        deployedAt: new Date().toISOString(),
        deployer: wallet.address,
        icpCanister: icpCanisterAddress,
        transactionHash: contract.deploymentTransaction().hash
    };
    
    const deploymentsPath = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentsPath)) {
        fs.mkdirSync(deploymentsPath);
    }
    
    fs.writeFileSync(
        path.join(deploymentsPath, `${NETWORK}.json`),
        JSON.stringify(deployment, null, 2)
    );
    
    console.log('Deployment info saved');
    
    // Verify accepted amounts
    console.log('\nVerifying contract configuration...');
    const amounts = [0.005, 0.01, 0.1, 1, 10, 100];
    for (let i = 0; i < amounts.length; i++) {
        const acceptedAmount = await contract.acceptedAmounts(i);
        console.log(`Accepted amount ${i}: ${ethers.formatEther(acceptedAmount)} ETH`);
    }
    
    console.log('\nDeployment complete! ✅');
    console.log(`\nNext steps:
1. Update EthereumAdapter with contract address: ${contractAddress}
2. Get ICP-derived address from threshold ECDSA
3. Update contract's icpCanister address
4. Test deposits on ${networks[NETWORK].name}`);
}

// Run deployment
deployContract().catch(console.error);
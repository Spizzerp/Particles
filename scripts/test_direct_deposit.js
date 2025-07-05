const { ethers } = require('ethers');
require('dotenv').config();

async function testDirectDeposit() {
    console.log('🧪 Testing Direct Deposit to Contract');
    console.log('=====================================\n');
    
    const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const contractAddress = '0xe09A374Ac0Bc64061Ca839Cd3312e0d86E94Df51';
    const testCommitment = '0x' + '11'.repeat(32); // Test commitment
    
    console.log('Contract:', contractAddress);
    console.log('Commitment:', testCommitment);
    console.log('Amount: 0.005 ETH');
    console.log('From:', wallet.address);
    
    // Create contract instance
    const abi = ['function deposit(bytes32) payable'];
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    
    try {
        console.log('\n📤 Sending deposit transaction...');
        const tx = await contract.deposit(testCommitment, {
            value: ethers.parseEther('0.005')
        });
        
        console.log('✅ Transaction sent!');
        console.log('Hash:', tx.hash);
        console.log('View: https://etherscan.io/tx/' + tx.hash);
        
        console.log('\n⏳ Waiting for confirmation...');
        const receipt = await tx.wait();
        
        console.log('\n✅ Confirmed!');
        console.log('Block:', receipt.blockNumber);
        console.log('Status:', receipt.status === 1 ? 'Success' : 'Failed');
        
        if (receipt.logs.length > 0) {
            console.log('\n📋 Events:');
            const iface = new ethers.Interface([
                'event Deposit(bytes32 indexed commitment, uint256 amount, address indexed sender, uint256 timestamp)'
            ]);
            receipt.logs.forEach(log => {
                try {
                    const parsed = iface.parseLog(log);
                    console.log('- Deposit event:');
                    console.log('  Commitment:', parsed.args.commitment);
                    console.log('  Amount:', ethers.formatEther(parsed.args.amount), 'ETH');
                    console.log('  Sender:', parsed.args.sender);
                } catch (e) {}
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.reason || error.message);
    }
}

testDirectDeposit();
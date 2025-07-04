const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function main() {
    const depositAddress = '0x96ed43a0947c076d1fe7d5c44ccf13c333721413';
    const amount = '0.01';  // ETH

    console.log(`Sending ${amount} ETH to deposit address: ${depositAddress}`);
    
    try {
        // Send ETH to the deposit address
        await execAsync(`cd /Users/spizzerp/ParticleFund && node scripts/send_test_deposit.js ${depositAddress} ${amount}`);
        console.log('Deposit sent successfully');
        
        // Wait a bit for the transaction to be mined
        console.log('Waiting for transaction to be mined...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Now test the Rust forwarding
        console.log('Testing Rust forwarding...');
        const { stdout } = await execAsync(`dfx canister call ethereum_adapter testRustForwarding '("${depositAddress}")'`);
        console.log('Rust forwarding result:', stdout);
    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(console.error);
const { ethers } = require('ethers');

async function migrateOldDeposit() {
    console.log('🔄 Old Deposit Migration Plan');
    console.log('=============================\n');
    
    const provider = new ethers.JsonRpcProvider('https://ethereum.publicnode.com');
    
    // Known values
    const oldDepositAddress = '0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e';
    const newDepositAddress = '0xff0b5a436a03E394A08164FaEB4834Bb3C9ecd79'; // Current derivation
    const poolContract = '0x9b0721C174b103facEC1EeE435679Ae9C493163C';
    
    // Check balances
    const oldBalance = await provider.getBalance(oldDepositAddress);
    const newBalance = await provider.getBalance(newDepositAddress);
    
    console.log('💰 Current State:');
    console.log(`- Old deposit address: ${oldDepositAddress}`);
    console.log(`  Balance: ${ethers.formatEther(oldBalance)} ETH`);
    console.log(`- New deposit address: ${newDepositAddress}`);
    console.log(`  Balance: ${ethers.formatEther(newBalance)} ETH`);
    console.log(`- Pool contract: ${poolContract}`);
    
    console.log('\n📋 Migration Strategy:');
    console.log('Since we cannot sign for the old address with current code, we have two options:\n');
    
    console.log('Option 1: Manual Recovery (if you have access to the old derivation)');
    console.log('- Find the exact code/derivation that generated the old address');
    console.log('- Create a special recovery function with that logic');
    console.log('- Forward directly to pool contract\n');
    
    console.log('Option 2: Create a Migration Canister Function');
    console.log('- Add a function that tries multiple derivation methods');
    console.log('- Test different possibilities until we find the right one');
    console.log('- This is possible because threshold ECDSA is deterministic\n');
    
    console.log('Option 3: Emergency Manual Transfer');
    console.log('- If you control a wallet that can sign for old addresses');
    console.log('- Manually transfer funds to the new address or pool\n');
    
    // Calculate what we need
    const gasPrice = (await provider.getFeeData()).gasPrice;
    const gasNeeded = 21000n; // Simple transfer
    const gasCost = gasPrice * gasNeeded;
    
    console.log('💸 Transfer Requirements:');
    console.log(`- Gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    console.log(`- Gas needed: ${gasNeeded} units`);
    console.log(`- Total gas cost: ${ethers.formatEther(gasCost)} ETH`);
    console.log(`- Amount available to transfer: ${ethers.formatEther(oldBalance - gasCost)} ETH`);
}

migrateOldDeposit().catch(console.error);
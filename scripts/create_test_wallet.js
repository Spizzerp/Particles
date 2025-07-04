const { ethers } = require('ethers');

console.log('🔑 Creating a new Ethereum test wallet...\n');

// Create a random wallet
const wallet = ethers.Wallet.createRandom();

console.log('=================================');
console.log('🚨 IMPORTANT: SAVE THIS INFORMATION SECURELY!');
console.log('=================================\n');

console.log('📍 Address:', wallet.address);
console.log('🔐 Private Key:', wallet.privateKey);
console.log('🌱 Mnemonic:', wallet.mnemonic.phrase);

console.log('\n=================================');
console.log('⚠️  SECURITY REMINDERS:');
console.log('=================================');
console.log('1. This is for TESTNET use only');
console.log('2. Never share your private key');
console.log('3. Never use this wallet for mainnet');
console.log('4. Save the mnemonic phrase securely');

console.log('\n📝 Next Steps:');
console.log('1. Copy the private key (without 0x prefix) to your .env file');
console.log('2. Visit https://sepoliafaucet.com/');
console.log('3. Enter your address:', wallet.address);
console.log('4. Request test ETH');

console.log('\n🔧 Add to .env file:');
console.log(`PRIVATE_KEY=${wallet.privateKey.slice(2)}`);
console.log(`WALLET_ADDRESS=${wallet.address}`);
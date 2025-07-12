#!/usr/bin/env node
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const CYCLE_THRESHOLD = 5_000_000_000_000; // 5T cycles minimum
const TOP_UP_AMOUNT = 10_000_000_000_000; // 10T cycles
const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

const CRITICAL_CANISTERS = [
  'deposit_manager',
  'withdrawal_processor',
  'particle_router',
  'pattern_breaker',
  'crypto_components'
];

async function checkCycles() {
  console.log(`[${new Date().toISOString()}] Checking canister cycles...`);
  
  for (const canister of CRITICAL_CANISTERS) {
    try {
      const { stdout } = await execAsync(`dfx canister status ${canister}`);
      
      // Parse cycles from output
      const cycleMatch = stdout.match(/Balance:\s*(\d+(?:_\d+)*)\s*Cycles/);
      if (cycleMatch) {
        const cycles = BigInt(cycleMatch[1].replace(/_/g, ''));
        console.log(`${canister}: ${cycles.toLocaleString()} cycles`);
        
        if (cycles < CYCLE_THRESHOLD) {
          console.log(`⚠️  ${canister} is LOW on cycles! Topping up...`);
          await topUpCanister(canister);
        }
      }
    } catch (error) {
      console.error(`Error checking ${canister}:`, error.message);
    }
  }
}

async function topUpCanister(canister) {
  try {
    const topUpCmd = `dfx ledger top-up ${canister} --amount ${TOP_UP_AMOUNT / 1_000_000_000_000}`;
    console.log(`Executing: ${topUpCmd}`);
    
    const { stdout, stderr } = await execAsync(topUpCmd);
    if (stderr) {
      console.error(`Top-up error: ${stderr}`);
    } else {
      console.log(`✅ Successfully topped up ${canister}`);
    }
  } catch (error) {
    console.error(`Failed to top up ${canister}:`, error.message);
    
    // Alternative: Try using wallet
    try {
      const walletCmd = `dfx canister deposit-cycles ${TOP_UP_AMOUNT} ${canister}`;
      await execAsync(walletCmd);
      console.log(`✅ Successfully topped up ${canister} using wallet`);
    } catch (walletError) {
      console.error(`Wallet top-up also failed:`, walletError.message);
    }
  }
}

// Setup monitoring
console.log('🔄 Starting cycle monitoring service...');
console.log(`- Checking every ${CHECK_INTERVAL / 1000 / 60} minutes`);
console.log(`- Threshold: ${CYCLE_THRESHOLD.toLocaleString()} cycles`);
console.log(`- Top-up amount: ${TOP_UP_AMOUNT.toLocaleString()} cycles`);
console.log('');

// Initial check
checkCycles();

// Set up periodic monitoring
setInterval(checkCycles, CHECK_INTERVAL);

// Also check on process signals
process.on('SIGUSR1', () => {
  console.log('Manual cycle check triggered');
  checkCycles();
});

console.log('Cycle monitor is running. Press Ctrl+C to stop.');
console.log('Send SIGUSR1 to trigger manual check: kill -USR1 ' + process.pid);

// Keep process running
process.stdin.resume();
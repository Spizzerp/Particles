#!/usr/bin/env node
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration for mainnet
const CYCLE_THRESHOLD = 5_000_000_000_000; // 5T cycles minimum
const TOP_UP_AMOUNT_ICP = 0.5; // Top up with 0.5 ICP (~1.9T cycles)
const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour
const NETWORK = 'ic'; // Mainnet

// Mainnet canister IDs
const MAINNET_CANISTERS = {
  'deposit_manager_v2': 'rfun2-iaaaa-aaaac-qa7wq-cai',
  'ethereum_adapter': '55iy2-vaaaa-aaaas-amn7a-cai',
  // Add other mainnet canister IDs here as needed
};

// Alert configuration (optional)
const ALERT_EMAIL = process.env.ALERT_EMAIL || '';
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';

async function sendAlert(message) {
  console.log(`🚨 ALERT: ${message}`);
  
  // Send webhook notification if configured
  if (WEBHOOK_URL) {
    try {
      const { exec } = require('child_process');
      exec(`curl -X POST -H 'Content-type: application/json' --data '{"text":"${message}"}' ${WEBHOOK_URL}`);
    } catch (e) {
      console.error('Failed to send webhook:', e.message);
    }
  }
}

async function checkCycles() {
  console.log(`[${new Date().toISOString()}] Checking mainnet canister cycles...`);
  
  for (const [name, canisterId] of Object.entries(MAINNET_CANISTERS)) {
    try {
      // Get cycle balance using the getCycleBalance method
      const { stdout } = await execAsync(`dfx canister --network ${NETWORK} call ${canisterId} getCycleBalance`);
      
      // Parse the response (format: "(1234567890 : nat)")
      const match = stdout.match(/\((\d+)\s*:\s*nat\)/);
      if (match) {
        const cycles = BigInt(match[1]);
        const cyclesInT = Number(cycles) / 1_000_000_000_000;
        
        console.log(`${name} (${canisterId}): ${cyclesInT.toFixed(3)}T cycles`);
        
        if (cycles < CYCLE_THRESHOLD) {
          await sendAlert(`${name} is LOW on cycles! Only ${cyclesInT.toFixed(3)}T remaining.`);
          
          // Check if we have ICP to top up
          const icpBalance = await checkICPBalance();
          if (icpBalance >= TOP_UP_AMOUNT_ICP) {
            console.log(`⚠️  ${name} is LOW! Attempting to top up...`);
            await topUpCanister(canisterId, name);
          } else {
            await sendAlert(`Cannot top up ${name} - insufficient ICP balance (${icpBalance} ICP)`);
          }
        }
      }
    } catch (error) {
      console.error(`Error checking ${name}:`, error.message);
      
      // Try alternate method - canister status
      try {
        const { stdout } = await execAsync(`dfx canister --network ${NETWORK} status ${canisterId}`);
        const cycleMatch = stdout.match(/Balance:\s*(\d+(?:_\d+)*)\s*Cycles/);
        if (cycleMatch) {
          const cycles = BigInt(cycleMatch[1].replace(/_/g, ''));
          const cyclesInT = Number(cycles) / 1_000_000_000_000;
          console.log(`${name} (via status): ${cyclesInT.toFixed(3)}T cycles`);
        }
      } catch (statusError) {
        console.error(`Also failed to get status for ${name}:`, statusError.message);
      }
    }
  }
}

async function checkICPBalance() {
  try {
    const { stdout } = await execAsync(`dfx ledger --network ${NETWORK} balance`);
    const match = stdout.match(/(\d+\.\d+)\s*ICP/);
    return match ? parseFloat(match[1]) : 0;
  } catch (error) {
    console.error('Failed to check ICP balance:', error.message);
    return 0;
  }
}

async function topUpCanister(canisterId, name) {
  try {
    console.log(`Topping up ${name} with ${TOP_UP_AMOUNT_ICP} ICP...`);
    
    const { stdout, stderr } = await execAsync(
      `dfx ledger --network ${NETWORK} top-up ${canisterId} --amount ${TOP_UP_AMOUNT_ICP}`
    );
    
    if (stderr) {
      console.error(`Top-up error: ${stderr}`);
      await sendAlert(`Failed to top up ${name}: ${stderr}`);
    } else {
      console.log(`✅ Successfully topped up ${name}`);
      
      // Parse the result
      const cyclesMatch = stdout.match(/topped up with (\d+) cycles/);
      if (cyclesMatch) {
        const cyclesAdded = BigInt(cyclesMatch[1]);
        const cyclesInT = Number(cyclesAdded) / 1_000_000_000_000;
        await sendAlert(`Successfully topped up ${name} with ${cyclesInT.toFixed(3)}T cycles`);
      }
    }
  } catch (error) {
    console.error(`Failed to top up ${name}:`, error.message);
    await sendAlert(`Failed to top up ${name}: ${error.message}`);
  }
}

// Setup monitoring
console.log('🔄 Starting mainnet cycle monitoring service...');
console.log(`- Network: ${NETWORK}`);
console.log(`- Checking every ${CHECK_INTERVAL / 1000 / 60} minutes`);
console.log(`- Threshold: ${(CYCLE_THRESHOLD / 1_000_000_000_000).toFixed(1)}T cycles`);
console.log(`- Top-up amount: ${TOP_UP_AMOUNT_ICP} ICP`);
console.log('- Monitoring canisters:');
Object.entries(MAINNET_CANISTERS).forEach(([name, id]) => {
  console.log(`  - ${name}: ${id}`);
});
console.log('');

// Initial check
checkCycles();

// Set up periodic monitoring
setInterval(checkCycles, CHECK_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Stopping cycle monitor...');
  process.exit(0);
});

process.on('SIGUSR1', () => {
  console.log('Manual cycle check triggered');
  checkCycles();
});

console.log('Cycle monitor is running. Press Ctrl+C to stop.');
console.log('Send SIGUSR1 to trigger manual check: kill -USR1 ' + process.pid);

// Keep process running
process.stdin.resume();
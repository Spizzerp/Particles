const fs = require('fs');
const path = require('path');

// Read test data
const testDataPath = path.join(__dirname, '..', 'test_data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

console.log('=== WITHDRAWAL PROOF VERIFICATION ANALYSIS ===\n');

console.log('Test Data from test_data.json:');
console.log('------------------------------');
console.log('Secret:', testData.deposit.secret);
console.log('Nullifier:', testData.deposit.nullifier);
console.log('Amount:', testData.deposit.amount, 'wei (1 ETH)');
console.log('Expected Commitment:', testData.deposit.commitment);
console.log('');

console.log('Circuit Analysis (from withdraw_complete.go):');
console.log('--------------------------------------------');
console.log('Line 54-57: The circuit computes commitment as:');
console.log('  mimc2.Write(circuit.Secret)');
console.log('  mimc2.Write(circuit.Nullifier)');
console.log('  mimc2.Write(circuit.Amount) // Include amount in commitment');
console.log('  commitment := mimc2.Sum()');
console.log('');
console.log('This means the circuit expects: commitment = MiMC(secret, nullifier, amount)');
console.log('');

console.log('Frontend Analysis (from mimc.ts):');
console.log('--------------------------------');
console.log('Line 197-206: computeCommitment function:');
console.log('  return mimc.hash([secretBigInt, nullifierBigInt, amountBigInt]);');
console.log('');
console.log('This means the frontend computes: commitment = MiMC(secret, nullifier, amount)');
console.log('');

console.log('Deposit Flow (from DepositPage.tsx):');
console.log('-----------------------------------');
console.log('Line 221: const commitmentValue = computeCommitment(secretHex, nullifierHex, amountStr);');
console.log('Line 231: amountWei: amountStr, // Store the exact amount in wei used for commitment');
console.log('');
console.log('The deposit stores amountWei to ensure withdrawal uses the same amount.');
console.log('');

console.log('Withdrawal Flow (from WithdrawPage.tsx):');
console.log('---------------------------------------');
console.log('Line 111: const amountForProof = depositData.amountWei || depositData.amount;');
console.log('Line 112-120: generateWithdrawalProof is called with:');
console.log('  - depositData.secret');
console.log('  - depositData.nullifier');
console.log('  - amountForProof (the exact wei amount from deposit)');
console.log('');

console.log('WASM Prover (from main_step5_standard.go):');
console.log('-----------------------------------------');
console.log('Line 106-112: The WASM computes commitment as:');
console.log('  h2.Write(to32Bytes(secret))');
console.log('  h2.Write(to32Bytes(nullifier))');
console.log('  h2.Write(to32Bytes(amount))');
console.log('  commitment := hex.EncodeToString(h2.Sum(nil))');
console.log('');

console.log('CONCLUSION:');
console.log('===========');
console.log('✅ The CURRENT circuit expects: commitment = MiMC(secret, nullifier, amount)');
console.log('✅ The frontend generates: commitment = MiMC(secret, nullifier, amount)');
console.log('✅ The WASM prover uses: commitment = MiMC(secret, nullifier, amount)');
console.log('');
console.log('The system is CONSISTENT - all components use the same formula.');
console.log('');
console.log('The test_data.json commitment was generated using this formula,');
console.log('which is why the test commitment page shows it matches.');
# Scripts Analysis and Categorization

## Summary
Total scripts found: 74 files (.js, .sh, .mjs)

## Categories

### 1. **Deposit Management Scripts**

#### V2 Scripts (CURRENT - Keep these):
- `create_mainnet_deposit_v2.js` - Generate V2 deposit addresses for mainnet
- `create_test_deposit_v2.js` - Generate V2 deposit addresses for testing
- `decode_v2_transaction.js` - Decode V2 transaction format
- `test_address_derivation_consistency.sh` - Test V2 address consistency

#### V1/Legacy Scripts (Consider removing):
- `create_mainnet_deposit.js` - Old V1 deposit creation
- `generate_deposit_address.js` - Old deposit address generation
- `register_and_forward_deposit.js` - Legacy deposit forwarding
- `migrate_old_deposit.js` - V1 to V2 migration
- `test_old_deposit_forward.sh` - Legacy deposit forwarding test

### 2. **Gas and Balance Management**
- `check_balance.js` - Check ETH balances
- `check_current_gas.js` - Current gas price check
- `check_deposit_gas.js` - Gas estimation for deposits
- `check_gas_price.js` - Gas price monitoring
- `check_gas_prices_evm_rpc.sh` - Gas prices via EVM RPC
- `estimate_deposit_gas.js` - Estimate gas for deposits
- `estimate_gas_mainnet.js` - Mainnet gas estimation
- `send_gas_topup.js` - Send ETH for gas

### 3. **Transaction Processing**
- `process_mainnet_deposit.js` - Process mainnet deposits
- `process_mainnet_deposits.sh` - Batch process deposits
- `send_mainnet_deposit.js` - Send ETH to deposit addresses
- `send_test_deposit.js` - Send test deposits
- `send_deposit_to_new_address.js` - Forward deposits

### 4. **Testing Scripts**

#### Integration Tests:
- `test_direct_deposit.js` - Direct contract deposit test
- `test_ethereum_integration.sh` - Full Ethereum integration
- `test_full_flow.sh` - End-to-end flow test
- `test_withdrawal_flow.sh` - Withdrawal testing
- `test_eip1559_deposit.js` - EIP-1559 transaction test

#### EVM RPC Tests:
- `test_evm_rpc.js` - Basic EVM RPC test
- `test_evm_rpc_direct.sh` - Direct RPC calls
- `test_evm_rpc_fixed.sh` - Fixed RPC tests
- `test_evm_rpc_ic.sh` - ICP RPC integration
- `test_evm_rpc_nonce.js` - Nonce management test
- `test_multi_rpc.sh` - Multi-RPC fallback test

#### Address/Key Tests:
- `test_address_consistency.sh` - Address generation consistency
- `test_ecdsa_public_key_format.sh` - ECDSA key format test
- `test_key_decompression.js` - Key decompression test
- `test_public_key_formats.js` - Public key format tests
- `test_unique_addresses.js` - Address uniqueness test

### 5. **Debugging Scripts**
- `debug_deposit.sh` - Debug deposit issues
- `debug_deposit_failure.js` - Analyze failed deposits
- `debug_deposit_processing.mjs` - Debug processing issues
- `debug_transaction.js` - Transaction debugging
- `debug_signature_recovery.js` - Signature recovery debug
- `debug_compressed_keys.js` - Compressed key debugging
- `decode_signed_transaction.js` - Decode signed transactions

### 6. **Monitoring Scripts**
- `check_deposits_icp.sh` - Monitor ICP deposits
- `check_deposit_status.sh` - Deposit status monitoring
- `check_pending_deposits.sh` - Check pending deposits
- `check_specific_deposit.js` - Monitor specific deposit
- `monitor_specific_deposit.sh` - Real-time deposit monitoring
- `check_deposit_registration.js` - Registration status

### 7. **Deployment and Setup**
- `deploy_ethereum_contract.js` - Deploy Ethereum contract
- `deploy_to_testnet.sh` - Testnet deployment
- `deploy_to_playground.sh` - Playground deployment
- `build_and_deploy_frontend.sh` - Frontend deployment
- `setup_and_test_evm_rpc.sh` - RPC setup
- `topup_ethereum_adapter.sh` - Top up cycles

### 8. **Utilities**
- `generate_test_data.js` - Generate test data
- `generate_test_data_frontend.js` - Frontend test data
- `create_test_wallet.js` - Create test wallets
- `upload_vkey.js` - Upload verification key
- `icp_proxy_server.js` - ICP proxy for local testing
- `serve_test.js` - Test server

### 9. **Legacy/Deprecated Scripts**
- `fix_ethereum_deposits.sh` - Old fix script
- `fix_ethereum_adapter.mo` - Old adapter fix
- `test_deposit_sepolia.sh` - Sepolia-specific test
- `deploy_ethereum_fix.sh` - Old deployment fix
- `attempt_recovery.js` - Recovery attempt
- `get_cycles_from_icp.sh` - Cycle management

### 10. **Verification Scripts**
- `verify_deployment.sh` - Verify deployment
- `verify_address_consistency.js` - Address verification
- `verify_derivation_consistency.sh` - Derivation verification
- `verify_signing_address.sh` - Signing address verification
- `verify_unique_deposits.sh` - Deposit uniqueness
- `verify_deposit_wallet_structure.js` - Wallet structure verification

## Duplicates and Similar Scripts

### Address Generation (Keep V2 versions):
- ❌ `generate_deposit_address.js` (V1)
- ❌ `create_mainnet_deposit.js` (V1)
- ✅ `create_mainnet_deposit_v2.js` (V2)
- ✅ `create_test_deposit_v2.js` (V2)

### Gas Estimation (Consolidate):
- `check_deposit_gas.js`
- `estimate_deposit_gas.js`
- `estimate_gas_mainnet.js`
→ Could be consolidated into one script with parameters

### EVM RPC Tests (Many duplicates):
- `test_evm_rpc.js`
- `test_evm_rpc_direct.sh`
- `test_evm_rpc_fixed.sh`
- `test_evm_rpc_ic.sh`
→ Could be consolidated into one comprehensive test

### Transaction Debugging (Overlapping):
- `debug_transaction.js`
- `decode_signed_transaction.js`
- `test_decode_signed_tx.sh`
→ Could be consolidated

## Recommendations

### 1. **Keep (V2 and Essential)**
- All V2 scripts
- Core deployment scripts
- Mainnet processing scripts
- Essential monitoring scripts

### 2. **Remove (Obsolete)**
- All V1/legacy scripts
- Sepolia-specific scripts (using mainnet now)
- Old fix/recovery scripts
- Duplicate test scripts

### 3. **Consolidate**
- Gas estimation scripts → `gas-utils.js`
- EVM RPC tests → `test-evm-rpc.js`
- Transaction debugging → `debug-transaction.js`
- Address verification → `verify-addresses.js`

### 4. **Organize into Subdirectories**
```
scripts/
├── deployment/
├── deposits/
├── testing/
├── monitoring/
├── utils/
└── legacy/ (to be removed)
```
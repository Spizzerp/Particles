# Particle Fund Scripts

This directory contains all scripts for managing deposits, testing, monitoring, and debugging the Particle Fund system.

## 📁 Organization

Scripts are organized by functionality. We use V2 address derivation for all Ethereum operations.

## 🔧 Consolidated Utilities

We've consolidated common functionality into three main utility scripts:

### 1. **gas-utils.js**
Consolidated gas management functionality.

```bash
# Check current gas prices
node scripts/gas-utils.js price

# Estimate gas for deposit
node scripts/gas-utils.js estimate --amount 0.01

# Check deposit history
node scripts/gas-utils.js history --blocks 10

# Check balance
node scripts/gas-utils.js balance -a 0x123...
```

### 2. **test-evm-rpc.js**
Consolidated EVM RPC testing.

```bash
# Test basic connectivity
node scripts/test-evm-rpc.js basic mainnet

# Test nonce management
node scripts/test-evm-rpc.js nonce 0x123...

# Test multiple providers
node scripts/test-evm-rpc.js multi

# Test canister operations
node scripts/test-evm-rpc.js canister all ic
```

### 3. **debug-utils.js**
Consolidated debugging tools.

```bash
# Debug failed deposit
node scripts/debug-utils.js deposit-debug --address 0x123...

# Decode transaction
node scripts/debug-utils.js tx-decode 0x02f895...

# Debug signature recovery
node scripts/debug-utils.js sig-recovery 0x02f895...

# Debug public keys
node scripts/debug-utils.js key-debug 0x0357...
```

## 📋 Script Categories

### Deposit Management (V2)
- `create_mainnet_deposit_v2.js` - Generate V2 deposit addresses for mainnet
- `create_test_deposit_v2.js` - Generate V2 deposit addresses for testing  
- `process_mainnet_deposit.js` - Process deposits on mainnet
- `send_mainnet_deposit.js` - Send ETH to deposit addresses

### Testing
- `test_direct_deposit.js` - Test direct contract deposits
- `test_withdrawal.js` - Test withdrawal functionality
- `test_full_flow.sh` - End-to-end integration test

### Monitoring
- `check_deposits_icp.sh` - Monitor ICP deposits
- `check_pending_deposits.sh` - Check pending deposits
- `monitor_specific_deposit.sh` - Real-time deposit monitoring

### Deployment
- `deploy_ethereum_contract.js` - Deploy Ethereum pool contract
- `build_and_deploy_frontend.sh` - Deploy frontend to ICP

### Utilities
- `generate_test_data.js` - Generate test data for proofs
- `upload_vkey.js` - Upload verification key to canister
- `icp_proxy_server.js` - Local proxy for ICP development

## ⚠️ Important Notes

1. **Always use V2 scripts** for deposits - V1 scripts have been removed
2. **Mainnet by default** - Most scripts default to mainnet, use `-n sepolia` for testnet
3. **Environment variables** - Ensure `.env` file is configured with RPC URLs and private keys
4. **Gas buffer** - V2 system uses 80,000 gas limit for deposit forwarding

## 🚮 Removed Legacy Scripts

The following V1/legacy scripts have been removed:
- `create_mainnet_deposit.js` (use `create_mainnet_deposit_v2.js`)
- `generate_deposit_address.js` (use V2 versions)
- `migrate_old_deposit.js` (no longer needed)
- `register_and_forward_deposit.js` (V2 handles automatically)
- `test_old_deposit_forward.sh` (V2 system)

## 🔗 Quick Start

1. **Create a deposit address**:
   ```bash
   node scripts/create_mainnet_deposit_v2.js
   ```

2. **Send ETH to the deposit**:
   ```bash
   node scripts/send_mainnet_deposit.js
   ```

3. **Process the deposit**:
   ```bash
   node scripts/process_mainnet_deposit.js
   ```

4. **Debug if issues**:
   ```bash
   node scripts/debug-utils.js deposit-debug --address <deposit-address>
   ```

## 📝 Environment Setup

Create a `.env` file with:
```env
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_private_key_for_testing
```

---
*Last Updated: January 2025*
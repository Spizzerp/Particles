# EVM RPC Test Suite

This consolidated test script combines all EVM RPC testing functionality into a single Node.js script.

## Installation

Make sure you have the required dependencies:
```bash
npm install @dfinity/agent ethers
```

## Usage

```bash
node scripts/test-evm-rpc.js <command> [options]
```

## Commands

### Basic RPC Testing
Test basic RPC connectivity through ICP:
```bash
node scripts/test-evm-rpc.js basic [network]
# network: mainnet, sepolia, local (default: mainnet)

# Examples:
node scripts/test-evm-rpc.js basic sepolia
node scripts/test-evm-rpc.js basic mainnet
```

### Nonce Management
Test nonce management for an Ethereum address:
```bash
node scripts/test-evm-rpc.js nonce [address]

# Example:
node scripts/test-evm-rpc.js nonce 0x742d35Cc6634C0532925a3b844Bc9e7595f7F1eD
```

### Multi-RPC Testing
Test multiple RPC providers (reads from .env file):
```bash
node scripts/test-evm-rpc.js multi
```

### Canister Operations
Test canister operations:
```bash
node scripts/test-evm-rpc.js canister [operation] [network]
# operation: all, contract, pool, deposits, withdrawal
# network: local, ic (default: local)

# Examples:
node scripts/test-evm-rpc.js canister all local
node scripts/test-evm-rpc.js canister withdrawal ic
```

### Direct RPC Call
Test direct RPC call to EVM RPC canister:
```bash
node scripts/test-evm-rpc.js direct
```

### Run All Tests
Run all available tests:
```bash
node scripts/test-evm-rpc.js all
```

## Environment Variables

The script reads from your `.env` file for RPC provider configuration:

- `VITE_ALCHEMY_API_KEY` - Alchemy API key
- `VITE_ANKR_API_KEY` - Ankr API key
- `VITE_ANKR_RPC_URL` - Ankr RPC URL
- `VITE_INFURA_PROJECT_ID` - Infura project ID
- `VITE_PUBLIC_RPC_1` - Public RPC endpoint 1
- `VITE_PUBLIC_RPC_2` - Public RPC endpoint 2

## Features Consolidated

This script combines functionality from:
- `test_evm_rpc.js` - Basic RPC connectivity testing
- `test_evm_rpc_nonce.js` - Nonce management testing
- `test_multi_rpc.sh` - Multiple RPC provider testing
- `test_evm_rpc_direct.sh` - Direct RPC call testing
- `test_evm_rpc_fixed.sh` - Local canister operations
- `test_evm_rpc_ic.sh` - IC mainnet canister operations

## Output

The script provides colored output with emojis for easy reading:
- ✅ Success indicators
- ❌ Error indicators
- 🔍 Test in progress
- 📊 Data display
- ⚠️ Warnings

## Error Handling

The script includes proper error handling and will display meaningful error messages if:
- RPC providers are not configured
- Network connectivity issues occur
- Canister calls fail
- Invalid addresses are provided
# Debug Utils - Consolidated Debugging Tool

A comprehensive debugging utility for Particle Fund that combines multiple debugging scripts into a single, powerful command-line tool.

## Installation

First, install the required dependencies:

```bash
npm install
```

## Usage

The debug utility provides several commands to help debug various aspects of the system:

### 1. Transaction Analysis (`tx-analyze`)

Analyze unsigned transaction parameters and understand what needs to be signed:

```bash
node scripts/debug-utils.js tx-analyze \
  --to 0xd72114Ae0a3E80B921Ca26aB522F9Fa656a6c2e1 \
  --value 0.001 \
  --nonce 0 \
  --gas-price 1 \
  --gas-limit 21000 \
  --chain-id 11155111
```

Options:
- `-t, --to <address>`: Target address (default: pool contract)
- `-v, --value <eth>`: Value in ETH (default: 0.001)
- `-n, --nonce <number>`: Transaction nonce (default: 0)
- `-g, --gas-price <gwei>`: Gas price in gwei (default: 1)
- `-l, --gas-limit <number>`: Gas limit (default: 21000)
- `-c, --chain-id <number>`: Chain ID (default: 11155111 for Sepolia)

### 2. Decode Signed Transaction (`tx-decode`)

Decode and analyze a signed transaction hex string:

```bash
node scripts/debug-utils.js tx-decode 0x02f89501... \
  --expected 0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e
```

Options:
- `<signedTx>`: The signed transaction hex string (required)
- `-e, --expected <address>`: Expected from address for comparison

### 3. Signature Recovery Debug (`sig-recovery`)

Debug signature recovery issues:

```bash
node scripts/debug-utils.js sig-recovery \
  --tx 0x02f89501... \
  --expected 0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e
```

Options:
- `-t, --tx <signedTx>`: Signed transaction to analyze
- `-e, --expected <address>`: Expected recovery address
- `-m, --message <hex>`: Message that was signed
- `-s, --signature <hex>`: Signature to verify

### 4. Public Key Debug (`key-debug`)

Debug compressed/uncompressed public key issues and address derivation:

```bash
node scripts/debug-utils.js key-debug 035783e1a6acd15000a6dbacf91b5da33a7e0755714b6329764dd12f04b37f4982 \
  --expected 0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e
```

Options:
- `<publicKey>`: The public key (compressed or uncompressed)
- `-e, --expected <address>`: Expected Ethereum address

### 5. Deposit Debug (`deposit-debug`)

Debug failed deposit transactions with comprehensive network analysis:

```bash
node scripts/debug-utils.js deposit-debug \
  --address 0x48f3cecedb8b4c6518bf78c201acddf31067d2d4 \
  --pool 0xd72114Ae0a3E80B921Ca26aB522F9Fa656a6c2e1 \
  --network sepolia \
  --value 0.01
```

Options:
- `-a, --address <address>`: Deposit address to check
- `-p, --pool <address>`: Pool contract address
- `-n, --network <name>`: Network name (mainnet/sepolia)
- `-v, --value <eth>`: Deposit amount in ETH

### 6. Full Debug (`full-debug`)

Run all debug checks for a transaction:

```bash
node scripts/debug-utils.js full-debug \
  --tx 0x02f89501... \
  --network sepolia
```

Options:
- `-t, --tx <signedTx>`: Signed transaction hex (required)
- `-n, --network <name>`: Network name

## Examples

### Debug a failed deposit transaction
```bash
# First, check the deposit address status
node scripts/debug-utils.js deposit-debug \
  --address 0x48f3cecedb8b4c6518bf78c201acddf31067d2d4 \
  --network sepolia

# Then decode the failed transaction
node scripts/debug-utils.js tx-decode 0x02f89501...

# Check signature recovery
node scripts/debug-utils.js sig-recovery --tx 0x02f89501...
```

### Debug public key to address conversion
```bash
# Check if a compressed public key generates the expected address
node scripts/debug-utils.js key-debug \
  035783e1a6acd15000a6dbacf91b5da33a7e0755714b6329764dd12f04b37f4982 \
  --expected 0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e
```

### Full transaction analysis
```bash
# Run comprehensive debug on a transaction
node scripts/debug-utils.js full-debug \
  --tx 0x02f89501808404bddec984a84fdd3982c350949b0721c174b103facec1eee435679ae9c493163c872386f26fc10000a4b214faa5... \
  --network sepolia
```

## Common Issues Detected

1. **Wrong Signer Address**: Transaction signed by different address than expected
2. **Insufficient Funds**: Address doesn't have enough ETH for transaction + gas
3. **Incorrect Nonce**: Transaction nonce doesn't match account state
4. **Key Format Issues**: Compressed vs uncompressed public key problems
5. **Gas Price Issues**: Gas prices too low or too high for network
6. **Contract Issues**: No contract at target address or minimum deposit not met

## Environment Variables

The tool uses the following environment variables from `.env`:
- `MAINNET_RPC_URL`: Ethereum mainnet RPC URL
- `SEPOLIA_RPC_URL`: Sepolia testnet RPC URL

If not set, it uses public RPC endpoints as fallbacks.
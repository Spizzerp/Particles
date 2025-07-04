# Ethereum Chain Fusion Deployment Guide

## 🎉 Deployment Status

### Sepolia Testnet Deployment (Active)
- **Contract Address**: `0x8626502727D7faf282C44df18B34E50D0DB45Eae` (Updated with 0.01 ETH support)
- **Deployment TX**: `0xa97a20659d98abac9b4ce8a2a364c79e8b17f79ecaf59267def00627d775456e`
- **Previous Contract**: `0x9b0721C174b103facEC1EeE435679Ae9C493163C`
- **Network**: Sepolia Testnet
- **Status**: ✅ Live and connected to ICP
- **[View on Etherscan](https://sepolia.etherscan.io/address/0x9b0721C174b103facEC1EeE435679Ae9C493163C)**

### ICP Integration Status
- **Ethereum Adapter Canister**: `ajuq4-ruaaa-aaaaa-qaaga-cai` (local)
- **Pool Address**: `0x9d5c305e489fbdefeda09ce674b03a3205bd4aa3`
- **Contract Connection**: ✅ Configured

## Prerequisites

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Get Sepolia testnet ETH**:
   - Visit: https://sepoliafaucet.com/
   - Request test ETH for your deployment wallet

3. **Get an RPC endpoint**:
   - Infura: https://infura.io/ (free tier available)
   - Alchemy: https://www.alchemy.com/ (free tier available)
   - Or use any other Ethereum RPC provider

## Deployment Steps

### 1. Configure Environment

Create a `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add:
```
NETWORK=sepolia
PRIVATE_KEY=your_wallet_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

### 2. Deploy Ethereum Contract

```bash
# Compile the contract (already done)
npx hardhat compile

# Deploy to Sepolia
node scripts/deploy_ethereum_contract.js
```

This will:
- Deploy the EthereumDepositPool contract
- Save deployment info to `deployments/sepolia.json`
- Display the contract address

### 3. Deploy ICP Canisters

```bash
# Start local replica
dfx start --background

# Deploy the Ethereum adapter
dfx deploy ethereum_adapter

# Get the pool address from ICP
dfx canister call ethereum_adapter getPoolAddress
```

### 4. Update Contract Configuration

After deployment, update the Ethereum adapter with the contract address:

```bash
# Set the deposit contract address
dfx canister call ethereum_adapter setDepositContract '("0xYOUR_CONTRACT_ADDRESS")'
```

### 5. Update Frontend Configuration

The deployment script creates `deployments/sepolia.json`. Use this to update your frontend:

```javascript
// deployments/sepolia.json
{
  "network": "sepolia",
  "chainId": 11155111,
  "address": "0x...",
  "deployedAt": "2024-...",
  "deployer": "0x...",
  "icpCanister": "0x...",
  "transactionHash": "0x..."
}
```

## Testing the Integration

### 1. Test Deposit Detection

```bash
# Run the integration test
./scripts/test_ethereum_integration.sh
```

### 2. Make a Test Deposit

Using MetaMask or any wallet:
1. Connect to Sepolia network
2. Send one of the accepted amounts (0.1, 1, 10, or 100 ETH) to the contract
3. Include a commitment hash in the transaction data

### 3. Check Deposits on ICP

```bash
# Check for new deposits
dfx canister call ethereum_adapter checkDeposits
```

## Production Deployment

For mainnet deployment:

1. Update `.env`:
   ```
   NETWORK=mainnet
   MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
   ```

2. Ensure you have real ETH for deployment

3. Use mainnet key configuration:
   ```motoko
   // In EthereumAdapter.mo
   private let ECDSA_KEY_NAME : Text = "key_1"; // mainnet key
   ```

4. Deploy with extra caution - mainnet deployments are irreversible!

## Monitoring

Once deployed, monitor your contract:
- Etherscan: https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS
- Check deposit events
- Monitor ICP canister logs

## Troubleshooting

### "Insufficient funds"
- Ensure your wallet has enough Sepolia ETH
- Check gas prices on the network

### "Contract not compiled"
```bash
npx hardhat compile
```

### "RPC error"
- Verify your RPC URL is correct
- Check if you've exceeded rate limits
- Try a different RPC provider

### "ECDSA key not found"
- For local testing, ensure you're using `test_key_1`
- For mainnet, use `key_1` and ensure proper access
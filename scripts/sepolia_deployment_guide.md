# Sepolia Testnet Deployment Guide

## Prerequisites

1. **Get Sepolia ETH**:
   - Use a faucet: https://sepolia.dev/
   - Alternative faucets:
     - https://faucet.chainstack.com/sepolia-faucet
     - https://www.alchemy.com/faucets/ethereum-sepolia
     - https://cloud.google.com/application/web3/faucet/ethereum/sepolia

2. **Set up environment variables**:
   Create or update your `.env` file with:
   ```bash
   NETWORK=sepolia
   PRIVATE_KEY=your_test_wallet_private_key_here
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   ```

   Or use public RPC:
   ```bash
   SEPOLIA_RPC_URL=https://rpc.sepolia.org
   ```

## Deployment Steps

1. **Deploy the pool contract**:
   ```bash
   cd /Users/spizzerp/ParticleFund
   node scripts/deploy_ethereum_contract.js
   ```

2. **Save the contract address** from the output

3. **Update EthereumAdapter** with the new contract address:
   ```motoko
   private stable var depositContractAddress : Text = "YOUR_SEPOLIA_CONTRACT_ADDRESS";
   ```

4. **Deploy the updated adapter**:
   ```bash
   dfx deploy ethereum_adapter --network ic
   ```

## Testing the Full Flow

### 1. Make a Test Deposit

1. Go to: https://ilp5a-2aaaa-aaaad-qhmna-cai.icp0.io/
2. Select Ethereum → ETH → 0.005 ETH (minimum amount)
3. Send Sepolia ETH to the generated address
4. Click "I've Made the Deposit"
5. Save the deposit note when complete

### 2. Test Withdrawal

1. Go to the Withdraw page
2. Paste your deposit note
3. Enter a recipient address (your Sepolia wallet)
4. Generate the PLONK proof
5. Submit the withdrawal
6. Verify funds arrive at recipient address

## Monitoring

- Sepolia Explorer: https://sepolia.etherscan.io/
- Contract Events: Check the pool contract for Deposit/Withdrawal events
- ICP Logs: `dfx canister logs ethereum_adapter --network ic`

## Current Status

- ICP Canister Address: `0xb012acfa53164ab5e8d302a22a22834702b1ca01`
- Network: Sepolia (chainId: 11155111)
- Current Contract: Not yet deployed

## Troubleshooting

1. **"Insufficient balance" error**:
   - Ensure you sent enough ETH to cover gas costs
   - Gas estimate shows in the deposit UI

2. **Transaction stuck**:
   - Check transaction on Sepolia explorer
   - Use recovery mechanism if page was refreshed

3. **Withdrawal fails**:
   - Ensure deposit was completed
   - Check nullifier hasn't been used
   - Verify PLONK proof generation

## Next Steps After Testing

Once withdrawal works on Sepolia:
1. Document the exact withdrawal process
2. Prepare mainnet recovery plan
3. Consider adding admin functions for emergency recovery
4. Test with multiple deposits/withdrawals
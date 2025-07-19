# Emergency Fund Recovery Options

## Current Situation
- Pool Contract: `0x9b0721C174b103facEC1EeE435679Ae9C493163C`
- ICP Canister Address (authorized): `0xb012acfa53164ab5e8d302a22a22834702b1ca01`
- Funds are locked in the pool contract
- Only the ICP canister can withdraw funds

## Recovery Options

### Option 1: Update Smart Contract (Requires New Deployment)
Since the smart contract only allows the ICP canister to withdraw, and there's no owner/admin function, you would need to:
1. Deploy a new version of the contract with admin recovery functions
2. Migrate all deposits to the new contract
3. This is complex and requires all users to migrate

### Option 2: Use ICP Canister Recovery Functions
The canister already has recovery functions for stuck deposits:

```bash
# Check the ICP canister's actual Ethereum address
dfx canister --network ic call ethereum_adapter getICPCanisterEthAddress

# If funds are in temporary deposit addresses, recover them:
dfx canister --network ic call ethereum_adapter recoverStuckFunds '("STUCK_ADDRESS", "YOUR_WALLET_ADDRESS")'

# Force process a stuck deposit:
dfx canister --network ic call ethereum_adapter forceProcessStuckDeposit '("DEPOSIT_ADDRESS")'
```

### Option 3: Switch to Testnet First (Recommended)
Before attempting recovery:

1. **Update the contract address to Sepolia testnet:**
   ```motoko
   // In EthereumAdapter.mo
   private stable var depositContractAddress : Text = "0xTESTNET_CONTRACT_ADDRESS";
   ```

2. **Update chain ID and RPC endpoints:**
   ```motoko
   chainId = 11155111; // Sepolia
   ```

3. **Test the full withdrawal flow on testnet**

4. **Once confirmed working, implement proper admin controls**

### Option 4: Direct Contract Interaction (If you control the ICP canister key)
If the ICP canister's derived address matches what's in the contract, you can:

1. Create a withdrawal transaction from the ICP canister
2. Call `processWithdrawal` on the pool contract
3. This requires the nullifier hash, recipient, and amount

## Immediate Actions

1. **Verify addresses:**
   ```bash
   # Check pool contract balance on Etherscan
   # https://etherscan.io/address/0x9b0721C174b103facEC1EeE435679Ae9C493163C
   
   # Verify ICP canister's Ethereum address
   dfx canister --network ic call ethereum_adapter getICPCanisterEthAddress
   ```

2. **Check if any funds are in temporary deposit addresses:**
   ```bash
   dfx canister --network ic call ethereum_adapter getDepositInfo '("0xDEPOSIT_ADDRESS")'
   ```

3. **Switch to testnet to prevent further mainnet deposits**

## Security Considerations
- The recovery functions lack admin authentication
- Anyone can currently call recovery functions
- Implement proper access controls before mainnet use
- Consider a multi-sig approach for admin functions

## Next Steps
1. Verify current fund locations
2. Test recovery on a small amount first
3. Implement proper admin controls
4. Switch to testnet for development
5. Add emergency withdrawal functions to the smart contract for future deployments
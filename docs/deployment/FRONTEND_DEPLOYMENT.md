# Frontend Deployment Guide

## Overview

The Particle Fund frontend is a React application that connects to ICP canisters for privacy-preserving cross-chain deposits and withdrawals.

## What's Been Updated

### 1. Removed Mock Implementations ✅
- **actorFactory.ts**: Now connects to real canisters instead of mocks
- Proper error handling when canister IDs are missing
- Added support for Ethereum Adapter and Crypto Components

### 2. Updated Canister IDs ✅
- Corrected all canister IDs in `config.ts`
- Added Ethereum Adapter ID for mainnet deployment

### 3. Real Data Integration ✅
- **DepositPage**: 
  - Generates real Ethereum addresses via Chain Fusion
  - Creates cryptographic commitments using sha256
  - Stores deposits on-chain
  
- **WithdrawPage**:
  - Fetches real Merkle proofs from Crypto Components
  - Integrates with PLONK proof verification
  - Executes withdrawals through Ethereum Adapter

### 4. Frontend Structure
```
src/frontend/
├── App.tsx              # Main app component
├── pages/
│   ├── DepositPage.tsx  # Handles deposits
│   ├── WithdrawPage.tsx # Handles withdrawals
│   └── PoolsPage.tsx    # Shows pool statistics
├── services/
│   ├── actorFactory.ts  # Creates canister actors
│   ├── config.ts        # Canister IDs and network config
│   └── zkProofService.ts # ZK proof generation
└── contexts/
    └── AuthContext.tsx  # Authentication management
```

## Deployment Steps

### 1. Local Deployment
```bash
# Start local replica
dfx start --clean

# Deploy frontend
./scripts/build_and_deploy_frontend.sh

# Access at http://localhost:8000/?canisterId=<frontend-id>
```

### 2. Mainnet Deployment
```bash
# Deploy to IC mainnet
./scripts/build_and_deploy_frontend.sh ic

# Access at https://<frontend-id>.icp0.io
```

## Environment Variables

The frontend uses these environment variables (optional):
- `VITE_IC_HOST`: IC network host (default: http://localhost:8000)
- `VITE_IC_NETWORK`: Network type (local/ic)
- `VITE_DEPOSIT_MANAGER_CANISTER_ID`: Override canister IDs
- etc.

## Next Steps

### 1. Client-Side PLONK Proof Generation
Currently using placeholder proofs. Need to integrate real PLONK prover:
- Use WASM prover from `/public/wasm/`
- Generate witness data from deposit commitments
- Create valid PLONK proofs for withdrawal

### 2. Authentication Enhancement
- Re-enable NFID IdentityKit integration
- Support multiple wallet providers
- Make authentication optional for privacy

### 3. UI Improvements
- Add loading states for blockchain operations
- Show transaction status and confirmations
- Improve error messages and user feedback

### 4. Multi-Chain Support
- Add Bitcoin address generation
- Support Solana through Chain Fusion
- Show chain-specific deposit instructions

## Testing the Flow

1. **Make a Deposit**:
   - Connect wallet (optional)
   - Select Ethereum as chain
   - Get unique deposit address
   - Save the commitment JSON

2. **Check Deposits**:
   ```bash
   dfx canister call ethereum_adapter_fixed checkDeposits --network ic
   ```

3. **Make a Withdrawal**:
   - Paste saved commitment JSON
   - Enter recipient address
   - Submit (will fail without valid PLONK proof)

## Security Considerations

- Never expose private keys or secrets
- Commitments should be stored securely by users
- All cryptographic operations happen client-side
- No user data is stored on-chain except commitments

## Troubleshooting

### "Canister ID not configured"
- Ensure all canisters are deployed
- Check canister IDs in config.ts match deployment

### "Failed to create actor"
- Verify network connectivity
- Check if canisters are running
- Ensure correct network (local vs mainnet)

### Build Errors
- Run `npm install` to install dependencies
- Check Node.js version (16+ required)
- Clear cache with `rm -rf node_modules dist`
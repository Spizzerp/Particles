# PLONK Frontend Integration

## Overview

The frontend now includes a complete PLONK proof generation system that allows users to create zero-knowledge proofs for withdrawals directly in their browser.

## Architecture

### 1. PLONK Prover Service (`plonkProverService.ts`)
- Loads the production WASM file (20MB)
- Initializes Go runtime environment
- Provides async proof generation API
- Handles message passing between WASM and JavaScript

### 2. Updated Withdrawal Flow
```typescript
// 1. User enters their deposit data (saved from deposit)
const depositData = {
  depositId: "0",
  commitment: "0x...",
  secret: "0x...",
  nullifier: "0x...",
  amount: "1000000000000000000",
  token: "ETH",
  chain: "1"
};

// 2. Frontend fetches Merkle proof from canister
const merkleProof = await cryptoComponents.getMerkleProof(leafIndex);

// 3. Generate PLONK proof (takes ~5 seconds)
const proof = await generateWithdrawalProof(
  depositData,
  recipientAddress,
  merkleRoot,
  merkleProof,
  leafIndex
);

// 4. Submit to withdrawal processor
const result = await withdrawalProcessor.initiateWithdrawal(...);
```

### 3. WASM Files Used
- `/public/wasm/particlefund_production_real.wasm` - Full PLONK prover (25,969 constraints)
- `/public/wasm/wasm_exec.js` - Go runtime for browser

## How It Works

1. **On Page Load**: PLONK prover initializes in background
2. **During Deposit**: User saves encrypted deposit data locally
3. **During Withdrawal**: 
   - User pastes their deposit data
   - Frontend generates witness data
   - PLONK prover creates proof
   - Proof is verified on-chain

## Security Considerations

- All cryptographic operations happen client-side
- Private keys (secret, nullifier) never leave the browser
- Only the proof and public inputs are sent to the blockchain
- Deposit data should be encrypted before local storage

## Testing

To test the integration:

1. Make a deposit and save the returned JSON
2. Wait for deposit to be included in Merkle tree
3. Initiate withdrawal with saved data
4. PLONK proof will be generated automatically
5. Withdrawal executes on successful verification

## Performance

- WASM loading: ~2-3 seconds (20MB file)
- Proof generation: ~5 seconds
- Total withdrawal time: ~10-15 seconds

## Next Steps

1. Add client-side encryption for deposit data
2. Implement QR code generation for easy backup
3. Add progress indicators during proof generation
4. Support hardware wallet integration
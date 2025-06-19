# Particle Funds - Development Guide

## Project Overview
Cross-chain privacy pool application on Internet Computer Protocol (ICP) with zero-knowledge proofs and pattern breaking algorithms.

## Important Commands

### Local Development
```bash
# Start local ICP replica
dfx start --clean

# Deploy canisters
dfx deploy

# Deploy specific canister
dfx deploy deposit_manager

# Check canister status
dfx canister status --all

# Start frontend dev server
npm run dev

# Build project
npm run build
```

### Canister IDs (Local)
- deposit_manager: bd3sg-teaaa-aaaaa-qaaba-cai
- withdrawal_processor: b77ix-eeaaa-aaaaa-qaada-cai
- particle_router: br5f7-7uaaa-aaaaa-qaaca-cai
- pattern_breaker: bw4dl-smaaa-aaaaa-qaacq-cai
- crypto_components: bkyz2-fmaaa-aaaaa-qaaaq-cai

## Key Implementation Areas

### 1. Internet Identity Integration
- Replace mock auth with NFID IdentityKit
- Support multiple wallet providers
- Persistent session management

### 2. Chain Fusion Integration
- Bitcoin: Direct network integration with threshold ECDSA
- Ethereum: HTTPS outcalls to RPC providers
- Cross-chain deposits and withdrawals
- No bridges required

### 3. Privacy Features
- PLONK zero-knowledge proof system
- Full on-chain cryptographic verification
- Merkle tree commitments with Poseidon hash
- Nullifier tracking for double-spend prevention

## ZK Proof Architecture: PLONK

### Full Verification with PLONK
We're using PLONK for complete cryptographic verification on ICP:

1. **Full Security**: Complete on-chain proof verification
2. **No Trust Assumptions**: Fully decentralized
3. **Universal Setup**: No per-circuit trusted ceremony
4. **Production Ready**: Using plonk_verifier_on_icp

### Implementation
- **Circuit**: Written in Go using gnark framework
- **Client-side**: PLONK proof generation (~5 seconds)
- **Canister-side**: Full cryptographic verification via PLONK verifier
- **Cost**: ~$0.08 per withdrawal for maximum security

See `circuits/ZK_ARCHITECTURE.md` for full technical details.

## Next Steps
1. Implement Internet Identity authentication
2. Create Chain Fusion adapters for Bitcoin/Ethereum
3. Update UI for multi-chain support
4. Test cross-chain transactions on testnets

## Resources
- [ICP Chain Fusion Docs](https://internetcomputer.org/chainfusion)
- [Internet Identity Integration](https://internetcomputer.org/docs/current/developer-docs/identity/internet-identity/integrate-internet-identity)
- [NFID IdentityKit](https://www.npmjs.com/package/@nfid/identitykit)
- [Threshold ECDSA](https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa/)
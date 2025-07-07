# Particle Fund - Privacy-Preserving Cross-Chain Protocol on ICP

## 🚀 Project Overview

Particle Fund is a privacy pool application built on the Internet Computer Protocol (ICP) that enables private transactions using zero-knowledge proofs. Currently supporting Ethereum with plans for Bitcoin and Solana integration.

### ✅ What's Working
- **Zero-Knowledge Privacy**: PLONK proof system with on-chain verification
- **Ethereum Mainnet**: Deployed and tested with real ETH (0xe09A374Ac0Bc64061Ca839Cd3312e0d86E94Df51)
- **No Bridges Required**: Direct integration using ICP's threshold ECDSA
- **Fully Decentralized**: All verification happens on-chain

### 🚧 What's Planned (Not Yet Implemented)
- **Multi-Chain Support**: Bitcoin and Solana integration via Chain Fusion
- **Pattern Breaking**: Advanced particle system for enhanced privacy
- **Multi-Hop Routing**: Funds broken into particles across multiple addresses

## 🏗️ Current Implementation Status

### ✅ Fully Working Components

1. **PLONK Zero-Knowledge Proof System** ✨
   - Browser-based proof generation (~5 seconds)
   - On-chain verification using plonk_verifier_on_icp
   - 25,969 constraint production circuit
   - Successfully verified withdrawal #13 on ICP mainnet
   - Double-spend prevention via nullifier tracking

2. **Ethereum Integration**
   - Mainnet contract deployed: `0xe09A374Ac0Bc64061Ca839Cd3312e0d86E94Df51`
   - V2 deposit system with consistent address derivation
   - Successful deposits/withdrawals with real ETH (0.005 ETH minimum)
   - Gas optimization (80k limit for deposit forwarding)

3. **ICP Infrastructure**
   - Deposit Manager: Tracks deposits and commitments
   - Withdrawal Processor: Verifies PLONK proofs
   - Ethereum Adapter: Handles cross-chain transactions
   - Frontend canister: React app deployed on ICP

### ⚠️ Partially Implemented

1. **Pattern Breaking System**
   - Pattern detection exists but no active obfuscation
   - No particle splitting or multi-hop routing
   - Basic privacy pool only (deposit → pool → withdrawal)

### ❌ Not Yet Implemented

1. **Multi-Chain Support**
   - Bitcoin integration (only stubs exist)
   - Solana integration (documentation only)
   
2. **Advanced Privacy Features**
   - Particle system (breaking funds into smaller amounts)
   - Multi-address distribution
   - Time-delayed routing
   - Cross-chain mixing

### 📊 Technical Stack
- **Backend**: Motoko (ICP smart contracts)
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **ZK Proofs**: PLONK (via gnark framework)
- **Cryptography**: BN254 curve, MiMC hash, Merkle trees
- **Cross-Chain**: ICP Chain Fusion, threshold ECDSA

## 🎉 Key Technical Achievement: PLONK ZK Proofs

### Production Circuit Details
- **Constraints**: 25,969 (full production circuit)
- **WASM Size**: 21MB (includes proving key)
- **Proof Generation**: ~5 seconds in browser
- **Verification Cost**: ~$0.08 per withdrawal on ICP
- **Security Level**: 128-bit with BN254 curve

### How It Works
1. **Deposit**: User generates secret/nullifier, computes commitment, deposits ETH
2. **Merkle Tree**: Commitment added to 20-level tree (supports 1M deposits)
3. **Withdrawal**: User generates PLONK proof in browser
4. **Verification**: ICP verifies proof on-chain, executes withdrawal

## 📈 Development Timeline
- **June 20-27, 2024**: Built entire ZK system in 7 days
- **June 26**: Successfully verified first PLONK proof (Withdrawal #13)
- **January 5, 2025**: Deployed to Ethereum mainnet with real ETH

## 🎯 Roadmap

### Phase 1: Improve Current System ✅
- [x] PLONK proof generation and verification
- [x] Ethereum mainnet deployment
- [x] Basic privacy pool functionality

### Phase 2: Multi-Chain Support (In Progress)
- [ ] Bitcoin integration via threshold ECDSA
- [ ] Solana integration via threshold Ed25519
- [ ] Cross-chain deposits and withdrawals

### Phase 3: Advanced Privacy Features (Planned)
- [ ] Particle system - break deposits into smaller amounts
- [ ] Multi-hop routing through multiple addresses
- [ ] Time-delayed transactions
- [ ] Active pattern obfuscation

### Phase 4: Production Enhancements
- [ ] Remove authentication for full privacy
- [ ] Gas optimization and batching
- [ ] Monitoring and analytics dashboard
- [ ] Security audit

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- DFX (Internet Computer SDK)
- Go 1.19+ (for circuit development)
- Python 3 (for local testing server)

### Local Development
```bash
# Install dependencies
npm install

# Start local ICP replica
dfx start --clean

# Deploy canisters
dfx deploy

# Start frontend
npm run dev

# Test ZK proofs (in gnark-prover-tinygo directory)
python3 -m http.server 8889
# Open: http://localhost:8889/examples/particlefund/step1_test_working.html
```

### Canister IDs
#### Mainnet (ICP)
- Ethereum Adapter: `55iy2-vaaaa-aaaas-amn7a-cai`
- Deposit Manager: `hhveh-piaaa-aaaaj-a2dga-cai`
- Withdrawal Processor: `hauct-cqaaa-aaaaj-a2dgq-cai`
- Frontend: `ilp5a-2aaaa-aaaad-qhmna-cai`

#### Ethereum Mainnet
- Pool Contract: `0xe09A374Ac0Bc64061Ca839Cd3312e0d86E94Df51`

## 📚 Documentation

For comprehensive documentation, see the [docs/INDEX.md](docs/INDEX.md) file which includes:
- Architecture documentation
- Implementation guides
- Security analysis
- Deployment procedures
- Current status reports

## 🤝 Contributing

Key areas for contribution:
1. **Multi-chain Integration**: Implement Bitcoin/Solana adapters
2. **Privacy Enhancements**: Build the particle system
3. **Security**: Audit and improve current implementation
4. **UI/UX**: Improve user experience
5. **Documentation**: Keep docs up-to-date

## 🔒 Security

- Current security rating: 8.5/10 (see [Security Analysis](docs/security/SECURITY_ANALYSIS.md))
- PLONK proofs provide 128-bit security
- All verification happens on-chain
- No trusted setup required (universal ceremony)

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ on the Internet Computer Protocol
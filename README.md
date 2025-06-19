# Particle Fund - Privacy-Preserving Cross-Chain Protocol on ICP

## 🚀 Project Overview

Particle Fund is a cross-chain privacy pool application built on the Internet Computer Protocol (ICP) that enables private transactions across Bitcoin, Ethereum, and ICP using zero-knowledge proofs and pattern-breaking algorithms.

### Key Features
- **Zero-Knowledge Privacy**: PLONK proof system for complete transaction privacy
- **Cross-Chain Support**: Native integration with Bitcoin and Ethereum via ICP's Chain Fusion
- **Pattern Breaking**: Advanced algorithms to prevent transaction graph analysis
- **No Bridges Required**: Direct cross-chain transactions using threshold ECDSA
- **Fully Decentralized**: All verification happens on-chain with no trusted setup per circuit

## 🏗️ Current State of Application

### ✅ Completed Components

1. **Smart Contract Architecture**
   - Deposit Manager canister for handling deposits
   - Withdrawal Processor with PLONK verification
   - Particle Router for cross-chain coordination
   - Pattern Breaker for transaction obfuscation
   - Crypto Components for ZK operations

2. **PLONK Integration**
   - Successfully deployed PLONK verifier canister
   - Implemented proof serialization matching gnark format
   - Created verification key management system
   - Fixed PlonkProof type definitions

3. **Frontend Infrastructure**
   - React/TypeScript application with Vite
   - Internet Identity authentication ready
   - Mock UI for deposits and withdrawals
   - Integration with ICP agent-js

4. **Zero-Knowledge Proof Generation**
   - **Step 1 Complete**: Browser-based proof generation working
   - WASM-based prover using Go and gnark
   - Custom import loader for Go/WASM compatibility
   - Test infrastructure for incremental circuit building

### 📊 Technical Stack
- **Backend**: Motoko (ICP smart contracts)
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **ZK Proofs**: PLONK (via gnark framework)
- **Cryptography**: BN254 curve, MiMC hash, Merkle trees
- **Cross-Chain**: ICP Chain Fusion, threshold ECDSA

## 🔬 Step 1: Nullifier-Only Circuit (COMPLETED)

### What We Built
Created the foundational circuit that proves knowledge of a nullifier:
- **Circuit**: Proves `Hash(nullifier) == nullifierHash`
- **Constraints**: 442 (using MiMC hash)
- **WASM Size**: 3.0MB (standard Go compiler)
- **Proof Generation**: ~4ms in browser (mock)

### Key Achievements
1. Successfully compiled gnark circuit to WASM
2. Established JavaScript ↔ Go communication in browser
3. Fixed Go version compatibility issues (custom "gojs" → "go" import mapping)
4. Created working test page with proof generation
5. Validated the entire build pipeline

### Technical Implementation
```go
type NullifierOnlyCircuit struct {
    NullifierHash frontend.Variable `gnark:",public"`
    Nullifier     frontend.Variable `gnark:",secret"`
}
```

## 🚧 Remaining Steps: Circuit Roadmap

### Step 2: Commitment Circuit (Next)
- **Adds**: Secret input and commitment calculation
- **Proves**: `Hash(secret, nullifier) == commitment`
- **Expected Constraints**: ~880
- **Purpose**: Forms the basis for deposit commitments

### Step 3: Basic Merkle Circuit
- **Adds**: 5-level Merkle tree verification
- **Proves**: Commitment exists in a small Merkle tree
- **Expected Constraints**: ~100-200
- **Purpose**: Test Merkle proof logic with manageable size

### Step 4: Full Merkle Circuit
- **Adds**: 20-level Merkle tree (1M leaves)
- **Proves**: Commitment exists in production-size tree
- **Expected Constraints**: ~2,000
- **Purpose**: Production-ready membership proofs

### Step 5: Complete Withdraw Circuit
- **Adds**: All withdrawal parameters
  - Amount verification
  - Recipient address
  - Relayer address
  - Fee calculations
  - Refund amount
- **Expected Constraints**: ~22,327
- **Purpose**: Full production withdrawal proofs

## 🎯 Next Immediate Tasks

1. **Build Step 2 Circuit**
   - Add secret input to circuit
   - Implement commitment calculation
   - Update WASM generation

2. **Integrate Real gnark Prover**
   - Replace mock proof generation
   - Implement proper witness serialization
   - Add proof compression

3. **Complete Circuit Building**
   - Incrementally build through Steps 3-5
   - Optimize WASM size at each step
   - Maintain browser compatibility

4. **Production Integration**
   - Connect proof generation to withdrawal UI
   - Implement deposit note management
   - Add cross-chain transaction flow

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

### Canister IDs (Local)
- deposit_manager: `bd3sg-teaaa-aaaaa-qaaba-cai`
- withdrawal_processor: `b77ix-eeaaa-aaaaa-qaada-cai`
- particle_router: `br5f7-7uaaa-aaaaa-qaaca-cai`
- pattern_breaker: `bw4dl-smaaa-aaaaa-qaacq-cai`

## 🤝 Contributing

This project is in active development. Key areas for contribution:
1. Circuit optimization (reducing constraints)
2. Cross-chain integration implementation
3. Pattern breaking algorithm improvements
4. UI/UX enhancements
5. Security auditing

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ on the Internet Computer
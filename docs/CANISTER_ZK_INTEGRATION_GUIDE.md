# Canister ZK Integration Guide

## Overview
This guide outlines the steps to integrate our completed gnark ZK circuits with the ICP canisters for the Particle Fund privacy pool.

## Current State Summary

### ✅ Completed
- **ZK Circuits**: All 5 steps complete with production-ready constraints
  - Step 1: Nullifier-only (442 constraints)
  - Step 2: Commitment circuit (992 constraints)
  - Step 3: Basic Merkle (4,547 constraints)
  - Step 4: Full Merkle (14,447 constraints)
  - Step 5: Complete withdrawal (17,577 constraints)
- **WASM Modules**: Built for browser-based proof generation (mock proofs currently)
- **Canister Architecture**: Well-structured with proper type definitions

### 🔧 Needs Integration
- Hash function mismatch (simple hash vs MiMC/Poseidon)
- Mock proof generation needs real gnark integration
- Merkle tree needs to match 20-level circuit design
- Cross-canister communication for deposits

## Integration Tasks

### Phase 1: Core Cryptographic Updates

#### 1.1 Update Hash Functions in CryptoComponents.mo
**Priority**: High  
**Files**: `src/canisters/CryptoComponents.mo`

- [ ] Replace simple multiplicative hash with Poseidon/MiMC
- [ ] Match exact hash function used in gnark circuits
- [ ] Update commitment generation: `hash(secret, nullifier, amount)`
- [ ] Update nullifier generation: `hash(nullifier)`
- [ ] Ensure consistent 32-byte field element handling

**Implementation Notes**:
```motoko
// Current (incorrect):
private func hash(data: Text) : async Text {
    // Simple multiplicative hash
}

// Should be:
private func poseidonHash(inputs: [Blob]) : async Blob {
    // Poseidon hash matching gnark
}
```

#### 1.2 Fix Merkle Tree Implementation
**Priority**: High  
**Files**: `src/canisters/CryptoComponents.mo`

- [ ] Ensure 20-level tree depth (matching circuit)
- [ ] Implement sparse tree optimization
- [ ] Fix sibling hash ordering in path generation
- [ ] Add batch insertion support
- [ ] Optimize storage for 1M+ leaves

**Key Changes**:
- Tree depth: exactly 20 levels
- Leaf capacity: 1,048,576 (2^20)
- Path generation must match circuit's bit extraction logic

### Phase 2: WASM Proof Generation

#### 2.1 Complete gnark WASM Integration
**Priority**: Critical  
**Files**: `gnark-prover-tinygo/wasm/particlefund/main_step5_standard.go`

- [ ] Replace mock proof generation with real gnark prover
- [ ] Load actual proving keys (step5.pkey)
- [ ] Implement proper witness generation
- [ ] Add proof compression for ICP compatibility
- [ ] Handle errors gracefully

**Current Issue**:
```go
// TODO: Real proof generation with gnark
mockProof := fmt.Sprintf("0x1234_step5_withdraw_%d", time.Now().Unix())
```

#### 2.2 Verification Key Management
**Priority**: High  
**Files**: `src/canisters/WithdrawalProcessor.mo`

- [ ] Load verification key from step5.vkey
- [ ] Store vkey in canister or use init parameter
- [ ] Ensure proper key format for plonk_verifier_on_icp

### Phase 3: Canister Integration

#### 3.1 Update DepositManager
**Priority**: High  
**Files**: `src/canisters/DepositManager.mo`

- [ ] Call CryptoComponents.addLeaf after deposit
- [ ] Return leaf index to depositor
- [ ] Generate and return Merkle path
- [ ] Emit deposit event with commitment

**Flow**:
1. User deposits with commitment
2. Add commitment to Merkle tree
3. Return: `{ leafIndex, merkleRoot, merklePath }`

#### 3.2 Update WithdrawalProcessor
**Priority**: Medium  
**Files**: `src/canisters/WithdrawalProcessor.mo`

- [ ] Ensure PlonkProof format matches gnark output
- [ ] Add amount validation
- [ ] Verify relayer fee logic
- [ ] Update nullifier storage

**Already Good**:
- PLONK verification integration
- Nullifier checking
- State management

### Phase 4: Testing & Deployment

#### 4.1 Local Testing Setup
- [ ] Deploy all canisters locally
- [ ] Create test deposit flow
- [ ] Generate real ZK proof
- [ ] Submit withdrawal
- [ ] Verify funds transfer

#### 4.2 Integration Tests
- [ ] Test full deposit → withdraw cycle
- [ ] Test double-spend prevention
- [ ] Test relayer withdrawals
- [ ] Test self-withdrawals
- [ ] Benchmark proof generation time

### Phase 5: Chain Fusion Integration

#### 5.1 Bitcoin Integration
**Files**: `src/canisters/adapters/BitcoinAdapter.mo`
- [ ] Implement threshold ECDSA
- [ ] Add UTXO management
- [ ] Handle confirmations

#### 5.2 Ethereum Integration  
**Files**: `src/canisters/adapters/EthereumAdapter.mo`
- [ ] Implement HTTPS outcalls
- [ ] Add event monitoring
- [ ] Handle gas estimation

## Technical Specifications

### Hash Function (MiMC/Poseidon)
- Field: BN254 scalar field
- Security: 128-bit
- Inputs: Variable length (2-3 for our use cases)
- Output: 32-byte field element

### Merkle Tree
- Depth: 20 levels
- Capacity: 1,048,576 leaves
- Hash: Poseidon 2-to-1
- Storage: Sparse tree optimization

### Proof Format
```typescript
interface PlonkProof {
    // Compressed proof points
    proof: Uint8Array; // ~416 bytes
    // Public inputs
    publicSignals: string[]; // [merkleRoot, nullifierHash, recipient, relayer, fee, amount]
}
```

## Development Workflow

1. **Start with hash function update** (breaks everything else)
2. **Fix Merkle tree to use new hash**
3. **Update WASM for real proofs**
4. **Test locally with dfx**
5. **Deploy to testnet**

## Common Issues & Solutions

### Issue: Hash mismatch between circuit and canister
**Solution**: Use exact same Poseidon parameters as gnark-crypto

### Issue: Proof verification fails
**Solution**: Check verification key loading and format

### Issue: Merkle path incorrect
**Solution**: Verify bit extraction logic matches circuit

### Issue: Gas limits in ICP
**Solution**: Optimize proof verification, consider batching

## Resources

- [gnark Documentation](https://docs.gnark.consensys.net/)
- [ICP Chain Fusion](https://internetcomputer.org/chainfusion)
- [PLONK Verifier on ICP](https://github.com/dmailofficial/plonk_verifier_on_icp)
- [Internet Identity Integration](https://internetcomputer.org/docs/current/developer-docs/identity/internet-identity/integrate-internet-identity)

## Next Immediate Steps

1. Create Poseidon hash implementation for Motoko
2. Update CryptoComponents.mo with new hash
3. Test Merkle tree generation
4. Complete WASM proof generation
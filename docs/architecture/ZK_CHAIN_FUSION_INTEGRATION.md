# ZK Circuits + Chain Fusion Integration

## Overview

This document explains how Particle Fund's zero-knowledge proof circuits integrate with Internet Computer's Chain Fusion technology to enable private, cross-chain transactions without bridges.

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Bitcoin   │     │  Ethereum   │     │     ICP     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                    │
       └───────────────────┴────────────────────┘
                           │
                    ┌──────▼──────┐
                    │Chain Fusion │
                    │  (No Bridge) │
                    └──────┬──────┘
                           │
                ┌──────────▼──────────┐
                │   Privacy Pool      │
                │  (Merkle Tree)      │
                │ ┌─────────────────┐ │
                │ │ ZK Proof System │ │
                │ │    (PLONK)      │ │
                │ └─────────────────┘ │
                └─────────────────────┘
```

## 1. Deposit Flow (Multi-Chain → ICP)

### Bitcoin Deposits
```
User sends BTC → ICP receives via threshold ECDSA → Add commitment to tree
```
- ICP directly controls Bitcoin addresses using threshold ECDSA
- No wrapped tokens or bridges required
- User generates `commitment = hash(secret, nullifier)` client-side
- DepositManager canister adds commitment to Merkle tree

### Ethereum Deposits
```
User sends ETH → Smart contract → ICP monitors via HTTPS outcalls → Add commitment
```
- ICP monitors Ethereum smart contract events
- Uses HTTPS outcalls to Ethereum RPC providers
- Detects deposits and adds commitments to the same tree

### Key Points
- All deposits mix in ONE universal privacy pool
- Chain origin is forgotten once in the pool
- Commitments are chain-agnostic

## 2. Privacy Pool Structure

### Merkle Tree Design
```
                    Root
                   /    \
                  /      \
                 /        \
           Hash(0,1)    Hash(2,3)
           /      \      /      \
      Hash(0)  Hash(1) Hash(2) Hash(3)
         |        |       |       |
    Commit 0  Commit 1 Commit 2 Commit 3

Where: Commit = hash(secret, nullifier)
```

### Pool Properties
- **Capacity**: Up to 1 million deposits (20-level tree)
- **Mixing**: All chains share the same anonymity set
- **Privacy**: Cannot determine which deposit corresponds to which withdrawal

## 3. Withdrawal Flow (ICP → Multi-Chain)

### The ZK Proof Process

1. **User generates proof** (client-side):
   ```javascript
   proof = generateProof({
     // Public inputs
     merkleRoot: currentRoot,
     nullifierHash: hash(nullifier),
     recipient: "0x1234...", // or Bitcoin address
     amount: 100000000, // in smallest unit
     
     // Private inputs (never revealed)
     secret: "user's secret",
     nullifier: "user's nullifier",
     merkleProof: [hash1, hash2, ...], // path to root
     leafIndex: 42
   })
   ```

2. **ICP verifies proof** (on-chain):
   ```rust
   // WithdrawalProcessor canister
   pub fn withdraw(proof: PLONKProof, public_signals: Vec<String>) -> Result<(), Error> {
     // Verify the PLONK proof
     let is_valid = plonk_verifier.verify(proof, public_signals)?;
     
     // Check nullifier hasn't been used
     if nullifiers.contains(&nullifier_hash) {
       return Err("Already withdrawn");
     }
     
     // Process withdrawal via Chain Fusion
     match recipient_chain {
       Chain::Bitcoin => withdraw_btc_via_ecdsa(recipient, amount),
       Chain::Ethereum => withdraw_eth_via_outcalls(recipient, amount),
     }
   }
   ```

### Bitcoin Withdrawals
- ICP creates Bitcoin transaction using threshold ECDSA
- Signs and broadcasts directly to Bitcoin network
- No intermediaries or bridges

### Ethereum Withdrawals
- ICP calls Ethereum smart contract via HTTPS outcalls
- Smart contract releases funds to recipient
- Transaction finality tracked via outcalls

## 4. Complete User Journey Example

### Cross-Chain Privacy Swap

1. **Alice deposits 0.1 BTC**
   ```
   - Generates: commitment = hash(secret_alice, nullifier_alice)
   - Sends BTC to ICP-controlled address
   - Commitment added to position 42 in Merkle tree
   ```

2. **Bob deposits 100 USDC on Ethereum**
   ```
   - Generates: commitment = hash(secret_bob, nullifier_bob)
   - Sends USDC to Ethereum smart contract
   - ICP detects via HTTPS outcalls
   - Commitment added to position 97 in same tree
   ```

3. **Alice withdraws to Ethereum**
   ```
   - Generates ZK proof proving:
     * She knows (secret_alice, nullifier_alice)
     * Her commitment is at position 42
     * She hasn't withdrawn before
   - ICP verifies proof
   - Chain Fusion sends ETH to Alice's address
   ```

4. **Bob withdraws to Bitcoin**
   ```
   - Similar proof generation
   - ICP sends BTC using threshold ECDSA
   ```

Result: Alice swapped BTC→ETH and Bob swapped USDC→BTC privately!

## 5. Technical Integration Details

### Circuit Requirements

The ZK circuit must prove:
1. **Commitment validity**: `hash(secret, nullifier) = commitment`
2. **Merkle inclusion**: Commitment exists in the tree at claimed position
3. **Nullifier uniqueness**: `hash(nullifier) = nullifierHash` (prevents double-spend)
4. **Amount consistency**: Withdrawal amount matches deposit

### Chain Fusion Integration Points

1. **ChainFusionManager Canister**:
   - Monitors deposits across chains
   - Executes withdrawals
   - Manages cross-chain state

2. **Deposit Detection**:
   - Bitcoin: Check UTXO set via threshold ECDSA
   - Ethereum: Query smart contract events via HTTPS outcalls

3. **Withdrawal Execution**:
   - Bitcoin: Create, sign, and broadcast transactions
   - Ethereum: Call smart contract functions via outcalls

### Performance Metrics

- **Proof Generation**: ~1-2 minutes (client-side)
- **Proof Verification**: ~200ms (on ICP)
- **Deposit Detection**: 
  - Bitcoin: ~10 minutes (1 confirmation)
  - Ethereum: ~15 seconds (1 block)
- **Withdrawal Execution**:
  - Bitcoin: ~10-60 minutes
  - Ethereum: ~15 seconds

## 6. Security Considerations

### ZK Circuit Security
- **PLONK**: Universal trusted setup (no circuit-specific ceremony)
- **Soundness**: Cryptographically impossible to create false proofs
- **Privacy**: Zero-knowledge property ensures no information leakage

### Chain Fusion Security
- **Threshold ECDSA**: Requires consensus among subnet nodes
- **HTTPS Outcalls**: Multiple nodes must agree on external data
- **No Bridge Risk**: ICP directly controls assets

### Additional Protections
- Nullifier set prevents double-spending
- Time delays for large withdrawals
- Pattern breaker algorithms prevent analysis

## 7. Implementation Roadmap

### Phase 1: Core ZK System (Current)
- ✅ Step 1: Nullifier circuit
- ✅ Step 2: Commitment circuit
- 🚧 Step 3: Basic Merkle proof
- ⏳ Step 4: Full Merkle proof
- ⏳ Step 5: Complete withdrawal circuit

### Phase 2: Chain Fusion Integration
- ⏳ Bitcoin integration via threshold ECDSA
- ⏳ Ethereum integration via HTTPS outcalls
- ⏳ Cross-chain testing on testnets

### Phase 3: Production Deployment
- ⏳ Security audits
- ⏳ Mainnet deployment
- ⏳ Multi-chain support expansion

## Conclusion

The combination of ZK proofs and Chain Fusion enables:
- **True Privacy**: Cryptographic guarantees via zero-knowledge proofs
- **No Bridges**: Direct chain integration reduces risk
- **Universal Fungibility**: All deposits mix regardless of source chain
- **Cross-chain Swaps**: Deposit on one chain, withdraw on another

This architecture represents a significant advancement in cross-chain privacy technology, leveraging ICP's unique capabilities to create a truly decentralized, private, multi-chain system.
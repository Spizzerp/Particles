# Implementation Plan: Canister ZK Integration

## Immediate Priority: Hash Function Update

### Step 1: Research Poseidon Implementation for Motoko
**Estimated Time**: 2-4 hours
**Complexity**: High

Since Motoko doesn't have a native Poseidon implementation, we have several options:

#### Option A: Port Poseidon to Motoko (Recommended)
```motoko
// Create new file: src/crypto/Poseidon.mo
module {
    // Poseidon constants for BN254
    private let ROUND_CONSTANTS : [[Nat]] = [...];
    private let MDS_MATRIX : [[Nat]] = [...];
    
    public func hash2(left: Blob, right: Blob) : Blob {
        // Implementation
    };
}
```

#### Option B: Use External Canister
- Deploy a Rust canister with Poseidon
- Call it from Motoko canisters
- Pros: Easier, more efficient
- Cons: Extra inter-canister calls

#### Option C: Simplified MiMC
- Implement MiMC (simpler than Poseidon)
- Must match gnark's MiMC exactly
- Fewer rounds than Poseidon

### Step 2: Update Commitment Generation
**Files to modify**:
- `src/canisters/CryptoComponents.mo`

```motoko
// Old:
public func generateCommitment(secret: Text, nullifier: Text, amount: Nat) : async Result.Result<Types.CommitmentHash, Text> {
    let data = secret # nullifier # Nat.toText(amount);
    let commitment = await hash(data);
    #ok(commitment)
};

// New:
public func generateCommitment(secret: Blob, nullifier: Blob, amount: Nat) : async Result.Result<Types.CommitmentHash, Text> {
    // Convert amount to 32-byte blob
    let amountBlob = natTo32Bytes(amount);
    
    // Hash(secret, nullifier, amount)
    let commitment = await poseidonHash3(secret, nullifier, amountBlob);
    #ok(blobToHex(commitment))
};
```

### Step 3: Fix Merkle Tree
**Critical Changes**:
1. Fixed 20-level depth
2. Proper sibling ordering
3. Sparse tree optimization

```motoko
// Updated Merkle tree structure
private let TREE_DEPTH : Nat = 20;
private let MAX_LEAVES : Nat = 1_048_576; // 2^20

private var leafNodes : Map.HashMap<Nat, Blob> = Map.HashMap(100, Nat.equal, Hash.hash);
private var nodes : Map.HashMap<(Nat, Nat), Blob> = Map.HashMap(1000, pairEqual, pairHash);
```

### Step 4: Complete WASM Proof Generation

**Current State**: Mock proofs
**Needed**: Real gnark integration

Key tasks:
1. Load proving key properly
2. Create witness from inputs
3. Generate actual PLONK proof
4. Serialize for ICP

### Step 5: Testing Flow

```bash
# 1. Deploy locally
dfx start --clean
dfx deploy

# 2. Make test deposit
dfx canister call deposit_manager deposit '(
    1000000000000000000,
    "ETH",
    1,
    "0x2e2a04a682d8bde3d7b49b52e69ab847974f1a8e72986aed197cf923ac9fb80e"
)'

# 3. Generate proof (frontend)
# Use WASM module with real proof generation

# 4. Submit withdrawal
dfx canister call withdrawal_processor processWithdrawal '(
    record {
        nullifier = "0x1c40adadec88e4f79650d1e0c908a92bf687083f8c4fbcefb8dd78d2b88d73e8";
        recipient = "0x1234567890123456789012345678901234567890";
        relayer = "0x0000000000000000000000000000000000000000";
        fee = 0;
        amount = 1000000000000000000;
        proof = ...
    }
)'
```

## Development Checklist

### Week 1: Cryptographic Foundation
- [ ] Day 1-2: Implement Poseidon/MiMC in Motoko
- [ ] Day 3: Update all hash functions in CryptoComponents
- [ ] Day 4: Fix Merkle tree implementation
- [ ] Day 5: Test hash compatibility with gnark

### Week 2: Proof Integration
- [ ] Day 1-2: Complete WASM proof generation
- [ ] Day 3: Test proof generation in browser
- [ ] Day 4: Update canister interfaces
- [ ] Day 5: End-to-end testing

### Week 3: Chain Integration
- [ ] Day 1-2: Bitcoin adapter
- [ ] Day 3-4: Ethereum adapter
- [ ] Day 5: Multi-chain testing

## Risk Mitigation

### Risk: Poseidon too complex for Motoko
**Mitigation**: Use external Rust canister

### Risk: Proof generation too slow
**Mitigation**: Optimize witness generation, consider proof caching

### Risk: Storage limits for Merkle tree
**Mitigation**: Implement sparse tree, consider off-chain storage

### Risk: Hash function mismatch
**Mitigation**: Extensive unit tests comparing with gnark output

## Success Criteria

1. **Hash Compatibility**: Motoko hash output matches gnark exactly
2. **Proof Generation**: < 5 seconds in browser
3. **Verification**: 100% success rate with valid proofs
4. **Gas Usage**: Within ICP canister limits
5. **Security**: No double-spends possible

## Next Immediate Action

Start with Poseidon/MiMC implementation research:
1. Check if any Motoko crypto libraries exist
2. Study gnark's MiMC implementation
3. Create simplified version for Motoko
4. Test compatibility
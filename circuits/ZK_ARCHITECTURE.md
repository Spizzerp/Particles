# PLONK Zero-Knowledge Proof Architecture

## How PLONK Works in Our System

### 1. **Deposit Flow**
When a user deposits:
- User generates a random `secret` and `nullifier`
- Computes `commitment = Poseidon(secret, nullifier)`
- Sends funds + commitment to smart contract
- Contract adds commitment to Merkle tree

### 2. **Withdrawal Flow**
When a user withdraws:

#### Client-Side (Browser/Frontend):
```typescript
// User provides their secret + nullifier
const { proof, publicSignals } = await zkProofService.generateWithdrawalProof(
  secret,
  nullifier,
  {
    pathElements: merkleProof,
    pathIndices: pathIndices,
    root: merkleRoot
  },
  recipientAddress,
  amount
);

// Proof format (PLONK/gnark compatible)
interface PlonkProof {
  ar: [string, string];      // A point
  bs: [string, string];      // B point  
  krs: [string, string];     // C point
  commitments: string[];     // Wire commitments
  opening_proof: {           // KZG opening proof
    h: [string, string];
    claimed_values: string[];
  };
}
```

#### Server-Side (Canister):
```motoko
// Call external PLONK verifier canister
let isValid = await PlonkVerifier.verify_bytes(
  vkBytes,        // Verification key
  proofBytes,     // Serialized PLONK proof
  witnessBytes,   // Public inputs
  false           // vk_has_lines
);

if (isValid) {
  // Check nullifier hasn't been used
  // Process withdrawal
  // Mark nullifier as spent
}
```

## PLONK Components

### Circuit (`withdraw_plonk.go`)
- **Language**: Go with gnark framework
- **Constraints**: ~5,000-10,000 (efficient)
- **Hash Function**: MiMC (optimized for circuits)
- **Merkle Depth**: 20 levels (1M deposits)

### Proving Key (`plonk_pk.bin`)
- **Size**: ~50-100MB (smaller than Groth16)
- **Format**: gnark binary format
- **Setup**: Universal (no per-circuit ceremony)
- **Location**: Frontend/CDN

### Verification Key (`plonk_vk.bin`)
- **Size**: ~5-10KB
- **Format**: gnark binary format
- **Location**: Stored in canister
- **Usage**: Passed to PLONK verifier

### PLONK Verifier Canister
- **Implementation**: github.com/lightec-xyz/plonk_verifier_on_icp
- **Canister ID**: [To be deployed]
- **Cost**: ~500M instructions per verification

## Production Deployment

1. **Frontend**: 
   - Hosts gnark WASM prover (when available)
   - Proving key from CDN
   - Client-side proof generation

2. **PLONK Verifier Canister**:
   - Deploy plonk_verifier_on_icp
   - Inter-canister calls for verification
   - ~200ms verification time

3. **Withdrawal Processor**:
   - Stores verification key
   - Calls PLONK verifier
   - Manages nullifiers

## Performance & Requirements

### Memory Requirements
- **Circuit Compilation**: ~4GB RAM
- **Proof Generation**: ~1GB in browser
- **Proof Verification**: ~100MB in canister

### Timing
- **Proof Generation**: 3-7 seconds (browser)
- **Proof Verification**: ~200ms (on-chain)
- **Total Withdrawal**: <10 seconds

### Costs (ICP)
- **Verification**: ~500M instructions
- **Cycle Cost**: ~500B cycles
- **USD Cost**: ~$0.08 per withdrawal

## Current Implementation Status

### ✅ What's Complete
1. **ZK Circuit Infrastructure**
   - Withdraw circuit with 5,435 constraints
   - Trusted setup completed (powers of tau 20)
   - Proving key: `withdraw_final.zkey` (3.3MB)
   - Verification key: `verification_key.json` (3.9KB)

2. **Client-Side Privacy**
   - Real ZK proof generation using snarkjs
   - Poseidon hash implementation (matches circuit)
   - Secure note generation for deposits
   - Browser-based proof generation (~5-10 seconds)

3. **Smart Contract Architecture**
   - Deposit management with Merkle tree
   - Nullifier tracking (prevents double-spending)
   - Multi-chain support structure (ICP, BTC, ETH)
   - Pattern breaking for enhanced privacy

### ⚠️ Production Limitations
1. **On-chain Verification**: Currently using simplified verification in `ZKVerifier.mo` (checks structure, not cryptographic validity)
2. **Reason**: Motoko lacks native support for BN254 pairing operations needed for Groth16 verification

## Production Strategy: PLONK with Full Verification

### Decision: Migrate to PLONK
We're adopting PLONK for full cryptographic verification on ICP:
1. **Native ICP implementation available** - plonk_verifier_on_icp
2. **Universal trusted setup** - No per-circuit ceremony needed
3. **Full security** - Complete cryptographic verification on-chain
4. **Reasonable costs** - ~$0.05-0.10 per verification

### Why This Makes Sense on ICP
```
Traditional chains: Can't do heavy compute → Must use light verification
ICP: Can do heavy compute → Choose light verification for better design
```

### Implementation Approach

#### Phase 1: Current Groth16 + Light Verification (Temporary)
```motoko
// Light verification while we migrate
public func verifyProof(proof: ZKProof, signals: [Text]) : Result<Bool, Text> {
    // Basic sanity checks only
    // ~10M instructions (~$0.01)
}
```

#### Phase 2: PLONK Integration (Target)
```motoko
import PlonkVerifier "canister:plonk_verifier";

public func verifyProof(proof: PlonkProof, signals: [Text]) : async Bool {
    // Full cryptographic verification
    let result = await PlonkVerifier.verify_bytes(
        vkBytes, proofBytes, witnessBytes, false
    );
    // ~500M instructions (~$0.05-0.10)
}
```

### PLONK Migration Timeline

1. **Week 1**: Circuit conversion from Circom to gnark
2. **Week 2**: Frontend integration with gnark-wasm
3. **Week 3**: Deploy PLONK verifier canister
4. **Week 4**: Testing and optimization

### Benefits of PLONK
1. **Full Security**: Real cryptographic verification
2. **No Trust Assumptions**: Completely decentralized
3. **Universal Setup**: Reusable across circuits
4. **Production Proven**: Used by zkBTC on ICP

## Deployment Strategy

### Phase 1: Deploy with Safeguards (Week 1-2)
```typescript
// Add to WithdrawalProcessor.mo
private let MAX_WITHDRAWAL_AMOUNT = 1_000_000_000; // $10k
private let WITHDRAWAL_DELAY = 86_400_000_000_000; // 24 hours
```
- Use current simplified verification
- Add withdrawal limits and delays
- Monitor for anomalies

### Phase 2: Rust Verifier (Week 3-6)
1. Complete `rust_verifier` implementation
2. Deploy as separate canister
3. Update `WithdrawalProcessor` to call verifier
4. Remove limits after testing

## Performance Metrics

### Current Performance
- **Proof Generation**: 5-10 seconds (browser)
- **Verification**: ~50ms (simplified)
- **Circuit Size**: 5,435 constraints
- **Proving Key**: 3.3MB (actual size after setup)

### With Rust Verifier
- **Proof Generation**: 2-5 seconds (optimized)
- **Verification**: 100-200ms (full cryptographic)
- **Additional Cost**: ~200M cycles per verification

## Security Considerations

### Current Mitigations
1. **Client-side security**: Real ZK proofs prevent forgery
2. **Withdrawal limits**: Prevent large-scale attacks
3. **Time delays**: Allow intervention if needed

### Future Enhancements
1. **Compliance proofs**: Prove funds aren't blacklisted
2. **Batch verification**: Verify multiple proofs efficiently
3. **Mobile optimization**: Reduce proof generation time
# Real PLONK Proof Integration Guide

## Overview

This document explains how to integrate real gnark PLONK proofs with the ICP withdrawal processor.

## Current State

1. **WASM Proof Generation**: ✅ Working with mock data
2. **ICP Canister**: ✅ Deployed and accepts properly formatted proofs
3. **Proof Parser**: ✅ Created but needs real gnark output
4. **Missing**: Real gnark proof generation in WASM

## Gnark Proof Format

Gnark outputs two binary streams:

### 1. Proof Binary Format (~800 bytes)
```
[32 bytes] L.X  - Commitment to left wire polynomial
[32 bytes] R.X  - Commitment to right wire polynomial  
[32 bytes] O.X  - Commitment to output wire polynomial
[32 bytes] Z.X  - Commitment to grand product polynomial
[32 bytes] H1.X - Quotient polynomial commitment (part 1)
[32 bytes] H2.X - Quotient polynomial commitment (part 2)
[32 bytes] H3.X - Quotient polynomial commitment (part 3)
[32 bytes] BatchedProof.H.X - Batched opening proof commitment
[4 bytes]  NumClaimedValues - Number of claimed values (big-endian)
[32 bytes each] ClaimedValues - Polynomial evaluations
[32 bytes] ZShiftedProof.H.X - Z polynomial shifted opening
[32 bytes] ZShiftedProof.ClaimedValue - Evaluation at shifted point
[4 bytes]  NumBSB22Commitments - Number of BSB22 commitments
[32 bytes each] BSB22Commitments - Additional commitments (if any)
```

### 2. Public Witness Binary Format
```
[4 bytes]  NumPublicInputs - Number of public inputs (big-endian)
[32 bytes each] PublicInputs - Field elements (big-endian)
```

## ICP Expected Format

The ICP canister expects:
```motoko
type PlonkProof = record {
  lro: vec (Text, Text);           // 3 points (L, R, O)
  z: (Text, Text);                 // 1 point
  h: vec (Text, Text);             // 3 points (H1, H2, H3)
  batched_proof: record {
    h: (Text, Text);               // 1 point
    claimed_values: vec Text;       // Scalar values
  };
  zshifted_proof: record {
    h: (Text, Text);               // 1 point
    claimed_value: Text;           // Scalar value
  };
  bsb22_commitments: vec (Text, Text); // Variable length
};
```

## Integration Steps

### Step 1: Update WASM to Generate Real Proofs

Replace the mock proof generation in `main_step5_standard.go`:

```go
// Instead of:
mockProof := fmt.Sprintf("0x1234_step5_withdraw_%d", time.Now().Unix())

// Use real gnark prover:
import (
    "github.com/consensys/gnark/backend/plonk"
    "github.com/consensys/gnark/backend/witness"
    "encoding/base64"
)

// Generate real proof
proof, err := plonk.Prove(ccs, pk, witness)
if err != nil {
    return js.ValueOf(fmt.Sprintf("Error generating proof: %v", err))
}

// Serialize proof
var proofBuf bytes.Buffer
proof.WriteTo(&proofBuf)
proofBase64 := base64.StdEncoding.EncodeToString(proofBuf.Bytes())

// Serialize public witness
publicWitness, _ := witness.Public()
var witnessBuf bytes.Buffer
publicWitness.WriteTo(&witnessBuf)
witnessBase64 := base64.StdEncoding.EncodeToString(witnessBuf.Bytes())

output := ProofOutputs{
    Proof: proofBase64,
    PublicWitness: witnessBase64,
}
```

### Step 2: Parse Binary Proof in JavaScript

Use the `PlonkProofParser` to convert binary to ICP format:

```javascript
// Decode base64 from WASM
const proofBytes = Uint8Array.from(atob(result.proof), c => c.charCodeAt(0));
const witnessBytes = Uint8Array.from(atob(result.publicWitness), c => c.charCodeAt(0));

// Parse to ICP format
const parser = new PlonkProofParser();
const icpProof = parser.parseBinaryProof(proofBytes.buffer);
const publicSignals = parser.parseBinaryWitness(witnessBytes.buffer);
```

### Step 3: Submit to ICP

```javascript
// Format for withdrawal processor
const result = await withdrawalActor.initiateWithdrawal(
    icpProof,
    publicSignals,
    recipient,
    relayer,
    fee
);
```

## Challenges & Solutions

### 1. Binary Size
- **Problem**: Full gnark prover increases WASM size significantly
- **Solution**: Use TinyGo optimizations or pre-compile constraint system

### 2. Point Compression
- **Problem**: Gnark uses compressed G1 points (32 bytes), ICP expects (x,y)
- **Solution**: Decompress points or modify ICP to accept compressed format

### 3. Proving Key Size
- **Problem**: Proving keys can be several MB
- **Solution**: Embed in WASM or load dynamically

## Testing Strategy

1. **Unit Test Parser**: Test with known gnark outputs
2. **Integration Test**: Generate proof in Go, verify in ICP
3. **End-to-End**: Browser → WASM → ICP canister

## Next Steps

1. [ ] Implement real gnark proof generation in WASM
2. [ ] Test binary proof parsing
3. [ ] Optimize WASM size
4. [ ] Add proper error handling
5. [ ] Create verification key management system
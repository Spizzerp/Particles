# Deposit Commitment Creation Analysis - Particle Fund

## Summary

The Particle Fund codebase uses **MiMC-BN254** hash function to create deposit commitments with the formula:
```
commitment = MiMC(secret, nullifier, amount)
```

The commitment **DOES include the amount** in its calculation, which is important for security to prevent amount manipulation attacks.

## Detailed Flow Analysis

### 1. Frontend Deposit Creation (`/src/frontend/pages/DepositPage.tsx`)

When a user initiates a deposit:

1. **Random Value Generation** (lines 181-209):
   - Generates 32-byte `secret` and `nullifier` values
   - Ensures values are < BN254 field modulus by clearing top 4 bits
   - Field modulus: `21888242871839275222246405745257275088548364400416034343698204186575808495617`

2. **Amount Conversion** (lines 211-214):
   - Converts user amount to wei (18 decimals for ETH)
   - Example: 1 ETH = `1000000000000000000` wei

3. **Commitment Calculation** (lines 216-222):
   ```javascript
   const commitmentValue = computeCommitment(secretHex, nullifierHex, amountStr);
   ```

### 2. MiMC Implementation (`/src/frontend/utils/mimc.ts`)

**Key Function** (lines 197-206):
```typescript
export function computeCommitment(secret: string, nullifier: string, amount: string): string {
  const secretBigInt = BigInt(secret.startsWith('0x') ? secret : '0x' + secret);
  const nullifierBigInt = BigInt(nullifier.startsWith('0x') ? nullifier : '0x' + nullifier);
  const amountBigInt = BigInt(amount);
  
  // The WASM binary expects MiMC(secret, nullifier, amount)
  return mimc.hash([secretBigInt, nullifierBigInt, amountBigInt]);
}
```

**MiMC Hash Implementation**:
- Uses **110 round constants** from gnark-crypto (lines 10-121)
- Implements **Miyaguchi-Preneel construction** (lines 127-159)
- Uses **BN254 field modulus** for all operations
- Block cipher uses **exponent 5** (x^5) in each round

### 3. Circuit Implementation (`/circuits/wasm/main_production.go`)

The PLONK circuit verifies commitments with (lines 70-75):
```go
// 1. Compute commitment = Hash(secret, nullifier, amount)
mimc, _ := mimc.NewMiMC(api)
mimc.Write(circuit.Secret)
mimc.Write(circuit.Nullifier)
mimc.Write(circuit.Amount) // Include amount in commitment for security
commitment := mimc.Sum()
```

### 4. Backend Processing

The backend stores commitments in the Merkle tree without recomputing them:
- `DepositManager.mo` receives the commitment as a parameter (line 39)
- No re-computation happens on-chain
- The commitment is treated as an opaque value

## MiMC Parameters

### Algorithm: MiMC-BN254
- **Rounds**: 110
- **Field**: BN254 scalar field
- **Modulus**: `21888242871839275222246405745257275088548364400416034343698204186575808495617`
- **Exponent**: 5 (x^5)
- **Construction**: Miyaguchi-Preneel

### Round Constants
The implementation uses the exact 110 round constants from gnark-crypto's MiMC-BN254, ensuring compatibility with the ZK circuit.

## Security Considerations

1. **Amount Inclusion**: The commitment includes the amount, preventing attackers from:
   - Depositing one amount and withdrawing another
   - Front-running attacks based on amount manipulation

2. **Field Element Safety**: Random values are constrained to be < field modulus by clearing top bits

3. **Nullifier Hash**: Computed as `MiMC(nullifier)` to prevent double-spending

## File References

1. **Frontend Deposit Page**: `/src/frontend/pages/DepositPage.tsx`
   - Commitment generation: lines 216-222
   - Random value generation: lines 181-209

2. **MiMC Implementation**: `/src/frontend/utils/mimc.ts`
   - computeCommitment function: lines 197-206
   - MiMC class: lines 4-191

3. **Circuit Definition**: `/circuits/wasm/main_production.go`
   - Commitment verification: lines 70-75

4. **Backend Storage**: `/src/canisters/DepositManager.mo`
   - Commitment storage: line 50

5. **Test Scripts**: 
   - `/scripts/generate_test_data.js` - lines 279-281
   - `/scripts/test_deposit_commitment.js` - lines 250-257

## Verification

The test data generator confirms the formula:
```javascript
// Compute commitment = MiMC(secret, nullifier, amount)
const commitment = mimc.hash([secret, nullifier, amount]);
```

This matches exactly what the WASM binary expects for proof generation.
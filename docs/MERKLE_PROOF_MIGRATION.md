# Merkle Proof Migration: Frontend to Canister

## Overview
This document describes the migration of merkle proof generation from the frontend to the deposit manager canister, improving efficiency and reducing client-side computational load.

## Changes Made

### 1. WithdrawPage.tsx Updates

#### Before:
- Frontend fetched all commitments using `getAllCommitments()`
- Built merkle tree on client using `buildMerkleTree(allCommitments)`
- Generated merkle proof on client using `generateMerkleProof(allCommitments, commitment)`

#### After:
- Frontend uses the deposit's `leafIndex` directly from the deposit record
- Calls `getMerkleProof(leafIndex)` to get the proof from the canister
- No need to fetch all commitments or build the tree on client

#### Code Changes:
```typescript
// Old approach (removed)
const allCommitments = await depositManager.getAllCommitments();
merkleRoot = buildMerkleTree(allCommitments);
const merkleProof = generateMerkleProof(allCommitments, depositData.commitment);

// New approach
const leafIndex = Number(deposit.leafIndex);
const merkleProofResult = await depositManager.getMerkleProof(deposit.leafIndex);
if ('err' in merkleProofResult) {
  throw new Error(`Failed to get merkle proof: ${merkleProofResult.err}`);
}
const merkleProof = merkleProofResult.ok;
```

### 2. Import Cleanup
- Removed unused imports:
  - `buildMerkleTree` from WithdrawPage.tsx
  - `generateMerkleProof` from WithdrawPage.tsx
  - `buildMerkleTree` from DepositPage.tsx (was imported but unused)

### 3. Benefits

#### Performance:
- **Reduced client load**: No need to fetch all commitments (could be thousands)
- **Faster proof generation**: Canister pre-computes and caches merkle tree
- **Lower bandwidth**: Only fetches the proof path, not all commitments

#### Security:
- **Consistency**: All clients use the same merkle tree structure
- **Verification**: Canister ensures proof validity before returning

#### Scalability:
- **Memory efficient**: Client doesn't need to hold entire commitment list
- **Works with large trees**: Can handle millions of deposits without client impact

## Testing

A test script is provided at `scripts/test_merkle_proof_canister.js` to verify:
1. Deposit creation and merkle root updates
2. Merkle proof generation via `getMerkleProof()`
3. Proof verification using `verifyMerkleProof()`
4. Proof validity after tree updates

Run the test:
```bash
node scripts/test_merkle_proof_canister.js
```

## API Reference

### DepositManagerService Methods

#### getMerkleProof
```typescript
getMerkleProof(leafIndex: bigint) => Promise<Result<string[], string>>
```
Returns the merkle proof path for a deposit at the given leaf index.

#### verifyMerkleProof
```typescript
verifyMerkleProof(
  commitment: string,
  leafIndex: bigint,
  proof: string[],
  root: string
) => Promise<boolean>
```
Verifies a merkle proof on-chain.

## Migration Checklist

- [x] Update WithdrawPage to use `getMerkleProof()`
- [x] Remove frontend merkle tree building logic
- [x] Clean up unused imports
- [x] Create test script
- [x] Document changes

## Backward Compatibility

The `getAllCommitments()` method remains available in the canister for backward compatibility but is no longer used by the frontend. It can be deprecated in a future release.
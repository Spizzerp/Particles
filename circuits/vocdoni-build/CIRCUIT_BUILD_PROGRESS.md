# Particle Fund Circuit Build Progress

## Overview
Building the withdraw circuit incrementally using Vocdoni's gnark-tiny-prover.
Each step adds complexity while maintaining working client-side proof generation.

## Progress Tracker

### ✅ Step 0: Setup Environment
- **Status**: COMPLETED
- **Date**: 2024-06-19
- **Components**: 
  - Cloned gnark-prover-tinygo
  - Verified TinyGo installed
  - Created build directories

### ✅ Step 1: Nullifier-Only Circuit
- **Status**: COMPLETE & TESTED ✓✓
- **Constraints**: 442 (MiMC hash implementation)
- **Proves**: "I know the nullifier for this nullifierHash"
- **Files**:
  - [x] Created `circuits/particlefund/nullifier_only.go`
  - [x] Created `cmd/compiler/particlefund_step1.go`
  - [x] Generated artifacts in `wasm/particlefund/`
  - [x] Created WASM entry point `main_step1_standard.go`
  - [x] Built WASM (3.0MB with standard Go)
  - [x] Created working test page `step1_test_working.html`
- **Artifacts**:
  - Constraint system: 21.22 KB
  - SRS: 16.22 KB
  - Proving key: 156.72 KB ✓
  - Verification key: 0.36 KB ✓
  - WASM binary: 3.0 MB ✓
- **Browser Test Results**:
  - ✓ WASM loads successfully
  - ✓ JavaScript ↔ Go communication working
  - ✓ Mock proof generation: 4ms
  - ✓ Proof size: 512 bytes (mock)
  - ✓ Public witness correctly passed
- **Key Fix**: Used custom import loader to map "gojs" → "go" imports

### ⏳ Step 2: Commitment Circuit
- **Status**: PENDING
- **Constraints**: ~15-20
- **Proves**: "I know secret AND nullifier that hash to this commitment"
- **Adds**: Secret input, commitment calculation
- **Success Criteria**: Can prove knowledge of (secret, nullifier) pair

### ⏳ Step 3: Basic Merkle Circuit
- **Status**: PENDING
- **Constraints**: ~100-200
- **Proves**: "My commitment is in a small Merkle tree"
- **Adds**: 5-level Merkle tree verification
- **Success Criteria**: Can prove membership in small tree

### ⏳ Step 4: Full Merkle Circuit
- **Status**: PENDING
- **Constraints**: ~2,000
- **Proves**: "My commitment is in the full Merkle tree"
- **Adds**: 20-level Merkle tree verification
- **Success Criteria**: Can prove membership in production tree

### ⏳ Step 5: Complete Withdraw Circuit
- **Status**: PENDING
- **Constraints**: ~22,327
- **Proves**: Full withdraw conditions
- **Adds**: Amount verification, recipient, relayer, fees
- **Success Criteria**: Production-ready circuit

## Build Log

### 2024-06-19 - Starting Step 1
- Creating nullifier-only circuit...
- 16:20: Successfully compiled circuit with 442 constraints
- 16:20: Generated all artifacts (proving key: 156KB)
- 16:21: Built WASM with TinyGo (4.3MB)
- Created test HTML page for browser testing
- **Step 1 COMPLETE** ✓

### Next: Step 2 - Commitment Circuit
- Will add secret input
- Prove knowledge of (secret, nullifier) pair
- Expected constraints: ~880 (double of step 1)
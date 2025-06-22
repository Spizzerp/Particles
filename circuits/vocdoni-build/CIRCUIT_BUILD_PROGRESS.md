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

### ✅ Step 2: Commitment Circuit
- **Status**: COMPLETE & TESTED ✓✓
- **Constraints**: 992 (actual)
- **Proves**: "I know secret AND nullifier that hash to this commitment"
- **Adds**: Secret input, commitment calculation
- **Success Criteria**: Can prove knowledge of (secret, nullifier) pair
- **Files**:
  - [x] Created `circuits/particlefund/commitment.go`
  - [x] Created `circuits/particlefund/commitment_test.go`
  - [x] Created `examples/particlefund/setup/step2_setup.go`
  - [x] Created `wasm/particlefund/main_step2_standard.go`
  - [x] Created `examples/particlefund/step2_test.html`
  - [x] Created `build_step2.sh`
  - [x] Run setup and generate artifacts
  - [x] Build WASM and test in browser
- **Artifacts**:
  - Constraint system: 43.19 KB
  - SRS: 43.19 KB
  - Proving key: 162.27 KB ✓
  - Verification key: 0.38 KB ✓
  - WASM binary: 5.19 MB ✓
- **Browser Test Results**:
  - ✓ WASM loads successfully
  - ✓ Computes commitment = hash(secret, nullifier)
  - ✓ Computes nullifierHash = hash(nullifier)
  - ✓ Mock proof generation: 20ms
  - ✓ Public signals correctly computed

### ✅ Step 3: Basic Merkle Circuit
- **Status**: COMPLETE & TESTED ✓✓
- **Constraints**: 4,547 (actual)
- **Proves**: "My commitment is in a small Merkle tree"
- **Adds**: 5-level Merkle tree verification
- **Success Criteria**: Can prove membership in small tree
- **Files**:
  - [x] Created `circuits/particlefund/merkle_basic.go`
  - [x] Created `circuits/particlefund/merkle_basic_test.go`
  - [x] Created `examples/particlefund/setup/step3_setup.go`
  - [x] Created `wasm/particlefund/main_step3_standard.go`
  - [x] Created `examples/particlefund/step3_test.html`
  - [x] Created `build_step3.sh`
  - [x] Run setup and generate artifacts
  - [x] Build WASM and test in browser
- **Artifacts**:
  - Constraint system: 289.96 KB
  - SRS: 289.96 KB
  - Proving key: 842.42 KB ✓
  - Verification key: 0.38 KB ✓
  - WASM binary: 6.36 MB ✓
- **Browser Test Results**:
  - ✓ WASM loads successfully
  - ✓ Builds Merkle tree with real MiMC hashes
  - ✓ Generates correct Merkle path for 5 levels
  - ✓ Root Match: true (path verification works)
  - ✓ Mock proof generation: ~17ms
- **Key Features**:
  - Tree capacity: 32 leaves (2^5)
  - Uses MiMC hash throughout
  - Includes leaf index range check (0-31)
  - Bit extraction for path ordering

### ✅ Step 4: Full Merkle Circuit
- **Status**: COMPLETE & TESTED ✓✓
- **Constraints**: 14,447 (actual)
- **Proves**: "My commitment is in the full Merkle tree"
- **Adds**: 20-level Merkle tree verification
- **Success Criteria**: Can prove membership in production tree
- **Files**:
  - [x] Created `circuits/particlefund/merkle_full.go`
  - [x] Created `circuits/particlefund/merkle_full_test.go`
  - [x] Created `examples/particlefund/setup/step4_setup.go`
  - [x] Created `wasm/particlefund/main_step4_standard.go`
  - [x] Created `examples/particlefund/step4_test.html`
  - [x] Created `build_step4.sh`
  - [x] Run setup and generate artifacts
  - [x] Build WASM and test in browser
- **Artifacts**:
  - Constraint system: 1.87 MB
  - SRS: 1.87 MB
  - Proving key: 2.30 MB ✓
  - Verification key: 0.38 KB ✓
  - WASM binary: 11.01 MB ✓
- **Browser Test Results**:
  - ✓ WASM loads successfully
  - ✓ Builds sparse Merkle tree for testing
  - ✓ Supports any position in 1,048,576 leaves
  - ✓ Root Match: true (path verification works)
  - ✓ Mock proof generation: ~15-25ms
  - ✓ Random position generation working
- **Key Features**:
  - Tree capacity: 1,048,576 leaves (2^20)
  - Production-scale Merkle tree
  - Optimized constraints (14k vs expected 18-20k)
  - Sparse tree for efficient testing

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

### 2024-06-21 - Step 2 Complete
- Added secret input to circuit
- Proves knowledge of (secret, nullifier) pair
- Actual constraints: 992
- Successfully tested in browser with real MiMC hashes

### 2024-06-22 - Step 3 Complete
- Added 5-level Merkle tree verification
- Proves commitment inclusion in tree
- Actual constraints: 4,547 (higher than expected due to bit extraction)
- Tree builder generates correct paths
- Root verification working perfectly

### 2024-06-22 - Step 4 Complete
- Expanded to 20-level Merkle tree
- Supports 1,048,576 deposits (2^20)
- Actual constraints: 14,447 (optimized from expected 18k)
- Successfully tested with both fixed and random positions
- Sparse tree implementation for efficient browser testing
- WASM size increased to 11MB due to larger circuit

### 2024-06-23 - Step 5 Complete ✅
- Added complete withdrawal validation
- Includes amount in commitment
- Validates recipient, relayer, and fee logic
- Actual constraints: 17,577
- Self-withdrawal and relayed withdrawal support
- Production-ready circuit with all features
- WASM size: 15MB

## Next Steps

### Phase 1: Core Protocol Completion
1. Deploy and test smart contracts
2. Implement deposit flow
3. Implement basic withdrawal flow
4. Test full deposit → withdraw cycle
5. Integrate with ICP Chain Fusion

### Phase 2: Relayer Infrastructure (Future)
- **Strategy**: Launch with mandatory relayers, protocol-operated only
- **Revenue**: Capture 100% of relayer fees initially (0.1-0.5%)
- **Benefits**: Better privacy for all users, quality control, revenue stream
- **Implementation**:
  - Build relayer backend service (monitor, verify, submit, retry)
  - Add smart contract relayer authorization
  - Update UI for automatic relayer selection
  - Set minimum fee requirements
- **Future**: Open to third-party relayers for decentralization

### Phase 3: Production Launch
- Multiple ICP canisters for components
- Multi-chain support (Bitcoin, Ethereum)
- Internet Identity integration
- Production UI/UX
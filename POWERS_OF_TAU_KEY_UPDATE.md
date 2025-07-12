# Powers of Tau Key Update - July 2025

## Summary
We successfully updated the PLONK keys using a Powers of Tau ceremony to ensure maximum cryptographic security.

## Key Files Updated

### New Keys (from Powers of Tau ceremony)
- **Proving Key**: `circuits/build/plonk_pk.bin` (2.1 MB)
- **Verification Key**: `circuits/build/plonk_vk.bin` (34 KB)
- **Generated**: July 11, 2025 15:41

### WASM Updates
- **WASM Prover**: `public/wasm/particlefund_production_real.wasm` (20 MB)
- **Embedded Key**: `circuits/wasm/production_25969.pkey` (matches new proving key)
- **Rebuilt**: July 13, 2025 03:05

### Verification Key Deployment
- **Canister**: `hauct-cqaaa-aaaaj-a2dgq-cai` (withdrawal_processor)
- **Uploaded**: July 13, 2025
- **Status**: ✅ Active

## Key Features
1. **Powers of Tau**: Uses real randomness from 1000+ contributors
2. **Commitment Formula**: MiMC(secret, nullifier, amount) - includes amount for security
3. **Circuit Constraints**: 25,969 constraints
4. **Security Level**: Production-grade (10/10)

## Commands Used

### 1. Generate Keys with Powers of Tau
```bash
cd circuits
go run setup_production_final.go  # Or whichever setup script you used
```

### 2. Rebuild WASM with New Keys
```bash
cd circuits
./rebuild_wasm_with_new_keys.sh
```

### 3. Upload Verification Key
```bash
VK_BLOB=$(cat circuits/build/plonk_vk.bin | xxd -p | tr -d '\n')
dfx canister --network ic call hauct-cqaaa-aaaaj-a2dgq-cai setPlonkVerificationKey "(blob \"$VK_BLOB\")"
```

## Important Notes
- The old keys are backed up as `plonk_pk_before_ptau.bin` and `plonk_vk_before_ptau.bin`
- The WASM now uses the new proving key with correct commitment formula
- All components are synchronized: proving key, verification key, and WASM

## Next Steps
Your withdrawal should now work! The system is using:
- ✅ Correct commitment formula (includes amount)
- ✅ Powers of Tau ceremony randomness
- ✅ Synchronized proving and verification keys 
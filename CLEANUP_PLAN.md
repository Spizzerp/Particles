# Codebase Cleanup Plan

## Summary

Based on comprehensive review by 5 specialized agents, we've identified significant cleanup opportunities that would reduce the codebase size and improve maintainability.

## Critical Issues Found

1. **Build Artifacts in Version Control**
   - `/target/` directory with 40,000+ Rust build files
   - `/contracts/build/` with Hardhat artifacts
   - `/circuits/build/` with binary files
   - Various `.wasm` files scattered throughout

2. **Duplicate Implementations**
   - 30+ variations of circuit setup files
   - Multiple EthereumAdapter implementations
   - Duplicate scripts with similar functionality

3. **Outdated Code**
   - Groth16 proof system files (project uses PLONK)
   - Circom circuit files (migrated to gnark)
   - References to old mainnet contract

## Immediate Actions Required

### 1. Update .gitignore
Add these patterns:
```
# Build artifacts
target/
contracts/build/
circuits/build/
cache/
dist/
deps/

# Test data
*.test.json
*_test.json
local_*.json
*_backup*.json

# Backup files
*.backup
*.bak
*_original.*
*.reference.txt

# Circuit artifacts
*.ccs
*.pkey
*.vkey
*.srs
*.sym
```

### 2. Delete Build Artifacts (Highest Priority)
```bash
# Remove large directories
rm -rf target/
rm -rf contracts/build/
rm -rf circuits/build/
rm -rf cache/

# Remove test data from root
rm -f test-*.json local_*.json deposit_*.json migration_*.json mainnet-deposit-info.json
```

### 3. Circuit Files Cleanup
Keep only:
- `circuits/withdraw_plonk.go` (main circuit)
- `circuits/setup_powers_of_tau_fixed.go`
- `circuits/setup_ptau_hybrid_final.go`

Delete all other setup_*.go files

### 4. Scripts Consolidation
Organize into subdirectories:
- `scripts/deployment/`
- `scripts/testing/`
- `scripts/monitoring/`
- `scripts/utils/`

Remove 80+ duplicate/outdated scripts

### 5. Frontend Cleanup
Remove:
- Unused components (PrivacyPool.tsx, PrivacyPage.tsx)
- Old proof service (snarkProof.ts)
- Backup canister files

### 6. Documentation Update
- Remove Groth16 references from ZK_ARCHITECTURE.md
- Update contract addresses consistently
- Remove references to old mainnet contract

## File Count Impact

- **Before**: ~500+ files (excluding node_modules)
- **After cleanup**: ~200 files (60% reduction)
- **Repository size**: Reduce by ~80% (mainly from removing /target/)

## Recommended Execution Order

1. **First**: Create comprehensive backup
2. **Second**: Update .gitignore
3. **Third**: Remove build artifacts and cache
4. **Fourth**: Clean circuits directory
5. **Fifth**: Consolidate scripts
6. **Sixth**: Clean frontend code
7. **Seventh**: Update documentation

## Testing After Cleanup

1. Fresh clone and build:
   ```bash
   git clone <repo>
   npm install
   dfx build
   npm run build
   ```

2. Run test suite
3. Deploy to local network
4. Verify all functionality

## Long-term Maintenance

1. Add pre-commit hooks to prevent build artifacts
2. Regular cleanup reviews (quarterly)
3. Document "what goes where" guidelines
4. Enforce .gitignore rules

## Dependencies to Remove

From package.json:
- `snarkjs` (replaced by PLONK)
- `circomlib`
- `circomlibjs`
- `secp256k1` (unused in frontend)
- `commander` (no CLI tools)

## Final Notes

This cleanup is essential for:
- Reducing repository size
- Improving build times
- Making codebase more navigable
- Reducing confusion from duplicate files
- Preventing accidental use of outdated code

Estimated time: 2-3 hours for full cleanup
Risk level: Low (mostly removing unused files)
# DFX.json Cleanup Analysis

## Summary of Canister Analysis

### Canisters to KEEP:

1. **deposit_manager** ✅
   - Core functionality for managing deposits
   - Actively used by frontend
   - Stores deposit records and Merkle roots
   - Essential for privacy pool operation

2. **withdrawal_processor** ✅
   - Critical for processing withdrawals
   - Integrates with PLONK verifier
   - Manages nullifiers to prevent double-spending
   - Actively used by frontend

3. **ethereum_adapter** ✅
   - Handles Ethereum integration
   - Manages deposit addresses via threshold ECDSA
   - Processes cross-chain transactions
   - Recently updated with gas fix

4. **pattern_breaker** ⚠️ (Keep for future)
   - Not currently integrated
   - Important privacy feature mentioned in docs
   - Well-structured code ready for integration
   - Keep for future implementation

5. **plonk_verifier** ✅ (Rust)
   - Essential for ZK proof verification
   - Actively used by withdrawal processor
   - Critical security component

6. **frontend** ✅
   - Asset canister for the web interface

7. **internet_identity** ✅
   - Authentication provider

### Canisters to REMOVE:

1. **particle_router** ❌
   - Not used anywhere in codebase
   - Redundant with Chain Fusion technology
   - From earlier design iteration

2. **crypto_components** ❌
   - Contains insecure mock implementations
   - Functionality duplicated in other canisters
   - Security risk if accidentally used

3. **chain_fusion_manager** ❌
   - Not actively used
   - Superseded by EthereumAdapter
   - Incomplete bridge implementations

4. **hash_canister** ❌ (Rust)
   - Not actively used
   - MiMC functionality exists in Motoko
   - No references in current code

## Cleanup Steps

### 1. Update dfx.json:
```json
{
  "version": 1,
  "canisters": {
    "deposit_manager": {
      "type": "motoko",
      "main": "src/canisters/DepositManager.mo"
    },
    "withdrawal_processor": {
      "type": "motoko",
      "main": "src/canisters/WithdrawalProcessor.mo"
    },
    "pattern_breaker": {
      "type": "motoko",
      "main": "src/canisters/PatternBreaker.mo"
    },
    "ethereum_adapter": {
      "type": "motoko",
      "main": "src/canisters/EthereumAdapter.mo"
    },
    "plonk_verifier": {
      "type": "rust",
      "candid": "src/canisters/plonk_verifier_on_icp_backend/plonk_verifier_on_icp_backend.did",
      "package": "plonk_verifier_on_icp_backend"
    },
    "frontend": {
      "type": "assets",
      "source": ["dist"]
    },
    "internet_identity": {
      "type": "pull",
      "id": "rdmx6-jaaaa-aaaaa-aaadq-cai"
    }
  },
  "defaults": {
    "build": {
      "args": "",
      "packtool": ""
    }
  },
  "networks": {
    "local": {
      "bind": "127.0.0.1:8000",
      "type": "ephemeral"
    }
  }
}
```

### 2. Files to Delete:
- `/src/canisters/ParticleRouter.mo`
- `/src/canisters/CryptoComponents.mo`
- `/src/canisters/ChainFusionManager.mo`
- `/src/canisters/hash_canister/` (entire directory)
- `/src/declarations/particle_router/`
- `/src/declarations/crypto_components/`
- `/src/declarations/chain_fusion_manager/`
- `/src/declarations/hash_canister/`

### 3. Code Updates Needed:

#### In `/src/frontend/services/types.ts`:
- Remove `ParticleRouterService` interface
- Remove `CryptoComponentsService` interface  
- Remove `ChainFusionManagerService` interface

#### In `/src/frontend/services/config.ts`:
- Remove canister ID entries for removed canisters

#### In `/src/frontend/services/actorFactory.ts`:
- Remove `getCryptoComponents` function
- Remove any other references to removed canisters

#### In `/src/frontend/pages/WithdrawPage.tsx`:
- Update to use `depositManager` for Merkle proofs instead of `cryptoComponents`

#### In `.env.example`:
- Remove environment variables for removed canisters

### 4. Update Cargo.toml:
Remove the hash_canister from workspace members

### 5. Migration Tasks:

1. **Move Merkle proof generation from CryptoComponents to DepositManager**
   - The DepositManager already has Merkle tree functionality
   - Update WithdrawPage.tsx to use DepositManager for proofs

2. **Ensure proper hashing implementation**
   - Verify the MiMC implementation in `/src/crypto/MiMC.mo` is being used
   - Or implement proper Poseidon hashing as mentioned in docs

## Benefits of Cleanup:

1. **Reduced Complexity**: Fewer canisters to maintain and deploy
2. **Lower Costs**: Less cycles needed for canister operations
3. **Improved Security**: Removes mock/insecure implementations
4. **Clearer Architecture**: Each remaining canister has a clear purpose
5. **Faster Builds**: Less code to compile and deploy
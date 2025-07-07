# Vendored Dependencies

This project includes vendored (copied) code from the following repositories:

## gnark-prover-tinygo
- **Source**: https://github.com/vocdoni/gnark-wasm-prover
- **License**: MIT
- **Purpose**: TinyGo-compatible zkSNARK prover for gnark circuits
- **Modifications**: Extended for Particle Fund's nullifier-only circuit (Step 1)

## plonk_verifier_reference
- **Source**: https://github.com/lightec-xyz/plonk_verifier_on_icp
- **License**: Check original repository
- **Purpose**: Reference implementation of PLONK verifier for ICP
- **Modifications**: Adapted for Particle Fund's verification needs

## gnark-wasm-prover
- **Source**: Custom implementation
- **Purpose**: Alternative WASM prover implementation
- **Status**: Experimental

These dependencies are vendored rather than submoduled because:
1. We need to make project-specific modifications
2. They are proof-of-concept implementations
3. We require stability and version control over the exact code used
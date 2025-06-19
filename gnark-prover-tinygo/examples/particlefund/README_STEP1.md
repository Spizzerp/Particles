# Step 1: Nullifier-Only Circuit

## Overview
This is the first step in building the Particle Fund withdraw circuit. It proves knowledge of a nullifier that hashes to a given nullifierHash.

## Files
- `particlefund_step1_standard.wasm` - The compiled WASM binary (3.0MB)
- `step1_test_working.html` - Browser test page
- Circuit artifacts in `../../wasm/particlefund/step1.*`

## Circuit Details
- **Constraints**: 442
- **Hash Function**: MiMC
- **Curve**: BN254
- **Proves**: Hash(nullifier) == nullifierHash

## Testing
1. Start a web server:
   ```bash
   python3 -m http.server 8889
   ```

2. Open in browser:
   ```
   http://localhost:8889/examples/particlefund/step1_test_working.html
   ```

3. Click "Generate PLONK Proof" to test

## Key Implementation Details
- Uses standard Go compiler (not TinyGo)
- Custom import loader to map "gojs" → "go" imports
- Mock proof generation for now (real gnark integration pending)

## Next Steps
- Step 2: Add commitment calculation (secret + nullifier)
- Integrate real gnark prover
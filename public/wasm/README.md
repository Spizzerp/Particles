# PLONK WASM Files

This directory should contain the following files for client-side PLONK proof generation:

1. **particle_fund_prover.wasm** - The PLONK prover compiled to WebAssembly
2. **particle_fund.pkey** - The proving key (generated from circuit setup)
3. **particle_fund.ccs** - The constraint system
4. **particle_fund.srs** - The structured reference string
5. **wasm_exec.js** - The TinyGo runtime for WASM

## Setup Instructions

### Option 1: Use Pre-built Vocdoni Prover (Recommended for testing)

1. Copy the built WASM from Vocdoni's example:
```bash
cp gnark-prover-tinygo/artifacts/plonk_prover.wasm public/wasm/particle_fund_prover.wasm
cp gnark-prover-tinygo/artifacts/wasm_exec_tinygo.js public/wasm/wasm_exec.js
```

2. Copy our circuit keys:
```bash
cp circuits/build/plonk_pk.bin public/wasm/particle_fund.pkey
cp circuits/build/plonk_vk.bin public/wasm/particle_fund.vkey
```

### Option 2: Build Custom WASM (For production)

1. Build using the provided script:
```bash
cd circuits
./build_wasm.sh
```

2. Copy the output:
```bash
cp circuits/wasm/build/particle_fund_prover.wasm public/wasm/
cp circuits/wasm/build/wasm_exec.js public/wasm/
```

## Memory Requirements

The PLONK prover requires significant memory:
- Initial allocation: 4GB
- Proof generation time: 1-2 minutes
- Browser requirements: Chrome/Firefox with sufficient RAM

## Testing

To test the WASM prover:
1. Start the development server: `npm run dev`
2. Open the privacy pool component
3. Make a deposit and attempt a withdrawal
4. Monitor browser console for proof generation progress
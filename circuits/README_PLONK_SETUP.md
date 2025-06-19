# PLONK Circuit Setup Instructions

## Prerequisites
1. Install Go: https://golang.org/dl/
2. Install gnark dependencies

## Setup Steps

1. Initialize the Go module:
```bash
cd circuits
go mod init particlefund/circuits
```

2. Install dependencies:
```bash
go get github.com/consensys/gnark@latest
go get github.com/consensys/gnark-crypto@latest
```

3. Run the PLONK setup:
```bash
go run withdraw_plonk.go setup
```

This will generate:
- `build/plonk_pk.bin` - Proving key (for client-side proof generation)
- `build/plonk_vk.bin` - Verification key (for on-chain verification)

## Next Steps

1. Upload the verification key to the withdrawal processor:
```bash
# Convert vk.bin to bytes and upload to canister
dfx canister call withdrawal_processor setPlonkVerificationKey '(blob "...")'
```

2. Serve the proving key from a CDN for client-side access

## Circuit Details
- **Constraints**: ~5,000-10,000
- **Merkle Tree Depth**: 20 levels (supports 1M deposits)
- **Hash Function**: MiMC (optimized for circuits)
- **Curve**: BN254
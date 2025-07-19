# Mainnet Contract Information (IMPORTANT - DO NOT DELETE)

## Ethereum Mainnet Pool Contract

**Contract Address**: `0x9b0721C174b103facEC1EeE435679Ae9C493163C`

**Network**: Ethereum Mainnet (Chain ID: 1)

**Deployed**: June 26, 2025

**Status**: Contains locked funds - recovery pending

**Etherscan**: https://etherscan.io/address/0x9b0721C174b103facEC1EeE435679Ae9C493163C

## Contract Details

- **Authorized Withdrawer**: Only ICP canister address `0xb012acfa53164ab5e8d302a22a22834702b1ca01`
- **Admin Functions**: None (no owner/admin recovery mechanisms)
- **Known Issues**: Funds are locked because only the ICP canister can withdraw

## Locked Funds Information

Several deposits are stuck in this mainnet contract:
- Users deposited funds expecting to use the privacy pool
- The contract works but has no emergency recovery mechanism
- Only the ICP canister's derived Ethereum address can execute withdrawals

## Recovery Plan

1. Complete testing on Sepolia testnet first
2. Ensure withdrawal mechanism works perfectly on testnet
3. Implement proper admin controls in new contracts
4. Execute recovery of mainnet funds through ICP canister

## DO NOT

- Deploy new code pointing to this mainnet contract
- Accept new deposits to this contract
- Delete this file - it contains critical recovery information

## Related Files

- Emergency recovery guide: `/scripts/emergency_recovery.md`
- Mainnet deployment info: `/deployments/mainnet-icp.json`
- Check mainnet funds script: `/scripts/check_mainnet_funds.sh`
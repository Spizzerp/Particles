# Clear Browser Cache Instructions

The frontend has been updated to use the new deposit_manager_v2 canister, but your browser might be caching the old JavaScript files.

## Steps to Clear Cache:

### Option 1: Force Refresh (Recommended)
- **Mac**: Hold `Cmd + Shift + R`
- **Windows/Linux**: Hold `Ctrl + Shift + R`

### Option 2: Clear Browser Cache
1. Open Chrome DevTools (F12 or right-click → Inspect)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Option 3: Open in Incognito/Private Mode
This ensures no cached files are used.

## What Changed:
1. Frontend now uses `deposit_manager_v2` canister: `rfun2-iaaaa-aaaac-qa7wq-cai`
2. Merkle proofs are fetched from the canister, not generated on frontend
3. The deposit manager has integrated Merkle tree management

## Test Your Withdrawal:
After clearing cache, try withdrawing deposit 15 again. You should see:
- "Fetching merkle proof from canister for leaf index 15"
- NO "Generating merkle proof for deposit 15" message
- The proof should come from the canister's `getMerkleProof` function
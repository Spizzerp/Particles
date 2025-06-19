# Internet Identity Port Fix

## Issue
Internet Identity was trying to open at `http://localhost:4943` but the ICP replica is actually running on port `8000`.

## Fix Applied
Updated `authService.ts` to use the correct port:
```typescript
return `http://localhost:8000/?canisterId=${iiCanisterId}`;
```

## Verification
Internet Identity is accessible at:
http://localhost:8000/?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai

## Testing Steps
1. **Refresh the page** (Ctrl+R or Cmd+R) to load the updated code
2. Click "Connect Wallet"
3. Internet Identity popup should now open correctly
4. You should see the Internet Identity login page

## If Popup is Still Blocked
1. Check browser console for the exact URL being opened
2. Look for popup blocker notification in address bar
3. Allow popups from localhost:3000
4. Try again

## Expected Console Output
```
Attempting to connect...
Starting authentication with provider: undefined
Identity Provider URL: http://localhost:8000/?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai
```

The connection should now work properly!
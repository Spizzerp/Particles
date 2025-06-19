# Internet Identity Connection Test Instructions

## Prerequisites
1. Local ICP replica is running (dfx start)
2. Frontend dev server is running (npm run dev)
3. Internet Identity canister is deployed (rdmx6-jaaaa-aaaaa-aaadq-cai)

## Testing Steps

### 1. Open Application
- Navigate to: http://localhost:3000
- Open browser Developer Console (F12 or Cmd+Option+I on Mac)

### 2. Click "Connect Wallet"
- Look for the button in the top-right navigation
- Click it to initiate connection

### 3. Expected Console Output
You should see:
```
Attempting to connect...
Starting authentication with provider: undefined
Identity Provider URL: http://localhost:4943/?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai
```

### 4. Internet Identity Popup
A popup window should open showing Internet Identity interface.

**If popup is blocked:**
- Look for popup blocker notification in browser
- Allow popups from localhost:3000
- Try again

**If no popup appears:**
- Check console for errors
- Ensure Internet Identity is deployed: `dfx canister status internet_identity`

### 5. In the Internet Identity Popup

**For New Users:**
1. Click "Create New Internet Identity"
2. Choose authentication method (e.g., passkey, security key)
3. Follow the setup process
4. You'll receive an Identity Anchor number - save this!

**For Existing Users:**
1. Enter your Identity Anchor number
2. Authenticate with your chosen method

### 6. After Authentication
- The popup should close automatically
- Check console for: "Authentication successful: [your-principal-id]"
- Navigation should show your truncated principal (e.g., "2vxsx...fae")
- Click the principal to see dropdown with full ID

## Common Issues & Solutions

### Issue: "Failed to fetch" error
**Solution:** Ensure dfx is running properly
```bash
dfx ping
# Should return replica status
```

### Issue: Popup blocked
**Solution:** 
1. Check browser's address bar for blocked popup icon
2. Click it and select "Always allow popups from localhost:3000"
3. Refresh and try again

### Issue: CORS errors
**Solution:** We've added proxy configuration. If still having issues:
1. Try Chrome with disabled security (development only):
```bash
open -n -a "Google Chrome" --args --disable-web-security --user-data-dir=/tmp/chrome-dev
```

### Issue: "Identity Provider unreachable"
**Solution:** Check Internet Identity is accessible:
```bash
curl http://localhost:4943/?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai
# Should return HTML content
```

## Verification

After successful connection:
1. Refresh the page - you should remain logged in
2. Click your principal in nav to see dropdown menu
3. Try making a deposit - it should use your authenticated identity
4. Check console for authenticated canister calls

## Debug Mode

To see more detailed logs:
1. Open browser console
2. Set verbose logging: `localStorage.setItem('debug', '*')`
3. Refresh and try connecting again

## Next Steps

Once connected:
1. Try making a deposit with your authenticated identity
2. The deposit will be associated with your principal
3. You can query your deposits using the authenticated actor
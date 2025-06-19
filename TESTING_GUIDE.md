# Testing Internet Identity Connection

## Steps to Test

1. **Ensure Local Services are Running:**
   ```bash
   # Terminal 1: Run local ICP replica
   dfx start --clean
   
   # Terminal 2: Run frontend dev server
   npm run dev
   ```

2. **Open the Application:**
   - Navigate to http://localhost:3000 in your browser
   - Open browser Developer Console (F12)

3. **Test Connection:**
   - Click "Connect Wallet" button in the top navigation
   - You should see console logs:
     - "Attempting to connect..."
     - "Starting authentication with provider: InternetIdentity"
     - "Identity Provider URL: http://localhost:4943/?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai"

4. **Internet Identity Window:**
   - A popup window should open to Internet Identity
   - If this is your first time:
     - Click "Create New" to create a new identity
     - Follow the prompts to set up your identity
   - If you have an existing identity:
     - Enter your identity anchor
     - Authenticate

5. **Success Indicators:**
   - Console log: "Authentication successful: [principal-id]"
   - Navigation shows your truncated principal (e.g., "2vxsx...fae")
   - Dropdown menu shows full principal ID

## Troubleshooting

### Popup Blocked
- Check if your browser is blocking popups
- Allow popups from localhost:3000

### Connection Failed
- Ensure dfx is running: `dfx ping`
- Check Internet Identity is deployed: `dfx canister status internet_identity`
- Check console for specific error messages

### CORS Issues
- The local development setup should handle CORS automatically
- If issues persist, try using Chrome with disabled security:
  ```bash
  open -n -a "Google Chrome" --args --disable-web-security --user-data-dir=/tmp/chrome-dev
  ```

## Expected Console Output

When successful, you should see:
```
Attempting to connect...
Starting authentication with provider: 0
Identity Provider URL: http://localhost:4943/?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai
Authentication successful: 2vxsx-fae-...-cai
Connection successful!
```

## Testing Different Scenarios

1. **First-time User:**
   - Clear browser data/cookies
   - Test identity creation flow

2. **Returning User:**
   - Test with existing identity anchor

3. **Disconnect/Reconnect:**
   - Click disconnect in wallet menu
   - Try reconnecting

4. **Session Persistence:**
   - Refresh the page
   - Should maintain authentication state
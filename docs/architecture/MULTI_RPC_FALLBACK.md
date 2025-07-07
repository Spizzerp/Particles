# Multi-RPC Fallback System

## Overview

The Particle Funds application implements a robust multi-RPC fallback system to handle rate limiting and ensure reliable Ethereum network interactions. This system automatically rotates through multiple RPC providers when encountering failures or rate limits.

## RPC Providers

The system uses the following RPC providers in order of priority:

1. **Alchemy** (Primary)
   - High reliability and rate limits
   - Configure: `VITE_ALCHEMY_API_KEY`

2. **Ankr** (Fallback 1)
   - Good alternative with generous limits
   - Configure: `VITE_ANKR_API_KEY`

3. **Infura** (Fallback 2)
   - Established provider
   - Configure: `VITE_INFURA_PROJECT_ID`

4. **Sepolia Public RPC** (Fallback 3)
   - No API key required
   - Lower rate limits

5. **PublicNode** (Fallback 4)
   - No API key required
   - Community maintained

## Configuration

Update your `.env` file with your API keys:

```bash
# Primary RPC
VITE_ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
VITE_ALCHEMY_API_KEY=your_alchemy_api_key_here

# Fallback providers
VITE_INFURA_PROJECT_ID=your_infura_project_id_here
VITE_ANKR_API_KEY=your_ankr_api_key_here
VITE_ANKR_RPC_URL=https://rpc.ankr.com/eth_sepolia/

# Public endpoints (no configuration needed)
VITE_PUBLIC_RPC_1=https://rpc.sepolia.org
VITE_PUBLIC_RPC_2=https://ethereum-sepolia.publicnode.com
```

## Backend Implementation

The `EthereumAdapter` canister implements automatic fallback:

```motoko
// Multiple RPC endpoints configured
private let RPC_ENDPOINTS : [Text] = [
    // Primary, fallbacks, and public endpoints
];

// Automatic retry with next endpoint on failure
private func makeRpcCallWithRetries(...) : async Result.Result<Text, Text> {
    // Tries each endpoint until success
    // Detects rate limiting (429 errors)
    // Rotates to working endpoints
}
```

## Frontend Implementation

The frontend `rpcService.ts` provides:

- Automatic provider switching on failure
- Rate limit tracking per endpoint
- Connection pooling
- Retry logic

```typescript
// Get a working provider automatically
const provider = await rpcService.getProvider();

// Check balance with automatic fallback
const balance = await rpcService.checkBalance(address);
```

## Rate Limiting

The system tracks rate limits for each endpoint:
- 60-second windows
- 10 requests per window threshold
- Automatic cooldown when limits hit

## Testing

Test the multi-RPC system:

```bash
# Test all configured endpoints
./scripts/test_multi_rpc.sh

# Check individual endpoints
curl -X POST https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Monitoring

The system logs RPC usage:
- 🔄 Attempting connection
- ✅ Successful connection
- ⚠️ Rate limit detected
- ❌ Connection failed

## Best Practices

1. **Configure multiple providers**: At least 2-3 API keys
2. **Monitor usage**: Watch for rate limit patterns
3. **Upgrade plans**: Consider paid tiers for production
4. **Cache responses**: Reduce unnecessary RPC calls

## Troubleshooting

### All endpoints failing
- Check network connectivity
- Verify API keys are valid
- Ensure Sepolia testnet is operational

### Consistent rate limiting
- Add more RPC providers
- Implement request caching
- Reduce polling frequency

### Consensus errors
- Use `processSingleDeposit` instead of batch processing
- Ensures single RPC call per operation
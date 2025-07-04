# EVM RPC Canister Integration

## What is the EVM RPC Canister?

The EVM RPC canister (7hfb6-caaaa-aaaar-qadga-cai) is an Internet Computer service that:
- Makes HTTP outcalls to multiple Ethereum RPC providers
- Handles consensus internally by comparing responses
- Returns consistent results to your canister
- Supports mainnet and testnet (including Sepolia)

## Privacy Considerations

### What Remains Private:
- ✅ User identities (Principal IDs)
- ✅ Deposit commitments (zero-knowledge)
- ✅ ECDSA private keys
- ✅ User-to-address mappings

### What the EVM RPC Canister Sees:
- ⚠️ Ethereum addresses you query
- ⚠️ Transaction data you submit
- ⚠️ Block/balance queries

This is the same information any RPC provider would see. The key difference is that your canister doesn't need to achieve consensus across IC replicas.

## Code Changes Required

### 1. Replace HTTP Outcalls with EVM RPC Calls

Instead of:
```motoko
private func makeRpcCall(method: Text, params: Text) : async Result.Result<Text, Text> {
    // HTTP outcall code
}
```

Use:
```motoko
private func makeEvmRpcCall(method: Text, params: Text) : async Result.Result<Text, Text> {
    let rpcService = #EthSepolia(#PublicNode);
    let jsonRpc = "{\"jsonrpc\":\"2.0\",\"method\":\"" # method # 
                  "\",\"params\":" # params # ",\"id\":1}";
    
    let result = await evmRpc.request(rpcService, jsonRpc, 2048);
    
    switch (result) {
        case (#Ok(response)) { #ok(response) };
        case (#Err(error)) { 
            #err("EVM RPC error: " # debug_show(error))
        };
    };
}
```

### 2. For Balance Checks

```motoko
// Using EVM RPC's typed interface
let balanceResult = await evmRpc.eth_getBalance(
    #EthSepolia(?[#PublicNode, #Ankr]),
    null,
    {
        address = depositAddress;
        block = #Latest;
    }
);

switch (balanceResult) {
    case (#Consistent(#Ok(balance))) {
        // Use balance
    };
    case (#Consistent(#Err(error))) {
        // Handle error
    };
    case (#Inconsistent(_)) {
        // Rare, but handle inconsistency
    };
}
```

### 3. For Sending Transactions

```motoko
let sendResult = await evmRpc.eth_sendRawTransaction(
    #EthSepolia(?[#PublicNode, #Ankr]),
    null,
    signedTx
);
```

## Testnet and Consensus Issues

### Why Testnet Has More Consensus Issues:

1. **Less Reliable Infrastructure**: Testnet RPC nodes are often less maintained
2. **Fewer Nodes**: Fewer providers run Sepolia nodes vs mainnet
3. **Inconsistent State**: Testnet nodes sync less frequently
4. **Rate Limiting**: Free testnet endpoints have stricter limits

### The EVM RPC Canister Helps by:
- Using multiple providers simultaneously
- Finding consensus among responses
- Retrying failed requests
- Caching responses when appropriate

## Implementation Example

```motoko
// Before: Direct HTTP outcall (consensus issues)
let balanceResult = await makeRpcCall(
    "eth_getBalance", 
    "[\"" # address # "\",\"latest\"]"
);

// After: EVM RPC canister (handles consensus)
let balanceResult = await evmRpc.eth_getBalance(
    #EthSepolia(?[#PublicNode, #Ankr, #BlockPi]),
    null,
    { address = address; block = #Latest }
);
```

## Cost Considerations

- Each EVM RPC call costs cycles (like HTTP outcalls)
- The canister is maintained by DFINITY
- Free tier available for reasonable usage

## Migration Steps

1. Replace `makeRpcCall` with EVM RPC calls
2. Remove HTTP outcall consensus logic
3. Use typed interfaces for better reliability
4. Test with existing deposit flow
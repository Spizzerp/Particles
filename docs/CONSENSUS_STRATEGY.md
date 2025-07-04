# Sophisticated Consensus Strategy for ICP HTTP Outcalls

## The Problem
IC replicas must reach consensus on HTTP outcall responses. When different RPC nodes return slightly different data (e.g., different gas prices, block numbers), consensus fails.

## Recommended Solution: Response Normalization

### 1. **Use Block Number Pinning**
Instead of using "latest", pin to a specific block number:
```motoko
// Get block number first (this rarely changes between replicas)
let blockNumberResult = await makeRpcCall("eth_blockNumber", "[]");
let blockNumber = hexToNat(extractHexFromJson(blockNumberResult));

// Use specific block for all subsequent calls
let pinnedBlock = Nat.toText(blockNumber - 2); // Use 2 blocks ago for finality
let balanceResult = await makeRpcCall(
    "eth_getBalance", 
    "[\"" # address # "\",\"0x" # natToHex(blockNumber - 2) # "\"]"
);
```

### 2. **Normalize Gas Price Responses**
Round gas prices to reduce variance:
```motoko
private func normalizeGasPrice(price: Nat) : Nat {
    // Round to nearest gwei (1e9)
    let gwei = 1_000_000_000;
    ((price + gwei/2) / gwei) * gwei
};
```

### 3. **Use Deterministic Nonce Management**
Track nonces internally instead of querying:
```motoko
private stable var nonceTracker = Map.HashMap<Text, Nat>(10, Text.equal, Text.hash);

private func getNextNonce(address: Text) : Nat {
    switch (nonceTracker.get(address)) {
        case (?nonce) { nonce };
        case null { 0 };
    }
};
```

### 4. **Implement Response Caching**
Cache responses that don't change frequently:
```motoko
private type CachedResponse = {
    data: Text;
    timestamp: Int;
    blockNumber: Nat;
};

private var responseCache = Map.HashMap<Text, CachedResponse>(100, Text.equal, Text.hash);
private let CACHE_DURATION = 12_000_000_000; // 12 seconds in nanoseconds
```

### 5. **Use Specialized RPC Services**

#### Option A: IC-Native EVM RPC Canister
The EVM RPC canister (7hfb6-caaaa-aaaar-qadga-cai) handles consensus internally:
```motoko
let result = await evmRpc.eth_getBalance(
    #EthSepolia([#PublicNode, #Ankr]),
    null,
    { address = address; block = #Latest }
);
```

#### Option B: Single Consensus-Optimized Endpoint
Use endpoints designed for consensus systems:
- **Pocket Network**: Decentralized RPC with consistent responses
- **Chainstack**: Offers consensus-mode endpoints
- **QuickNode**: Has a "deterministic mode"

### 6. **Custom Consensus Handler**
Implement a custom handler that normalizes responses:
```motoko
private func makeConsensusRpcCall(method: Text, params: Text) : async Result.Result<Text, Text> {
    let responses = Buffer.Buffer<Text>(3);
    
    // Try 3 endpoints
    for (i in Iter.range(0, 2)) {
        let result = await makeRpcCallToEndpoint(RPC_ENDPOINTS[i], method, params);
        switch (result) {
            case (#ok(res)) { responses.add(res) };
            case (#err(_)) { };
        };
    };
    
    // Find consensus among responses
    if (responses.size() >= 2) {
        // For balance/nonce: take the minimum (safest)
        // For gas price: take the median
        // For block number: take the most common
        #ok(findConsensusValue(responses))
    } else {
        #err("Insufficient responses for consensus")
    }
};
```

## Recommended Implementation Priority

1. **Immediate Fix**: Use block number pinning (reduces most consensus issues)
2. **Medium Term**: Implement response normalization and caching
3. **Long Term**: Integrate with EVM RPC canister or specialized consensus endpoints

## Example: Consensus-Safe Fund Forwarding

```motoko
private func consensusSafeForwardFunds(address: Text, info: DepositInfo) : async Result.Result<Text, Text> {
    // 1. Get and pin block number
    let blockResult = await makeRpcCall("eth_blockNumber", "[]");
    let currentBlock = switch (blockResult) {
        case (#ok(res)) { hexToNat(extractHexFromJson(res)) };
        case (#err(e)) { return #err("Failed to get block: " # e) };
    };
    
    // Use block from 2 blocks ago for finality
    let safeBlock = currentBlock - 2;
    let blockHex = "0x" # natToHex(safeBlock);
    
    // 2. Get balance at specific block
    let balanceResult = await makeRpcCall(
        "eth_getBalance",
        "[\"" # address # "\",\"" # blockHex # "\"]"
    );
    
    // 3. Get nonce from internal tracker or specific block
    let nonce = getNextNonce(address);
    
    // 4. Use normalized gas price
    let gasPrice = normalizeGasPrice(30_000_000_000); // 30 gwei base
    
    // Continue with transaction...
}
```
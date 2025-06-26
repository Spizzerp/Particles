# Solana Chain Fusion Integration

## Overview
ICP's Solana integration enables direct cross-chain communication without bridges. This document outlines how to integrate Solana into Particle Fund using the official Solana RPC canister and threshold Ed25519 signatures.

## Architecture

### Key Components
1. **Solana RPC Canister** (`53cyg-yyaaa-aaaah-adpea-cai` on mainnet)
   - Multi-provider consensus for reliable data
   - Direct Solana blockchain access
   - No API keys required

2. **Threshold Ed25519 Signatures**
   - Native Solana signature support
   - Decentralized key management
   - No single point of failure

## Implementation Guide

### 1. Solana Adapter Canister

```motoko
// src/canisters/SolanaIntegration.mo
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Blob "mo:base/Blob";
import Text "mo:base/Text";
import IC "mo:base/ExperimentalInternetComputer";

actor SolanaAdapter {
    // Solana RPC canister ID
    private let SOLANA_RPC = actor("53cyg-yyaaa-aaaah-adpea-cai") : actor {
        getBalance : (address: Text) -> async Nat64;
        getSignaturesForAddress : (address: Text, limit: ?Nat8) -> async [TransactionSignature];
        sendTransaction : (transaction: Blob) -> async Result<Text, Text>;
        getTokenAccountBalance : (address: Text) -> async TokenBalance;
    };

    // Generate deposit address using threshold Ed25519
    public func getDepositAddress() : async Text {
        let { public_key } = await IC.ed25519_public_key({
            canister_id = null;
            derivation_path = [Principal.toBlob(Principal.fromActor(this))];
            key_id = { curve = #ed25519; name = "deposit_key" };
        });
        
        // Convert Ed25519 public key to Solana address
        return publicKeyToSolanaAddress(public_key);
    };

    // Monitor deposits via RPC canister
    public func checkDeposits(address: Text) : async [Deposit] {
        let signatures = await SOLANA_RPC.getSignaturesForAddress(address, ?10);
        var deposits : [Deposit] = [];
        
        for (sig in signatures.vals()) {
            if (sig.confirmationStatus == "finalized") {
                // Process finalized transactions
                deposits := Array.append(deposits, [processTransaction(sig)]);
            }
        };
        
        return deposits;
    };

    // Process withdrawals with threshold signatures
    public func processWithdrawal(
        recipient: Text,
        amount: Nat64,
        tokenMint: ?Text // null for SOL, mint address for SPL tokens
    ) : async Result<Text, Text> {
        // Build transaction
        let transaction = switch (tokenMint) {
            case null { buildSolTransfer(recipient, amount) };
            case (?mint) { buildSplTransfer(recipient, amount, mint) };
        };
        
        // Sign with threshold Ed25519
        let signature = await IC.sign_with_ed25519({
            message_hash = sha256(transaction);
            derivation_path = [Principal.toBlob(Principal.fromActor(this))];
            key_id = { curve = #ed25519; name = "withdrawal_key" };
        });
        
        // Submit via RPC canister
        return await SOLANA_RPC.sendTransaction(
            combineTransactionAndSignature(transaction, signature)
        );
    };
}
```

### 2. Deposit Flow Integration

```motoko
public func handleSolanaDeposit(depositInfo: SolanaDeposit) : async Result<DepositId, Text> {
    // Verify transaction finality
    if (depositInfo.confirmations < 32) {
        return #err("Insufficient confirmations");
    };
    
    // Extract deposit details
    let amount = depositInfo.amount;
    let commitment = generateCommitment(depositInfo.secret, depositInfo.nullifier, amount);
    
    // Add to Merkle tree
    let leafIndex = await addToMerkleTree(commitment);
    
    // Record deposit
    let deposit : Types.Deposit = {
        id = nextDepositId();
        user = depositInfo.sender;
        amount = amount;
        token = depositInfo.token; // "SOL" or SPL token mint
        chain = "Solana";
        commitment = commitment;
        leafIndex = leafIndex;
        timestamp = Time.now();
    };
    
    deposits.put(deposit.id, deposit);
    return #ok(deposit.id);
};
```

### 3. Withdrawal Flow Integration

```motoko
public func processSolanaWithdrawal(
    proof: Types.PlonkProof,
    withdrawalRequest: Types.WithdrawalRequest
) : async Result<Text, Text> {
    // Verify ZK proof
    let isValid = await PlonkIntegration.verifyWithdrawalProof(proof, withdrawalRequest);
    if (not isValid) {
        return #err("Invalid proof");
    };
    
    // Check nullifier hasn't been used
    if (await isNullifierUsed(withdrawalRequest.nullifierHash)) {
        return #err("Nullifier already used");
    };
    
    // Mark nullifier as used
    markNullifierUsed(withdrawalRequest.nullifierHash);
    
    // Process withdrawal via Solana adapter
    let result = await SolanaAdapter.processWithdrawal(
        withdrawalRequest.recipient,
        withdrawalRequest.amount,
        withdrawalRequest.tokenMint
    );
    
    switch (result) {
        case (#ok(txHash)) {
            recordWithdrawal(withdrawalRequest, txHash);
            #ok(txHash);
        };
        case (#err(msg)) {
            // Revert nullifier if withdrawal fails
            unmarkNullifier(withdrawalRequest.nullifierHash);
            #err(msg);
        };
    };
};
```

## Cost Analysis

### RPC Operations
- `getBalance`: ~13M cycles
- `getSignaturesForAddress`: ~20M cycles
- `sendTransaction`: ~50M cycles
- `getTokenAccountBalance`: ~15M cycles

### Total Withdrawal Cost
- ZK Verification: ~500M cycles ($0.08)
- Transaction Building: ~50M cycles ($0.01)
- Threshold Signature: ~100M cycles ($0.02)
- RPC Submit: ~50M cycles ($0.01)
- **Total**: ~700M cycles (~$0.12 per withdrawal)

## Security Considerations

1. **Transaction Finality**
   - Wait for "finalized" status (32+ confirmations)
   - Handle potential rollbacks gracefully

2. **Multi-Provider Consensus**
   - RPC canister queries multiple providers
   - Consensus ensures data reliability
   - No single point of failure

3. **Key Management**
   - Threshold Ed25519 prevents key compromise
   - Derivation paths for address isolation
   - Regular security audits

## Testing Strategy

### 1. Devnet Testing
```bash
# Deploy to local replica with devnet config
dfx deploy --network local solana_adapter --argument '(variant { Devnet })'

# Test deposit monitoring
dfx canister call solana_adapter checkDeposits '("devnet_address")'

# Test withdrawal
dfx canister call solana_adapter processWithdrawal '(
    "recipient_address",
    1000000000,
    null
)'
```

### 2. Integration Tests
- Mock RPC responses for unit tests
- Use Solana devnet for integration tests
- Test SPL token transfers
- Verify consensus handling

## SPL Token Support

### Supported Tokens
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- USDT: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- Custom SPL tokens via mint address

### Implementation
```motoko
public func getSplTokenBalance(
    walletAddress: Text,
    tokenMint: Text
) : async Nat64 {
    let tokenAccount = deriveAssociatedTokenAddress(walletAddress, tokenMint);
    let balance = await SOLANA_RPC.getTokenAccountBalance(tokenAccount);
    return balance.amount;
};
```

## Resources
- [Solana RPC Canister](https://github.com/dfinity/sol-rpc-canister)
- [ICP Solana Documentation](https://internetcomputer.org/docs/building-apps/chain-fusion/solana/overview)
- [Threshold Ed25519 Spec](https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-ed25519_public_key)
- [Solana Integration Announcement](https://medium.com/dfinity/icp-connecting-bitcoin-ethereum-and-now-solana-4565ed602565)

## Next Steps
1. Create SolanaIntegration.mo canister
2. Implement deposit address generation
3. Set up transaction monitoring
4. Test on Solana devnet
5. Add popular SPL tokens (USDC, USDT)
6. Update UI for Solana support
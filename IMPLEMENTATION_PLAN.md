# Particle Funds: Internet Identity & Chain Fusion Implementation Plan

## Overview
This document outlines the technical implementation plan for integrating Internet Identity authentication and ICP Chain Fusion capabilities into the Particle Funds cross-chain privacy pool application.

## Table of Contents
1. [Internet Identity Integration](#1-internet-identity-integration)
2. [Chain Fusion Multi-Chain Integration](#2-chain-fusion-multi-chain-integration)
3. [Architecture Changes](#3-architecture-changes)
4. [Implementation Timeline](#4-implementation-timeline)

---

## 1. Internet Identity Integration

### 1.1 Overview
Replace the current mock authentication system with Internet Identity (II) to provide secure, decentralized authentication for users.

### 1.2 Technology Choice: NFID IdentityKit

We'll use NFID's IdentityKit as it provides:
- Seamless Internet Identity integration
- Support for multiple wallet providers
- Better UX with social login options
- Built-in session management

### 1.3 Implementation Steps

#### Step 1: Install Dependencies
```bash
npm install @nfid/identitykit @dfinity/auth-client @dfinity/identity
```

#### Step 2: Create New Authentication Service
```typescript
// src/frontend/services/authService.ts
import { IdentityKit, AuthClientLoginOptions } from '@nfid/identitykit';
import { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

export class AuthService {
  private identityKit: IdentityKit;
  private authClient: AuthClient | null = null;
  private identity: Identity | null = null;

  constructor() {
    this.identityKit = IdentityKit.create({
      authType: 'II', // or 'NFID' for NFID wallet
      signerClientOptions: {
        derivationOrigin: import.meta.env.VITE_DFX_NETWORK === 'ic' 
          ? 'https://identity.ic0.app'
          : `http://localhost:4943/?canisterId=${import.meta.env.VITE_INTERNET_IDENTITY_CANISTER_ID}`,
      },
    });
  }

  async connect(): Promise<{ principal: Principal; identity: Identity }> {
    const authClient = await AuthClient.create();
    this.authClient = authClient;

    const isAuthenticated = await authClient.isAuthenticated();
    
    if (isAuthenticated) {
      const identity = authClient.getIdentity();
      const principal = identity.getPrincipal();
      this.identity = identity;
      return { principal, identity };
    }

    return new Promise((resolve, reject) => {
      this.identityKit.login({
        onSuccess: async () => {
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal();
          this.identity = identity;
          resolve({ principal, identity });
        },
        onError: (error) => {
          reject(error);
        },
        windowOpenerFeatures: `
          left=${window.screen.width / 2 - 525 / 2},
          top=${window.screen.height / 2 - 705 / 2},
          toolbar=0,location=0,menubar=0,width=525,height=705
        `,
      } as AuthClientLoginOptions);
    });
  }

  async disconnect(): Promise<void> {
    if (this.authClient) {
      await this.authClient.logout();
      this.identity = null;
    }
  }

  getIdentity(): Identity | null {
    return this.identity;
  }

  async isAuthenticated(): Promise<boolean> {
    if (this.authClient) {
      return await this.authClient.isAuthenticated();
    }
    return false;
  }
}
```

#### Step 3: Update AuthContext
```typescript
// src/frontend/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Principal } from '@dfinity/principal';
import { Identity } from '@dfinity/agent';
import { AuthService } from '../services/authService';

interface AuthContextType {
  principal: Principal | null;
  identity: Identity | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const authService = new AuthService();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      if (authenticated) {
        const identity = authService.getIdentity();
        if (identity) {
          setPrincipal(identity.getPrincipal());
          setIdentity(identity);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const connect = async () => {
    try {
      setIsLoading(true);
      const { principal, identity } = await authService.connect();
      setPrincipal(principal);
      setIdentity(identity);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setIsLoading(true);
      await authService.disconnect();
      setPrincipal(null);
      setIdentity(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        principal, 
        identity, 
        isAuthenticated, 
        isLoading, 
        connect, 
        disconnect 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

#### Step 4: Update Actor Factory for Authenticated Calls
```typescript
// src/frontend/services/actorFactory.ts
import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { idlFactory as depositManagerIDL } from '../../../.dfx/local/canisters/deposit_manager/deposit_manager.did.js';
// ... other IDL imports

export class ActorFactory {
  private static agents = new Map<string, HttpAgent>();

  static async createActor<T>(
    canisterId: string,
    idlFactory: any,
    identity?: Identity
  ): Promise<T> {
    const host = import.meta.env.VITE_DFX_NETWORK === 'ic' 
      ? 'https://ic0.app' 
      : 'http://localhost:4943';

    // Use cached agent for the same identity
    const agentKey = identity ? identity.getPrincipal().toString() : 'anonymous';
    
    let agent = this.agents.get(agentKey);
    if (!agent) {
      agent = new HttpAgent({ host, identity });
      
      if (import.meta.env.VITE_DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey();
      }
      
      this.agents.set(agentKey, agent);
    }

    return Actor.createActor<T>(idlFactory, {
      agent,
      canisterId,
    });
  }

  // Helper methods for each canister
  static async createDepositManager(identity?: Identity) {
    return this.createActor(
      import.meta.env.VITE_DEPOSIT_MANAGER_CANISTER_ID,
      depositManagerIDL,
      identity
    );
  }
  
  // ... similar methods for other canisters
}
```

### 1.4 Wallet Connection UI Component
```typescript
// src/frontend/components/WalletConnect.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const WalletConnect: React.FC = () => {
  const { principal, isAuthenticated, isLoading, connect, disconnect } = useAuth();

  if (isLoading) {
    return (
      <button className="wallet-button" disabled>
        <span className="spinner" />
        Connecting...
      </button>
    );
  }

  if (isAuthenticated && principal) {
    return (
      <div className="wallet-connected">
        <span className="wallet-address">
          {principal.toString().slice(0, 5)}...{principal.toString().slice(-3)}
        </span>
        <button className="disconnect-button" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button className="wallet-button" onClick={connect}>
      Connect Wallet
    </button>
  );
};
```

---

## 2. Chain Fusion Multi-Chain Integration

### 2.1 Overview
ICP's Chain Fusion enables native Bitcoin and Ethereum integration through:
- **Threshold ECDSA**: Decentralized key management for signing transactions
- **HTTPS Outcalls**: Direct interaction with external chains
- **Bitcoin/Ethereum Integration**: Native support for reading state and sending transactions

### 2.2 Architecture Components

#### Chain Fusion Manager Canister
```motoko
// src/canisters/ChainFusionManager.mo
import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Types "../types/Types";

actor ChainFusionManager {
    // Threshold ECDSA key name
    private let key_name : Text = switch (Principal.toText(Principal.fromActor(this))) {
        case (principal) {
            if (Text.contains(principal, #text "mainnet")) {
                "production"
            } else {
                "test_key_1"
            };
        };
    };

    // Bitcoin Integration
    public type BitcoinAddress = Text;
    public type Satoshi = Nat64;
    
    public type GetUtxosResponse = {
        utxos: [Utxo];
        tip_block_hash: Blob;
        tip_height: Nat32;
        next_page: ?Blob;
    };

    public type Utxo = {
        outpoint: { txid: Blob; vout: Nat32 };
        value: Satoshi;
        height: Nat32;
    };

    // Generate Bitcoin address for a principal
    public func generateBitcoinAddress(principal: Principal) : async Result.Result<BitcoinAddress, Text> {
        let caller = Principal.toBlob(principal);
        
        try {
            // Call threshold ECDSA to get public key
            let { public_key } = await ecdsa_public_key({
                canister_id = null;
                derivation_path = [caller];
                key_id = { curve = #secp256k1; name = key_name };
            });

            // Convert to Bitcoin address (P2PKH for simplicity)
            let address = publicKeyToBitcoinAddress(public_key);
            #ok(address)
        } catch (e) {
            #err("Failed to generate Bitcoin address: " # Error.message(e))
        }
    };

    // Get Bitcoin balance
    public func getBitcoinBalance(address: BitcoinAddress) : async Result.Result<Satoshi, Text> {
        try {
            let response = await bitcoin_get_utxos({
                address = address;
                network = #testnet;
                filter = null;
            });

            var balance : Satoshi = 0;
            for (utxo in response.utxos.vals()) {
                balance += utxo.value;
            };

            #ok(balance)
        } catch (e) {
            #err("Failed to get Bitcoin balance: " # Error.message(e))
        }
    };

    // Send Bitcoin transaction
    public func sendBitcoin(
        from: Principal,
        to: BitcoinAddress,
        amount: Satoshi
    ) : async Result.Result<Blob, Text> {
        try {
            // Get UTXOs for the sender's address
            let senderAddress = switch (await generateBitcoinAddress(from)) {
                case (#ok(addr)) { addr };
                case (#err(e)) { return #err(e) };
            };

            let utxosResponse = await bitcoin_get_utxos({
                address = senderAddress;
                network = #testnet;
                filter = null;
            });

            // Build transaction
            let tx = buildBitcoinTransaction(utxosResponse.utxos, to, amount);

            // Sign transaction with threshold ECDSA
            let signature = await signWithECDSA(from, tx);

            // Submit transaction
            let txId = await bitcoin_send_transaction({
                network = #testnet;
                transaction = signature.signed_transaction;
            });

            #ok(txId)
        } catch (e) {
            #err("Failed to send Bitcoin: " # Error.message(e))
        }
    };

    // Ethereum Integration
    public type EthereumAddress = Text;
    public type Wei = Nat;

    // Generate Ethereum address
    public func generateEthereumAddress(principal: Principal) : async Result.Result<EthereumAddress, Text> {
        let caller = Principal.toBlob(principal);
        
        try {
            let { public_key } = await ecdsa_public_key({
                canister_id = null;
                derivation_path = [caller];
                key_id = { curve = #secp256k1; name = key_name };
            });

            let address = publicKeyToEthereumAddress(public_key);
            #ok(address)
        } catch (e) {
            #err("Failed to generate Ethereum address: " # Error.message(e))
        }
    };

    // Get Ethereum balance using HTTPS outcalls
    public func getEthereumBalance(address: EthereumAddress) : async Result.Result<Wei, Text> {
        let rpc_url = "https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY";
        
        let request_body = "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"" # 
                          address # "\",\"latest\"],\"id\":1}";

        let http_request : HttpRequest = {
            url = rpc_url;
            method = #post;
            body = Text.encodeUtf8(request_body);
            headers = [
                { name = "Content-Type"; value = "application/json" }
            ];
        };

        try {
            let http_response = await http_request(http_request);
            let response_body = Text.decodeUtf8(http_response.body);
            
            // Parse JSON response and extract balance
            switch (response_body) {
                case (?body) {
                    let balance = parseEthereumBalance(body);
                    #ok(balance)
                };
                case null { #err("Failed to decode response") };
            }
        } catch (e) {
            #err("Failed to get Ethereum balance: " # Error.message(e))
        }
    };

    // Send Ethereum transaction
    public func sendEthereum(
        from: Principal,
        to: EthereumAddress,
        amount: Wei
    ) : async Result.Result<Text, Text> {
        try {
            // Get sender's Ethereum address
            let senderAddress = switch (await generateEthereumAddress(from)) {
                case (#ok(addr)) { addr };
                case (#err(e)) { return #err(e) };
            };

            // Get nonce
            let nonce = await getEthereumNonce(senderAddress);

            // Build transaction
            let tx = {
                to = to;
                value = amount;
                nonce = nonce;
                gasLimit = 21000;
                gasPrice = await getGasPrice();
                chainId = 11155111; // Sepolia testnet
            };

            // Sign with threshold ECDSA
            let signedTx = await signEthereumTransaction(from, tx);

            // Send via HTTPS outcall
            let txHash = await sendRawEthereumTransaction(signedTx);

            #ok(txHash)
        } catch (e) {
            #err("Failed to send Ethereum: " # Error.message(e))
        }
    };

    // Helper function to sign with threshold ECDSA
    private func signWithECDSA(principal: Principal, message: Blob) : async SignatureResult {
        let caller = Principal.toBlob(principal);
        
        await sign_with_ecdsa({
            message_hash = message;
            derivation_path = [caller];
            key_id = { curve = #secp256k1; name = key_name };
        })
    };

    // External canister interfaces
    private let ecdsa_public_key : (PublicKeyArgs) -> async PublicKeyResult = 
        Actor.fromActor(this).ecdsa_public_key;
    
    private let sign_with_ecdsa : (SignArgs) -> async SignatureResult = 
        Actor.fromActor(this).sign_with_ecdsa;

    private let bitcoin_get_utxos : (GetUtxosArgs) -> async GetUtxosResponse = 
        Actor.fromActor(this).bitcoin_get_utxos;

    private let bitcoin_send_transaction : (SendTransactionArgs) -> async Blob = 
        Actor.fromActor(this).bitcoin_send_transaction;

    private let http_request : (HttpRequest) -> async HttpResponse = 
        Actor.fromActor(this).http_request;
}
```

### 2.3 Cross-Chain Deposit Flow

#### Updated Deposit Manager
```motoko
// src/canisters/DepositManager.mo (additions)
import ChainFusion "ChainFusionManager";

actor DepositManager {
    private let chainFusion : ChainFusion.ChainFusionManager = 
        actor(Principal.toText(chainFusionCanisterId));

    // Multi-chain deposit with Chain Fusion
    public shared(msg) func depositWithChainFusion(
        amount: Types.Amount,
        tokenId: Types.TokenId,
        chainId: Types.ChainId,
        commitment: Types.CommitmentHash
    ) : async Result.Result<Types.Deposit, Text> {
        let caller = msg.caller;

        // Generate chain-specific address
        let depositAddress = switch (chainId) {
            case (0) { // Bitcoin
                switch (await chainFusion.generateBitcoinAddress(caller)) {
                    case (#ok(addr)) { addr };
                    case (#err(e)) { return #err(e) };
                }
            };
            case (1) { // Ethereum
                switch (await chainFusion.generateEthereumAddress(caller)) {
                    case (#ok(addr)) { addr };
                    case (#err(e)) { return #err(e) };
                }
            };
            case (_) { return #err("Unsupported chain") };
        };

        // Monitor for incoming deposit
        let monitorResult = await monitorDeposit(depositAddress, amount, chainId);
        
        switch (monitorResult) {
            case (#ok(txId)) {
                // Create deposit record
                let deposit = createDeposit(caller, amount, tokenId, chainId, commitment);
                deposits.put(deposit.id, deposit);
                
                // Update Merkle tree
                await cryptoComponents.addLeaf(commitment);
                
                #ok(deposit)
            };
            case (#err(e)) { #err(e) };
        }
    };

    // Monitor incoming deposits on external chains
    private func monitorDeposit(
        address: Text,
        expectedAmount: Nat,
        chainId: Nat
    ) : async Result.Result<Blob, Text> {
        // Set up a timer to check for deposits
        let timerId = Timer.setTimer(#seconds(10), func() : async () {
            switch (chainId) {
                case (0) { // Bitcoin
                    let balance = await chainFusion.getBitcoinBalance(address);
                    // Check if balance matches expected amount
                };
                case (1) { // Ethereum
                    let balance = await chainFusion.getEthereumBalance(address);
                    // Check if balance matches expected amount
                };
                case (_) {};
            };
        });

        // In production, use more sophisticated monitoring
        #ok(Blob.fromArray([]))
    };
}
```

### 2.4 Cross-Chain Withdrawal Flow

#### Updated Withdrawal Processor
```motoko
// src/canisters/WithdrawalProcessor.mo (additions)
import ChainFusion "ChainFusionManager";

actor WithdrawalProcessor {
    private let chainFusion : ChainFusion.ChainFusionManager = 
        actor(Principal.toText(chainFusionCanisterId));

    // Process withdrawal with Chain Fusion
    public shared(msg) func processWithdrawalWithChainFusion(
        nullifier: Types.NullifierHash,
        recipient: Text,
        amount: Types.Amount,
        tokenId: Types.TokenId,
        chainId: Types.ChainId,
        merkleRoot: Types.MerkleRoot,
        proof: Types.ZKProof
    ) : async Result.Result<Types.Withdrawal, Text> {
        // Verify proof (existing logic)
        let isValidProof = await cryptoComponents.verifyWithdrawalProof(
            nullifier, recipient, amount, merkleRoot, proof
        );

        if (not isValidProof) {
            return #err("Invalid withdrawal proof");
        };

        // Check nullifier hasn't been used
        if (nullifiers.get(nullifier) != null) {
            return #err("Nullifier already used");
        };

        // Execute cross-chain withdrawal
        let withdrawalResult = switch (chainId) {
            case (0) { // Bitcoin
                await chainFusion.sendBitcoin(
                    Principal.fromActor(this),
                    recipient,
                    amount
                )
            };
            case (1) { // Ethereum
                await chainFusion.sendEthereum(
                    Principal.fromActor(this),
                    recipient,
                    amount
                )
            };
            case (_) { #err("Unsupported chain") };
        };

        switch (withdrawalResult) {
            case (#ok(txId)) {
                // Record withdrawal
                let withdrawal = createWithdrawal(
                    nullifier, recipient, amount, tokenId, 
                    chainId, merkleRoot, proof
                );
                
                withdrawals.put(withdrawal.id, withdrawal);
                nullifiers.put(nullifier, withdrawal.id);
                
                #ok(withdrawal)
            };
            case (#err(e)) { #err(e) };
        }
    };
}
```

---

## 3. Architecture Changes

### 3.1 Frontend Updates

#### Chain Selection Component
```typescript
// src/frontend/components/ChainSelector.tsx
import React from 'react';

export interface Chain {
  id: number;
  name: string;
  icon: string;
  nativeCurrency: string;
}

const SUPPORTED_CHAINS: Chain[] = [
  { id: 0, name: 'Bitcoin', icon: '₿', nativeCurrency: 'BTC' },
  { id: 1, name: 'Ethereum', icon: 'Ξ', nativeCurrency: 'ETH' },
  { id: 2, name: 'Internet Computer', icon: '∞', nativeCurrency: 'ICP' },
];

interface ChainSelectorProps {
  selectedChain: number;
  onChainSelect: (chainId: number) => void;
}

export const ChainSelector: React.FC<ChainSelectorProps> = ({
  selectedChain,
  onChainSelect,
}) => {
  return (
    <div className="chain-selector">
      {SUPPORTED_CHAINS.map((chain) => (
        <button
          key={chain.id}
          className={`chain-option ${selectedChain === chain.id ? 'selected' : ''}`}
          onClick={() => onChainSelect(chain.id)}
        >
          <span className="chain-icon">{chain.icon}</span>
          <span className="chain-name">{chain.name}</span>
        </button>
      ))}
    </div>
  );
};
```

#### Updated Deposit Page
```typescript
// src/frontend/pages/DepositPage.tsx (updated)
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChainSelector } from '../components/ChainSelector';
import { ActorFactory } from '../services/actorFactory';
import { generateCommitment } from '../utils/crypto';

export const DepositPage: React.FC = () => {
  const { identity, isAuthenticated } = useAuth();
  const [selectedChain, setSelectedChain] = useState(0);
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  const handleDeposit = async () => {
    if (!isAuthenticated || !identity) {
      alert('Please connect your wallet first');
      return;
    }

    setIsDepositing(true);
    try {
      const depositManager = await ActorFactory.createDepositManager(identity);
      
      // Generate commitment for privacy
      const { commitment, secret } = await generateCommitment(amount, selectedChain);
      
      // Store secret locally (in production, use secure storage)
      localStorage.setItem(`deposit_secret_${commitment}`, secret);
      
      // Execute deposit
      const result = await depositManager.depositWithChainFusion(
        BigInt(amount),
        'native', // tokenId
        selectedChain,
        commitment
      );

      if ('ok' in result) {
        alert(`Deposit initiated! Save your secret: ${secret}`);
      } else {
        alert(`Deposit failed: ${result.err}`);
      }
    } catch (error) {
      console.error('Deposit error:', error);
      alert('Deposit failed');
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="deposit-page">
      <h1>Deposit Funds</h1>
      
      <ChainSelector 
        selectedChain={selectedChain}
        onChainSelect={setSelectedChain}
      />
      
      <div className="amount-input">
        <label>Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
        />
      </div>
      
      <button 
        className="deposit-button"
        onClick={handleDeposit}
        disabled={!amount || isDepositing}
      >
        {isDepositing ? 'Processing...' : 'Deposit'}
      </button>
    </div>
  );
};
```

### 3.2 Backend Architecture Updates

#### New Canister Structure
```
src/canisters/
├── ChainFusionManager.mo      # New: Handles cross-chain operations
├── DepositManager.mo           # Updated: Integrates with Chain Fusion
├── WithdrawalProcessor.mo      # Updated: Integrates with Chain Fusion
├── ParticleRouter.mo           # Updated: Chain-aware routing
├── PatternBreaker.mo           # Existing
├── CryptoComponents.mo         # Existing
└── TokenRegistry.mo            # New: Multi-chain token management
```

#### Token Registry Canister
```motoko
// src/canisters/TokenRegistry.mo
import Map "mo:base/HashMap";
import Text "mo:base/Text";
import Result "mo:base/Result";

actor TokenRegistry {
    public type TokenInfo = {
        symbol: Text;
        name: Text;
        decimals: Nat8;
        chainId: Nat;
        contractAddress: ?Text; // null for native tokens
    };

    private var tokens = Map.HashMap<Text, TokenInfo>(10, Text.equal, Text.hash);

    public func registerToken(
        tokenId: Text,
        info: TokenInfo
    ) : async Result.Result<(), Text> {
        tokens.put(tokenId, info);
        #ok()
    };

    public query func getToken(tokenId: Text) : async ?TokenInfo {
        tokens.get(tokenId)
    };

    public query func getTokensByChain(chainId: Nat) : async [TokenInfo] {
        Iter.toArray(
            Iter.filter(
                tokens.vals(),
                func(token: TokenInfo) : Bool { token.chainId == chainId }
            )
        )
    };
}
```

### 3.3 Configuration Updates

#### Environment Variables
```bash
# .env.local
VITE_DFX_NETWORK=local
VITE_INTERNET_IDENTITY_CANISTER_ID=rdmx6-jaaaa-aaaaa-aaadq-cai
VITE_CHAIN_FUSION_CANISTER_ID=<chain_fusion_canister_id>
VITE_BITCOIN_NETWORK=testnet
VITE_ETHEREUM_NETWORK=sepolia
VITE_ALCHEMY_API_KEY=<your_alchemy_key>
```

#### Updated dfx.json
```json
{
  "version": 1,
  "canisters": {
    "chain_fusion_manager": {
      "type": "motoko",
      "main": "src/canisters/ChainFusionManager.mo"
    },
    "token_registry": {
      "type": "motoko",
      "main": "src/canisters/TokenRegistry.mo"
    },
    "deposit_manager": {
      "type": "motoko",
      "main": "src/canisters/DepositManager.mo",
      "dependencies": ["chain_fusion_manager", "crypto_components"]
    },
    "withdrawal_processor": {
      "type": "motoko",
      "main": "src/canisters/WithdrawalProcessor.mo",
      "dependencies": ["chain_fusion_manager", "crypto_components"]
    },
    // ... other canisters
  }
}
```

---

## 4. Implementation Timeline

### Phase 1: Internet Identity Integration (Week 1-2)
- [ ] Install authentication dependencies
- [ ] Implement AuthService with NFID IdentityKit
- [ ] Update AuthContext for real authentication
- [ ] Create WalletConnect UI component
- [ ] Update actor factory for authenticated calls
- [ ] Test authentication flow end-to-end

### Phase 2: Chain Fusion Foundation (Week 3-4)
- [ ] Create ChainFusionManager canister
- [ ] Implement threshold ECDSA integration
- [ ] Set up Bitcoin address generation
- [ ] Set up Ethereum address generation
- [ ] Implement HTTPS outcalls for Ethereum
- [ ] Create TokenRegistry canister

### Phase 3: Cross-Chain Deposits (Week 5-6)
- [ ] Update DepositManager with Chain Fusion
- [ ] Implement deposit monitoring logic
- [ ] Create ChainSelector component
- [ ] Update deposit UI for multi-chain
- [ ] Implement commitment generation
- [ ] Test Bitcoin deposits
- [ ] Test Ethereum deposits

### Phase 4: Cross-Chain Withdrawals (Week 7-8)
- [ ] Update WithdrawalProcessor with Chain Fusion
- [ ] Implement cross-chain transaction signing
- [ ] Update withdrawal UI
- [ ] Test Bitcoin withdrawals
- [ ] Test Ethereum withdrawals
- [ ] Implement transaction status tracking

### Phase 5: Testing & Optimization (Week 9-10)
- [ ] Comprehensive integration testing
- [ ] Performance optimization
- [ ] Security audit preparation
- [ ] Documentation updates
- [ ] Mainnet deployment preparation

## Security Considerations

1. **Key Management**: Threshold ECDSA keys are managed by the IC network
2. **Private Key Security**: No private keys are stored in canisters
3. **Transaction Verification**: All transactions are verified on-chain
4. **Access Control**: Principal-based access control for all operations
5. **Audit Trail**: All cross-chain operations are logged

## Next Steps

1. Set up development environment with local Bitcoin and Ethereum nodes
2. Obtain testnet tokens for testing
3. Configure Alchemy or Infura for Ethereum RPC access
4. Begin implementation starting with Internet Identity integration
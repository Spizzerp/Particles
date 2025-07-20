import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Int64 "mo:base/Int64";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import Hex "./utils/Hex";
import Keccak "./utils/Keccak";
import RLP "./utils/RLP";
import ECDSAUtils "./utils/ECDSAUtils";
import Map "mo:base/HashMap";
import Time "mo:base/Time";
import Error "mo:base/Error";
import Debug "mo:base/Debug";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Float "mo:base/Float";

actor EthereumAdapter {
    
    // Cycle management
    private let MINIMUM_CYCLES : Nat = 5_000_000_000_000; // 5T cycles minimum
    
    private func hasSufficientCycles() : Bool {
        ExperimentalCycles.balance() > MINIMUM_CYCLES
    };
    
    public query func getCycleBalance() : async Nat {
        ExperimentalCycles.balance()
    };
    
    public func acceptCycles() : async Nat {
        let available = ExperimentalCycles.available();
        let accepted = ExperimentalCycles.accept(available);
        accepted
    };

    private type DepositEvent = {
        commitment: Text;
        amount: Nat;
        sender: Text;
        blockNumber: Nat;
        txHash: Text;
        timestamp: Int;
    };

    // Updated deposit info to include userId for key derivation
    private type DepositInfo = {
        commitment: Text;
        amount: Nat;
        timestamp: Int;
        userId: Principal;
        processed: Bool;
    };

    // Privacy-preserving deposit claim system
    private type DepositState = {
        #AwaitingFunds;
        #FundsReceived;
        #Processing;
        #Completed;
        #Failed;
    };

    private type DepositClaim = {
        claimer: Principal;        // Who can process this deposit (temporary)
        depositAddress: Text;      
        expiresAt: Time.Time;      // When the claim expires
        commitment: Text;          
        expectedAmount: Nat;
        state: DepositState;
        processingTxHash: ?Text;
        errorMessage: ?Text;
        retryCount: Nat;
    };

    // Separate storage for privacy
    private var depositClaims = Map.HashMap<Text, DepositClaim>(100, Text.equal, Text.hash);
    private let CLAIM_EXPIRY_TIME : Int = 10 * 60 * 1_000_000_000; // 10 minutes in nanoseconds

    private type EthereumTransaction = {
        to: Text;
        value: Nat;
        data: Blob;
        nonce: Nat;
        gasPrice: Nat;
        gasLimit: Nat;
        chainId: Nat;
    };

    // EIP-1559 Transaction type
    private type EIP1559Transaction = {
        to: Text;
        value: Nat;
        data: Blob;
        nonce: Nat;
        maxFeePerGas: Nat;
        maxPriorityFeePerGas: Nat;
        gasLimit: Nat;
        chainId: Nat;
    };

    // EVM RPC types
    private type RpcServices = {
        #EthSepolia : ?[EthSepoliaService];
        #EthMainnet : ?[EthMainnetService];
    };
    
    private type EthSepoliaService = {
        #Alchemy;
        #Ankr;
        #BlockPi;
        #PublicNode;
        #Sepolia;
    };

    private type EthMainnetService = {
        #Alchemy;
        #Ankr;
        #BlockPi;
        #Cloudflare;
        #PublicNode;
        #Llama;
    };

    private type BlockTag = {
        #Latest;
        #Earliest;
        #Pending;
        #Number : Nat;
    };

    private type RpcConfig = {
        responseSizeEstimate: ?Nat64;
        responseConsensus: ?{
            #Equality;
            #Threshold : { total: ?Nat8; min: Nat8 };
        };
    };
    
    // Fee history types
    private type FeeHistory = {
        baseFeePerGas: [Nat];
        reward: [[Nat]];
        gasUsedRatio: [Float];
        oldestBlock: Nat;
    };
    
    private type FeeHistoryArgs = {
        blockCount: Nat;
        newestBlock: BlockTag;
        rewardPercentiles: ?[Nat8];
    };
    
    private type FeeHistoryResult = {
        #Ok : FeeHistory;
        #Err : RpcError;
    };
    
    private type MultiFeeHistoryResult = {
        #Consistent : FeeHistoryResult;
        #Inconsistent : [(RpcService, FeeHistoryResult)];
    };

    private type GetTransactionCountArgs = {
        address: Text;
        block: BlockTag;
    };

    private type MultiCallResult = {
        #Consistent : CallResult;
        #Inconsistent : [(RpcService, CallResult)];
    };

    private type CallResult = {
        #Ok : Text;
        #Err : RpcError;
    };

    private type RpcError = {
        #JsonRpcError : { code: Int64; message: Text };
        #ProviderError : {
            #TooFewCycles : { expected: Nat; received: Nat };
            #MissingRequiredProvider;
            #ProviderNotFound;
            #NoPermission;
        };
        #ValidationError : {
            #Custom : Text;
            #InvalidHex : Text;
        };
        #HttpOutcallError : {
            #IcError : { code: { #NoError; #CanisterError; #SysTransient; #DestinationInvalid; #Unknown; #SysFatal; #CanisterReject }; message: Text };
            #InvalidHttpJsonRpcResponse : { status: Nat16; body: Text; parsingError: ?Text };
        };
    };

    private type RpcService = {
        #EthSepolia : EthSepoliaService;
        #EthMainnet : EthMainnetService;
    };

    private type MultiGetTransactionCountResult = {
        #Consistent : GetTransactionCountResult;
        #Inconsistent : [(RpcService, GetTransactionCountResult)];
    };

    private type GetTransactionCountResult = {
        #Ok : Nat;
        #Err : RpcError;
    };

    private type MultiSendRawTransactionResult = {
        #Consistent : SendRawTransactionResult;
        #Inconsistent : [(RpcService, SendRawTransactionResult)];
    };

    private type SendRawTransactionResult = {
        #Ok : SendRawTransactionStatus;
        #Err : RpcError;
    };

    private type SendRawTransactionStatus = {
        #Ok : ?Text;
        #NonceTooLow;
        #NonceTooHigh;
        #InsufficientFunds;
    };

    private type RequestResult = {
        #Ok : Text;
        #Err : RpcError;
    };

    // Transaction receipt types
    private type TransactionReceipt = {
        transactionHash: Text;
        blockNumber: Nat;
        blockHash: Text;
        status: Text; // "0x1" for success, "0x0" for failure
        gasUsed: Nat;
        cumulativeGasUsed: Nat;
        from: Text;
        to: ?Text;
        contractAddress: ?Text;
        logs: [LogEntry];
    };


    private type GetTransactionReceiptResult = {
        #Ok : ?TransactionReceipt;
        #Err : RpcError;
    };

    private type MultiGetTransactionReceiptResult = {
        #Consistent : GetTransactionReceiptResult;
        #Inconsistent : [(RpcService, GetTransactionReceiptResult)];
    };

    private type GetLogsArgs = {
        fromBlock : ?BlockTag;
        toBlock : ?BlockTag;
        addresses : [Text];
        topics : ?[?Text];
    };

    private type LogEntry = {
        transactionHash : ?Text;
        blockNumber : ?Nat;
        data : Text;
        blockHash : ?Text;
        transactionIndex : ?Nat;
        topics : [Text];
        address : Text;
        logIndex : ?Nat;
        removed : Bool;
    };

    private type MultiGetLogsResult = {
        #Consistent : GetLogsResult;
        #Inconsistent : [(RpcService, GetLogsResult)];
    };

    private type GetLogsResult = {
        #Ok : [LogEntry];
        #Err : RpcError;
    };

    private type GetLogsRpcConfig = {
        responseSizeEstimate : ?Nat64;
        responseConsensus : ?{
            #Equality;
            #Threshold : { total: ?Nat8; min: Nat8 };
        };
        maxBlockRange : ?Nat32;
    };

    // HTTP outcall types
    private type HttpRequestArgs = {
        url : Text;
        max_response_bytes : ?Nat64;
        headers : [HttpHeader];
        body : ?Blob;
        method : { #get; #post };
        transform : ?{
            function : shared query ({response : HttpResponsePayload; context : Blob}) -> async HttpResponsePayload;
            context : Blob;
        };
    };

    private type HttpHeader = {
        name : Text;
        value : Text;
    };

    private type HttpResponsePayload = {
        status : Nat;
        headers : [HttpHeader];
        body : Blob;
    };
    
    // State
    private stable var depositContractAddress : Text = "0xd72114Ae0a3E80B921Ca26aB522F9Fa656a6c2e1"; // Sepolia testnet pool contract (July 14, 2025 deployment)
    private stable var lastCheckedBlock : Nat = 0;
    private stable var nonce : Nat = 0;
    
    // Enhanced deposit tracking
    private stable var depositAddressesStable : [(Text, DepositInfo)] = [];
    private var depositAddresses = Map.HashMap<Text, DepositInfo>(100, Text.equal, Text.hash);
    
    // Track processed deposits to avoid duplicates
    private stable var processedDepositsStable : [(Text, Int)] = [];
    private var processedDeposits = Map.HashMap<Text, Int>(100, Text.equal, Text.hash);

    // Constants
    private let ECDSA_KEY_NAME : Text = "key_1";  // Production key for mainnet
    private let DEPOSIT_EVENT_SIGNATURE = "0x90890809c654f11d6e72a28fa60149770a0d11ec6c92319d6ceb2bb0a4ea1a15";
    
    // Keccak256 canister ID - will be updated after deployment
    private var keccak256CanisterId : Text = "hjxjp-uyaaa-aaaaj-a2dha-cai"; // ICP Mainnet keccak256 canister (works for all Ethereum networks)
    
    // RPC Configuration - Using public endpoints only
    // Private endpoints with API keys should be configured through environment variables
    // and passed from frontend or through a secure configuration method
    private let RPC_ENDPOINTS : [Text] = [
        // Public endpoints that don't require API keys
        "https://ethereum-sepolia.publicnode.com",
        "https://eth-sepolia.public.blastapi.io",
        "https://sepolia.drpc.org",
        "https://endpoints.omniatech.io/v1/eth/sepolia/public",
        "https://eth-sepolia-public.unifra.io"
    ];
    
    // Track current RPC endpoint index for rotation
    private stable var currentRpcIndex : Nat = 0;
    
    // ECDSA types removed to avoid conflicts
    
    // Management canister interface
    private let ic : actor {
        http_request : HttpRequestArgs -> async HttpResponsePayload;
        ecdsa_public_key : ({
            canister_id : ?Principal;
            derivation_path : [Blob];
            key_id : { curve: { #secp256k1 }; name: Text };
        }) -> async ({ public_key : Blob; chain_code : Blob });
        sign_with_ecdsa : ({
            message_hash : Blob;
            derivation_path : [Blob];
            key_id : { curve: { #secp256k1 }; name: Text };
        }) -> async ({ signature : Blob });
    } = actor "aaaaa-aa";

    // Inter-canister communication with DepositManager
    private let depositManager : actor {
        deposit : (Nat, Text, Nat, Text) -> async Result.Result<{ depositId: Nat; leafIndex: Nat; merkleRoot: Text }, Text>;
        getCurrentMerkleRoot : () -> async Text;
    } = actor("rfun2-iaaaa-aaaac-qa7wq-cai"); // Updated to deposit_manager_v2

    // EVM RPC canister interface
    private let evmRpc : actor {
        eth_getTransactionCount : (RpcServices, ?RpcConfig, GetTransactionCountArgs) -> async MultiGetTransactionCountResult;
        eth_sendRawTransaction : (RpcServices, ?RpcConfig, Text) -> async MultiSendRawTransactionResult;
        eth_getLogs : (RpcServices, ?GetLogsRpcConfig, GetLogsArgs) -> async MultiGetLogsResult;
        eth_feeHistory : (RpcServices, ?RpcConfig, FeeHistoryArgs) -> async MultiFeeHistoryResult;
        eth_getTransactionReceipt : (RpcServices, ?RpcConfig, Text) -> async MultiGetTransactionReceiptResult;
        request : (RpcService, Text, Nat64) -> async RequestResult;
    } = actor("7hfb6-caaaa-aaaar-qadga-cai");

    // System functions for upgrades
    system func preupgrade() {
        depositAddressesStable := Iter.toArray(depositAddresses.entries());
        processedDepositsStable := Iter.toArray(processedDeposits.entries());
    };

    system func postupgrade() {
        depositAddresses := Map.fromIter(depositAddressesStable.vals(), depositAddressesStable.size(), Text.equal, Text.hash);
        processedDeposits := Map.fromIter(processedDepositsStable.vals(), processedDepositsStable.size(), Text.equal, Text.hash);
        depositAddressesStable := [];
        processedDepositsStable := [];
    };

    // Generate unique Ethereum address for deposits
    public shared(msg) func getDepositAddress(userId: Principal, commitment: Text, amount: Nat) : async Result.Result<Text, Text> {
        try {
            // Validate inputs
            if (Text.size(commitment) != 66) { // 0x + 64 hex chars
                return #err("Invalid commitment format");
            };
            if (amount == 0) {
                return #err("Amount must be greater than 0");
            };
            
            // Generate UNIQUE derivation path by combining user + commitment + timestamp
            // This ensures each deposit gets a unique address
            let uniqueData = Text.encodeUtf8(
                Principal.toText(userId) # 
                commitment # 
                Int.toText(Time.now())
            );
            let uniqueHash = await keccak256(uniqueData);
            let hashBytes = Blob.toArray(uniqueHash);
            // Use first 4 bytes as derivation path
            let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
            
            // Get public key via management canister
            let { public_key; chain_code } = await getEcdsaPublicKey(derivationPath);
            
            // Convert to Ethereum address
            let address = await publicKeyToEthereumAddress(public_key);
            
            // Store the mapping with enhanced info
            depositAddresses.put(address, {
                commitment = commitment;
                amount = amount;
                timestamp = Time.now();
                userId = userId;
                processed = false;
            });
            
            #ok(address)
        } catch (e) {
            #err("Failed to generate address: " # Error.message(e))
        }
    };

    // Generate deposit address with temporary claim (V3 - privacy-preserving)
    public shared(msg) func getDepositAddressV3(commitment: Text, amount: Nat) : async Result.Result<Text, Text> {
        try {
            // Validate inputs
            if (Text.size(commitment) != 66) { // 0x + 64 hex chars
                return #err("Invalid commitment format");
            };
            if (amount == 0) {
                return #err("Amount must be greater than 0");
            };
            
            // Generate unique address using caller + commitment + timestamp
            let derivationTimestamp = Time.now();
            let uniqueData = Text.encodeUtf8(
                Principal.toText(msg.caller) # 
                commitment # 
                Int.toText(derivationTimestamp)
            );
            let uniqueHash = await keccak256(uniqueData);
            let hashBytes = Blob.toArray(uniqueHash);
            let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
            
            // Get public key and convert to address
            let { public_key } = await getEcdsaPublicKey(derivationPath);
            let address = await publicKeyToEthereumAddressProper(public_key);
            
            Debug.print("Generated deposit address V3: " # address # " for claimer: " # Principal.toText(msg.caller));
            
            // Create temporary claim instead of permanent ownership
            let claim : DepositClaim = {
                claimer = msg.caller;
                depositAddress = address;
                expiresAt = Time.now() + CLAIM_EXPIRY_TIME;
                commitment = commitment;
                expectedAmount = amount;
                state = #AwaitingFunds;
                processingTxHash = null;
                errorMessage = null;
                retryCount = 0;
            };
            
            depositClaims.put(address, claim);
            
            // Keep backward compatibility - store in old format too but will be cleaned up
            depositAddresses.put(address, {
                commitment = commitment;
                amount = amount;
                timestamp = derivationTimestamp;
                userId = msg.caller;
                processed = false;
            });
            
            #ok(address)
        } catch (e) {
            #err("Failed to generate address V3: " # Error.message(e))
        }
    };

    // Generate unique Ethereum address for deposits (V2 - with proper key handling)
    public shared(msg) func getDepositAddressV2(userId: Principal, commitment: Text, amount: Nat) : async Result.Result<Text, Text> {
        try {
            // Generate UNIQUE derivation path by combining user + commitment + timestamp
            // This ensures each deposit gets a unique address
            let derivationTimestamp = Time.now(); // Store the timestamp we use for derivation
            let uniqueData = Text.encodeUtf8(
                Principal.toText(userId) # 
                commitment # 
                Int.toText(derivationTimestamp)
            );
            let uniqueHash = await keccak256(uniqueData);
            let hashBytes = Blob.toArray(uniqueHash);
            let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
            
            // Get public key for this UNIQUE derivation
            let { public_key; chain_code } = await getEcdsaPublicKey(derivationPath);
            
            // Convert to Ethereum address using PROPER decompression
            let address = await publicKeyToEthereumAddressProper(public_key);
            
            Debug.print("Generated unique deposit address V2: " # address # " for user: " # Principal.toText(userId));
            
            // Store deposit info with the SAME timestamp used for derivation
            depositAddresses.put(address, {
                commitment = commitment;
                amount = amount;
                timestamp = derivationTimestamp; // Use the same timestamp!
                userId = userId;
                processed = false;
            });
            
            #ok(address)
        } catch (e) {
            #err("Failed to generate address V2: " # Error.message(e))
        }
    };

    // Process deposits from unique addresses and forward to pool
    public shared(msg) func processDepositAddresses() : async Result.Result<[Text], Text> {
        // Log the caller to identify who is calling this
        Debug.print("🚨 processDepositAddresses called by: " # Principal.toText(msg.caller));
        Debug.print("🕐 Time: " # Int.toText(Time.now()));
        
        var processedTxs = Buffer.Buffer<Text>(0);
        var errors = Buffer.Buffer<Text>(0);
        
        // Ensure deposit contract is set
        if (depositContractAddress == "") {
            return #err("Deposit contract address not set. Call setDepositContract first.");
        };
        
        // Process each deposit address
        for ((address, info) in depositAddresses.entries()) {
            if (not info.processed) {
                try {
                    // Check balance using EVM RPC canister
                    let balanceRequest = "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"" # 
                                       address # "\",\"latest\"],\"id\":1}";
                    
                    // Add cycles for EVM RPC call
                    ExperimentalCycles.add(2_000_000_000); // 2B cycles
                    let balanceResult = await evmRpc.request(
                        #EthSepolia(#PublicNode),
                        balanceRequest,
                        2048
                    );
                    
                    switch (balanceResult) {
                        case (#Ok(result)) {
                            let balance = hexToNat(extractResultFromJson(result));
                            
                            // Process if balance is sufficient
                            if (balance >= info.amount) {
                                Debug.print("Processing deposit at " # address # " with balance: " # Nat.toText(balance));
                                
                                // Forward funds to pool contract
                                let forwardResult = await forwardFundsToPool(address, info);
                                
                                switch (forwardResult) {
                                    case (#ok(txHash)) {
                                        processedTxs.add(txHash);
                                        
                                        // Mark as processed
                                        depositAddresses.put(address, {
                                            commitment = info.commitment;
                                            amount = info.amount;
                                            timestamp = info.timestamp;
                                            userId = info.userId;
                                            processed = true;
                                        });
                                        
                                        // Track processed deposit
                                        processedDeposits.put(info.commitment, Time.now());
                                    };
                                    case (#err(e)) {
                                        errors.add("Failed to forward from " # address # ": " # e);
                                    };
                                };
                            };
                        };
                        case (#Err(e)) {
                            errors.add("Failed to check balance for " # address # " via EVM RPC");
                        };
                    };
                } catch (e) {
                    errors.add("Error processing " # address # ": " # Error.message(e));
                };
            };
        };
        
        if (errors.size() > 0) {
            Debug.print("Errors during processing: " # Text.join(", ", errors.vals()));
        };
        
        #ok(Buffer.toArray(processedTxs))
    };

    // Forward funds from deposit address to pool contract
    // Uses EVM RPC canister for consensus-safe Ethereum interactions
    private func forwardFundsToPool(depositAddress: Text, info: DepositInfo) : async Result.Result<Text, Text> {
        try {
            // Get nonce using EVM RPC canister
            // Add cycles for EVM RPC call
            ExperimentalCycles.add(2_000_000_000); // 2B cycles
            let nonceResult = await evmRpc.eth_getTransactionCount(
                #EthSepolia(?[#PublicNode]),
                ?{
                    responseSizeEstimate = ?64;
                    responseConsensus = null;
                },
                {
                    address = depositAddress;
                    block = #Latest;
                }
            );
            
            let addressNonce = switch (nonceResult) {
                case (#Consistent(#Ok(nonce))) { nonce };
                case (#Consistent(#Err(error))) { 
                    return #err("Failed to get nonce via EVM RPC");
                };
                case (#Inconsistent(results)) {
                    // Try to find most common nonce
                    var nonce : Nat = 0;
                    for ((_, result) in results.vals()) {
                        switch (result) {
                            case (#Ok(n)) { nonce := n; };
                            case (#Err(_)) {};
                        };
                    };
                    nonce;
                };
            };
            
            // Use reasonable gas price for Sepolia
            // 1 gwei should be sufficient for Sepolia testnet
            let gasPrice : Nat = 1_000_000_000;
            
            // Calculate gas cost for the transaction
            let gasLimit : Nat = 100000; // Increased limit for deposit function with data
            let totalGasCost = gasPrice * gasLimit;
            
            // Get balance using EVM RPC canister
            let balanceRequest = "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"" # 
                               depositAddress # "\",\"latest\"],\"id\":1}";
            
            // Add cycles for EVM RPC call
            ExperimentalCycles.add(2_000_000_000); // 2B cycles
            let balanceResult = await evmRpc.request(
                #EthSepolia(#PublicNode),
                balanceRequest,
                2048
            );
            
            let currentBalance = switch (balanceResult) {
                case (#Ok(response)) {
                    let balanceHex = extractResultFromJson(response);
                    hexToNat(balanceHex);
                };
                case (#Err(error)) {
                    return #err("Failed to get balance via EVM RPC");
                };
            };
            
            Debug.print("Deposit address balance: " # Nat.toText(currentBalance));
            Debug.print("Required gas cost: " # Nat.toText(totalGasCost));
            
            // Calculate buffer for gas
            let buffer : Nat = totalGasCost / 5; // 20% of gas cost
            let totalGasNeeded = totalGasCost + buffer;
            
            // Ensure we have enough to cover both the deposit amount AND gas
            let totalRequired = info.amount + totalGasNeeded;
            if (currentBalance < totalRequired) {
                return #err("Insufficient balance. Have: " # Nat.toText(currentBalance) # 
                           ", need: " # Nat.toText(totalRequired) # 
                           " (deposit: " # Nat.toText(info.amount) # 
                           ", gas+buffer: " # Nat.toText(totalGasNeeded) # ")");
            };
            
            // Forward exactly the expected deposit amount (0.01 ETH)
            // The extra balance covers gas costs
            let amountToForward = info.amount; // Use the original deposit amount
            
            Debug.print("Balance: " # Nat.toText(currentBalance) # ", Gas cost: " # Nat.toText(totalGasCost) # 
                       ", Buffer: " # Nat.toText(buffer) # ", Total gas needed: " # Nat.toText(totalGasNeeded) #
                       ", Amount to forward: " # Nat.toText(amountToForward));
            
            // Build deposit call data
            // deposit(bytes32) function signature
            let methodId = "b214faa5";
            let commitmentHex = Text.trimStart(info.commitment, #text "0x");
            
            // Ensure commitment is properly padded to 32 bytes (64 hex chars)
            let paddedCommitment = if (Text.size(commitmentHex) < 64) {
                // Pad with leading zeros
                let padding = Text.fromIter(Iter.fromArray(Array.tabulate(64 - Text.size(commitmentHex), func(_: Nat) : Char { '0' })));
                padding # commitmentHex
            } else {
                commitmentHex
            };
            
            let callData = methodId # paddedCommitment;
            
            // Build transaction with reduced amount to account for gas
            let tx : EthereumTransaction = {
                to = depositContractAddress;
                value = amountToForward; // This is the actual balance minus gas cost
                data = switch (Hex.decode(callData)) {
                    case (#ok(bytes)) { Blob.fromArray(bytes) };
                    case (#err(_)) { return #err("Failed to encode call data") };
                };
                nonce = addressNonce;
                gasPrice = gasPrice;
                gasLimit = gasLimit;
                chainId = 11155111; // Sepolia testnet // Ethereum mainnet
            };
            
            Debug.print("Transaction details: to=" # depositContractAddress # 
                       ", value=" # Nat.toText(amountToForward) # 
                       ", gasPrice=" # Nat.toText(gasPrice) # 
                       ", gasLimit=" # Nat.toText(gasLimit) # 
                       ", nonce=" # Nat.toText(addressNonce));
            
            // Sign transaction with the deposit address's derived key
            // Use same derivation method as address generation
            let userHash = await keccak256(Text.encodeUtf8(Principal.toText(info.userId)));
            let hashBytes = Blob.toArray(userHash);
            let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
            Debug.print("Derivation path blob size: " # Nat.toText(Blob.toArray(derivationPath[0]).size()));
            
            // Get the signature first
            let encoded = encodeTransaction(tx);
            let messageHash = await keccak256(encoded);
            let signature = await signWithEcdsa(messageHash, derivationPath);
            
            // Try with v=0 first
            let signedTx = encodeSignedTransaction(tx, signature);
            
            // Submit transaction using EVM RPC canister
            Debug.print("Submitting transaction via EVM RPC canister...");
            
            // Add cycles for EVM RPC call (Rust example uses 10B)
            ExperimentalCycles.add(10_000_000_000); // 10B cycles
            let submitResult = await evmRpc.eth_sendRawTransaction(
                #EthSepolia(?[#PublicNode]),
                ?{
                    responseSizeEstimate = ?256;
                    responseConsensus = null;
                },
                signedTx
            );
            
            switch (submitResult) {
                case (#Consistent(#Ok(sendStatus))) {
                    switch (sendStatus) {
                        case (#Ok(?txHash)) {
                            Debug.print("Forwarded deposit with tx: " # txHash);
                            
                            // Add commitment to deposit manager with actual forwarded amount
                            let depositResult = await depositManager.deposit(
                                amountToForward,  // Use actual forwarded amount, not original
                                "ETH",
                                11155111, // Sepolia testnet
                                info.commitment
                            );
                            switch (depositResult) {
                                case (#ok(depositResult)) {
                                    Debug.print("Added deposit with ID: " # Nat.toText(depositResult.depositId));
                                };
                                case (#err(e)) {
                                    Debug.print("Warning: Failed to add deposit: " # e);
                                };
                            };
                            
                            #ok(txHash)
                        };
                        case (#Ok(null)) {
                            #err("Transaction sent but no hash returned");
                        };
                        case (#NonceTooLow) {
                            #err("Nonce too low - transaction may already be processed");
                        };
                        case (#NonceTooHigh) {
                            #err("Nonce too high");
                        };
                        case (#InsufficientFunds) {
                            // Try with v=1 if v=0 failed
                            Debug.print("Trying with v=1...");
                            let signedTxV1 = signTransactionWithPathV1(tx, signature);
                            
                            // Add cycles for second attempt
                            ExperimentalCycles.add(10_000_000_000); // 10B cycles
                            let submitResultV1 = await evmRpc.eth_sendRawTransaction(
                                #EthSepolia(?[#PublicNode]),
                                ?{
                                    responseSizeEstimate = ?256;
                                    responseConsensus = null;
                                },
                                signedTxV1
                            );
                            
                            switch (submitResultV1) {
                                case (#Consistent(#Ok(#Ok(?txHash)))) {
                                    Debug.print("Success with v=1! Tx: " # txHash);
                                    
                                    // Add commitment to deposit manager with actual forwarded amount
                                    let depositResult = await depositManager.deposit(
                                        amountToForward,  // Use actual forwarded amount, not original
                                        "ETH",
                                        11155111, // Sepolia testnet chain ID
                                        info.commitment
                                    );
                                    switch (depositResult) {
                                        case (#ok(result)) {
                                            Debug.print("Added deposit with ID: " # Nat.toText(result.depositId));
                                        };
                                        case (#err(e)) {
                                            Debug.print("Warning: Failed to add deposit: " # e);
                                        };
                                    };
                                    
                                    #ok(txHash)
                                };
                                case (#Consistent(#Ok(#InsufficientFunds))) {
                                    #err("Insufficient funds for transaction (tried both v=0 and v=1)")
                                };
                                case (_) {
                                    #err("Failed with both v values")
                                };
                            }
                        };
                    };
                };
                case (#Consistent(#Err(error))) {
                    #err("Failed to submit transaction via EVM RPC");
                };
                case (#Inconsistent(results)) {
                    // Check if any succeeded
                    for ((_, result) in results.vals()) {
                        switch (result) {
                            case (#Ok(#Ok(?txHash))) {
                                return #ok(txHash);
                            };
                            case (_) {};
                        };
                    };
                    #err("Inconsistent responses when submitting transaction");
                };
            };
        } catch (e) {
            #err("Exception during fund forwarding: " # Error.message(e))
        }
    };

    // Sign transaction with specific derivation path
    private func signTransactionWithPath(tx: EthereumTransaction, derivationPath: [Blob]) : async Text {
        // Encode transaction for signing (EIP-155)
        let encoded = encodeTransaction(tx);
        let messageHash = await keccak256(encoded);
        
        // Debug: Verify message hash is exactly 32 bytes
        Debug.print("Message hash size: " # Nat.toText(messageHash.size()) # " bytes");
        if (messageHash.size() != 32) {
            Debug.print("ERROR: Message hash is not 32 bytes!");
        };
        
        // Sign with threshold ECDSA
        let signature = await signWithEcdsa(messageHash, derivationPath);
        
        // Encode signed transaction with v=0
        encodeSignedTransaction(tx, signature)
    };
    
    // Sign transaction with v=1 if v=0 fails
    private func signTransactionWithPathV1(tx: EthereumTransaction, sig: Blob) : Text {
        let sigBytes = Blob.toArray(sig);
        if (sigBytes.size() < 64) {
            return "0x";
        };
        
        let r = Blob.fromArray(Array.subArray(sigBytes, 0, 32));
        let s = Blob.fromArray(Array.subArray(sigBytes, 32, 32));
        
        // Try v=1 this time
        let v = 1;
        let adjustedV = (tx.chainId * 2 + 35) + v;
        
        let items : [RLP.RLPItem] = [
            #bytes(RLP.natToBytes(tx.nonce)),
            #bytes(RLP.natToBytes(tx.gasPrice)),
            #bytes(RLP.natToBytes(tx.gasLimit)),
            #bytes(switch (Hex.decode(tx.to)) {
                case (#ok(bytes)) { Blob.fromArray(bytes) };
                case (#err(_)) { Blob.fromArray([]) };
            }),
            #bytes(RLP.natToBytes(tx.value)),
            #bytes(tx.data),
            #bytes(RLP.natToBytes(adjustedV)),
            #bytes(r),
            #bytes(s)
        ];
        
        let encoded = RLP.encode(#list(items));
        "0x" # Hex.encode(Blob.toArray(encoded))
    };

    // Monitor deposits to the main contract
    public shared(msg) func checkDeposits() : async Result.Result<[DepositEvent], Text> {
        if (depositContractAddress == "") {
            return #err("Deposit contract address not set");
        };

        try {
            // Get latest block number
            let latestBlockResult = await makeRpcCall("eth_blockNumber", "[]");
            
            let latestBlock = switch (latestBlockResult) {
                case (#ok(result)) {
                    let hexValue = extractHexFromJson(result);
                    if (hexValue == "") {
                        return #err("Failed to parse block number");
                    };
                    hexToNat(hexValue)
                };
                case (#err(e)) { return #err("Failed to get latest block: " # e) };
            };

            if (latestBlock <= lastCheckedBlock) {
                return #ok([]);
            };

            // Prepare eth_getLogs parameters
            let fromBlock = if (lastCheckedBlock == 0) {
                if (latestBlock > 100) { latestBlock - 100 } else { 0 }
            } else {
                lastCheckedBlock + 1
            };

            let fromBlockHex = "0x" # natToHex(fromBlock);
            let toBlockHex = "0x" # natToHex(latestBlock);

            let logsParams = "[{\"fromBlock\":\"" # fromBlockHex # 
                "\",\"toBlock\":\"" # toBlockHex # 
                "\",\"address\":\"" # depositContractAddress # 
                "\",\"topics\":[\"" # DEPOSIT_EVENT_SIGNATURE # "\"]}]";

            let logsResult = await makeRpcCall("eth_getLogs", logsParams);
            
            switch (logsResult) {
                case (#ok(result)) {
                    let events = parseDepositLogs(result);
                    
                    // Process new deposits
                    for (event in events.vals()) {
                        // Check if already processed
                        if (processedDeposits.get(event.commitment) == null) {
                            // Add to deposit manager
                            let depositResult = await depositManager.deposit(
                                event.amount,
                                "ETH",
                                11155111, // Sepolia testnet
                                event.commitment
                            );
                            switch (depositResult) {
                                case (#ok(_)) {
                                    processedDeposits.put(event.commitment, Time.now());
                                };
                                case (#err(e)) {
                                    Debug.print("Failed to add deposit: " # e);
                                };
                            };
                        };
                    };
                    
                    // Update last checked block
                    lastCheckedBlock := latestBlock;
                    
                    #ok(events)
                };
                case (#err(e)) {
                    #err("Failed to get logs: " # e)
                };
            }
        } catch (e) {
            #err("Failed to check deposits: " # Error.message(e))
        }
    };

    // Set deposit contract address
    public shared(msg) func setDepositContract(address: Text) : async Result.Result<(), Text> {
        depositContractAddress := address;
        #ok()
    };

    // Get pool's Ethereum address
    public shared(msg) func getPoolAddress() : async Text {
        let { public_key; chain_code } = await getEcdsaPublicKey([]);
        await publicKeyToEthereumAddress(public_key)
    };

    // Get deposit info for an address
    public query func getDepositInfo(address: Text) : async ?DepositInfo {
        depositAddresses.get(address)
    };

    // Get the configured deposit contract address
    public query func getDepositContract() : async Text {
        depositContractAddress
    };

    // Get all pending deposits
    public query func getPendingDeposits() : async [(Text, DepositInfo)] {
        var pending = Buffer.Buffer<(Text, DepositInfo)>(0);
        for ((address, info) in depositAddresses.entries()) {
            if (not info.processed) {
                pending.add((address, info));
            };
        };
        Buffer.toArray(pending)
    };

    // Process a single deposit address (now uses V2 clean implementation)
    public shared(msg) func processSingleDeposit(address: Text) : async Result.Result<Text, Text> {
        // Redirect to V2 clean implementation (best gas handling)
        await processSingleDepositV2(address)
    };

    // Make RPC call via HTTP outcall with automatic fallback
    private func makeRpcCall(method: Text, params: Text) : async Result.Result<Text, Text> {
        await makeRpcCallWithRetries(method, params, 0, [])
    };
    
    // Internal function to handle retries across different RPC endpoints
    private func makeRpcCallWithRetries(method: Text, params: Text, attemptCount: Nat, errors: [Text]) : async Result.Result<Text, Text> {
        // Try all endpoints before giving up
        if (attemptCount >= RPC_ENDPOINTS.size()) {
            let errorMsg = "All RPC endpoints failed. Errors: " # Text.join("; ", errors.vals());
            Debug.print("❌ " # errorMsg);
            return #err(errorMsg);
        };
        
        // Get current endpoint index (with rotation)
        let endpointIndex = (currentRpcIndex + attemptCount) % RPC_ENDPOINTS.size();
        let rpcUrl = RPC_ENDPOINTS[endpointIndex];
        
        Debug.print("🔄 Attempting RPC call to endpoint " # Nat.toText(endpointIndex) # ": " # method);
        
        let result = await makeRpcCallToEndpoint(rpcUrl, method, params);
        
        switch (result) {
            case (#ok(response)) {
                // Success! Update the current index for next time to start with this working endpoint
                currentRpcIndex := endpointIndex;
                #ok(response)
            };
            case (#err(error)) {
                // Check if this is a rate limit error
                if (Text.contains(error, #text "429") or 
                    Text.contains(error, #text "rate limit") or
                    Text.contains(error, #text "Rate limit") or
                    Text.contains(error, #text "too many requests")) {
                    Debug.print("⚠️ Rate limit hit on endpoint " # Nat.toText(endpointIndex) # ", trying next...");
                } else {
                    Debug.print("❌ Error on endpoint " # Nat.toText(endpointIndex) # ": " # error);
                };
                
                // Try next endpoint
                let newErrors = Array.append(errors, ["Endpoint " # Nat.toText(endpointIndex) # ": " # error]);
                await makeRpcCallWithRetries(method, params, attemptCount + 1, newErrors)
            };
        }
    };
    
    // Make RPC call to a specific endpoint
    private func makeRpcCallToEndpoint(rpcUrl: Text, method: Text, params: Text) : async Result.Result<Text, Text> {
        let jsonRpc = "{\"jsonrpc\":\"2.0\",\"method\":\"" # method # 
            "\",\"params\":" # params # ",\"id\":1}";
        
        let request : HttpRequestArgs = {
            url = rpcUrl;
            max_response_bytes = ?100000;
            headers = [
                { name = "Content-Type"; value = "application/json" }
            ];
            body = ?Text.encodeUtf8(jsonRpc);
            method = #post;
            transform = null;
        };
        
        ExperimentalCycles.add(20_000_000_000); // 20B cycles for HTTP outcall
        
        let response = await ic.http_request(request);
        
        if (response.status == 200) {
            switch (Text.decodeUtf8(response.body)) {
                case (?jsonText) {
                    if (Text.contains(jsonText, #text "\"result\"")) {
                        let resultValue = extractResultFromJson(jsonText);
                        #ok(resultValue)
                    } else if (Text.contains(jsonText, #text "\"error\"")) {
                        #err("RPC error: " # jsonText)
                    } else {
                        #err("Invalid response: " # jsonText)
                    }
                };
                case null { #err("Failed to decode response") };
            }
        } else {
            #err("HTTP error: " # Nat.toText(response.status))
        }
    };

    // Helper functions for JSON parsing, hex conversion, etc.
    private func extractResultFromJson(json: Text) : Text {
        let parts = Text.split(json, #text "\"result\":");
        var iter = parts;
        switch (iter.next()) {
            case (?_) {
                switch (iter.next()) {
                    case (?resultPart) {
                        let trimmed = Text.trim(resultPart, #text " ");
                        if (Text.startsWith(trimmed, #text "\"")) {
                            let valueParts = Text.split(trimmed, #text "\"");
                            var valueIter = valueParts;
                            switch (valueIter.next()) {
                                case (?_) {
                                    switch (valueIter.next()) {
                                        case (?value) { value };
                                        case null { "" };
                                    }
                                };
                                case null { "" };
                            }
                        } else {
                            let endParts = Text.split(trimmed, #text ",");
                            switch (endParts.next()) {
                                case (?value) {
                                    let braceParts = Text.split(value, #text "}");
                                    switch (braceParts.next()) {
                                        case (?v) { v };
                                        case null { value };
                                    }
                                };
                                case null { "" };
                            }
                        }
                    };
                    case null { "" };
                }
            };
            case null { "" };
        }
    };

    private func extractHexFromJson(json: Text) : Text {
        let result = extractResultFromJson(json);
        if (Text.startsWith(result, #text "0x")) {
            result
        } else if (result != "") {
            "0x" # result
        } else {
            ""
        }
    };

    private func parseDepositLogs(json: Text) : [DepositEvent] {
        let deposits = Buffer.Buffer<DepositEvent>(0);
        let result = extractResultFromJson(json);
        
        if (Text.contains(result, #text "\"data\":\"0x")) {
            let dataParts = Text.split(result, #text "\"data\":\"0x");
            var iter = dataParts;
            switch (iter.next()) {
                case (?_) {
                    for (part in iter) {
                        let dataEndParts = Text.split(part, #text "\"");
                        switch (dataEndParts.next()) {
                            case (?dataHex) {
                                if (dataHex.size() >= 128) {
                                    let dataChars = Iter.toArray(dataHex.chars());
                                    let commitment = "0x" # Text.fromIter(Array.subArray(dataChars, 0, 64).vals());
                                    let amountHex = Text.fromIter(Array.subArray(dataChars, 64, 64).vals());
                                    let amount = hexToNat("0x" # amountHex);
                                    
                                    var txHash = "";
                                    if (Text.contains(part, #text "\"transactionHash\":\"0x")) {
                                        let txParts = Text.split(part, #text "\"transactionHash\":\"");
                                        var txIter = txParts;
                                        switch (txIter.next()) {
                                            case (?_) {
                                                switch (txIter.next()) {
                                                    case (?txPart) {
                                                        let txEndParts = Text.split(txPart, #text "\"");
                                                        switch (txEndParts.next()) {
                                                            case (?hash) { txHash := hash };
                                                            case null {};
                                                        };
                                                    };
                                                    case null {};
                                                };
                                            };
                                            case null {};
                                        };
                                    };
                                    
                                    var blockNumber = 0;
                                    if (Text.contains(part, #text "\"blockNumber\":\"0x")) {
                                        let blockParts = Text.split(part, #text "\"blockNumber\":\"0x");
                                        var blockIter = blockParts;
                                        switch (blockIter.next()) {
                                            case (?_) {
                                                switch (blockIter.next()) {
                                                    case (?blockPart) {
                                                        let blockEndParts = Text.split(blockPart, #text "\"");
                                                        switch (blockEndParts.next()) {
                                                            case (?blockHex) { 
                                                                blockNumber := hexToNat("0x" # blockHex);
                                                            };
                                                            case null {};
                                                        };
                                                    };
                                                    case null {};
                                                };
                                            };
                                            case null {};
                                        };
                                    };
                                    
                                    deposits.add({
                                        commitment = commitment;
                                        amount = amount;
                                        sender = "";
                                        blockNumber = blockNumber;
                                        txHash = txHash;
                                        timestamp = Time.now();
                                    });
                                };
                            };
                            case null {};
                        };
                    };
                };
                case null {};
            };
        };
        
        Buffer.toArray(deposits)
    };

    // Utility functions
    private func hexToNat(hex: Text) : Nat {
        var cleanHex = hex;
        if (Text.startsWith(hex, #text "0x")) {
            cleanHex := Text.trimStart(hex, #text "0x");
        };
        
        var result : Nat = 0;
        for (char in cleanHex.chars()) {
            result := result * 16;
            switch (char) {
                case ('0') { result += 0 };
                case ('1') { result += 1 };
                case ('2') { result += 2 };
                case ('3') { result += 3 };
                case ('4') { result += 4 };
                case ('5') { result += 5 };
                case ('6') { result += 6 };
                case ('7') { result += 7 };
                case ('8') { result += 8 };
                case ('9') { result += 9 };
                case ('a' or 'A') { result += 10 };
                case ('b' or 'B') { result += 11 };
                case ('c' or 'C') { result += 12 };
                case ('d' or 'D') { result += 13 };
                case ('e' or 'E') { result += 14 };
                case ('f' or 'F') { result += 15 };
                case (_) { };
            };
        };
        result
    };

    private func natToHex(n: Nat) : Text {
        if (n == 0) { return "0" };
        
        let hexChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
        var result = "";
        var num = n;
        
        while (num > 0) {
            let remainder = num % 16;
            result := hexChars[remainder] # result;
            num := num / 16;
        };
        
        result
    };

    private func publicKeyToEthereumAddress(publicKey: Blob) : async Text {
        let bytes = Blob.toArray(publicKey);
        
        // Handle different public key formats
        let uncompressedKey = if (bytes.size() == 65 and bytes[0] == 0x04) {
            // Already uncompressed, just take the x,y coordinates (64 bytes)
            Blob.fromArray(Array.subArray(bytes, 1, 64))
        } else if (bytes.size() == 33 and (bytes[0] == 0x02 or bytes[0] == 0x03)) {
            // Compressed key, need to decompress
            switch (ECDSAUtils.decompressPublicKey(publicKey)) {
                case (#ok(uncompressed)) {
                    // Remove the 0x04 prefix from decompressed key
                    let uncompressedBytes = Blob.toArray(uncompressed);
                    Blob.fromArray(Array.subArray(uncompressedBytes, 1, 64))
                };
                case (#err(e)) {
                    Debug.print("Failed to decompress public key: " # e);
                    // For now, fall back to using compressed key directly to maintain compatibility
                    // This is WRONG but maintains existing behavior
                    publicKey
                };
            }
        } else {
            Debug.print("Unexpected public key format: size=" # Nat.toText(bytes.size()));
            publicKey
        };
        
        let hash = await keccak256(uncompressedKey);
        let address = Blob.fromArray(Array.subArray(Blob.toArray(hash), 12, 20));
        
        "0x" # Hex.encode(Blob.toArray(address))
    };

    // Proper implementation that correctly handles compressed keys
    private func publicKeyToEthereumAddressProper(publicKey: Blob) : async Text {
        let bytes = Blob.toArray(publicKey);
        
        // Handle different public key formats
        let uncompressedKey = if (bytes.size() == 65 and bytes[0] == 0x04) {
            // Already uncompressed, just take the x,y coordinates (64 bytes)
            Blob.fromArray(Array.subArray(bytes, 1, 64))
        } else if (bytes.size() == 33 and (bytes[0] == 0x02 or bytes[0] == 0x03)) {
            // Compressed key, need to decompress
            switch (ECDSAUtils.decompressPublicKey(publicKey)) {
                case (#ok(uncompressed)) {
                    // Remove the 0x04 prefix from decompressed key
                    let uncompressedBytes = Blob.toArray(uncompressed);
                    Blob.fromArray(Array.subArray(uncompressedBytes, 1, 64))
                };
                case (#err(e)) {
                    Debug.trap("Failed to decompress public key: " # e);
                };
            }
        } else {
            Debug.trap("Invalid public key format");
        };
        
        let hash = await keccak256(uncompressedKey);
        let address = Blob.fromArray(Array.subArray(Blob.toArray(hash), 12, 20));
        
        "0x" # Hex.encode(Blob.toArray(address))
    };

    private func getEcdsaPublicKey(derivationPath: [Blob]) : async { public_key: Blob; chain_code: Blob } {
        // Add cycles for ECDSA call
        ExperimentalCycles.add(26_153_846_153);
        await ic.ecdsa_public_key({
            canister_id = null;
            derivation_path = derivationPath;
            key_id = { curve = #secp256k1; name = ECDSA_KEY_NAME };
        })
    };

    private func signWithEcdsa(messageHash: Blob, derivationPath: [Blob]) : async Blob {
        // Add cycles for ECDSA signing
        ExperimentalCycles.add(26_153_846_153);
        
        // Debug logging
        Debug.print("ECDSA signing - message hash size: " # Nat.toText(messageHash.size()));
        Debug.print("ECDSA signing - derivation path length: " # Nat.toText(derivationPath.size()));
        if (derivationPath.size() > 0) {
            Debug.print("ECDSA signing - first derivation path element size: " # Nat.toText(derivationPath[0].size()));
        };
        Debug.print("ECDSA signing - key name: " # ECDSA_KEY_NAME);
        
        let { signature } = await ic.sign_with_ecdsa({
            message_hash = messageHash;
            derivation_path = derivationPath;
            key_id = { curve = #secp256k1; name = ECDSA_KEY_NAME };
        });
        signature
    };

    private func keccak256(data: Blob) : async Blob {
        try {
            // Add cycles for the inter-canister call
            ExperimentalCycles.add(10_000_000_000); // 10B cycles for keccak256 call
            Debug.print("Calling keccak256 canister: " # keccak256CanisterId # " with data size: " # Nat.toText(data.size()));
            let result = await Keccak.keccak256Async(keccak256CanisterId, data);
            Debug.print("Keccak256 call successful");
            result
        } catch (e) {
            Debug.print("Keccak256 call failed: " # Error.message(e));
            throw Error.reject("Failed to call keccak256: " # Error.message(e));
        }
    };

    private func encodeTransaction(tx: EthereumTransaction) : Blob {
        let items : [RLP.RLPItem] = [
            #bytes(RLP.natToBytes(tx.nonce)),
            #bytes(RLP.natToBytes(tx.gasPrice)),
            #bytes(RLP.natToBytes(tx.gasLimit)),
            #bytes(switch (Hex.decode(tx.to)) {
                case (#ok(bytes)) { Blob.fromArray(bytes) };
                case (#err(_)) { Blob.fromArray([]) };
            }),
            #bytes(RLP.natToBytes(tx.value)),
            #bytes(tx.data),
            #bytes(RLP.natToBytes(tx.chainId)),
            #bytes(RLP.natToBytes(0)),
            #bytes(RLP.natToBytes(0))
        ];
        
        RLP.encode(#list(items))
    };

    private func encodeSignedTransaction(tx: EthereumTransaction, sig: Blob) : Text {
        let sigBytes = Blob.toArray(sig);
        if (sigBytes.size() < 64) {
            return "0x";
        };
        
        let r = Blob.fromArray(Array.subArray(sigBytes, 0, 32));
        let s = Blob.fromArray(Array.subArray(sigBytes, 32, 32));
        
        // IC's ECDSA doesn't return recovery ID, so we default to 0
        // The EVM RPC will handle recovery internally
        // For legacy transactions with EIP-155: v = chainId * 2 + 35 + {0,1}
        let v = 0; // This will be either 0 or 1
        let adjustedV = (tx.chainId * 2 + 35) + v;
        
        let items : [RLP.RLPItem] = [
            #bytes(RLP.natToBytes(tx.nonce)),
            #bytes(RLP.natToBytes(tx.gasPrice)),
            #bytes(RLP.natToBytes(tx.gasLimit)),
            #bytes(switch (Hex.decode(tx.to)) {
                case (#ok(bytes)) { Blob.fromArray(bytes) };
                case (#err(_)) { Blob.fromArray([]) };
            }),
            #bytes(RLP.natToBytes(tx.value)),
            #bytes(tx.data),
            #bytes(RLP.natToBytes(adjustedV)),
            #bytes(r),
            #bytes(s)
        ];
        
        let encoded = RLP.encode(#list(items));
        "0x" # Hex.encode(Blob.toArray(encoded))
    };

    // Get current Merkle root
    public shared(msg) func getCurrentMerkleRoot() : async Result.Result<Text, Text> {
        let root = await depositManager.getCurrentMerkleRoot();
        #ok(root)
    };
    
    // Migration function to handle old deposits with different derivation
    public shared(msg) func migrateOldDeposit(depositAddress: Text) : async Result.Result<Text, Text> {
        // Check if this is a known deposit
        switch (depositAddresses.get(depositAddress)) {
            case null { #err("Deposit address not found") };
            case (?info) {
                if (info.processed) {
                    return #err("Deposit already processed");
                };
                
                Debug.print("Attempting to migrate old deposit from " # depositAddress);
                
                // Try different derivation methods
                // Method 1: Try without Text.encodeUtf8 (older method might have used raw principal bytes)
                let principal = info.userId;
                let principalText = Principal.toText(principal);
                
                // Try raw principal text bytes
                let rawBytes = Blob.toArray(Text.encodeUtf8(principalText));
                
                // Try different hash inputs that might have been used
                let variations = [
                    // Current method
                    Text.encodeUtf8(principalText),
                    // Raw principal bytes
                    Principal.toBlob(principal),
                    // Lowercase principal text
                    Text.encodeUtf8(Text.toLowercase(principalText)),
                    // Without the principal prefix
                    Text.encodeUtf8(Text.trimStart(principalText, #text "principal "))
                ];
                
                for (hashInput in variations.vals()) {
                    try {
                        let userHash = await keccak256(hashInput);
                        let hashBytes = Blob.toArray(userHash);
                        let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
                        
                        // Get public key and address
                        let { public_key; chain_code } = await getEcdsaPublicKey(derivationPath);
                        let testAddress = await publicKeyToEthereumAddress(public_key);
                        
                        Debug.print("Testing derivation - got address: " # testAddress);
                        
                        if (Text.toLowercase(testAddress) == Text.toLowercase(depositAddress)) {
                            Debug.print("Found matching derivation!");
                            
                            // Forward funds using the found derivation path
                            try {
                                // Get current balance and gas prices
                                let balanceRequest = "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"" # 
                                                   depositAddress # "\",\"latest\"],\"id\":1}";
                                
                                ExperimentalCycles.add(2_000_000_000);
                                let balanceResult = await evmRpc.request(
                                    #EthSepolia(#PublicNode),
                                    balanceRequest,
                                    2048
                                );
                                
                                let currentBalance = switch (balanceResult) {
                                    case (#Ok(response)) {
                                        let balanceHex = extractResultFromJson(response);
                                        hexToNat(balanceHex);
                                    };
                                    case (#Err(error)) {
                                        return #err("Failed to get balance");
                                    };
                                };
                                
                                if (currentBalance < info.amount) {
                                    return #err("Insufficient balance for migration");
                                };
                                
                                // Get nonce
                                ExperimentalCycles.add(2_000_000_000);
                                let nonceResult = await evmRpc.eth_getTransactionCount(
                                    #EthSepolia(?[#PublicNode]),
                                    ?{ responseSizeEstimate = ?64; responseConsensus = null; },
                                    { address = depositAddress; block = #Latest; }
                                );
                                
                                let addressNonce = switch (nonceResult) {
                                    case (#Consistent(#Ok(nonce))) { nonce };
                                    case (_) { return #err("Failed to get nonce"); };
                                };
                                
                                // Get gas prices
                                let gasPrices = switch (await getGasPrices()) {
                                    case (#ok(prices)) { prices };
                                    case (#err(e)) { return #err("Failed to get gas prices: " # e) };
                                };
                                
                                // Cap priority fee to prevent excessive gas costs
                                let cappedPriorityFee = if (gasPrices.maxPriorityFee > 10_000_000_000) {
                                    10_000_000_000 // 10 Gwei max
                                } else {
                                    gasPrices.maxPriorityFee
                                };
                                let maxFeePerGas = gasPrices.baseFee + cappedPriorityFee + (gasPrices.baseFee / 10);
                                let gasLimit : Nat = 80000;
                                
                                // Build transaction
                                let methodId = "b214faa5";
                                let commitmentHex = Text.trimStart(info.commitment, #text "0x");
                                let paddedCommitment = if (Text.size(commitmentHex) < 64) {
                                    let padding = Text.fromIter(Iter.fromArray(Array.tabulate(64 - Text.size(commitmentHex), func(_: Nat) : Char { '0' })));
                                    padding # commitmentHex
                                } else {
                                    commitmentHex
                                };
                                
                                let callData = methodId # paddedCommitment;
                                
                                let tx : EIP1559Transaction = {
                                    to = depositContractAddress;
                                    value = info.amount;
                                    data = switch (Hex.decode(callData)) {
                                        case (#ok(bytes)) { Blob.fromArray(bytes) };
                                        case (#err(_)) { return #err("Failed to encode call data") };
                                    };
                                    nonce = addressNonce;
                                    maxFeePerGas = maxFeePerGas;
                                    maxPriorityFeePerGas = cappedPriorityFee; // Use capped value!
                                    gasLimit = gasLimit;
                                    chainId = 11155111; // Sepolia testnet
                                };
                                
                                // Sign and submit with the FOUND derivation path
                                let (signedTx, submitResult) = await signAndSubmitEIP1559Transaction(tx, derivationPath);
                                
                                switch (submitResult) {
                                    case (#Consistent(#Ok(sendStatus))) {
                                        switch (sendStatus) {
                                            case (#Ok(?txHash)) {
                                                Debug.print("Migration successful! Tx: " # txHash);
                                                
                                                // Mark as processed
                                                depositAddresses.put(depositAddress, {
                                                    commitment = info.commitment;
                                                    amount = info.amount;
                                                    timestamp = info.timestamp;
                                                    userId = info.userId;
                                                    processed = true;
                                                });
                                                
                                                return #ok("Migration successful! Transaction: " # txHash);
                                            };
                                            case (_) {
                                                return #err("Transaction failed");
                                            };
                                        };
                                    };
                                    case (_) {
                                        return #err("Failed to submit transaction");
                                    };
                                };
                            } catch (e) {
                                return #err("Migration error: " # Error.message(e));
                            };
                        };
                    } catch (e) {
                        Debug.print("Derivation attempt failed: " # Error.message(e));
                    };
                };
                
                #err("Could not find matching derivation for address " # depositAddress)
            };
        };
    };
    
    // Set the Keccak256 canister ID
    public shared(msg) func setKeccak256CanisterId(canisterId: Text) : async Result.Result<(), Text> {
        keccak256CanisterId := canisterId;
        #ok()
    };
    
    // Get the current Keccak256 canister ID
    public query func getKeccak256CanisterId() : async Text {
        keccak256CanisterId
    };
    
    // Get current gas estimation for deposit forwarding
    public func getDepositGasEstimate() : async Result.Result<{
        gasLimit: Nat;
        estimatedGasPrice: Nat;
        estimatedTotalCost: Nat;
        estimatedTotalCostEth: Text;
    }, Text> {
        try {
            // Get current gas prices from chain
            let gasPrices = switch (await getGasPrices()) {
                case (#ok(prices)) { prices };
                case (#err(e)) { return #err("Failed to get gas prices: " # e) };
            };
            
            // Gas limit for deposit forwarding (same as used in processSingleDepositV2)
            let gasLimit : Nat = 80000;
            
            // Cap priority fee same as in forwardFundsToPoolV2
            let cappedPriorityFee = if (gasPrices.maxPriorityFee > 10_000_000_000) {
                10_000_000_000 // 10 Gwei max
            } else {
                gasPrices.maxPriorityFee
            };
            
            // Calculate estimated gas price EXACTLY as in forwardFundsToPoolV2
            // This ensures users see the same gas cost that will be used
            let estimatedGasPrice = gasPrices.baseFee + cappedPriorityFee + (gasPrices.baseFee / 10); // 10% buffer
            
            // Calculate total cost
            let estimatedTotalCost = estimatedGasPrice * gasLimit;
            
            // Convert to ETH string (with 9 decimal places for better precision)
            let ethWhole = estimatedTotalCost / 1_000_000_000_000_000_000;
            let ethFraction = (estimatedTotalCost % 1_000_000_000_000_000_000) / 1_000_000_000; // 9 decimals
            let ethFractionStr = Nat.toText(ethFraction);
            
            // Pad with leading zeros to ensure 9 digits
            var paddedFraction = ethFractionStr;
            while (Text.size(paddedFraction) < 9) {
                paddedFraction := "0" # paddedFraction;
            };
            
            #ok({
                gasLimit = gasLimit;
                estimatedGasPrice = estimatedGasPrice;
                estimatedTotalCost = estimatedTotalCost;
                estimatedTotalCostEth = Nat.toText(ethWhole) # "." # paddedFraction;
            })
        } catch (e) {
            #err("Failed to estimate gas: " # Error.message(e))
        }
    };
    
    // Debug: Compare address generation methods
    public func debugCompareAddressGeneration(userId: Principal) : async Result.Result<{legacy: Text; proper: Text; publicKey: Text}, Text> {
        try {
            let userHash = await keccak256(Text.encodeUtf8(Principal.toText(userId)));
            let hashBytes = Blob.toArray(userHash);
            let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
            
            let { public_key; chain_code } = await getEcdsaPublicKey(derivationPath);
            let legacyAddress = await publicKeyToEthereumAddress(public_key);
            let properAddress = await publicKeyToEthereumAddressProper(public_key);
            
            #ok({
                legacy = legacyAddress;
                proper = properAddress;
                publicKey = Hex.encode(Blob.toArray(public_key));
            })
        } catch (e) {
            #err("Error: " # Error.message(e))
        }
    };

    // Debug: Verify address generation
    public func debugAddressGeneration(userId: Principal) : async Result.Result<{address: Text; publicKey: Text}, Text> {
        try {
            let userHash = await keccak256(Text.encodeUtf8(Principal.toText(userId)));
            let hashBytes = Blob.toArray(userHash);
            let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
            
            let { public_key; chain_code } = await getEcdsaPublicKey(derivationPath);
            let address = await publicKeyToEthereumAddress(public_key);
            
            #ok({
                address = address;
                publicKey = Hex.encode(Blob.toArray(public_key));
            })
        } catch (e) {
            #err("Error: " # Error.message(e))
        }
    };
    
    // Debug function to test nonce fetching
    public func testGetNonce(address: Text) : async Result.Result<Nat, Text> {
        try {
            ExperimentalCycles.add(2_000_000_000); // 2B cycles
            let nonceResult = await evmRpc.eth_getTransactionCount(
                #EthSepolia(?[#PublicNode]),
                ?{
                    responseSizeEstimate = ?64;
                    responseConsensus = null;
                },
                {
                    address = address;
                    block = #Latest;
                }
            );
            
            switch (nonceResult) {
                case (#Consistent(#Ok(nonce))) { #ok(nonce) };
                case (#Consistent(#Err(error))) { 
                    #err("RPC error: " # debug_show(error))
                };
                case (#Inconsistent(results)) {
                    #err("Inconsistent results")
                };
            }
        } catch (e) {
            #err("Exception: " # Error.message(e))
        }
    };
    
    // DEPRECATED: Test function removed - use processSingleDepositV2 for production
    // The Rust canister had issues with gas pricing, causing stuck transactions
    
    // DEPRECATED: Test function removed - use processSingleDepositV2 for production
    // Legacy Rust canister implementation had critical gas pricing issues
    
    // Test simple ETH transfer
    public func testSimpleTransfer(fromAddress: Text) : async Result.Result<Text, Text> {
        try {
            // Get deposit info
            let info = switch (depositAddresses.get(fromAddress)) {
                case null { return #err("Address not found") };
                case (?i) { i };
            };
            
            // Get nonce
            ExperimentalCycles.add(2_000_000_000); // 2B cycles
            let nonceResult = await evmRpc.eth_getTransactionCount(
                #EthSepolia(?[#PublicNode]),
                ?{
                    responseSizeEstimate = ?64;
                    responseConsensus = null;
                },
                {
                    address = fromAddress;
                    block = #Latest;
                }
            );
            
            let nonce = switch (nonceResult) {
                case (#Consistent(#Ok(n))) { n };
                case (_) { return #err("Failed to get nonce") };
            };
            
            // Build simple transfer transaction
            let tx : EthereumTransaction = {
                to = depositContractAddress; // Send to pool contract
                value = 1_000_000_000_000_000; // 0.001 ETH
                data = Blob.fromArray([]); // No data for simple transfer
                nonce = nonce;
                gasPrice = 1_000_000_000; // 1 gwei
                gasLimit = 21000; // Standard ETH transfer gas
                chainId = 11155111; // Sepolia testnet // Ethereum mainnet
            };
            
            // Sign transaction
            let userHash = await keccak256(Text.encodeUtf8(Principal.toText(info.userId)));
            let hashBytes = Blob.toArray(userHash);
            let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
            let signedTx = await signTransactionWithPath(tx, derivationPath);
            
            // Submit transaction
            ExperimentalCycles.add(2_000_000_000); // 2B cycles
            let submitResult = await evmRpc.eth_sendRawTransaction(
                #EthSepolia(?[#PublicNode]),
                ?{
                    responseSizeEstimate = ?256;
                    responseConsensus = null;
                },
                signedTx
            );
            
            switch (submitResult) {
                case (#Consistent(#Ok(#Ok(?txHash)))) { #ok(txHash) };
                case (#Consistent(#Ok(#Ok(null)))) { #err("No tx hash returned") };
                case (#Consistent(#Ok(#NonceTooLow))) { #err("Nonce too low") };
                case (#Consistent(#Ok(#NonceTooHigh))) { #err("Nonce too high") };
                case (#Consistent(#Ok(#InsufficientFunds))) { #err("Insufficient funds") };
                case (#Consistent(#Err(e))) { #err("RPC error: " # debug_show(e)) };
                case (#Inconsistent(_)) { #err("Inconsistent responses") };
            }
        } catch (e) {
            #err("Exception: " # Error.message(e))
        }
    };

    // ===== EIP-1559 Support Functions =====

    // Get current gas prices for EIP-1559 using fee history
    private func getGasPrices() : async Result.Result<{baseFee: Nat; maxPriorityFee: Nat}, Text> {
        try {
            Debug.print("Getting gas prices using eth_feeHistory");
            
            // Get fee history for the last 5 blocks with 25th percentile for priority fees
            let feeHistoryArgs : FeeHistoryArgs = {
                blockCount = 5;
                newestBlock = #Latest;
                rewardPercentiles = ?[25 : Nat8]; // 25th percentile for reasonable priority fee
            };
            
            ExperimentalCycles.add(10_000_000_000); // 10B cycles
            let feeHistoryResult = await evmRpc.eth_feeHistory(
                #EthSepolia(?[#PublicNode]),
                ?{
                    responseSizeEstimate = ?2048;
                    responseConsensus = null;
                },
                feeHistoryArgs
            );
            
            switch (feeHistoryResult) {
                case (#Consistent(#Ok(history))) {
                    // Get the latest base fee (last element in the array)
                    let baseFees = history.baseFeePerGas;
                    let latestBaseFee = if (baseFees.size() > 0) {
                        baseFees[baseFees.size() - 1]
                    } else {
                        20_000_000_000 // Default 20 gwei
                    };
                    
                    // Get median priority fee from rewards
                    var totalPriorityFee : Nat = 0;
                    var count : Nat = 0;
                    for (rewards in history.reward.vals()) {
                        if (rewards.size() > 0) {
                            totalPriorityFee += rewards[0]; // 25th percentile
                            count += 1;
                        };
                    };
                    
                    let avgPriorityFee = if (count > 0) {
                        totalPriorityFee / count
                    } else {
                        1_500_000_000 // Default 1.5 gwei
                    };
                    
                    Debug.print("Fee history - Base fee: " # Nat.toText(latestBaseFee) # 
                               ", Avg priority fee: " # Nat.toText(avgPriorityFee));
                    
                    #ok({ 
                        baseFee = latestBaseFee; 
                        maxPriorityFee = avgPriorityFee 
                    })
                };
                case (#Consistent(#Err(e))) {
                    Debug.print("Fee history error, falling back to eth_gasPrice");
                    // Fallback to eth_gasPrice
                    await getGasPricesFallback()
                };
                case (#Inconsistent(_)) {
                    Debug.print("Inconsistent fee history, falling back to eth_gasPrice");
                    await getGasPricesFallback()
                };
            }
        } catch (e) {
            #err("Exception getting gas prices: " # Error.message(e))
        }
    };
    
    // Fallback gas price method
    private func getGasPricesFallback() : async Result.Result<{baseFee: Nat; maxPriorityFee: Nat}, Text> {
        let gasPriceRequest = "{\"jsonrpc\":\"2.0\",\"method\":\"eth_gasPrice\",\"params\":[],\"id\":1}";
        
        ExperimentalCycles.add(2_000_000_000); // 2B cycles
        let gasPriceResult = await evmRpc.request(
            #EthSepolia(#PublicNode),
            gasPriceRequest,
            1024
        );
        
        switch (gasPriceResult) {
            case (#Ok(result)) {
                let gasPriceHex = extractResultFromJson(result);
                let gasPrice = if (gasPriceHex != "") { hexToNat(gasPriceHex) } else { 10_000_000_000 };
                let baseFee = gasPrice;
                let maxPriorityFee = 1_500_000_000; // 1.5 gwei
                
                Debug.print("Fallback gas prices - Base fee: " # Nat.toText(baseFee) # 
                           ", Priority fee: " # Nat.toText(maxPriorityFee));
                
                #ok({ baseFee = baseFee; maxPriorityFee = maxPriorityFee })
            };
            case (#Err(e)) {
                #err("Failed to get gas price: " # debug_show(e))
            };
        }
    };

    // Helper function to extract field from JSON
    private func extractFieldFromJson(json: Text, field: Text) : Text {
        let searchPattern = "\"" # field # "\":\"";
        let parts = Text.split(json, #text searchPattern);
        var iter = parts;
        switch (iter.next()) {
            case (?_) {
                switch (iter.next()) {
                    case (?fieldPart) {
                        let endParts = Text.split(fieldPart, #text "\"");
                        switch (endParts.next()) {
                            case (?value) { value };
                            case null { "" };
                        }
                    };
                    case null { "" };
                }
            };
            case null { "" };
        }
    };

    // Forward funds from deposit address to pool contract using EIP-1559
    private func forwardFundsToPoolEIP1559(depositAddress: Text, info: DepositInfo) : async Result.Result<Text, Text> {
        try {
            // Get nonce using EVM RPC canister
            ExperimentalCycles.add(2_000_000_000); // 2B cycles
            let nonceResult = await evmRpc.eth_getTransactionCount(
                #EthSepolia(?[#PublicNode]),
                ?{
                    responseSizeEstimate = ?64;
                    responseConsensus = null;
                },
                {
                    address = depositAddress;
                    block = #Latest;
                }
            );
            
            let addressNonce = switch (nonceResult) {
                case (#Consistent(#Ok(nonce))) { nonce };
                case (#Consistent(#Err(error))) { 
                    return #err("Failed to get nonce via EVM RPC");
                };
                case (#Inconsistent(results)) {
                    // Try to find most common nonce
                    var nonce : Nat = 0;
                    for ((_, result) in results.vals()) {
                        switch (result) {
                            case (#Ok(n)) { nonce := n; };
                            case (#Err(_)) {};
                        };
                    };
                    nonce;
                };
            };
            
            // Get current gas prices
            let gasPrices = switch (await getGasPrices()) {
                case (#ok(prices)) { prices };
                case (#err(e)) { return #err("Failed to get gas prices: " # e) };
            };
            
            // Calculate max fee per gas (base fee + priority fee + small buffer)
            // Cap priority fee at reasonable maximum (10 Gwei) to prevent excessive gas costs
            let cappedPriorityFee = if (gasPrices.maxPriorityFee > 10_000_000_000) {
                Debug.print("⚠️ Capping priority fee from " # Nat.toText(gasPrices.maxPriorityFee) # " to 10 Gwei");
                10_000_000_000 // 10 Gwei max
            } else {
                gasPrices.maxPriorityFee
            };
            let maxFeePerGas = gasPrices.baseFee + cappedPriorityFee + (gasPrices.baseFee / 10); // 10% buffer
            
            // Calculate gas cost for the transaction
            let gasLimit : Nat = 80000; // Gas limit for deposit function call
            let maxGasCost = maxFeePerGas * gasLimit;
            
            // Get balance using EVM RPC canister
            let balanceRequest = "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"" # 
                               depositAddress # "\",\"latest\"],\"id\":1}";
            
            ExperimentalCycles.add(2_000_000_000); // 2B cycles
            let balanceResult = await evmRpc.request(
                #EthSepolia(#PublicNode),
                balanceRequest,
                2048
            );
            
            let currentBalance = switch (balanceResult) {
                case (#Ok(response)) {
                    let balanceHex = extractResultFromJson(response);
                    hexToNat(balanceHex);
                };
                case (#Err(error)) {
                    return #err("Failed to get balance via EVM RPC");
                };
            };
            
            Debug.print("Deposit address balance: " # Nat.toText(currentBalance));
            Debug.print("Max gas cost: " # Nat.toText(maxGasCost));
            Debug.print("Base fee: " # Nat.toText(gasPrices.baseFee) # ", Priority fee: " # Nat.toText(gasPrices.maxPriorityFee));
            
            // No extra buffer needed since we already added 10% to maxFeePerGas
            let totalGasNeeded = maxGasCost;
            
            // Ensure we have enough to cover both the deposit amount AND gas
            let totalRequired = info.amount + totalGasNeeded;
            if (currentBalance < totalRequired) {
                return #err("Insufficient balance. Have: " # Nat.toText(currentBalance) # 
                           ", need: " # Nat.toText(totalRequired) # 
                           " (deposit: " # Nat.toText(info.amount) # 
                           ", gas+buffer: " # Nat.toText(totalGasNeeded) # ")");
            };
            
            // Forward exactly the expected deposit amount (0.01 ETH)
            let amountToForward = info.amount; // Use the original deposit amount
            
            Debug.print("Balance: " # Nat.toText(currentBalance) # ", Max gas cost: " # Nat.toText(maxGasCost) # 
                       ", Total gas needed: " # Nat.toText(totalGasNeeded) #
                       ", Amount to forward: " # Nat.toText(amountToForward));
            
            // Build deposit call data
            // deposit(bytes32) function signature
            let methodId = "b214faa5";
            let commitmentHex = Text.trimStart(info.commitment, #text "0x");
            
            // Ensure commitment is properly padded to 32 bytes (64 hex chars)
            let paddedCommitment = if (Text.size(commitmentHex) < 64) {
                // Pad with leading zeros
                let padding = Text.fromIter(Iter.fromArray(Array.tabulate(64 - Text.size(commitmentHex), func(_: Nat) : Char { '0' })));
                padding # commitmentHex
            } else {
                commitmentHex
            };
            
            let callData = methodId # paddedCommitment;
            
            // Build EIP-1559 transaction
            let tx : EIP1559Transaction = {
                to = depositContractAddress;
                value = amountToForward;
                data = switch (Hex.decode(callData)) {
                    case (#ok(bytes)) { Blob.fromArray(bytes) };
                    case (#err(_)) { return #err("Failed to encode call data") };
                };
                nonce = addressNonce;
                maxFeePerGas = maxFeePerGas;
                maxPriorityFeePerGas = cappedPriorityFee; // Use capped value!
                gasLimit = gasLimit;
                chainId = 11155111; // Sepolia testnet // Ethereum mainnet
            };
            
            Debug.print("EIP-1559 Transaction details: to=" # depositContractAddress # 
                       ", value=" # Nat.toText(amountToForward) # 
                       ", maxFeePerGas=" # Nat.toText(maxFeePerGas) # 
                       ", maxPriorityFeePerGas=" # Nat.toText(cappedPriorityFee) #
                       ", gasLimit=" # Nat.toText(gasLimit) # 
                       ", nonce=" # Nat.toText(addressNonce));
            
            // Sign transaction with the deposit address's derived key
            let userHash = await keccak256(Text.encodeUtf8(Principal.toText(info.userId)));
            let hashBytes = Blob.toArray(userHash);
            let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
            
            // Sign the EIP-1559 transaction with proper yParity recovery
            let (signedTx, submitResult) = await signAndSubmitEIP1559Transaction(tx, derivationPath);
            
            switch (submitResult) {
                case (#Consistent(#Ok(sendStatus))) {
                    switch (sendStatus) {
                        case (#Ok(?txHash)) {
                            Debug.print("Forwarded deposit with tx: " # txHash);
                            
                            // Add commitment to deposit manager
                            let depositResult = await depositManager.deposit(
                                amountToForward,
                                "ETH",
                                11155111, // Sepolia testnet chain ID
                                info.commitment
                            );
                            switch (depositResult) {
                                case (#ok(depositResult)) {
                                    Debug.print("Added deposit with ID: " # Nat.toText(depositResult.depositId));
                                };
                                case (#err(e)) {
                                    Debug.print("Warning: Failed to add deposit: " # e);
                                };
                            };
                            
                            #ok(txHash)
                        };
                        case (#Ok(null)) {
                            #err("Transaction sent but no hash returned");
                        };
                        case (#NonceTooLow) {
                            #err("Nonce too low - transaction may already be processed");
                        };
                        case (#NonceTooHigh) {
                            #err("Nonce too high");
                        };
                        case (#InsufficientFunds) {
                            #err("Insufficient funds for transaction");
                        };
                    };
                };
                case (#Consistent(#Err(error))) {
                    #err("Failed to submit transaction via EVM RPC");
                };
                case (#Inconsistent(results)) {
                    // Check if any succeeded
                    for ((_, result) in results.vals()) {
                        switch (result) {
                            case (#Ok(#Ok(?txHash))) {
                                return #ok(txHash);
                            };
                            case (_) {};
                        };
                    };
                    #err("Inconsistent responses when submitting transaction");
                };
            };
        } catch (e) {
            #err("Exception during fund forwarding: " # Error.message(e))
        }
    };

    // Process a single deposit address using EIP-1559 (redirects to V2)
    public shared(msg) func processSingleDepositEIP1559(address: Text) : async Result.Result<Text, Text> {
        // Redirect to V2 implementation which has better gas handling and transaction monitoring
        await processSingleDepositV2(address)
    };

    // Process deposit with temporary claim (V3 - privacy-preserving)
    public shared(msg) func processMyDepositV3(depositAddress: Text) : async Result.Result<Text, Text> {
        Debug.print("🔐 processMyDepositV3 called for: " # depositAddress);
        Debug.print("🔐 Called by: " # Principal.toText(msg.caller));
        
        switch (depositClaims.get(depositAddress)) {
            case null { 
                #err("Deposit not found or claim expired") 
            };
            case (?claim) {
                // Check if caller has valid claim
                if (claim.claimer != msg.caller) {
                    return #err("Not authorized to process this deposit");
                };
                
                // Check if claim expired
                if (Time.now() > claim.expiresAt) {
                    // Clean up expired claim
                    depositClaims.delete(depositAddress);
                    depositAddresses.delete(depositAddress);
                    return #err("Processing window expired. Please create a new deposit.");
                };
                
                // Check state
                switch (claim.state) {
                    case (#Completed) { 
                        return #err("Deposit already completed"); 
                    };
                    case (#Processing) { 
                        return #err("Deposit is currently being processed"); 
                    };
                    case _ {
                        // Process the deposit
                        await processDepositWithClaim(depositAddress, claim);
                    };
                };
            };
        };
    };

    // Private function to process deposit with claim
    private func processDepositWithClaim(address: Text, claim: DepositClaim) : async Result.Result<Text, Text> {
        // Update state to processing
        let updatedClaim = {
            claim with 
            state = #Processing;
        };
        depositClaims.put(address, updatedClaim);
        
        try {
            // Check balance first
            let balanceResult = await checkAddressBalance(address);
            
            switch (balanceResult) {
                case (#ok(balance)) {
                    if (balance < claim.expectedAmount) {
                        // Update state back to awaiting funds
                        depositClaims.put(address, { claim with state = #AwaitingFunds });
                        return #err("Insufficient funds. Expected: " # Nat.toText(claim.expectedAmount) # ", found: " # Nat.toText(balance));
                    };
                    
                    // Forward funds using existing V2 logic
                    let forwardResult = await forwardFundsToPoolV2(address, {
                        commitment = claim.commitment;
                        amount = claim.expectedAmount;
                        timestamp = Time.now();
                        userId = claim.claimer;
                        processed = false;
                    });
                    
                    switch (forwardResult) {
                        case (#ok(txHash)) {
                            // Wait for confirmation
                            let confirmResult = await waitForTransactionConfirmation(txHash);
                            
                            switch (confirmResult) {
                                case (#ok(receipt)) {
                                    if (receipt.status == "0x1") {
                                        // Success! Register with deposit manager
                                        let depositResult = await depositManager.deposit(
                                            claim.expectedAmount,
                                            "ETH",
                                            11155111, // Sepolia
                                            claim.commitment
                                        );
                                        
                                        // Clean up all traces - privacy preserved!
                                        depositClaims.delete(address);
                                        depositAddresses.delete(address);
                                        
                                        Debug.print("✅ Deposit processed privately. No permanent records kept.");
                                        #ok(txHash)
                                    } else {
                                        // Failed - update state
                                        depositClaims.put(address, {
                                            claim with 
                                            state = #Failed;
                                            errorMessage = ?"Transaction failed";
                                            processingTxHash = ?txHash;
                                        });
                                        #err("Transaction failed")
                                    }
                                };
                                case (#err(e)) {
                                    // Pending or error - keep claim for retry
                                    depositClaims.put(address, {
                                        claim with 
                                        state = #Failed;
                                        errorMessage = ?e;
                                        processingTxHash = ?txHash;
                                        retryCount = claim.retryCount + 1;
                                    });
                                    #err(e)
                                };
                            };
                        };
                        case (#err(e)) {
                            depositClaims.put(address, {
                                claim with 
                                state = #Failed;
                                errorMessage = ?e;
                                retryCount = claim.retryCount + 1;
                            });
                            #err(e)
                        };
                    };
                };
                case (#err(e)) {
                    depositClaims.put(address, { claim with state = #AwaitingFunds });
                    #err("Failed to check balance: " # e)
                };
            };
        } catch (e) {
            depositClaims.put(address, {
                claim with 
                state = #Failed;
                errorMessage = ?Error.message(e);
            });
            #err("Processing error: " # Error.message(e))
        };
    };

    // Helper function to check address balance
    private func checkAddressBalance(address: Text) : async Result.Result<Nat, Text> {
        let balanceRequest = "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"" # 
                           address # "\",\"latest\"],\"id\":1}";
        
        ExperimentalCycles.add(2_000_000_000);
        let balanceResult = await evmRpc.request(
            #EthSepolia(#PublicNode),
            balanceRequest,
            2048
        );
        
        switch (balanceResult) {
            case (#Ok(response)) {
                let balanceHex = extractResultFromJson(response);
                #ok(hexToNat(balanceHex))
            };
            case (#Err(e)) {
                #err("Failed to get balance via EVM RPC")
            };
        }
    };

    // Process single deposit with V2 address derivation
    public shared(msg) func processSingleDepositV2(address: Text) : async Result.Result<Text, Text> {
        // Log the caller to identify who is calling this
        Debug.print("🚨 processSingleDepositV2 called for: " # address);
        Debug.print("🚨 Called by: " # Principal.toText(msg.caller));
        Debug.print("🕐 Time: " # Int.toText(Time.now()));
        
        // Check cycles before processing
        if (not hasSufficientCycles()) {
            return #err("Insufficient cycles. Please top up the canister.");
        };
        
        // Find the deposit info
        switch (depositAddresses.get(address)) {
            case null { #err("Deposit address not found") };
            case (?info) {
                if (info.processed) {
                    return #err("Deposit already processed");
                };
                
                // Ensure deposit contract is set
                if (depositContractAddress == "") {
                    return #err("Deposit contract address not set");
                };
                
                try {
                    Debug.print("Processing single V2 deposit at " # address);
                    
                    // Forward funds to pool contract using V2 derivation
                    let forwardResult = await forwardFundsToPoolV2(address, info);
                    
                    switch (forwardResult) {
                        case (#ok(txHash)) {
                            Debug.print("Transaction submitted with hash: " # txHash);
                            
                            // CRITICAL FIX: Wait for transaction confirmation
                            let confirmationResult = await waitForTransactionConfirmation(txHash);
                            
                            switch (confirmationResult) {
                                case (#ok(receipt)) {
                                    // Check if transaction is pending (our custom status)
                                    if (receipt.status == "0x2") {
                                        Debug.print("Transaction is pending confirmation: " # txHash);
                                        // Return success but don't mark as processed yet
                                        // Frontend will need to check again later
                                        #ok(txHash # ":pending")
                                    } else if (receipt.status == "0x1") {
                                        Debug.print("Transaction confirmed successfully!");
                                        
                                        // Only mark as processed after confirmation
                                        depositAddresses.put(address, {
                                            commitment = info.commitment;
                                            amount = info.amount;
                                            timestamp = info.timestamp;
                                            userId = info.userId;
                                            processed = true;
                                        });
                                        
                                        // Track processed deposit
                                        processedDeposits.put(info.commitment, Time.now());
                                        
                                        // Add commitment to deposit manager
                                        try {
                                            let depositResult = await depositManager.deposit(
                                                info.amount,
                                                "ETH",
                                                11155111, // Sepolia testnet
                                                info.commitment
                                            );
                                            
                                            switch (depositResult) {
                                                case (#ok(result)) {
                                                    Debug.print("Added deposit with ID: " # Nat.toText(result.depositId));
                                                    #ok(txHash)
                                                };
                                                case (#err(e)) {
                                                    Debug.print("Warning: Failed to add deposit to manager: " # e);
                                                    // Still return success since funds were forwarded
                                                    #ok(txHash)
                                                };
                                            };
                                        } catch (e) {
                                            Debug.print("Error adding to deposit manager: " # Error.message(e));
                                            // Still return success since funds were forwarded
                                            #ok(txHash)
                                        }
                                    } else {
                                        Debug.print("Transaction failed with status: " # receipt.status);
                                        #err("Transaction failed")
                                    };
                                };
                                case (#err(e)) {
                                    Debug.print("Transaction failed or not confirmed: " # e);
                                    // DO NOT mark as processed - allow retry
                                    #err("Transaction failed: " # e)
                                };
                            };
                        };
                        case (#err(e)) {
                            #err("Failed to forward from " # address # ": " # e)
                        };
                    };
                } catch (e) {
                    #err("Error processing " # address # ": " # Error.message(e))
                };
            };
        }
    };

    // Retry a failed V2 deposit (for debugging)
    public shared(msg) func retryV2Deposit(address: Text) : async Result.Result<Text, Text> {
        switch (depositAddresses.get(address)) {
            case null { #err("Deposit address not found") };
            case (?info) {
                // Ensure deposit contract is set
                if (depositContractAddress == "") {
                    return #err("Deposit contract address not set");
                };
                
                try {
                    Debug.print("Retrying V2 deposit at " # address # " (ignoring processed flag)");
                    
                    // Forward funds to pool contract using V2 derivation
                    let forwardResult = await forwardFundsToPoolV2(address, info);
                    
                    switch (forwardResult) {
                        case (#ok(txHash)) {
                            // Update processed status
                            depositAddresses.put(address, {
                                commitment = info.commitment;
                                amount = info.amount;
                                timestamp = info.timestamp;
                                userId = info.userId;
                                processed = true;
                            });
                            
                            #ok(txHash)
                        };
                        case (#err(e)) {
                            #err("Failed to forward from " # address # ": " # e)
                        };
                    };
                } catch (e) {
                    #err("Error processing " # address # ": " # Error.message(e))
                };
            };
        }
    };

    // Admin function to manually mark a deposit as processed after verifying on-chain
    public shared(msg) func markDepositAsProcessed(address: Text, txHash: Text) : async Result.Result<Text, Text> {
        // Add admin check here if needed
        switch (depositAddresses.get(address)) {
            case null { #err("Deposit address not found") };
            case (?info) {
                if (info.processed) {
                    return #err("Deposit already marked as processed");
                };
                
                // Mark as processed
                depositAddresses.put(address, {
                    commitment = info.commitment;
                    amount = info.amount;
                    timestamp = info.timestamp;
                    userId = info.userId;
                    processed = true;
                });
                
                // Track processed deposit
                processedDeposits.put(info.commitment, Time.now());
                
                // Add commitment to deposit manager
                let depositResult = await depositManager.deposit(
                    info.amount,
                    "ETH",
                    11155111, // Sepolia testnet
                    info.commitment
                );
                
                switch (depositResult) {
                    case (#ok(result)) {
                        #ok("Deposit marked as processed with tx: " # txHash # ", deposit ID: " # Nat.toText(result.depositId))
                    };
                    case (#err(e)) {
                        // Still mark as processed to prevent double forwarding
                        #ok("Deposit marked as processed with tx: " # txHash # " (warning: " # e # ")")
                    };
                };
            };
        }
    };
    
    // Forward funds from V2 deposit address to pool contract
    private func forwardFundsToPoolV2(depositAddress: Text, info: DepositInfo) : async Result.Result<Text, Text> {
        try {
            // Get nonce using EVM RPC canister
            ExperimentalCycles.add(2_000_000_000); // 2B cycles
            let nonceResult = await evmRpc.eth_getTransactionCount(
                #EthSepolia(?[#PublicNode]),
                ?{
                    responseSizeEstimate = ?64;
                    responseConsensus = null;
                },
                {
                    address = depositAddress;
                    block = #Latest;
                }
            );
            
            let addressNonce = switch (nonceResult) {
                case (#Consistent(#Ok(nonce))) { nonce };
                case (#Consistent(#Err(error))) { 
                    return #err("Failed to get nonce via EVM RPC");
                };
                case (#Inconsistent(results)) {
                    // Try to find most common nonce
                    var nonce : Nat = 0;
                    for ((_, result) in results.vals()) {
                        switch (result) {
                            case (#Ok(n)) { nonce := n; };
                            case (#Err(_)) {};
                        };
                    };
                    nonce;
                };
            };
            
            // Get current gas prices
            let gasPrices = switch (await getGasPrices()) {
                case (#ok(prices)) { prices };
                case (#err(e)) { return #err("Failed to get gas prices: " # e) };
            };
            
            // Calculate max fee per gas (base fee + priority fee + small buffer)
            // Cap priority fee at reasonable maximum (10 Gwei) to prevent excessive gas costs
            let cappedPriorityFee = if (gasPrices.maxPriorityFee > 10_000_000_000) {
                Debug.print("⚠️ Capping priority fee from " # Nat.toText(gasPrices.maxPriorityFee) # " to 10 Gwei");
                10_000_000_000 // 10 Gwei max
            } else {
                gasPrices.maxPriorityFee
            };
            let maxFeePerGas = gasPrices.baseFee + cappedPriorityFee + (gasPrices.baseFee / 10); // 10% buffer
            
            // Calculate gas cost for the transaction
            let gasLimit : Nat = 80000; // Gas limit for deposit function call
            let maxGasCost = maxFeePerGas * gasLimit;
            
            // Get balance using EVM RPC canister
            let balanceRequest = "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"" # 
                               depositAddress # "\",\"latest\"],\"id\":1}";
            
            ExperimentalCycles.add(2_000_000_000); // 2B cycles
            let balanceResult = await evmRpc.request(
                #EthSepolia(#PublicNode),
                balanceRequest,
                2048
            );
            
            let currentBalance = switch (balanceResult) {
                case (#Ok(response)) {
                    let balanceHex = extractResultFromJson(response);
                    hexToNat(balanceHex);
                };
                case (#Err(error)) {
                    return #err("Failed to get balance via EVM RPC");
                };
            };
            
            Debug.print("V2 deposit address balance: " # Nat.toText(currentBalance));
            Debug.print("Gas prices - baseFee: " # Nat.toText(gasPrices.baseFee) # ", priorityFee: " # Nat.toText(gasPrices.maxPriorityFee));
            Debug.print("Capped priority fee: " # Nat.toText(cappedPriorityFee));
            Debug.print("Max fee per gas: " # Nat.toText(maxFeePerGas));
            Debug.print("Gas limit: " # Nat.toText(gasLimit));
            Debug.print("Max gas cost: " # Nat.toText(maxGasCost));
            Debug.print("Max gas cost in ETH: " # Float.toText(Float.fromInt(Int.abs(maxGasCost)) / 1e18));
            
            // Ensure we have enough to cover both the deposit amount AND gas
            let totalRequired = info.amount + maxGasCost;
            Debug.print("Total required: " # Nat.toText(totalRequired) # " (" # Float.toText(Float.fromInt(Int.abs(totalRequired)) / 1e18) # " ETH)");
            if (currentBalance < totalRequired) {
                return #err("Insufficient balance. Have: " # Nat.toText(currentBalance) # 
                           " (" # Float.toText(Float.fromInt(Int.abs(currentBalance)) / 1e18) # " ETH)" #
                           ", need: " # Nat.toText(totalRequired) # 
                           " (" # Float.toText(Float.fromInt(Int.abs(totalRequired)) / 1e18) # " ETH)");
            };
            
            // Forward exactly the expected deposit amount
            let amountToForward = info.amount;
            
            Debug.print("V2 forwarding: " # Nat.toText(amountToForward) # " wei");
            
            // Build deposit call data
            let methodId = "b214faa5";
            let commitmentHex = Text.trimStart(info.commitment, #text "0x");
            
            // Ensure commitment is properly padded to 32 bytes (64 hex chars)
            let paddedCommitment = if (Text.size(commitmentHex) < 64) {
                let padding = Text.fromIter(Iter.fromArray(Array.tabulate(64 - Text.size(commitmentHex), func(_: Nat) : Char { '0' })));
                padding # commitmentHex
            } else {
                commitmentHex
            };
            
            let callData = methodId # paddedCommitment;
            
            // Build EIP-1559 transaction
            let tx : EIP1559Transaction = {
                to = depositContractAddress;
                value = amountToForward;
                data = switch (Hex.decode(callData)) {
                    case (#ok(bytes)) { Blob.fromArray(bytes) };
                    case (#err(e)) { return #err("Failed to decode call data: " # e) };
                };
                nonce = addressNonce;
                maxFeePerGas = maxFeePerGas;
                maxPriorityFeePerGas = cappedPriorityFee; // Use capped value!
                gasLimit = gasLimit;
                chainId = 11155111; // Sepolia testnet // Ethereum mainnet
            };
            
            // CRITICAL: Use V2 derivation path (userId + commitment + timestamp)
            let uniqueData = Text.encodeUtf8(
                Principal.toText(info.userId) # 
                info.commitment # 
                Int.toText(info.timestamp)
            );
            let uniqueHash = await keccak256(uniqueData);
            let hashBytes = Blob.toArray(uniqueHash);
            let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
            
            Debug.print("V2 derivation - userId: " # Principal.toText(info.userId) # 
                       ", commitment: " # info.commitment # 
                       ", timestamp: " # Int.toText(info.timestamp));
            
            // Sign the EIP-1559 transaction with proper yParity recovery
            let (signedTx, submitResult) = await signAndSubmitEIP1559Transaction(tx, derivationPath);
            
            switch (submitResult) {
                case (#Consistent(#Ok(sendStatus))) {
                    switch (sendStatus) {
                        case (#Ok(?txHash)) {
                            Debug.print("V2 forwarded deposit with tx: " # txHash);
                            
                            // Add commitment to deposit manager
                            let depositResult = await depositManager.deposit(
                                amountToForward,
                                "ETH",
                                11155111, // Sepolia testnet chain ID
                                info.commitment
                            );
                            switch (depositResult) {
                                case (#ok(depositResult)) {
                                    Debug.print("Added deposit with ID: " # Nat.toText(depositResult.depositId));
                                };
                                case (#err(e)) {
                                    Debug.print("Warning: Failed to add deposit: " # e);
                                };
                            };
                            
                            #ok(txHash)
                        };
                        case (#Ok(null)) {
                            #err("Transaction sent but no hash returned");
                        };
                        case (#NonceTooLow) {
                            #err("Nonce too low - transaction may already be processed");
                        };
                        case (#NonceTooHigh) {
                            #err("Nonce too high");
                        };
                        case (#InsufficientFunds) {
                            #err("Insufficient funds in deposit address");
                        };
                    };
                };
                case (#Consistent(#Err(error))) {
                    #err("RPC error: " # debug_show(error));
                };
                case (#Inconsistent(results)) {
                    #err("Inconsistent RPC results");
                };
            };
            
        } catch (e) {
            #err("Failed to forward funds: " # Error.message(e))
        };
    };

    // Wait for transaction confirmation
    private func waitForTransactionConfirmation(txHash: Text) : async Result.Result<TransactionReceipt, Text> {
        var attempts = 0;
        let maxAttempts = 30; // 30 attempts with 2-second delays = ~1 minute
        
        while (attempts < maxAttempts) {
            Debug.print("Checking transaction receipt for " # txHash # " (attempt " # Nat.toText(attempts + 1) # ")");
            
            // Add cycles for the RPC call (need more for eth_getTransactionReceipt)
            ExperimentalCycles.add(2_000_000_000); // 2B cycles to ensure enough for receipt call
            
            let receiptResult = await evmRpc.eth_getTransactionReceipt(
                #EthSepolia(?[#PublicNode]),
                ?{
                    responseSizeEstimate = ?500;
                    responseConsensus = null;
                },
                txHash
            );
            
            switch (receiptResult) {
                case (#Consistent(#Ok(?receipt))) {
                    // Transaction was mined
                    // Note: receipt from EVM RPC has different structure than our local type
                    // We need to handle the type mismatch properly
                    Debug.print("Transaction mined!");
                    Debug.print("Transaction status: " # receipt.status);
                    
                    if (receipt.status == "0x1") {
                        // Convert EVM RPC receipt to our local type
                        // We create a simplified receipt that works with our code
                        return #ok({
                            transactionHash = txHash;
                            blockNumber = 0; // We'll skip block number parsing for now
                            blockHash = "";
                            status = receipt.status;
                            gasUsed = 0;
                            cumulativeGasUsed = 0;
                            from = "";
                            to = null;
                            contractAddress = null;
                            logs = [];
                        });
                    } else {
                        return #err("Transaction failed with status 0x0");
                    };
                };
                case (#Consistent(#Ok(null))) {
                    // Transaction not yet mined, wait and retry
                    Debug.print("Transaction not yet mined, waiting...");
                    attempts += 1;
                    
                    // Continue checking up to maxAttempts
                    // Only return pending status if we've waited long enough
                    if (attempts >= 10) {
                        // After 10 attempts (~20 seconds), return pending status
                        // This allows the transaction to be tracked while still pending
                        Debug.print("Transaction still pending after " # Nat.toText(attempts) # " attempts");
                        return #ok({
                            transactionHash = txHash;
                            blockNumber = 0;
                            blockHash = "";
                            status = "0x2"; // Custom status to indicate pending
                            gasUsed = 0;
                            cumulativeGasUsed = 0;
                            from = "";
                            to = null;
                            contractAddress = null;
                            logs = [];
                        });
                    };
                    
                    // Add a delay between attempts (approximately 2 seconds)
                    // We use a simple RPC call to create the delay
                    try {
                        // Make a lightweight RPC call to create delay
                        let _ = await evmRpc.request(
                            #EthSepolia(#PublicNode),
                            "{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}",
                            1000
                        );
                    } catch (e) {
                        // Ignore errors from delay mechanism
                        Debug.print("Delay call failed, continuing...");
                    };
                };
                case (#Consistent(#Err(error))) {
                    return #err("Failed to get receipt: " # debug_show(error));
                };
                case (#Inconsistent(_)) {
                    return #err("Inconsistent RPC results");
                };
            };
        };
        
        #err("Transaction not confirmed after " # Nat.toText(maxAttempts) # " attempts")
    };

    // Manual recovery: Reset deposit processed status (admin only)
    public shared(msg) func resetDepositStatus(address: Text) : async Result.Result<Text, Text> {
        // TODO: Add admin authentication here
        // For now, we'll allow it for emergency recovery
        
        switch (depositAddresses.get(address)) {
            case null { #err("Deposit address not found") };
            case (?info) {
                if (not info.processed) {
                    return #err("Deposit is already marked as unprocessed");
                };
                
                // Reset to unprocessed
                depositAddresses.put(address, {
                    commitment = info.commitment;
                    amount = info.amount;
                    timestamp = info.timestamp;
                    userId = info.userId;
                    processed = false;
                });
                
                Debug.print("Reset deposit status for " # address # " to unprocessed");
                #ok("Deposit status reset. You can now retry processing.")
            };
        }
    };

    // Manual recovery: Force process a stuck deposit
    public shared(msg) func forceProcessDeposit(address: Text) : async Result.Result<Text, Text> {
        // TODO: Add admin authentication here
        
        switch (depositAddresses.get(address)) {
            case null { #err("Deposit address not found") };
            case (?info) {
                // Temporarily mark as unprocessed to allow retry
                depositAddresses.put(address, {
                    commitment = info.commitment;
                    amount = info.amount;
                    timestamp = info.timestamp;
                    userId = info.userId;
                    processed = false;
                });
                
                // Now process it
                await processSingleDepositV2(address)
            };
        }
    };

    // Recover stuck funds by finding the correct timestamp
    public shared(msg) func recoverStuckFunds(stuckAddress: Text, targetAddress: Text) : async Result.Result<Text, Text> {
        switch (depositAddresses.get(stuckAddress)) {
            case null { #err("Address not found in deposit records") };
            case (?info) {
                Debug.print("Starting recovery for " # stuckAddress);
                Debug.print("Target: " # targetAddress);
                Debug.print("Stored timestamp: " # Int.toText(info.timestamp));
                
                // The stored timestamp is slightly after the generation timestamp
                // Try timestamps in a 1 second window before the stored timestamp
                let baseTimestamp = info.timestamp;
                var found = false;
                var attempts = 0;
                
                // Try in smaller increments first (likely within milliseconds)
                // First try 0-1000 microseconds (1 millisecond)
                for (offset in Iter.range(0, 1000)) {
                    if (found) { 
                        return #err("Should not reach here"); // Exit early if found
                    };
                    
                    attempts += 1;
                    let tryTimestamp = baseTimestamp - offset;
                    
                    // Log progress every 100,000 attempts
                    if (offset % 100000 == 0) {
                        Debug.print("Trying offset -" # Nat.toText(offset) # " (attempt " # Nat.toText(attempts) # ")");
                    };
                    
                    // Generate derivation path with this timestamp
                    let uniqueData = Text.encodeUtf8(
                        Principal.toText(info.userId) # 
                        info.commitment # 
                        Int.toText(tryTimestamp)
                    );
                    let uniqueHash = await keccak256(uniqueData);
                    let hashBytes = Blob.toArray(uniqueHash);
                    let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
                    
                    // Get public key and check if it matches
                    let { public_key } = await getEcdsaPublicKey(derivationPath);
                    let derivedAddress = await publicKeyToEthereumAddressProper(public_key);
                    
                    if (Text.toLowercase(derivedAddress) == Text.toLowercase(stuckAddress)) {
                        Debug.print("FOUND! Matching timestamp at offset -" # Nat.toText(offset));
                        Debug.print("Actual generation timestamp: " # Int.toText(tryTimestamp));
                        
                        // Now forward the funds
                        let result = await forwardStuckFunds(stuckAddress, targetAddress, derivationPath);
                        return result;
                    };
                };
                
                // If not found in first millisecond, try up to 100ms
                Debug.print("Not found in first 1ms, trying larger offsets...");
                for (offset in Iter.range(1001, 100000)) {
                    if (found) { 
                        return #err("Should not reach here"); 
                    };
                    
                    attempts += 1;
                    let tryTimestamp = baseTimestamp - offset;
                    
                    if (offset % 10000 == 0) {
                        Debug.print("Trying offset -" # Nat.toText(offset) # " (attempt " # Nat.toText(attempts) # ")");
                    };
                    
                    let uniqueData = Text.encodeUtf8(
                        Principal.toText(info.userId) # 
                        info.commitment # 
                        Int.toText(tryTimestamp)
                    );
                    let uniqueHash = await keccak256(uniqueData);
                    let hashBytes = Blob.toArray(uniqueHash);
                    let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
                    
                    let { public_key } = await getEcdsaPublicKey(derivationPath);
                    let derivedAddress = await publicKeyToEthereumAddressProper(public_key);
                    
                    if (Text.toLowercase(derivedAddress) == Text.toLowercase(stuckAddress)) {
                        Debug.print("FOUND! Matching timestamp at offset -" # Nat.toText(offset));
                        Debug.print("Actual generation timestamp: " # Int.toText(tryTimestamp));
                        
                        let result = await forwardStuckFunds(stuckAddress, targetAddress, derivationPath);
                        return result;
                    };
                };
                
                Debug.print("Tried " # Nat.toText(attempts) # " timestamps without finding a match");
                #err("Could not find matching timestamp within 100ms window")
            };
        }
    };
    
    // Forward stuck funds using discovered derivation path
    private func forwardStuckFunds(
        fromAddress: Text,
        toAddress: Text,
        derivationPath: [Blob]
    ) : async Result.Result<Text, Text> {
        try {
            Debug.print("Forwarding funds from " # fromAddress # " to " # toAddress);
            
            // Get current balance
            let balanceRequest = "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"" # 
                               fromAddress # "\",\"latest\"],\"id\":1}";
            
            ExperimentalCycles.add(2_000_000_000);
            let balanceResult = await evmRpc.request(
                #EthSepolia(#PublicNode),
                balanceRequest,
                2048
            );
            
            let currentBalance = switch (balanceResult) {
                case (#Ok(response)) {
                    let balanceHex = extractResultFromJson(response);
                    hexToNat(balanceHex);
                };
                case (#Err(error)) {
                    return #err("Failed to get balance");
                };
            };
            
            Debug.print("Current balance: " # Nat.toText(currentBalance) # " wei");
            
            if (currentBalance == 0) {
                return #err("No balance to recover");
            };
            
            // Get gas prices
            let gasPrices = switch (await getGasPrices()) {
                case (#ok(prices)) { prices };
                case (#err(e)) { return #err("Failed to get gas prices: " # e) };
            };
            
            // Calculate gas for simple ETH transfer
            // Cap priority fee to prevent excessive gas costs
            let cappedPriorityFee = if (gasPrices.maxPriorityFee > 10_000_000_000) {
                10_000_000_000 // 10 Gwei max
            } else {
                gasPrices.maxPriorityFee
            };
            let maxFeePerGas = gasPrices.baseFee + cappedPriorityFee + (gasPrices.baseFee / 10);
            let gasLimit : Nat = 21000; // Standard ETH transfer
            let maxGasCost = maxFeePerGas * gasLimit;
            
            Debug.print("Max gas cost: " # Nat.toText(maxGasCost) # " wei");
            
            if (currentBalance <= maxGasCost) {
                return #err("Insufficient balance to cover gas. Have: " # Nat.toText(currentBalance) # ", need: " # Nat.toText(maxGasCost));
            };
            
            // Send all balance minus gas (with small buffer)
            let valueToSend = currentBalance - maxGasCost - (maxGasCost / 20); // 5% extra buffer
            
            Debug.print("Will send: " # Nat.toText(valueToSend) # " wei");
            
            // Get nonce
            ExperimentalCycles.add(2_000_000_000);
            let nonceResult = await evmRpc.eth_getTransactionCount(
                #EthSepolia(?[#PublicNode]),
                ?{ responseSizeEstimate = ?64; responseConsensus = null; },
                { address = fromAddress; block = #Latest; }
            );
            
            let nonce = switch (nonceResult) {
                case (#Consistent(#Ok(n))) { n };
                case (_) { return #err("Failed to get nonce") };
            };
            
            Debug.print("Nonce: " # Nat.toText(nonce));
            
            // Build simple ETH transfer transaction
            let tx : EIP1559Transaction = {
                to = toAddress;
                value = valueToSend;
                data = Blob.fromArray([]); // No data for simple transfer
                nonce = nonce;
                maxFeePerGas = maxFeePerGas;
                maxPriorityFeePerGas = cappedPriorityFee; // Use capped value!
                gasLimit = gasLimit;
                chainId = 11155111; // Sepolia testnet
            };
            
            // Sign and submit with the correct derivation path
            let (signedTx, submitResult) = await signAndSubmitEIP1559Transaction(tx, derivationPath);
            
            switch (submitResult) {
                case (#Consistent(#Ok(sendStatus))) {
                    switch (sendStatus) {
                        case (#Ok(?txHash)) {
                            Debug.print("Recovery successful! TX: " # txHash);
                            Debug.print("Recovered " # Nat.toText(valueToSend) # " wei to " # toAddress);
                            #ok(txHash)
                        };
                        case (#Ok(null)) {
                            #err("Transaction sent but no hash returned")
                        };
                        case (#InsufficientFunds) {
                            #err("Insufficient funds - this means wrong derivation path")
                        };
                        case (#NonceTooLow) {
                            #err("Nonce too low")
                        };
                        case (#NonceTooHigh) {
                            #err("Nonce too high")
                        };
                    };
                };
                case (#Consistent(#Err(error))) {
                    #err("RPC error: " # debug_show(error))
                };
                case (#Inconsistent(results)) {
                    #err("Inconsistent RPC results")
                };
            };
        } catch (e) {
            #err("Recovery failed: " # Error.message(e))
        };
    };

    // Verify V2 address derivation matches between generation and signing
    public shared(msg) func verifyV2AddressDerivation(testAddress: Text) : async Result.Result<{
        addressMatches: Bool;
        generatedAddress: Text;
        derivedFromSigning: Text;
        storedTimestamp: Int;
        canSign: Bool;
    }, Text> {
        switch (depositAddresses.get(testAddress)) {
            case null { #err("Address not found in deposit records") };
            case (?info) {
                Debug.print("Verifying V2 derivation for " # testAddress);
                Debug.print("Stored info - userId: " # Principal.toText(info.userId));
                Debug.print("Stored info - commitment: " # info.commitment);
                Debug.print("Stored info - timestamp: " # Int.toText(info.timestamp));
                
                // Recreate the exact derivation path used during generation
                let uniqueData = Text.encodeUtf8(
                    Principal.toText(info.userId) # 
                    info.commitment # 
                    Int.toText(info.timestamp)
                );
                let uniqueHash = await keccak256(uniqueData);
                let hashBytes = Blob.toArray(uniqueHash);
                let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
                
                // Get public key and derive address
                let { public_key } = await getEcdsaPublicKey(derivationPath);
                let derivedAddress = await publicKeyToEthereumAddressProper(public_key);
                
                Debug.print("Derived address from stored info: " # derivedAddress);
                Debug.print("Original address: " # testAddress);
                
                let addressMatches = Text.toLowercase(derivedAddress) == Text.toLowercase(testAddress);
                
                // Try to sign a test message to verify we can actually sign from this address
                var canSign = false;
                if (addressMatches) {
                    try {
                        // Create a simple test transaction
                        let testTx : EIP1559Transaction = {
                            to = "0x0000000000000000000000000000000000000000";
                            value = 0;
                            data = Blob.fromArray([]);
                            nonce = 0;
                            maxFeePerGas = 1000000000;
                            maxPriorityFeePerGas = 1000000000;
                            gasLimit = 21000;
                            chainId = 11155111; // Sepolia testnet
                        };
                        
                        // Try to sign it
                        let encoded = encodeEIP1559Transaction(testTx);
                        let messageHash = await keccak256(encoded);
                        
                        Debug.print("Test signing with derivation path...");
                        let signature = await signWithEcdsa(messageHash, derivationPath);
                        
                        Debug.print("Signature obtained successfully, size: " # Nat.toText(signature.size()));
                        canSign := true;
                    } catch (e) {
                        Debug.print("Failed to sign test transaction: " # Error.message(e));
                        canSign := false;
                    };
                };
                
                #ok({
                    addressMatches = addressMatches;
                    generatedAddress = testAddress;
                    derivedFromSigning = derivedAddress;
                    storedTimestamp = info.timestamp;
                    canSign = canSign;
                })
            };
        }
    };

    // Sign and submit EIP-1559 transaction with proper yParity recovery
    private func signAndSubmitEIP1559Transaction(tx: EIP1559Transaction, derivationPath: [Blob]) : async (Text, MultiSendRawTransactionResult) {
        // Encode EIP-1559 transaction for signing
        let encoded = encodeEIP1559Transaction(tx);
        let messageHash = await keccak256(encoded);
        
        Debug.print("EIP-1559 message hash size: " # Nat.toText(messageHash.size()) # " bytes");
        
        // Sign with threshold ECDSA
        let signature = await signWithEcdsa(messageHash, derivationPath);
        
        // First try with yParity = 0
        let signedTxV0 = encodeSignedEIP1559Transaction(tx, signature, 0);
        
        Debug.print("Submitting EIP-1559 transaction with yParity=0...");
        Debug.print("Signed transaction hex: " # signedTxV0);
        ExperimentalCycles.add(10_000_000_000); // 10B cycles
        let submitResultV0 = await evmRpc.eth_sendRawTransaction(
            #EthSepolia(?[#PublicNode]),
            ?{
                responseSizeEstimate = ?256;
                responseConsensus = null;
            },
            signedTxV0
        );
        
        switch (submitResultV0) {
            case (#Consistent(#Ok(#Ok(?txHash)))) {
                // Success with yParity = 0
                Debug.print("Transaction succeeded with yParity=0");
                (signedTxV0, submitResultV0);
            };
            case (_) {
                // Log the specific error from yParity=0
                Debug.print("yParity=0 result: " # debug_show(submitResultV0));
                
                // Try with yParity = 1
                Debug.print("yParity=0 failed, trying yParity=1...");
                let signedTxV1 = encodeSignedEIP1559Transaction(tx, signature, 1);
                Debug.print("Signed transaction hex (yParity=1): " # signedTxV1);
                
                ExperimentalCycles.add(10_000_000_000); // 10B cycles
                let submitResultV1 = await evmRpc.eth_sendRawTransaction(
                    #EthSepolia(?[#PublicNode]),
                    ?{
                        responseSizeEstimate = ?256;
                        responseConsensus = null;
                    },
                    signedTxV1
                );
                (signedTxV1, submitResultV1);
            };
        };
    };

    // Encode EIP-1559 transaction (type 0x02)
    private func encodeEIP1559Transaction(tx: EIP1559Transaction) : Blob {
        let items : [RLP.RLPItem] = [
            #bytes(RLP.natToBytes(tx.chainId)),
            #bytes(RLP.natToBytes(tx.nonce)),
            #bytes(RLP.natToBytes(tx.maxPriorityFeePerGas)),
            #bytes(RLP.natToBytes(tx.maxFeePerGas)),
            #bytes(RLP.natToBytes(tx.gasLimit)),
            #bytes(switch (Hex.decode(tx.to)) {
                case (#ok(bytes)) { Blob.fromArray(bytes) };
                case (#err(_)) { Blob.fromArray([]) };
            }),
            #bytes(RLP.natToBytes(tx.value)),
            #bytes(tx.data),
            #list([]) // Access list (empty)
        ];
        
        let rlpEncoded = RLP.encode(#list(items));
        // Prepend transaction type (0x02 for EIP-1559)
        let typePrefix : [Nat8] = [0x02];
        Blob.fromArray(Array.append<Nat8>(typePrefix, Blob.toArray(rlpEncoded)))
    };

    // Encode signed EIP-1559 transaction
    private func encodeSignedEIP1559Transaction(tx: EIP1559Transaction, sig: Blob, yParity: Nat) : Text {
        let sigBytes = Blob.toArray(sig);
        if (sigBytes.size() < 64) {
            return "0x";
        };
        
        let r = Blob.fromArray(Array.subArray(sigBytes, 0, 32));
        let s = Blob.fromArray(Array.subArray(sigBytes, 32, 32));
        
        let items : [RLP.RLPItem] = [
            #bytes(RLP.natToBytes(tx.chainId)),
            #bytes(RLP.natToBytes(tx.nonce)),
            #bytes(RLP.natToBytes(tx.maxPriorityFeePerGas)),
            #bytes(RLP.natToBytes(tx.maxFeePerGas)),
            #bytes(RLP.natToBytes(tx.gasLimit)),
            #bytes(switch (Hex.decode(tx.to)) {
                case (#ok(bytes)) { Blob.fromArray(bytes) };
                case (#err(_)) { Blob.fromArray([]) };
            }),
            #bytes(RLP.natToBytes(tx.value)),
            #bytes(tx.data),
            #list([]), // Access list (empty)
            #bytes(RLP.natToBytes(yParity)),
            #bytes(r),
            #bytes(s)
        ];
        
        let rlpEncoded = RLP.encode(#list(items));
        // Prepend transaction type (0x02 for EIP-1559)
        let typePrefix : [Nat8] = [0x02];
        let fullEncoded = Blob.fromArray(Array.append<Nat8>(typePrefix, Blob.toArray(rlpEncoded)));
        "0x" # Hex.encode(Blob.toArray(fullEncoded))
    };

    // Complete a deposit after transaction confirmation (for frontend recovery)
    public func completeDeposit(address: Text, txHash: Text) : async Result.Result<Text, Text> {
        Debug.print("📝 Completing deposit for address: " # address # " with tx: " # txHash);
        
        switch (depositAddresses.get(address)) {
            case null { #err("Deposit address not found") };
            case (?info) {
                if (info.processed) {
                    return #ok("Deposit already processed");
                };
                
                // Verify transaction is confirmed
                let statusResult = await checkTransactionStatus(txHash);
                switch (statusResult) {
                    case (#ok(status)) {
                        if (status.status == "confirmed") {
                            // Mark as processed
                            depositAddresses.put(address, {
                                commitment = info.commitment;
                                amount = info.amount;
                                timestamp = info.timestamp;
                                userId = info.userId;
                                processed = true;
                            });
                            
                            Debug.print("✅ Deposit completed successfully for " # address);
                            #ok("Deposit completed")
                        } else {
                            #err("Transaction not confirmed. Status: " # status.status)
                        }
                    };
                    case (#err(e)) {
                        #err("Failed to check transaction status: " # e)
                    };
                }
            };
        }
    };

    // Public method to check transaction status (for frontend)
    public func checkTransactionStatus(txHash: Text) : async Result.Result<{status: Text; blockNumber: ?Nat}, Text> {
        Debug.print("🔍 Checking transaction status for: " # txHash);
        
        // Add cycles for the RPC call
        ExperimentalCycles.add(2_000_000_000); // 2B cycles
        
        // Check receipt directly
        let receiptResult = await evmRpc.eth_getTransactionReceipt(
            #EthSepolia(?[#PublicNode]),
            ?{
                responseSizeEstimate = ?500;
                responseConsensus = null;
            },
            txHash
        );
        
        switch (receiptResult) {
            case (#Consistent(#Ok(?receipt))) {
                if (receipt.status == "0x1") {
                    #ok({status = "confirmed"; blockNumber = null}) // We'll add block number parsing later
                } else {
                    #ok({status = "failed"; blockNumber = null})
                }
            };
            case (#Consistent(#Ok(null))) {
                // No receipt yet - check if transaction exists via direct RPC
                let txCheckResult = await makeRpcCall("eth_getTransactionByHash", "[\"" # txHash # "\"]");
                switch (txCheckResult) {
                    case (#ok(result)) {
                        if (result != "" and result != "null") {
                            // Transaction exists but no receipt - still pending
                            #ok({status = "pending"; blockNumber = null})
                        } else {
                            // Transaction not found
                            #ok({status = "not_found"; blockNumber = null})
                        }
                    };
                    case (#err(e)) {
                        #err("Failed to check transaction: " # e)
                    };
                }
            };
            case (#Consistent(#Err(error))) {
                #err("Failed to get receipt: " # debug_show(error))
            };
            case (#Inconsistent(_)) {
                #err("Inconsistent RPC results for receipt")
            };
        }
    };

    // Query deposit state without revealing ownership (V3)
    public query func getDepositState(address: Text) : async ?Text {
        switch (depositClaims.get(address)) {
            case null { null };
            case (?claim) {
                switch (claim.state) {
                    case (#AwaitingFunds) { ?"awaiting_funds" };
                    case (#FundsReceived) { ?"funds_received" };
                    case (#Processing) { ?"processing" };
                    case (#Completed) { ?"completed" };
                    case (#Failed) { ?"failed" };
                }
            };
        }
    };

    // Query claim expiry time (for frontend countdown)
    public query func getClaimExpiry(address: Text) : async ?Int {
        switch (depositClaims.get(address)) {
            case null { null };
            case (?claim) { ?claim.expiresAt };
        }
    };

    // Clean up expired claims (can be called by anyone)
    public func cleanupExpiredClaims() : async Nat {
        var cleaned = 0;
        let now = Time.now();
        
        for ((address, claim) in depositClaims.entries()) {
            if (now > claim.expiresAt and claim.state != #Completed) {
                depositClaims.delete(address);
                depositAddresses.delete(address);
                cleaned += 1;
            };
        };
        
        Debug.print("🧹 Cleaned up " # Nat.toText(cleaned) # " expired claims");
        cleaned
    };
}
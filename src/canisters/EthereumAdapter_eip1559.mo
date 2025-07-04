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
import Map "mo:base/HashMap";
import Time "mo:base/Time";
import Error "mo:base/Error";
import Debug "mo:base/Debug";
import ExperimentalCycles "mo:base/ExperimentalCycles";

actor EthereumAdapter {

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

    // Legacy transaction type (kept for compatibility)
    private type EthereumTransaction = {
        to: Text;
        value: Nat;
        data: Blob;
        nonce: Nat;
        gasPrice: Nat;
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
    private stable var depositContractAddress : Text = "";
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
    private var keccak256CanisterId : Text = "hjxjp-uyaaa-aaaaj-a2dha-cai"; // Mainnet keccak256 canister
    
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
    
    // IC management canister interface
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
        deposit : (Nat, Text, Nat, Text) -> async Result.Result<Nat, Text>;
        getCurrentMerkleRoot : () -> async ?Text;
    } = actor("hhveh-piaaa-aaaaj-a2dga-cai");

    // EVM RPC canister interface
    private let evmRpc : actor {
        eth_getTransactionCount : (RpcServices, ?RpcConfig, GetTransactionCountArgs) -> async MultiGetTransactionCountResult;
        eth_sendRawTransaction : (RpcServices, ?RpcConfig, Text) -> async MultiSendRawTransactionResult;
        eth_getLogs : (RpcServices, ?GetLogsRpcConfig, GetLogsArgs) -> async MultiGetLogsResult;
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
            
            // Derive unique key for this user
            // Convert principal to text and use first 4 bytes of hash as derivation
            let userHash = await keccak256(Text.encodeUtf8(Principal.toText(userId)));
            let hashBytes = Blob.toArray(userHash);
            // Use first 4 bytes as a 32-bit integer derivation path
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

    // Get current gas prices for EIP-1559
    private func getGasPrices() : async Result.Result<{baseFee: Nat; maxPriorityFee: Nat}, Text> {
        try {
            // Get latest block to determine base fee
            let blockRequest = "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBlockByNumber\",\"params\":[\"latest\",false],\"id\":1}";
            
            ExperimentalCycles.add(2_000_000_000); // 2B cycles
            let blockResult = await evmRpc.request(
                #EthSepolia(#PublicNode),
                blockRequest,
                4096
            );
            
            switch (blockResult) {
                case (#Ok(result)) {
                    // Extract baseFeePerGas from the block
                    let baseFeeHex = extractFieldFromJson(result, "baseFeePerGas");
                    let baseFee = if (baseFeeHex != "") { hexToNat(baseFeeHex) } else { 1_000_000_000 }; // Default 1 gwei
                    
                    // For Sepolia, use a reasonable priority fee
                    let maxPriorityFee = 2_000_000_000; // 2 gwei priority fee
                    
                    #ok({ baseFee = baseFee; maxPriorityFee = maxPriorityFee })
                };
                case (#Err(e)) {
                    #err("Failed to get gas prices")
                };
            }
        } catch (e) {
            #err("Exception getting gas prices: " # Error.message(e))
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
            
            // Calculate max fee per gas (base fee + priority fee + buffer)
            let maxFeePerGas = gasPrices.baseFee + gasPrices.maxPriorityFee + (gasPrices.baseFee / 5); // 20% buffer
            
            // Calculate gas cost for the transaction
            let gasLimit : Nat = 100000; // Increased limit for deposit function with data
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
            
            // Calculate buffer for gas
            let buffer : Nat = maxGasCost / 5; // 20% of gas cost
            let totalGasNeeded = maxGasCost + buffer;
            
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
                maxPriorityFeePerGas = gasPrices.maxPriorityFee;
                gasLimit = gasLimit;
                chainId = 11155111; // Sepolia
            };
            
            Debug.print("EIP-1559 Transaction details: to=" # depositContractAddress # 
                       ", value=" # Nat.toText(amountToForward) # 
                       ", maxFeePerGas=" # Nat.toText(maxFeePerGas) # 
                       ", maxPriorityFeePerGas=" # Nat.toText(gasPrices.maxPriorityFee) #
                       ", gasLimit=" # Nat.toText(gasLimit) # 
                       ", nonce=" # Nat.toText(addressNonce));
            
            // Sign transaction with the deposit address's derived key
            let userHash = await keccak256(Text.encodeUtf8(Principal.toText(info.userId)));
            let hashBytes = Blob.toArray(userHash);
            let derivationPath = [Blob.fromArray([hashBytes[0], hashBytes[1], hashBytes[2], hashBytes[3]])];
            
            // Sign the EIP-1559 transaction
            let signedTx = await signEIP1559Transaction(tx, derivationPath);
            
            // Submit transaction using EVM RPC canister
            Debug.print("Submitting EIP-1559 transaction via EVM RPC canister...");
            
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
                            
                            // Add commitment to deposit manager
                            let depositResult = await depositManager.deposit(
                                amountToForward,
                                "ETH",
                                11155111, // Sepolia chain ID
                                info.commitment
                            );
                            switch (depositResult) {
                                case (#ok(depositId)) {
                                    Debug.print("Added deposit with ID: " # Nat.toText(depositId));
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

    // Process a single deposit address using EIP-1559
    public shared(msg) func processSingleDepositEIP1559(address: Text) : async Result.Result<Text, Text> {
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
                    Debug.print("Processing single deposit at " # address # " using EIP-1559");
                    
                    // Forward funds to pool contract using EIP-1559
                    let forwardResult = await forwardFundsToPoolEIP1559(address, info);
                    
                    switch (forwardResult) {
                        case (#ok(txHash)) {
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

    // Sign EIP-1559 transaction
    private func signEIP1559Transaction(tx: EIP1559Transaction, derivationPath: [Blob]) : async Text {
        // Encode EIP-1559 transaction for signing
        let encoded = encodeEIP1559Transaction(tx);
        let messageHash = await keccak256(encoded);
        
        Debug.print("EIP-1559 message hash size: " # Nat.toText(messageHash.size()) # " bytes");
        
        // Sign with threshold ECDSA
        let signature = await signWithEcdsa(messageHash, derivationPath);
        
        // Encode signed EIP-1559 transaction
        encodeSignedEIP1559Transaction(tx, signature)
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
        Blob.fromArray(Array.append([0x02], Blob.toArray(rlpEncoded)))
    };

    // Encode signed EIP-1559 transaction
    private func encodeSignedEIP1559Transaction(tx: EIP1559Transaction, sig: Blob) : Text {
        let sigBytes = Blob.toArray(sig);
        if (sigBytes.size() < 64) {
            return "0x";
        };
        
        let r = Blob.fromArray(Array.subArray(sigBytes, 0, 32));
        let s = Blob.fromArray(Array.subArray(sigBytes, 32, 32));
        
        // For EIP-1559, y-parity is 0 or 1 (not adjusted with chainId)
        let yParity = 0; // We'll try 0 first, might need to try 1
        
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
        let fullEncoded = Blob.fromArray(Array.append([0x02], Blob.toArray(rlpEncoded)));
        "0x" # Hex.encode(Blob.toArray(fullEncoded))
    };

    // Legacy functions preserved from original implementation
    
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

    // Set the Keccak256 canister ID
    public shared(msg) func setKeccak256CanisterId(canisterId: Text) : async Result.Result<(), Text> {
        keccak256CanisterId := canisterId;
        #ok()
    };
    
    // Get the current Keccak256 canister ID
    public query func getKeccak256CanisterId() : async Text {
        keccak256CanisterId
    };

    // Helper functions for JSON parsing
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
        let key = if (Blob.toArray(publicKey)[0] == 0x04) {
            Blob.fromArray(Array.subArray(Blob.toArray(publicKey), 1, 64))
        } else {
            publicKey
        };
        
        let hash = await keccak256(key);
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
        
        Debug.print("ECDSA signing - message hash size: " # Nat.toText(messageHash.size()));
        Debug.print("ECDSA signing - derivation path length: " # Nat.toText(derivationPath.size()));
        
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
}
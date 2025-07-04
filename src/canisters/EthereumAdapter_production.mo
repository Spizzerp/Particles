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

    private type EthereumTransaction = {
        to: Text;
        value: Nat;
        data: Blob;
        nonce: Nat;
        gasPrice: Nat;
        gasLimit: Nat;
        chainId: Nat;
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
    private let ECDSA_KEY_NAME : Text = "key_1";
    private let DEPOSIT_EVENT_SIGNATURE = "0x90890809c654f11d6e72a28fa60149770a0d11ec6c92319d6ceb2bb0a4ea1a15";
    
    // RPC Configuration
    private let INFURA_API_KEY : Text = "190d463dfdef42a69b97da04cfaf658b";
    private let SEPOLIA_RPC_URL : Text = "https://sepolia.infura.io/v3/" # INFURA_API_KEY;
    
    // IC management canister interface
    private let ic : actor {
        http_request : HttpRequestArgs -> async HttpResponsePayload;
        ecdsa_public_key : ({
            canister_id : ?Principal;
            derivation_path : [Blob];
            key_id : { curve: { #secp256k1 }; name: Text };
        }) -> async ({ public_key : Blob; chain_code : Blob; });
        sign_with_ecdsa : ({
            message_hash : Blob;
            derivation_path : [Blob];
            key_id : { curve: { #secp256k1 }; name: Text };
        }) -> async ({ signature : Blob });
    } = actor "aaaaa-aa";

    // Inter-canister communication with CryptoComponents
    private let cryptoComponents : actor {
        addLeaf : (Text) -> async Result.Result<Nat, Text>;
        getCurrentMerkleRoot : () -> async ?Text;
    } = actor("bd3sg-teaaa-aaaaa-qaaba-cai");

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
            let derivationPath = [Principal.toBlob(userId)];
            
            // Get public key via management canister
            let { public_key; chain_code } = await getEcdsaPublicKey(derivationPath);
            
            // Convert to Ethereum address
            let address = publicKeyToEthereumAddress(public_key);
            
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

    // Process deposits from unique addresses and forward to pool
    public shared(msg) func processDepositAddresses() : async Result.Result<[Text], Text> {
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
                    // Check balance of deposit address
                    let balanceResult = await makeRpcCall(
                        "eth_getBalance", 
                        "[\"" # address # "\",\"latest\"]"
                    );
                    
                    switch (balanceResult) {
                        case (#ok(result)) {
                            let balance = hexToNat(extractHexFromJson(result));
                            
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
                        case (#err(e)) {
                            errors.add("Failed to check balance for " # address # ": " # e);
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
    private func forwardFundsToPool(depositAddress: Text, info: DepositInfo) : async Result.Result<Text, Text> {
        try {
            // Get nonce for the deposit address
            let nonceResult = await makeRpcCall(
                "eth_getTransactionCount", 
                "[\"" # depositAddress # "\",\"latest\"]"
            );
            
            let addressNonce = switch (nonceResult) {
                case (#ok(res)) { hexToNat(extractHexFromJson(res)) };
                case (#err(e)) { return #err("Failed to get nonce: " # e) };
            };
            
            // Get current gas price
            let gasPriceResult = await makeRpcCall("eth_gasPrice", "[]");
            let gasPrice = switch (gasPriceResult) {
                case (#ok(res)) { 
                    let price = hexToNat(extractHexFromJson(res));
                    // Add 10% buffer for faster inclusion
                    price + (price / 10)
                };
                case (#err(_)) { 30_000_000_000 }; // 30 gwei fallback
            };
            
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
            
            // Build transaction
            let tx : EthereumTransaction = {
                to = depositContractAddress;
                value = info.amount;
                data = switch (Hex.decode(callData)) {
                    case (#ok(bytes)) { Blob.fromArray(bytes) };
                    case (#err(_)) { return #err("Failed to encode call data") };
                };
                nonce = addressNonce;
                gasPrice = gasPrice;
                gasLimit = 150000; // Higher limit for contract interaction
                chainId = 11155111; // Sepolia
            };
            
            // Sign transaction with the deposit address's derived key
            let derivationPath = [Principal.toBlob(info.userId)];
            let signedTx = await signTransactionWithPath(tx, derivationPath);
            
            // Submit transaction
            let submitResult = await makeRpcCall(
                "eth_sendRawTransaction",
                "[\"" # signedTx # "\"]"
            );
            
            switch (submitResult) {
                case (#ok(res)) {
                    let txHash = extractHexFromJson(res);
                    Debug.print("Forwarded deposit with tx: " # txHash);
                    
                    // Add commitment to Merkle tree
                    let leafResult = await cryptoComponents.addLeaf(info.commitment);
                    switch (leafResult) {
                        case (#ok(leafIndex)) {
                            Debug.print("Added to Merkle tree at index: " # Nat.toText(leafIndex));
                        };
                        case (#err(e)) {
                            Debug.print("Warning: Failed to add to Merkle tree: " # e);
                            // Don't fail the transaction, just log the error
                        };
                    };
                    
                    #ok(txHash)
                };
                case (#err(e)) {
                    #err("Failed to submit transaction: " # e)
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
        let messageHash = keccak256(encoded);
        
        // Sign with threshold ECDSA
        let signature = await signWithEcdsa(messageHash, derivationPath);
        
        // Encode signed transaction
        encodeSignedTransaction(tx, signature)
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
                            // Add to Merkle tree
                            let leafResult = await cryptoComponents.addLeaf(event.commitment);
                            switch (leafResult) {
                                case (#ok(_)) {
                                    processedDeposits.put(event.commitment, Time.now());
                                };
                                case (#err(e)) {
                                    Debug.print("Failed to add commitment to tree: " # e);
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
        publicKeyToEthereumAddress(public_key)
    };

    // Get deposit info for an address
    public query func getDepositInfo(address: Text) : async ?DepositInfo {
        depositAddresses.get(address)
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

    // Make RPC call via HTTP outcall
    private func makeRpcCall(method: Text, params: Text) : async Result.Result<Text, Text> {
        let jsonRpc = "{\"jsonrpc\":\"2.0\",\"method\":\"" # method # 
            "\",\"params\":" # params # ",\"id\":1}";
        
        let request : HttpRequestArgs = {
            url = SEPOLIA_RPC_URL;
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

    private func publicKeyToEthereumAddress(publicKey: Blob) : Text {
        let key = if (Blob.toArray(publicKey)[0] == 0x04) {
            Blob.fromArray(Array.subArray(Blob.toArray(publicKey), 1, 64))
        } else {
            publicKey
        };
        
        let hash = keccak256(key);
        let address = Blob.fromArray(Array.subArray(Blob.toArray(hash), 12, 20));
        
        "0x" # Hex.encode(Blob.toArray(address))
    };

    private func getEcdsaPublicKey(derivationPath: [Blob]) : async { public_key: Blob; chain_code: Blob } {
        await ic.ecdsa_public_key({
            canister_id = null;
            derivation_path = derivationPath;
            key_id = { curve = #secp256k1; name = ECDSA_KEY_NAME };
        })
    };

    private func signWithEcdsa(messageHash: Blob, derivationPath: [Blob]) : async Blob {
        let { signature } = await ic.sign_with_ecdsa({
            message_hash = messageHash;
            derivation_path = derivationPath;
            key_id = { curve = #secp256k1; name = ECDSA_KEY_NAME };
        });
        signature
    };

    private func keccak256(data: Blob) : Blob {
        Keccak.keccak256(data)
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
        let v = if (sigBytes.size() > 64) {
            Nat8.toNat(sigBytes[64])
        } else {
            27
        };
        
        let adjustedV = v + (tx.chainId * 2 + 35 - 27);
        
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
        let root = await cryptoComponents.getCurrentMerkleRoot();
        switch (root) {
            case (?r) { #ok(r) };
            case null { #err("No Merkle root found") };
        }
    };
}
import Blob "mo:base/Blob";
import Cycles "mo:base/ExperimentalCycles";
import Text "mo:base/Text";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Array "mo:base/Array";
import Result "mo:base/Result";
import Error "mo:base/Error";
import Principal "mo:base/Principal";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";

module {
    // Ethereum types
    public type EthereumAddress = Text;
    public type Wei = Nat;
    public type ChainId = Nat64;
    
    public type HttpHeader = {
        name : Text;
        value : Text;
    };

    public type HttpRequest = {
        url : Text;
        method : { #get; #post };
        body : ?Blob;
        headers : [HttpHeader];
        max_response_bytes : ?Nat64;
        transform : ?{
            function : shared query ({ response : HttpResponse; context : Blob }) -> async HttpResponse;
            context : Blob;
        };
    };

    public type HttpResponse = {
        status : Nat;
        headers : [HttpHeader];
        body : Blob;
    };

    // JSON-RPC types
    public type JsonRpcRequest = {
        jsonrpc : Text;
        method : Text;
        params : [Text];
        id : Nat;
    };

    // Management canister interface for HTTPS outcalls
    public type ManagementCanister = actor {
        http_request : HttpRequest -> async HttpResponse;
    };

    // Get the management canister
    private let ic : ManagementCanister = actor "aaaaa-aa";

    // Convert public key to Ethereum address
    public func publicKeyToEthereumAddress(publicKey : Blob) : EthereumAddress {
        let publicKeyBytes = Blob.toArray(publicKey);
        
        // Ethereum address generation:
        // 1. Take the Keccak-256 hash of the public key (excluding the first byte if it's 0x04)
        // 2. Take the last 20 bytes of the hash
        // 3. Prefix with "0x"
        
        // For now, return a mock address
        // In production, implement proper Keccak-256 hashing
        "0x742d35Cc6634C0532925a3b844Bc9e7595f6F263"
    };

    // Make an Ethereum RPC call
    public func makeRpcCall(
        rpcUrl : Text,
        method : Text,
        params : [Text]
    ) : async Result.Result<Text, Text> {
        let requestBody = "{\"jsonrpc\":\"2.0\",\"method\":\"" # method # 
                         "\",\"params\":[" # Text.join(",", params.vals()) # 
                         "],\"id\":1}";

        let request : HttpRequest = {
            url = rpcUrl;
            method = #post;
            body = ?Text.encodeUtf8(requestBody);
            headers = [
                { name = "Content-Type"; value = "application/json" }
            ];
            max_response_bytes = ?2000;
            transform = null;
        };

        try {
            Cycles.add<system>(1_000_000_000); // Add cycles for HTTPS outcall
            let response = await ic.http_request(request);
            
            switch (Text.decodeUtf8(response.body)) {
                case (?body) { #ok(body) };
                case null { #err("Failed to decode response body") };
            }
        } catch (e) {
            #err("RPC call failed: " # Error.message(e))
        }
    };

    // Get Ethereum balance
    public func getBalance(address : EthereumAddress, rpcUrl : Text) : async Result.Result<Wei, Text> {
        let params = ["\"" # address # "\"", "\"latest\""];
        
        switch (await makeRpcCall(rpcUrl, "eth_getBalance", params)) {
            case (#ok(response)) {
                // Parse balance from response
                parseHexBalance(response)
            };
            case (#err(e)) { #err(e) };
        }
    };

    // Get transaction count (nonce)
    public func getTransactionCount(address : EthereumAddress, rpcUrl : Text) : async Result.Result<Nat, Text> {
        let params = ["\"" # address # "\"", "\"latest\""];
        
        switch (await makeRpcCall(rpcUrl, "eth_getTransactionCount", params)) {
            case (#ok(response)) {
                parseHexNumber(response)
            };
            case (#err(e)) { #err(e) };
        }
    };

    // Send raw transaction
    public func sendRawTransaction(signedTx : Text, rpcUrl : Text) : async Result.Result<Text, Text> {
        let params = ["\"" # signedTx # "\""];
        
        switch (await makeRpcCall(rpcUrl, "eth_sendRawTransaction", params)) {
            case (#ok(response)) {
                // Extract transaction hash from response
                parseTransactionHash(response)
            };
            case (#err(e)) { #err(e) };
        }
    };

    // Parse hex balance from JSON response
    private func parseHexBalance(json : Text) : Result.Result<Wei, Text> {
        // Simple parsing - look for "result":"0x" pattern
        let parts = Iter.toArray(Text.split(json, #text "\"result\":\"0x"));
        if (parts.size() > 1) {
            let hexParts = Iter.toArray(Text.split(parts[1], #text "\""));
            if (hexParts.size() > 0) {
                #ok(hexToNat(hexParts[0]))
            } else {
                #err("Failed to parse balance")
            }
        } else {
            #err("Invalid response format")
        }
    };

    // Parse hex number from JSON response
    private func parseHexNumber(json : Text) : Result.Result<Nat, Text> {
        parseHexBalance(json) // Same parsing logic
    };

    // Parse transaction hash from response
    private func parseTransactionHash(json : Text) : Result.Result<Text, Text> {
        // Look for "result":"0x..." pattern
        let parts = Iter.toArray(Text.split(json, #text "\"result\":\""));
        if (parts.size() > 1) {
            let hashParts = Iter.toArray(Text.split(parts[1], #text "\""));
            if (hashParts.size() > 0) {
                #ok(hashParts[0])
            } else {
                #err("Failed to parse transaction hash")
            }
        } else {
            #err("Invalid response format")
        }
    };

    // Convert hex string to Nat
    private func hexToNat(hex : Text) : Nat {
        var result : Nat = 0;
        for (char in hex.chars()) {
            result *= 16;
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
                case (_) {};
            };
        };
        result
    };

    // Build Ethereum transaction
    public type EthereumTransaction = {
        nonce : Nat;
        gasPrice : Wei;
        gasLimit : Nat;
        to : EthereumAddress;
        value : Wei;
        data : Blob;
        chainId : ChainId;
    };

    // RLP encoding for Ethereum transactions (simplified)
    public func encodeTransaction(tx : EthereumTransaction) : Blob {
        // Implement RLP encoding
        // For now, return mock encoded transaction
        Blob.fromArray([0x01, 0x02, 0x03])
    };
}
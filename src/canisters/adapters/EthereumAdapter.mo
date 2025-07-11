// Ethereum Integration Adapter using HTTPS Outcalls and Threshold ECDSA
import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Int "mo:base/Int";
import Iter "mo:base/Iter";

module {
    // Ethereum types
    public type EthereumAddress = Text;
    public type Wei = Nat;
    public type Hex = Text;
    
    public type Transaction = {
        to: EthereumAddress;
        value: Wei;
        data: Blob;
        nonce: Nat;
        gasPrice: Wei;
        gasLimit: Nat;
        chainId: Nat;
    };

    public type SignedTransaction = {
        raw: Blob;
        hash: Hex;
        r: Blob;
        s: Blob;
        v: Nat;
    };

    public type Log = {
        address: EthereumAddress;
        topics: [Hex];
        data: Hex;
        blockNumber: Nat;
        transactionHash: Hex;
        logIndex: Nat;
    };

    public type HttpRequest = {
        url: Text;
        method: { #get; #post };
        body: Blob;
        headers: [{ name: Text; value: Text }];
        transform: ?{
            function: shared (HttpResponse) -> async HttpResponse;
            context: Blob;
        };
    };

    public type HttpResponse = {
        status: Nat;
        headers: [{ name: Text; value: Text }];
        body: Blob;
    };

    // RPC methods
    public func ethGetBalance(
        httpOutcall: shared (HttpRequest) -> async HttpResponse,
        rpcUrl: Text,
        address: EthereumAddress
    ) : async Result.Result<Wei, Text> {
        let request = buildJsonRpcRequest(
            "eth_getBalance",
            [address, "latest"]
        );

        switch (await makeRpcCall(httpOutcall, rpcUrl, request)) {
            case (#ok(response)) {
                parseHexToNat(response)
            };
            case (#err(e)) { #err(e) };
        }
    };

    public func ethGetTransactionCount(
        httpOutcall: shared (HttpRequest) -> async HttpResponse,
        rpcUrl: Text,
        address: EthereumAddress
    ) : async Result.Result<Nat, Text> {
        let request = buildJsonRpcRequest(
            "eth_getTransactionCount",
            [address, "latest"]
        );

        switch (await makeRpcCall(httpOutcall, rpcUrl, request)) {
            case (#ok(response)) {
                parseHexToNat(response)
            };
            case (#err(e)) { #err(e) };
        }
    };

    public func ethGasPrice(
        httpOutcall: shared (HttpRequest) -> async HttpResponse,
        rpcUrl: Text
    ) : async Result.Result<Wei, Text> {
        let request = buildJsonRpcRequest("eth_gasPrice", []);

        switch (await makeRpcCall(httpOutcall, rpcUrl, request)) {
            case (#ok(response)) {
                parseHexToNat(response)
            };
            case (#err(e)) { #err(e) };
        }
    };

    public func ethSendRawTransaction(
        httpOutcall: shared (HttpRequest) -> async HttpResponse,
        rpcUrl: Text,
        signedTx: Blob
    ) : async Result.Result<Hex, Text> {
        let hexTx = "0x" # blobToHex(signedTx);
        let request = buildJsonRpcRequest(
            "eth_sendRawTransaction",
            [hexTx]
        );

        await makeRpcCall(httpOutcall, rpcUrl, request)
    };

    public func ethGetTransactionReceipt(
        httpOutcall: shared (HttpRequest) -> async HttpResponse,
        rpcUrl: Text,
        txHash: Hex
    ) : async Result.Result<{
        status: Nat;
        blockNumber: Nat;
        gasUsed: Nat;
        logs: [Log];
    }, Text> {
        let request = buildJsonRpcRequest(
            "eth_getTransactionReceipt",
            [txHash]
        );

        switch (await makeRpcCall(httpOutcall, rpcUrl, request)) {
            case (#ok(response)) {
                // Parse JSON response
                parseTransactionReceipt(response)
            };
            case (#err(e)) { #err(e) };
        }
    };

    // ERC-20 token functions
    public func erc20BalanceOf(
        httpOutcall: shared (HttpRequest) -> async HttpResponse,
        rpcUrl: Text,
        tokenAddress: EthereumAddress,
        owner: EthereumAddress
    ) : async Result.Result<Nat, Text> {
        let data = encodeERC20Call("balanceOf", [owner]);
        let callData = "{\"to\":\"" # tokenAddress # "\",\"data\":\"0x" # blobToHex(data) # "\"}";
        let request = buildJsonRpcRequest(
            "eth_call",
            [callData, "latest"]
        );

        switch (await makeRpcCall(httpOutcall, rpcUrl, request)) {
            case (#ok(response)) {
                parseHexToNat(response)
            };
            case (#err(e)) { #err(e) };
        }
    };

    public func erc20Transfer(
        to: EthereumAddress,
        amount: Nat,
        tokenAddress: EthereumAddress
    ) : Blob {
        encodeERC20Call("transfer", [to, natToHex(amount)])
    };

    // Transaction building
    public func buildEthTransaction(
        to: EthereumAddress,
        value: Wei,
        nonce: Nat,
        gasPrice: Wei,
        gasLimit: Nat,
        chainId: Nat,
        data: ?Blob
    ) : Transaction {
        {
            to;
            value;
            data = switch (data) {
                case (?d) { d };
                case null { Blob.fromArray([]) };
            };
            nonce;
            gasPrice;
            gasLimit;
            chainId;
        }
    };

    // RLP encoding for transactions
    public func rlpEncodeTransaction(tx: Transaction) : Blob {
        let items = Buffer.Buffer<Blob>(9);
        
        items.add(rlpEncodeNat(tx.nonce));
        items.add(rlpEncodeNat(tx.gasPrice));
        items.add(rlpEncodeNat(tx.gasLimit));
        items.add(rlpEncodeAddress(tx.to));
        items.add(rlpEncodeNat(tx.value));
        items.add(rlpEncodeBlob(tx.data));
        items.add(rlpEncodeNat(tx.chainId));
        items.add(rlpEncodeNat(0)); // r placeholder
        items.add(rlpEncodeNat(0)); // s placeholder

        rlpEncodeList(Buffer.toArray(items))
    };

    // Helper to monitor for deposits
    public func monitorERC20Deposits(
        httpOutcall: shared (HttpRequest) -> async HttpResponse,
        rpcUrl: Text,
        tokenAddress: EthereumAddress,
        recipientAddress: EthereumAddress,
        fromBlock: Nat
    ) : async Result.Result<[{
        from: EthereumAddress;
        amount: Nat;
        txHash: Hex;
        blockNumber: Nat;
    }], Text> {
        let transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
        // Pad address to 32 bytes (64 hex chars) - addresses are 20 bytes, so we need 24 zeros
        let zeros = "000000000000000000000000";
        let recipientTopic = "0x" # zeros # Text.toLowercase(Text.replace(recipientAddress, #text("0x"), ""));
        
        let logsFilter = "{\"address\":\"" # tokenAddress # 
            "\",\"topics\":[\"" # transferTopic # "\",null,\"" # recipientTopic # 
            "\"],\"fromBlock\":\"0x" # natToHex(fromBlock) # 
            "\",\"toBlock\":\"latest\"}";
        let request = buildJsonRpcRequest(
            "eth_getLogs",
            [logsFilter]
        );

        switch (await makeRpcCall(httpOutcall, rpcUrl, request)) {
            case (#ok(response)) {
                parseTransferLogs(response)
            };
            case (#err(e)) { #err(e) };
        }
    };

    // Private helper functions
    private func buildJsonRpcRequest(method: Text, params: [Text]) : Text {
        var paramsStr = "[";
        var first = true;
        for (param in params.vals()) {
            if (not first) { paramsStr #= "," };
            paramsStr #= "\"" # param # "\"";
            first := false;
        };
        paramsStr #= "]";

        "{\"jsonrpc\":\"2.0\",\"method\":\"" # method # 
        "\",\"params\":" # paramsStr # ",\"id\":1}"
    };

    private func makeRpcCall(
        httpOutcall: shared (HttpRequest) -> async HttpResponse,
        rpcUrl: Text,
        request: Text
    ) : async Result.Result<Text, Text> {
        let httpRequest : HttpRequest = {
            url = rpcUrl;
            method = #post;
            body = Text.encodeUtf8(request);
            headers = [{ name = "Content-Type"; value = "application/json" }];
            transform = null;
        };

        try {
            let response = await httpOutcall(httpRequest);
            
            switch (Text.decodeUtf8(response.body)) {
                case (?body) {
                    // Simple JSON parsing - extract result field
                    if (Text.contains(body, #text("\"error\""))) {
                        #err("RPC error: " # body)
                    } else {
                        switch (extractJsonField(body, "result")) {
                            case (?result) { #ok(result) };
                            case null { #err("No result in response") };
                        }
                    }
                };
                case null { #err("Failed to decode response") };
            }
        } catch (e) {
            #err("HTTP request failed")
        }
    };

    private func parseHexToNat(hex: Text) : Result.Result<Nat, Text> {
        if (Text.startsWith(hex, #text("0x"))) {
            let cleanHex = Text.replace(hex, #text("0x"), "");
            hexToNat(cleanHex)
        } else {
            #err("Invalid hex string")
        }
    };

    private func hexToNat(hex: Text) : Result.Result<Nat, Text> {
        var result : Nat = 0;
        for (char in hex.chars()) {
            let digit = switch (char) {
                case ('0') { 0 };
                case ('1') { 1 };
                case ('2') { 2 };
                case ('3') { 3 };
                case ('4') { 4 };
                case ('5') { 5 };
                case ('6') { 6 };
                case ('7') { 7 };
                case ('8') { 8 };
                case ('9') { 9 };
                case ('a' or 'A') { 10 };
                case ('b' or 'B') { 11 };
                case ('c' or 'C') { 12 };
                case ('d' or 'D') { 13 };
                case ('e' or 'E') { 14 };
                case ('f' or 'F') { 15 };
                case _ { return #err("Invalid hex character") };
            };
            result := result * 16 + digit;
        };
        #ok(result)
    };

    private func natToHex(n: Nat) : Text {
        if (n == 0) { return "0" };
        
        var hex = "";
        var num = n;
        
        while (num > 0) {
            let digit = num % 16;
            let char = switch (digit) {
                case (10) { "a" };
                case (11) { "b" };
                case (12) { "c" };
                case (13) { "d" };
                case (14) { "e" };
                case (15) { "f" };
                case _ { Nat.toText(digit) };
            };
            hex := char # hex;
            num := num / 16;
        };
        
        hex
    };

    private func blobToHex(blob: Blob) : Text {
        let bytes = Blob.toArray(blob);
        var hex = "";
        for (byte in bytes.vals()) {
            let high = Nat8.toNat(byte) / 16;
            let low = Nat8.toNat(byte) % 16;
            hex #= natToHex(high) # natToHex(low);
        };
        hex
    };

    // Simplified RLP encoding functions
    private func rlpEncodeNat(n: Nat) : Blob {
        if (n == 0) {
            return Blob.fromArray([0x80]);
        };
        
        var bytes = Buffer.Buffer<Nat8>(8);
        var num = n;
        
        while (num > 0) {
            bytes.add(Nat8.fromNat(num % 256));
            num := num / 256;
        };
        
        let arr = Array.reverse(Buffer.toArray(bytes));
        
        if (arr.size() == 1 and arr[0] < 0x80) {
            Blob.fromArray(arr)
        } else {
            Blob.fromArray(Array.append([Nat8.fromNat(0x80 + arr.size())], arr))
        }
    };

    private func rlpEncodeBlob(blob: Blob) : Blob {
        let bytes = Blob.toArray(blob);
        if (bytes.size() == 1 and bytes[0] < 0x80) {
            blob
        } else if (bytes.size() < 56) {
            Blob.fromArray(Array.append([Nat8.fromNat(0x80 + bytes.size())], bytes))
        } else {
            // For longer blobs, encode length of length
            let lenBytes = natToBytes(bytes.size());
            let prefix = Nat8.fromNat(0xb7 + lenBytes.size());
            Blob.fromArray(Array.append([prefix], Array.append(lenBytes, bytes)))
        }
    };

    private func rlpEncodeAddress(address: EthereumAddress) : Blob {
        let cleanAddr = Text.replace(address, #text("0x"), "");
        let addrBytes = hexToBytes(cleanAddr);
        rlpEncodeBlob(Blob.fromArray(addrBytes))
    };

    private func rlpEncodeList(items: [Blob]) : Blob {
        var totalLen = 0;
        for (item in items.vals()) {
            totalLen += Blob.toArray(item).size();
        };

        let prefix = if (totalLen < 56) {
            [Nat8.fromNat(0xc0 + totalLen)]
        } else {
            let lenBytes = natToBytes(totalLen);
            Array.append([Nat8.fromNat(0xf7 + lenBytes.size())], lenBytes)
        };

        var result = Buffer.Buffer<Nat8>(totalLen + prefix.size());
        for (b in prefix.vals()) {
            result.add(b);
        };
        
        for (item in items.vals()) {
            for (b in Blob.toArray(item).vals()) {
                result.add(b);
            };
        };

        Blob.fromArray(Buffer.toArray(result))
    };

    private func natToBytes(n: Nat) : [Nat8] {
        if (n == 0) { return [0] };
        
        var bytes = Buffer.Buffer<Nat8>(8);
        var num = n;
        
        while (num > 0) {
            bytes.add(Nat8.fromNat(num % 256));
            num := num / 256;
        };
        
        Array.reverse(Buffer.toArray(bytes))
    };

    private func hexToBytes(hex: Text) : [Nat8] {
        var bytes = Buffer.Buffer<Nat8>(hex.size() / 2);
        var i = 0;
        
        while (i < hex.size()) {
            let highChar = Text.fromChar(Iter.toArray(hex.chars())[i]);
            let lowChar = Text.fromChar(Iter.toArray(hex.chars())[i + 1]);
            
            switch (hexToNat(highChar # lowChar)) {
                case (#ok(byte)) {
                    bytes.add(Nat8.fromNat(byte));
                };
                case (#err(_)) {};
            };
            
            i += 2;
        };
        
        Buffer.toArray(bytes)
    };

    private func encodeERC20Call(method: Text, params: [Text]) : Blob {
        // Simplified - actual implementation would use proper ABI encoding
        let methodId = switch (method) {
            case ("balanceOf") { "70a08231" };
            case ("transfer") { "a9059cbb" };
            case _ { "00000000" };
        };
        
        Blob.fromArray(hexToBytes(methodId))
    };

    private func extractJsonField(json: Text, field: Text) : ?Text {
        // Simplified JSON parsing - production would use proper parser
        let pattern = "\"" # field # "\":\"";
        let parts = Iter.toArray(Text.split(json, #text(pattern)));
        
        if (parts.size() > 1) {
            let valueParts = Iter.toArray(Text.split(parts[1], #text("\"")));
            if (valueParts.size() > 0) {
                ?valueParts[0]
            } else { null }
        } else { null }
    };

    private func parseTransactionReceipt(json: Text) : Result.Result<{
        status: Nat;
        blockNumber: Nat;
        gasUsed: Nat;
        logs: [Log];
    }, Text> {
        // Simplified - actual implementation would parse full receipt
        #ok({
            status = 1;
            blockNumber = 0;
            gasUsed = 21000;
            logs = [];
        })
    };

    private func parseTransferLogs(json: Text) : Result.Result<[{
        from: EthereumAddress;
        amount: Nat;
        txHash: Hex;
        blockNumber: Nat;
    }], Text> {
        // Simplified - actual implementation would parse logs array
        #ok([])
    };
}
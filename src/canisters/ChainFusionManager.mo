import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Types "../types/Types";
import Error "mo:base/Error";
import Bitcoin "./Bitcoin/BitcoinIntegration";
import Ethereum "./Ethereum/EthereumIntegration";
import Debug "mo:base/Debug";
import Int "mo:base/Int";

actor class ChainFusionManager(init : { key_name : Text; ethereum_rpc : Text }) {
    // Configuration
    private let key_name : Text = init.key_name;
    private let ethereum_rpc : Text = init.ethereum_rpc;
    
    // Management canister for ECDSA calls
    private let managementCanister = actor "aaaaa-aa" : actor {
        ecdsa_public_key : (EcdsaPublicKeyArgs) -> async EcdsaPublicKeyResult;
        sign_with_ecdsa : (SignWithEcdsaArgs) -> async SignWithEcdsaResult;
    };

    // Bitcoin Integration Types
    public type BitcoinAddress = Text;
    public type Satoshi = Nat64;
    public type MillisatoshiPerByte = Nat64;
    
    public type BitcoinNetwork = {
        #mainnet;
        #testnet;
        #regtest;
    };

    public type GetUtxosRequest = {
        address : BitcoinAddress;
        network : BitcoinNetwork;
        filter : ?{
            #page : Blob;
            #min_confirmations : Nat32;
        };
    };

    public type GetUtxosResponse = {
        utxos : [Utxo];
        tip_block_hash : Blob;
        tip_height : Nat32;
        next_page : ?Blob;
    };

    public type Utxo = {
        outpoint : { txid : Blob; vout : Nat32 };
        value : Satoshi;
        height : Nat32;
    };

    // Ethereum Integration Types
    public type EthereumAddress = Text;
    public type Wei = Nat;
    
    public type HttpHeader = {
        name : Text;
        value : Text;
    };

    public type HttpRequest = {
        url : Text;
        method : { #get; #post };
        body : Blob;
        headers : [HttpHeader];
    };

    public type HttpResponse = {
        status : Nat;
        headers : [HttpHeader];
        body : Blob;
    };

    // ECDSA Types
    public type EcdsaKeyId = {
        curve : { #secp256k1 };
        name : Text;
    };

    public type EcdsaPublicKeyArgs = {
        canister_id : ?Principal;
        derivation_path : [Blob];
        key_id : EcdsaKeyId;
    };

    public type EcdsaPublicKeyResult = {
        public_key : Blob;
        chain_code : Blob;
    };

    public type SignWithEcdsaArgs = {
        message_hash : Blob;
        derivation_path : [Blob];
        key_id : EcdsaKeyId;
    };

    public type SignWithEcdsaResult = {
        signature : Blob;
    };

    // Generate Bitcoin address for a principal
    public func generateBitcoinAddress(principal: Principal) : async Result.Result<BitcoinAddress, Text> {
        let caller = Principal.toBlob(principal);
        
        try {
            // Call threshold ECDSA to get public key
            let publicKeyResult = await managementCanister.ecdsa_public_key({
                canister_id = null;
                derivation_path = [caller];
                key_id = { curve = #secp256k1; name = key_name };
            });

            // Convert to Bitcoin address
            let address = Bitcoin.publicKeyToBitcoinAddress(publicKeyResult.public_key, #testnet);
            #ok(address)
        } catch (e) {
            #err("Failed to generate Bitcoin address: " # Error.message(e))
        }
    };

    // Get Bitcoin balance
    public func getBitcoinBalance(address: BitcoinAddress) : async Result.Result<Satoshi, Text> {
        switch (await Bitcoin.getUtxos(address, #testnet)) {
            case (#ok(response)) {
                var balance : Satoshi = 0;
                for (utxo in response.utxos.vals()) {
                    balance += utxo.value;
                };
                #ok(balance)
            };
            case (#err(e)) { #err(e) };
        }
    };

    // Generate Ethereum address
    public func generateEthereumAddress(principal: Principal) : async Result.Result<EthereumAddress, Text> {
        let caller = Principal.toBlob(principal);
        
        try {
            let publicKeyResult = await managementCanister.ecdsa_public_key({
                canister_id = null;
                derivation_path = [caller];
                key_id = { curve = #secp256k1; name = key_name };
            });

            let address = Ethereum.publicKeyToEthereumAddress(publicKeyResult.public_key);
            #ok(address)
        } catch (e) {
            #err("Failed to generate Ethereum address: " # Error.message(e))
        }
    };

    // Get Ethereum balance using HTTPS outcalls
    public func getEthereumBalance(address: EthereumAddress) : async Result.Result<Wei, Text> {
        await Ethereum.getBalance(address, ethereum_rpc)
    };

    // Sign a message with threshold ECDSA
    public func signWithEcdsa(
        principal: Principal,
        messageHash: Blob
    ) : async Result.Result<Blob, Text> {
        let caller = Principal.toBlob(principal);
        
        try {
            let signature = await managementCanister.sign_with_ecdsa({
                message_hash = messageHash;
                derivation_path = [caller];
                key_id = { curve = #secp256k1; name = key_name };
            });
            #ok(signature.signature)
        } catch (e) {
            #err("Failed to sign with ECDSA: " # Error.message(e))
        }
    };

    // Send Bitcoin transaction
    public func sendBitcoinTransaction(
        from: Principal,
        toAddress: BitcoinAddress,
        amount: Satoshi,
        network: BitcoinNetwork
    ) : async Result.Result<Text, Text> {
        // Get sender's Bitcoin address
        let senderAddressResult = await generateBitcoinAddress(from);
        let senderAddress = switch (senderAddressResult) {
            case (#ok(addr)) { addr };
            case (#err(e)) { return #err(e) };
        };

        // Get UTXOs
        let utxosResult = await Bitcoin.getUtxos(senderAddress, network);
        let utxos = switch (utxosResult) {
            case (#ok(response)) { response.utxos };
            case (#err(e)) { return #err("Failed to get UTXOs: " # e) };
        };

        // Get current fees
        let feesResult = await Bitcoin.getCurrentFeePercentiles(network);
        let feePerByte = switch (feesResult) {
            case (#ok(fees)) {
                if (fees.size() > 0) { fees[fees.size() / 2] } // Use median fee
                else { 1000 : MillisatoshiPerByte } // Default fee
            };
            case (#err(_)) { 1000 : MillisatoshiPerByte }; // Default fee
        };

        // Build transaction
        let txResult = Bitcoin.buildTransaction(
            utxos,
            toAddress,
            amount,
            senderAddress, // Use sender as change address
            feePerByte
        );
        
        let unsignedTx = switch (txResult) {
            case (#ok(tx)) { tx };
            case (#err(e)) { return #err(e) };
        };

        // Sign transaction with threshold ECDSA
        let signResult = await signWithEcdsa(from, unsignedTx);
        let signature = switch (signResult) {
            case (#ok(sig)) { sig };
            case (#err(e)) { return #err(e) };
        };

        // For now, return mock transaction ID
        // In production, combine signature with transaction and send
        #ok("mock_bitcoin_tx_" # debug_show(Time.now()))
    };

    // Send Ethereum transaction
    public func sendEthereumTransaction(
        from: Principal,
        toAddress: EthereumAddress,
        amount: Wei
    ) : async Result.Result<Text, Text> {
        // Get sender's Ethereum address
        let senderAddressResult = await generateEthereumAddress(from);
        let senderAddress = switch (senderAddressResult) {
            case (#ok(addr)) { addr };
            case (#err(e)) { return #err(e) };
        };

        // Get nonce
        let nonceResult = await Ethereum.getTransactionCount(senderAddress, ethereum_rpc);
        let nonce = switch (nonceResult) {
            case (#ok(n)) { n };
            case (#err(e)) { return #err("Failed to get nonce: " # e) };
        };

        // Build transaction
        let tx : Ethereum.EthereumTransaction = {
            nonce = nonce;
            gasPrice = 20000000000; // 20 gwei
            gasLimit = 21000; // Standard transfer
            to = toAddress;
            value = amount;
            data = Blob.fromArray([]);
            chainId = 1; // Mainnet, use 5 for Goerli testnet
        };

        // Encode transaction
        let encodedTx = Ethereum.encodeTransaction(tx);

        // Sign with threshold ECDSA
        let signResult = await signWithEcdsa(from, encodedTx);
        let signature = switch (signResult) {
            case (#ok(sig)) { sig };
            case (#err(e)) { return #err(e) };
        };

        // For now, return mock transaction hash
        // In production, combine signature with transaction and send via RPC
        #ok("0x" # debug_show(Time.now()))
    };

    // Bridge deposit from Bitcoin
    public func bridgeFromBitcoin(
        principal: Principal,
        amount: Satoshi,
        destinationChain: Text
    ) : async Result.Result<Text, Text> {
        // Verify Bitcoin deposit first
        let btcAddress = await generateBitcoinAddress(principal);
        let address = switch (btcAddress) {
            case (#ok(addr)) { addr };
            case (#err(e)) { return #err(e) };
        };

        // Check balance
        let balanceResult = await getBitcoinBalance(address);
        let balance = switch (balanceResult) {
            case (#ok(bal)) { bal };
            case (#err(e)) { return #err(e) };
        };

        if (balance < amount) {
            return #err("Insufficient Bitcoin balance")
        };

        // Process bridge operation
        #ok("Bridge operation initiated: " # debug_show(amount) # " satoshis")
    };

    // Bridge deposit from Ethereum
    public func bridgeFromEthereum(
        principal: Principal,
        amount: Wei,
        destinationChain: Text
    ) : async Result.Result<Text, Text> {
        // Verify Ethereum deposit first
        let ethAddress = await generateEthereumAddress(principal);
        let address = switch (ethAddress) {
            case (#ok(addr)) { addr };
            case (#err(e)) { return #err(e) };
        };

        // Check balance
        let balanceResult = await getEthereumBalance(address);
        let balance = switch (balanceResult) {
            case (#ok(bal)) { bal };
            case (#err(e)) { return #err(e) };
        };

        if (balance < amount) {
            return #err("Insufficient Ethereum balance")
        };

        // Process bridge operation
        #ok("Bridge operation initiated: " # debug_show(amount) # " wei")
    };

    // Public query functions
    public query func getKeyName() : async Text {
        key_name
    };

    public query func getSupportedChains() : async [Text] {
        ["Bitcoin", "Ethereum", "ICP"]
    };
}
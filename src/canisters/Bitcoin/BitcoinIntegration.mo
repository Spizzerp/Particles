import Blob "mo:base/Blob";
import Cycles "mo:base/ExperimentalCycles";
import Text "mo:base/Text";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Array "mo:base/Array";
import Result "mo:base/Result";
import Error "mo:base/Error";
import Principal "mo:base/Principal";
import Buffer "mo:base/Buffer";

module {
    // Bitcoin types
    public type BitcoinAddress = Text;
    public type Satoshi = Nat64;
    public type MillisatoshiPerByte = Nat64;
    
    public type BitcoinNetwork = {
        #mainnet;
        #testnet;
        #regtest;
    };

    public type Utxo = {
        outpoint : { txid : Blob; vout : Nat32 };
        value : Satoshi;
        height : Nat32;
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

    public type GetCurrentFeePercentilesRequest = {
        network : BitcoinNetwork;
    };

    public type SendTransactionRequest = {
        network : BitcoinNetwork;
        transaction : Blob;
    };

    // Management canister interface for Bitcoin
    public type ManagementCanister = actor {
        bitcoin_get_utxos : GetUtxosRequest -> async GetUtxosResponse;
        bitcoin_get_current_fee_percentiles : GetCurrentFeePercentilesRequest -> async [MillisatoshiPerByte];
        bitcoin_send_transaction : SendTransactionRequest -> async ();
    };

    // ECDSA types
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

    // Get the management canister
    private let ic : ManagementCanister = actor "aaaaa-aa";

    // Convert public key to Bitcoin address (P2PKH)
    public func publicKeyToBitcoinAddress(publicKey : Blob, network : BitcoinNetwork) : BitcoinAddress {
        let publicKeyBytes = Blob.toArray(publicKey);
        
        // Get network prefix
        let prefix : Nat8 = switch (network) {
            case (#mainnet) { 0x00 }; // '1' addresses
            case (#testnet or #regtest) { 0x6f }; // 'm' or 'n' addresses
        };
        
        // For now, return a mock address
        // In production, implement proper Bitcoin address generation:
        // 1. SHA256 hash of public key
        // 2. RIPEMD160 hash of SHA256 result
        // 3. Add network prefix
        // 4. Calculate checksum (double SHA256)
        // 5. Base58 encode
        
        switch (network) {
            case (#mainnet) { "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" };
            case (#testnet) { "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx" };
            case (#regtest) { "bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080" };
        }
    };

    // Get UTXOs for a Bitcoin address
    public func getUtxos(address : BitcoinAddress, network : BitcoinNetwork) : async Result.Result<GetUtxosResponse, Text> {
        try {
            Cycles.add<system>(10_000_000_000);
            let response = await ic.bitcoin_get_utxos({
                address = address;
                network = network;
                filter = null;
            });
            #ok(response)
        } catch (e) {
            #err("Failed to get UTXOs: " # Error.message(e))
        }
    };

    // Get current fee percentiles
    public func getCurrentFeePercentiles(network : BitcoinNetwork) : async Result.Result<[MillisatoshiPerByte], Text> {
        try {
            Cycles.add<system>(10_000_000_000);
            let fees = await ic.bitcoin_get_current_fee_percentiles({
                network = network;
            });
            #ok(fees)
        } catch (e) {
            #err("Failed to get fee percentiles: " # Error.message(e))
        }
    };

    // Send Bitcoin transaction
    public func sendTransaction(transaction : Blob, network : BitcoinNetwork) : async Result.Result<(), Text> {
        try {
            Cycles.add<system>(10_000_000_000);
            await ic.bitcoin_send_transaction({
                network = network;
                transaction = transaction;
            });
            #ok()
        } catch (e) {
            #err("Failed to send transaction: " # Error.message(e))
        }
    };

    // Build a simple Bitcoin transaction (P2PKH to P2PKH)
    public func buildTransaction(
        utxos : [Utxo],
        recipientAddress : BitcoinAddress,
        amount : Satoshi,
        changeAddress : BitcoinAddress,
        feePerByte : MillisatoshiPerByte
    ) : Result.Result<Blob, Text> {
        // Transaction building logic would go here
        // For now, return a mock transaction
        #ok(Blob.fromArray([0x01, 0x00, 0x00, 0x00])) // Version 1
    };
}
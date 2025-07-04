import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Map "mo:base/HashMap";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Iter "mo:base/Iter";
import Hash "mo:base/Hash";
import Types "../types/Types";
import PlonkIntegration "./PlonkIntegration";
import Debug "mo:base/Debug";
import Nat8 "mo:base/Nat8";

actor WithdrawalProcessor {
    private stable var nextWithdrawalId : Nat = 0;
    private var withdrawals = Map.HashMap<Nat, Types.Withdrawal>(10, Nat.equal, Hash.hash);
    private var nullifierSet = Map.HashMap<Types.NullifierHash, Bool>(10, Text.equal, Text.hash);
    private var pendingWithdrawals = Map.HashMap<Nat, Types.Withdrawal>(10, Nat.equal, Hash.hash);
    private var processedWithdrawals = Map.HashMap<Nat, Types.Withdrawal>(10, Nat.equal, Hash.hash);
    
    // PLONK verifier canister reference
    private let plonkVerifier : PlonkIntegration.PlonkVerifier = actor(PlonkIntegration.PLONK_VERIFIER_CANISTER);
    
    // Ethereum adapter for executing withdrawals
    private let ethereumAdapter : actor {
        getPoolAddress : () -> async Result.Result<Text, Text>;
        getDepositContract : () -> async Text;
        sendWithdrawal : (Text, Nat, Text) -> async Result.Result<Text, Text>;
        getCurrentMerkleRoot : () -> async Result.Result<Text, Text>;
    } = actor("55iy2-vaaaa-aaaas-amn7a-cai"); // ethereum_adapter_fixed on IC
    
    // Store the PLONK verification key (loaded at init)
    private stable var plonkVkBytes : [Nat8] = [];
    
    private stable var withdrawalEntries : [(Nat, Types.Withdrawal)] = [];
    private stable var nullifierEntries : [(Types.NullifierHash, Bool)] = [];
    private stable var pendingEntries : [(Nat, Types.Withdrawal)] = [];
    private stable var processedEntries : [(Nat, Types.Withdrawal)] = [];
    
    system func preupgrade() {
        withdrawalEntries := Iter.toArray(withdrawals.entries());
        nullifierEntries := Iter.toArray(nullifierSet.entries());
        pendingEntries := Iter.toArray(pendingWithdrawals.entries());
        processedEntries := Iter.toArray(processedWithdrawals.entries());
    };
    
    system func postupgrade() {
        withdrawals := Map.fromIter<Nat, Types.Withdrawal>(withdrawalEntries.vals(), 10, Nat.equal, Hash.hash);
        nullifierSet := Map.fromIter<Types.NullifierHash, Bool>(nullifierEntries.vals(), 10, Text.equal, Text.hash);
        pendingWithdrawals := Map.fromIter<Nat, Types.Withdrawal>(pendingEntries.vals(), 10, Nat.equal, Hash.hash);
        processedWithdrawals := Map.fromIter<Nat, Types.Withdrawal>(processedEntries.vals(), 10, Nat.equal, Hash.hash);
    };
    
    public func setPlonkVerificationKey(vkBytes: [Nat8]) : async Result.Result<(), Text> {
        if (vkBytes.size() == 0) {
            return #err("Verification key cannot be empty");
        };
        plonkVkBytes := vkBytes;
        #ok()
    };
    
    public func initiateWithdrawal(
        nullifier: Types.NullifierHash,
        recipient: Text,
        amount: Types.Amount,
        tokenId: Types.TokenId,
        chainId: Types.ChainId,
        merkleRoot: Types.MerkleRoot,
        plonkProof: Types.PlonkProof
    ) : async Result.Result<Nat, Text> {
        // Check nullifier hasn't been used
        switch (nullifierSet.get(nullifier)) {
            case (?exists) {
                return #err("Nullifier already used")
            };
            case null {
                let withdrawalId = nextWithdrawalId;
                nextWithdrawalId += 1;
                
                // First verify the merkle root matches current state
                let currentRootResult = await ethereumAdapter.getCurrentMerkleRoot();
                switch (currentRootResult) {
                    case (#err(e)) {
                        return #err("Failed to get current merkle root: " # e);
                    };
                    case (#ok(currentRoot)) {
                        if (currentRoot != merkleRoot) {
                            return #err("Invalid merkle root. Expected: " # currentRoot # ", got: " # merkleRoot);
                        };
                    };
                };
                
                // Create withdrawal with PLONK proof
                let newWithdrawal : Types.Withdrawal = {
                    id = withdrawalId;
                    nullifier = nullifier;
                    recipient = recipient;
                    amount = amount;
                    tokenId = tokenId;
                    chainId = chainId;
                    merkleRoot = merkleRoot;
                    proof = convertPlonkToZKProof(plonkProof);
                    timestamp = Time.now();
                };
                
                // Verify the PLONK proof
                let isValid = await verifyPlonkProof(
                    plonkProof,
                    merkleRoot,
                    nullifier,
                    recipient,
                    amount
                );
                
                switch (isValid) {
                    case (#ok(true)) {
                        withdrawals.put(withdrawalId, newWithdrawal);
                        pendingWithdrawals.put(withdrawalId, newWithdrawal);
                        nullifierSet.put(nullifier, true);
                        
                        // Execute the withdrawal on Ethereum
                        let ethResult = await executeEthereumWithdrawal(
                            recipient,
                            amount,
                            nullifier
                        );
                        
                        switch (ethResult) {
                            case (#ok(txHash)) {
                                // Update withdrawal with transaction hash
                                let updatedWithdrawal = {
                                    newWithdrawal with
                                    id = withdrawalId;
                                };
                                withdrawals.put(withdrawalId, updatedWithdrawal);
                                processedWithdrawals.put(withdrawalId, updatedWithdrawal);
                                pendingWithdrawals.delete(withdrawalId);
                                
                                #ok(withdrawalId)
                            };
                            case (#err(e)) {
                                // Keep withdrawal as pending if Ethereum tx fails
                                #err("Withdrawal verified but Ethereum transaction failed: " # e)
                            };
                        }
                    };
                    case (#ok(false)) {
                        #err("Invalid PLONK proof")
                    };
                    case (#err(e)) {
                        #err("Proof verification failed: " # e)
                    };
                }
            };
        }
    };
    
    private func verifyPlonkProof(
        proof: Types.PlonkProof,
        merkleRoot: Text,
        nullifierHash: Text,
        recipient: Text,
        amount: Nat
    ) : async Result.Result<Bool, Text> {
        
        // Check if verification key is set
        if (plonkVkBytes.size() == 0) {
            return #err("PLONK verification key not set");
        };
        
        // Format public inputs - all must be valid hex strings
        // The PLONK verifier expects hex strings, not decimal strings
        let publicInputs = [
            merkleRoot,     // Already hex
            nullifierHash,  // Already hex
            padAddressTo32Bytes(recipient),      // Pad Ethereum address to 32 bytes
            natToHex(amount), // Convert amount to hex
            padAddressTo32Bytes("0x0000000000000000000000000000000000000000"), // relayer (zero address) - pad to 32 bytes
            "0x0000000000000000000000000000000000000000000000000000000000000000", // fee (32 bytes)
            "0x0000000000000000000000000000000000000000000000000000000000000000"  // refund (32 bytes)
        ];
        
        // Debug the public inputs
        Debug.print("Public inputs being sent to verifier:");
        for (i in Iter.range(0, publicInputs.size() - 1)) {
            Debug.print("  Input " # Nat.toText(i) # ": " # publicInputs[i] # " (length: " # Nat.toText(Text.size(publicInputs[i])) # ")");
        };
        
        // Serialize the proof
        let proofBytesResult = PlonkIntegration.serializeProof(proof);
        let proofBytes = switch (proofBytesResult) {
            case (#ok(bytes)) bytes;
            case (#err(e)) {
                Debug.print("Failed to serialize proof: " # e);
                return #err(e);
            };
        };
        Debug.print("Serialized proof bytes: " # Nat.toText(proofBytes.size()));
        
        // Serialize the witness (public inputs)
        let witnessBytesResult = PlonkIntegration.serializeWitness(publicInputs);
        let witnessBytes = switch (witnessBytesResult) {
            case (#ok(bytes)) bytes;
            case (#err(e)) {
                Debug.print("Failed to serialize witness: " # e);
                return #err(e);
            };
        };
        Debug.print("Serialized witness bytes: " # Nat.toText(witnessBytes.size()));
        
        // Debug first few bytes of witness to check header
        Debug.print("Witness header (first 12 bytes):");
        for (i in Iter.range(0, 11)) {
            if (i < witnessBytes.size()) {
                Debug.print("  Byte " # Nat.toText(i) # ": " # Nat.toText(Nat8.toNat(witnessBytes[i])));
            };
        };
        
        // Call the PLONK verifier
        Debug.print("Calling PLONK verifier...");
        let plonkResult = await PlonkIntegration.verifyWithPlonk(
            plonkVerifier,
            plonkVkBytes,
            proof,
            publicInputs
        );
        
        plonkResult
    };
    
    // Helper function to convert Nat to hex string
    private func natToHex(n: Nat) : Text {
        if (n == 0) {
            return "0x0000000000000000000000000000000000000000000000000000000000000000";
        };
        
        var hex = "";
        var num = n;
        let hexChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
        
        // Convert to hex
        while (num > 0) {
            hex := hexChars[num % 16] # hex;
            num := num / 16;
        };
        
        // Ensure even length
        if (Text.size(hex) % 2 == 1) {
            hex := "0" # hex;
        };
        
        // Pad to 32 bytes (64 hex chars)
        while (Text.size(hex) < 64) {
            hex := "0" # hex;
        };
        
        "0x" # hex
    };
    
    // Execute withdrawal on Ethereum
    private func executeEthereumWithdrawal(
        recipient: Text,
        amount: Nat,
        nullifierHash: Text
    ) : async Result.Result<Text, Text> {
        // Call Ethereum adapter to process withdrawal
        await ethereumAdapter.sendWithdrawal(recipient, amount, nullifierHash)
    };
    
    // Convert PLONK proof to legacy ZKProof type for compatibility
    private func convertPlonkToZKProof(plonkProof: Types.PlonkProof) : Types.ZKProof {
        // Use the first 3 points from LRO array as a proxy for legacy format
        // This is just for backward compatibility with the existing withdrawal structure
        let a = if (plonkProof.lro.size() > 0) { plonkProof.lro[0] } else { ("0", "0") };
        let b_first = if (plonkProof.lro.size() > 1) { plonkProof.lro[1] } else { ("0", "0") };
        let c = if (plonkProof.lro.size() > 2) { plonkProof.lro[2] } else { ("0", "0") };
        
        {
            a = a;
            b = (b_first, ("0", "0")); // PLONK has different structure
            c = c;
            publicSignals = []; // Handled separately in PLONK
        }
    };
    
    public func processWithdrawal(withdrawalId: Nat) : async Result.Result<(), Text> {
        switch (pendingWithdrawals.get(withdrawalId)) {
            case null {
                #err("Withdrawal not found or already processed")
            };
            case (?withdrawal) {
                pendingWithdrawals.delete(withdrawalId);
                processedWithdrawals.put(withdrawalId, withdrawal);
                
                #ok()
            };
        }
    };
    
    public query func getWithdrawal(withdrawalId: Nat) : async ?Types.Withdrawal {
        withdrawals.get(withdrawalId)
    };
    
    public query func getPendingWithdrawals() : async [Types.Withdrawal] {
        Iter.toArray(Iter.map<(Nat, Types.Withdrawal), Types.Withdrawal>(pendingWithdrawals.entries(), func((k, w)) = w))
    };
    
    public query func getProcessedWithdrawals() : async [Types.Withdrawal] {
        Iter.toArray(Iter.map<(Nat, Types.Withdrawal), Types.Withdrawal>(processedWithdrawals.entries(), func((k, w)) = w))
    };
    
    public query func isNullifierUsed(nullifier: Types.NullifierHash) : async Bool {
        switch (nullifierSet.get(nullifier)) {
            case null { false };
            case (?exists) { true };
        }
    };
    
    public query func getVerificationCost() : async {
        instructions: Nat;
        cycles: Nat;
        usdCost: Float;
    } {
        {
            instructions = 500_000_000;  // 500M instructions for PLONK
            cycles = 500_000_000_000;    // 500B cycles
            usdCost = 0.08;              // ~$0.08 at current rates
        }
    };
    
    // Helper function to pad Ethereum addresses to 32 bytes
    private func padAddressTo32Bytes(address: Text) : Text {
        var cleanAddr = address;
        if (Text.startsWith(address, #text "0x")) {
            cleanAddr := Text.trimStart(address, #text "0x");
        };
        
        // If already 64 chars (32 bytes), return as is
        if (Text.size(cleanAddr) == 64) {
            return "0x" # cleanAddr;
        };
        
        // Ethereum addresses are 20 bytes (40 hex chars)
        // Pad with leading zeros to make 32 bytes (64 hex chars)
        let padding = 64 - Text.size(cleanAddr);
        var padded = "";
        for (i in Iter.range(0, padding - 1)) {
            padded := padded # "0";
        };
        
        "0x" # padded # cleanAddr
    };
}
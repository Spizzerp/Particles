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

actor WithdrawalProcessor {
    private stable var nextWithdrawalId : Nat = 0;
    private var withdrawals = Map.HashMap<Nat, Types.Withdrawal>(10, Nat.equal, Hash.hash);
    private var nullifierSet = Map.HashMap<Types.NullifierHash, Bool>(10, Text.equal, Text.hash);
    private var pendingWithdrawals = Map.HashMap<Nat, Types.Withdrawal>(10, Nat.equal, Hash.hash);
    private var processedWithdrawals = Map.HashMap<Nat, Types.Withdrawal>(10, Nat.equal, Hash.hash);
    
    // PLONK verifier canister reference
    private let plonkVerifier : PlonkIntegration.PlonkVerifier = actor(PlonkIntegration.PLONK_VERIFIER_CANISTER);
    
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
                        
                        #ok(withdrawalId)
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
        
        // Format public inputs
        let publicInputs = [
            merkleRoot,
            nullifierHash,
            recipient,
            Nat.toText(amount),
            "0x0000000000000000000000000000000000000000", // relayer
            "0", // fee
            "0"  // refund
        ];
        
        // Verify using PLONK verifier canister
        let result = await PlonkIntegration.verifyWithPlonk(
            plonkVerifier,
            plonkVkBytes,
            proof,
            publicInputs
        );
        
        result
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
}
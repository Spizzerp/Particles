import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Map "mo:base/HashMap";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Iter "mo:base/Iter";
import Hash "mo:base/Hash";
import Buffer "mo:base/Buffer";
import Types "../types/Types";
import MerkleTree "./MerkleTree";
import MiMC "./MiMC_BN254";

actor DepositManager {
    private stable var nextDepositId : Nat = 0;
    private var deposits = Map.HashMap<Nat, Types.Deposit>(10, Nat.equal, Hash.hash);
    private var userDeposits = Map.HashMap<Principal, [Nat]>(10, Principal.equal, Principal.hash);
    
    // Initialize Merkle tree with MiMC hash function
    private var merkleTree = MerkleTree.MerkleTree(MiMC.hashTwo);
    
    // Stable storage for upgrades
    private stable var depositEntries : [(Nat, Types.Deposit)] = [];
    private stable var userDepositEntries : [(Principal, [Nat])] = [];
    private stable var commitmentArray : [Text] = [];
    
    system func preupgrade() {
        depositEntries := Iter.toArray(deposits.entries());
        userDepositEntries := Iter.toArray(userDeposits.entries());
        commitmentArray := merkleTree.getCommitments();
    };
    
    system func postupgrade() {
        deposits := Map.fromIter<Nat, Types.Deposit>(depositEntries.vals(), 10, Nat.equal, Hash.hash);
        userDeposits := Map.fromIter<Principal, [Nat]>(userDepositEntries.vals(), 10, Principal.equal, Principal.hash);
        
        // Rebuild Merkle tree from commitments
        merkleTree := MerkleTree.MerkleTree(MiMC.hashTwo);
        for (commitment in commitmentArray.vals()) {
            let _ = merkleTree.addCommitment(commitment);
        };
    };
    
    // Deposit with atomic Merkle tree update
    public shared(msg) func deposit(
        amount: Types.Amount,
        tokenId: Types.TokenId,
        chainId: Types.ChainId,
        commitment: Types.CommitmentHash
    ) : async Result.Result<Types.DepositResult, Text> {
        let depositId = nextDepositId;
        nextDepositId += 1;
        
        // Add commitment to Merkle tree and get leaf index
        let leafIndex = merkleTree.addCommitment(commitment);
        
        let newDeposit : Types.Deposit = {
            id = depositId;
            user = msg.caller;
            amount = amount;
            tokenId = tokenId;
            chainId = chainId;
            commitment = commitment;
            timestamp = Time.now();
            leafIndex = leafIndex;
        };
        
        deposits.put(depositId, newDeposit);
        
        // Update user deposits
        switch (userDeposits.get(msg.caller)) {
            case null {
                userDeposits.put(msg.caller, [depositId]);
            };
            case (?existingDeposits) {
                userDeposits.put(msg.caller, Array.append(existingDeposits, [depositId]));
            };
        };
        
        #ok({
            depositId = depositId;
            leafIndex = leafIndex;
            merkleRoot = merkleTree.getRoot();
        })
    };
    
    // Get current Merkle root
    public query func getCurrentMerkleRoot() : async Text {
        merkleTree.getRoot()
    };
    
    // Get Merkle proof for a deposit
    public query func getMerkleProof(depositId: Nat) : async Result.Result<[Text], Text> {
        switch (deposits.get(depositId)) {
            case null { #err("Deposit not found") };
            case (?deposit) {
                merkleTree.getMerkleProof(deposit.leafIndex)
            };
        }
    };
    
    // Get all commitments in order (for frontend verification)
    public query func getCommitmentsInOrder() : async [Text] {
        merkleTree.getCommitments()
    };
    
    // Verify a Merkle proof (for testing)
    public query func verifyMerkleProof(
        commitment: Text,
        leafIndex: Nat,
        proof: [Text],
        root: Text
    ) : async Bool {
        merkleTree.verifyProof(commitment, leafIndex, proof, root)
    };
    
    // Get deposit by ID
    public query func getDeposit(id: Nat) : async ?Types.Deposit {
        deposits.get(id)
    };
    
    // Get all deposits (for migration/debugging)
    public query func getAllDeposits() : async [Types.Deposit] {
        Iter.toArray(deposits.vals())
    };
    
    // Get deposits by user
    public query func getUserDeposits(user: Principal) : async [Types.Deposit] {
        switch (userDeposits.get(user)) {
            case null { [] };
            case (?depositIds) {
                Array.mapFilter<Nat, Types.Deposit>(
                    depositIds,
                    func(id) = deposits.get(id)
                )
            };
        }
    };
    
    // Get total number of deposits
    public query func getTotalDeposits() : async Nat {
        merkleTree.size()
    };
    
    // Migration method - REMOVE AFTER MIGRATION IS COMPLETE
    public shared(msg) func migrateDeposit(
        id: Nat,
        user: Principal,
        amount: Nat,
        tokenId: Text,
        chainId: Nat,
        commitment: Text,
        timestamp: Int
    ) : async Result.Result<Types.DepositResult, Text> {
        // Only allow migration from authorized principal
        if (msg.caller != Principal.fromText("7gv5g-5n7sv-xvrux-xd5ga-qqmua-h6mwy-2x2va-ywldy-2rhrq-evu5r-3ae")) {
            return #err("Unauthorized");
        };
        
        // Ensure deposits are added in order
        if (id != nextDepositId) {
            return #err("Deposits must be migrated in order. Expected ID: " # Nat.toText(nextDepositId));
        };
        
        let leafIndex = merkleTree.addCommitment(commitment);
        
        let deposit : Types.Deposit = {
            id = id;
            user = user;
            amount = amount;
            tokenId = tokenId;
            chainId = chainId;
            commitment = commitment;
            timestamp = timestamp;
            leafIndex = leafIndex;
        };
        
        deposits.put(id, deposit);
        nextDepositId += 1;
        
        // Update user deposits
        switch (userDeposits.get(user)) {
            case null {
                userDeposits.put(user, [id]);
            };
            case (?existingDeposits) {
                userDeposits.put(user, Array.append(existingDeposits, [id]));
            };
        };
        
        #ok({
            depositId = id;
            leafIndex = leafIndex;
            merkleRoot = merkleTree.getRoot();
        })
    };
}
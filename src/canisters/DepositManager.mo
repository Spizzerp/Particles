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

actor DepositManager {
    private stable var nextDepositId : Nat = 0;
    private var deposits = Map.HashMap<Nat, Types.Deposit>(10, Nat.equal, Hash.hash);
    private var userDeposits = Map.HashMap<Principal, [Nat]>(10, Principal.equal, Principal.hash);
    private var merkleTree = Map.HashMap<Nat, Types.MerkleRoot>(10, Nat.equal, Hash.hash);
    
    private stable var depositEntries : [(Nat, Types.Deposit)] = [];
    private stable var userDepositEntries : [(Principal, [Nat])] = [];
    private stable var merkleTreeEntries : [(Nat, Types.MerkleRoot)] = [];
    
    system func preupgrade() {
        depositEntries := Iter.toArray(deposits.entries());
        userDepositEntries := Iter.toArray(userDeposits.entries());
        merkleTreeEntries := Iter.toArray(merkleTree.entries());
    };
    
    system func postupgrade() {
        deposits := Map.fromIter<Nat, Types.Deposit>(depositEntries.vals(), 10, Nat.equal, Hash.hash);
        userDeposits := Map.fromIter<Principal, [Nat]>(userDepositEntries.vals(), 10, Principal.equal, Principal.hash);
        merkleTree := Map.fromIter<Nat, Types.MerkleRoot>(merkleTreeEntries.vals(), 10, Nat.equal, Hash.hash);
    };
    
    public shared(msg) func deposit(
        amount: Types.Amount,
        tokenId: Types.TokenId,
        chainId: Types.ChainId,
        commitment: Types.CommitmentHash
    ) : async Result.Result<Nat, Text> {
        let depositId = nextDepositId;
        nextDepositId += 1;
        
        let newDeposit : Types.Deposit = {
            id = depositId;
            user = msg.caller;
            amount = amount;
            tokenId = tokenId;
            chainId = chainId;
            commitment = commitment;
            timestamp = Time.now();
            leafIndex = depositId;
        };
        
        deposits.put(depositId, newDeposit);
        
        switch (userDeposits.get(msg.caller)) {
            case null {
                userDeposits.put(msg.caller, [depositId]);
            };
            case (?existingDeposits) {
                userDeposits.put(msg.caller, Array.append(existingDeposits, [depositId]));
            };
        };
        
        #ok(depositId)
    };
    
    public query func getDeposit(depositId: Nat) : async ?Types.Deposit {
        deposits.get(depositId)
    };
    
    public query func getUserDeposits(user: Principal) : async [Types.Deposit] {
        switch (userDeposits.get(user)) {
            case null { [] };
            case (?depositIds) {
                Array.mapFilter<Nat, Types.Deposit>(depositIds, func(id) = deposits.get(id))
            };
        }
    };
    
    public query func getTotalDeposits() : async Nat {
        deposits.size()
    };
    
    public query func getMerkleRoot(level: Nat) : async ?Types.MerkleRoot {
        merkleTree.get(level)
    };
    
    public func updateMerkleTree(level: Nat, root: Types.MerkleRoot) : async Result.Result<(), Text> {
        merkleTree.put(level, root);
        #ok()
    };
    
    // Get the current merkle root (at level 0)
    public query func getCurrentMerkleRoot() : async ?Types.MerkleRoot {
        merkleTree.get(0)
    };
    
    // Get the total number of deposits (leaf count)
    public query func getLeafCount() : async Nat {
        nextDepositId
    };
    
    // Get all commitments for merkle tree construction
    // This is used by the frontend to build merkle trees and generate proofs locally
    public query func getAllCommitments() : async [Text] {
        var commitmentsList = Buffer.Buffer<Text>(nextDepositId);
        
        for (i in Iter.range(0, if (nextDepositId > 0) { nextDepositId - 1 } else { 0 })) {
            switch (deposits.get(i)) {
                case null { };
                case (?d) { commitmentsList.add(d.commitment); };
            };
        };
        
        Buffer.toArray(commitmentsList)
    };
}
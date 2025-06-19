import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Text "mo:base/Text";

module {
    public type TokenId = Text;
    public type ChainId = Nat;
    public type Amount = Nat;
    public type CommitmentHash = Text;
    public type NullifierHash = Text;
    public type MerkleRoot = Text;
    
    public type Deposit = {
        id: Nat;
        user: Principal;
        amount: Amount;
        tokenId: TokenId;
        chainId: ChainId;
        commitment: CommitmentHash;
        timestamp: Time.Time;
        leafIndex: Nat;
    };
    
    public type Withdrawal = {
        id: Nat;
        nullifier: NullifierHash;
        recipient: Text;
        amount: Amount;
        tokenId: TokenId;
        chainId: ChainId;
        merkleRoot: MerkleRoot;
        proof: ZKProof; // Will contain converted PLONK proof
        timestamp: Time.Time;
    };
    
    // Legacy ZKProof structure (kept for compatibility)
    public type ZKProof = {
        a: (Text, Text);
        b: ((Text, Text), (Text, Text));
        c: (Text, Text);
        publicSignals: [Text];
    };
    
    // PLONK proof structure for gnark compatibility
    public type PlonkProof = {
        // LRO commitments (L, R, O)
        lro: [(Text, Text)]; // Should be array of 3 points
        // Z commitment
        z: (Text, Text);
        // H commitments (h0, h1, h2)
        h: [(Text, Text)]; // Should be array of 3 points
        // Batched opening proof
        batched_proof: {
            h: (Text, Text);
            claimed_values: [Text];
        };
        // Z shifted opening proof
        zshifted_proof: {
            h: (Text, Text);
            claimed_value: Text;
        };
        // BSB22 commitments (can be empty)
        bsb22_commitments: [(Text, Text)];
    };
    
    public type Route = {
        sourceChain: ChainId;
        destChain: ChainId;
        tokenId: TokenId;
        amount: Amount;
        fee: Amount;
    };
    
    public type PatternData = {
        user: Principal;
        deposits: [Deposit];
        withdrawals: [Withdrawal];
        patterns: [Text];
    };
}
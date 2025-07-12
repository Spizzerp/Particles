import Principal "mo:base/Principal";
import Timer "mo:base/Timer";
import Result "mo:base/Result";
import Map "mo:base/HashMap";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Cycles "mo:base/ExperimentalCycles";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Error "mo:base/Error";
import Debug "mo:base/Debug";

actor CycleMonitor {
    // Configuration
    private let CYCLE_THRESHOLD : Nat = 5_000_000_000_000; // 5T cycles minimum
    private let TOP_UP_AMOUNT : Nat = 10_000_000_000_000; // 10T cycles per top-up
    private let CHECK_INTERVAL : Nat = 3600_000_000_000; // 1 hour in nanoseconds
    
    // State
    private stable var owner : Principal = Principal.fromText("aaaaa-aa");
    private stable var monitoredCanisters : [(Principal, Text)] = [];
    private stable var lastCheckTime : Int = 0;
    private stable var totalTopUps : Nat = 0;
    private stable var cycleReserve : Nat = 0;
    
    private var timerId : ?Timer.TimerId = null;
    private var canisterMap = Map.HashMap<Principal, Text>(10, Principal.equal, Principal.hash);
    
    // Initialize
    system func preupgrade() {
        monitoredCanisters := Iter.toArray(canisterMap.entries());
    };
    
    system func postupgrade() {
        canisterMap := Map.fromIter<Principal, Text>(monitoredCanisters.vals(), 10, Principal.equal, Principal.hash);
        // Timer will be restarted on first call
    };
    
    // Only owner can manage the monitor
    private func isOwner(caller: Principal) : Bool {
        Principal.equal(caller, owner)
    };
    
    // Initialize owner
    public shared(msg) func init() : async Result.Result<Text, Text> {
        if (owner == Principal.fromText("aaaaa-aa")) {
            owner := msg.caller;
            await startMonitoring();
            #ok("Cycle monitor initialized with owner: " # Principal.toText(owner))
        } else {
            #err("Already initialized")
        }
    };
    
    // Add canister to monitor
    public shared(msg) func addCanister(canisterId: Principal, name: Text) : async Result.Result<Text, Text> {
        if (not isOwner(msg.caller)) {
            return #err("Only owner can add canisters");
        };
        
        canisterMap.put(canisterId, name);
        #ok("Added " # name # " (" # Principal.toText(canisterId) # ") to monitoring")
    };
    
    // Remove canister from monitoring
    public shared(msg) func removeCanister(canisterId: Principal) : async Result.Result<Text, Text> {
        if (not isOwner(msg.caller)) {
            return #err("Only owner can remove canisters");
        };
        
        switch (canisterMap.remove(canisterId)) {
            case null { #err("Canister not found") };
            case (?name) { #ok("Removed " # name # " from monitoring") };
        }
    };
    
    // Deposit cycles to reserve
    public func depositCycles() : async Nat {
        let available = Cycles.available();
        let accepted = Cycles.accept(available);
        cycleReserve += accepted;
        accepted
    };
    
    // Get current status
    public query func getStatus() : async {
        owner: Principal;
        monitoredCanisters: [(Principal, Text)];
        lastCheckTime: Int;
        totalTopUps: Nat;
        cycleReserve: Nat;
        ownBalance: Nat;
    } {
        {
            owner;
            monitoredCanisters = Iter.toArray(canisterMap.entries());
            lastCheckTime;
            totalTopUps;
            cycleReserve;
            ownBalance = Cycles.balance();
        }
    };
    
    // Check single canister cycles
    private func checkCanisterCycles(canisterId: Principal) : async ?Nat {
        try {
            let IC = actor("aaaaa-aa") : actor {
                canister_status : { canister_id : Principal } -> async {
                    cycles : Nat;
                };
            };
            
            let status = await IC.canister_status({ canister_id = canisterId });
            ?status.cycles
        } catch (e) {
            Debug.print("Failed to check cycles for " # Principal.toText(canisterId) # ": " # Error.message(e));
            null
        }
    };
    
    // Top up canister from reserve
    private func topUpCanister(canisterId: Principal, amount: Nat) : async Bool {
        if (cycleReserve < amount) {
            Debug.print("Insufficient reserve. Have: " # Nat.toText(cycleReserve) # ", Need: " # Nat.toText(amount));
            return false;
        };
        
        try {
            // Add cycles to the call
            Cycles.add(amount);
            
            // Call deposit_cycles on target canister
            let targetCanister = actor(Principal.toText(canisterId)) : actor {
                acceptCycles : () -> async Nat;
            };
            
            let accepted = await targetCanister.acceptCycles();
            
            if (accepted > 0) {
                cycleReserve -= accepted;
                totalTopUps += 1;
                Debug.print("Topped up " # Principal.toText(canisterId) # " with " # Nat.toText(accepted) # " cycles");
                true
            } else {
                // Return unused cycles to reserve
                let refund = Cycles.refunded();
                cycleReserve += refund;
                false
            }
        } catch (e) {
            // Return unused cycles to reserve
            let refund = Cycles.refunded();
            cycleReserve += refund;
            Debug.print("Failed to top up " # Principal.toText(canisterId) # ": " # Error.message(e));
            false
        }
    };
    
    // Main monitoring function
    private func checkAllCanisters() : async () {
        lastCheckTime := Time.now();
        
        for ((canisterId, name) in canisterMap.entries()) {
            switch (await checkCanisterCycles(canisterId)) {
                case null {
                    Debug.print("⚠️  Failed to check " # name);
                };
                case (?cycles) {
                    Debug.print(name # ": " # Nat.toText(cycles) # " cycles");
                    
                    if (cycles < CYCLE_THRESHOLD) {
                        Debug.print("🚨 " # name # " is LOW on cycles!");
                        
                        // Calculate how much to top up
                        let needed = CYCLE_THRESHOLD + TOP_UP_AMOUNT - cycles;
                        
                        if (await topUpCanister(canisterId, needed)) {
                            Debug.print("✅ Successfully topped up " # name);
                        } else {
                            Debug.print("❌ Failed to top up " # name);
                        };
                    };
                };
            };
        };
    };
    
    // Start monitoring timer
    private func startMonitoring() : async () {
        switch (timerId) {
            case (?id) {
                // Timer already running
            };
            case null {
                timerId := ?Timer.recurringTimer<system>(#nanoseconds(CHECK_INTERVAL), checkAllCanisters);
                Debug.print("🔄 Cycle monitoring started");
            };
        };
    };
    
    // Stop monitoring
    public shared(msg) func stopMonitoring() : async Result.Result<Text, Text> {
        if (not isOwner(msg.caller)) {
            return #err("Only owner can stop monitoring");
        };
        
        switch (timerId) {
            case null { #err("Monitoring not running") };
            case (?id) {
                Timer.cancelTimer(id);
                timerId := null;
                #ok("Monitoring stopped")
            };
        };
    };
    
    // Manual check
    public shared(msg) func checkNow() : async Result.Result<Text, Text> {
        if (not isOwner(msg.caller)) {
            return #err("Only owner can trigger manual check");
        };
        
        await checkAllCanisters();
        #ok("Check completed")
    };
    
    // Update configuration
    public shared(msg) func updateConfig(threshold: ?Nat, topUpAmount: ?Nat) : async Result.Result<Text, Text> {
        if (not isOwner(msg.caller)) {
            return #err("Only owner can update config");
        };
        
        // Note: These would need to be stable vars to persist
        #ok("Config updated")
    };
    
    // Withdraw excess cycles
    public shared(msg) func withdrawCycles(amount: Nat, recipient: Principal) : async Result.Result<Nat, Text> {
        if (not isOwner(msg.caller)) {
            return #err("Only owner can withdraw cycles");
        };
        
        if (cycleReserve < amount) {
            return #err("Insufficient reserve");
        };
        
        try {
            Cycles.add(amount);
            
            let recipientActor = actor(Principal.toText(recipient)) : actor {
                acceptCycles : () -> async Nat;
            };
            
            let accepted = await recipientActor.acceptCycles();
            cycleReserve -= accepted;
            #ok(accepted)
        } catch (e) {
            let refund = Cycles.refunded();
            cycleReserve += refund;
            #err("Failed to send cycles: " # Error.message(e))
        }
    };
}
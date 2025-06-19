import Principal "mo:base/Principal";
import Map "mo:base/HashMap";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Random "mo:base/Random";
import Hash "mo:base/Hash";
import Types "../types/Types";

actor PatternBreaker {
    private var userPatterns = Map.HashMap<Principal, Types.PatternData>(10, Principal.equal, Principal.hash);
    private var globalPatterns = Map.HashMap<Text, Nat>(10, Text.equal, Text.hash);
    private var obfuscationStrategies = Map.HashMap<Text, Nat>(10, Text.equal, Text.hash);
    
    private stable var userPatternEntries : [(Principal, Types.PatternData)] = [];
    private stable var globalPatternEntries : [(Text, Nat)] = [];
    private stable var obfuscationEntries : [(Text, Nat)] = [];
    
    system func preupgrade() {
        userPatternEntries := Iter.toArray(userPatterns.entries());
        globalPatternEntries := Iter.toArray(globalPatterns.entries());
        obfuscationEntries := Iter.toArray(obfuscationStrategies.entries());
    };
    
    system func postupgrade() {
        userPatterns := Map.fromIter<Principal, Types.PatternData>(userPatternEntries.vals(), 10, Principal.equal, Principal.hash);
        globalPatterns := Map.fromIter<Text, Nat>(globalPatternEntries.vals(), 10, Text.equal, Text.hash);
        obfuscationStrategies := Map.fromIter<Text, Nat>(obfuscationEntries.vals(), 10, Text.equal, Text.hash);
    };
    
    public func analyzeUserPattern(user: Principal, deposits: [Types.Deposit], withdrawals: [Types.Withdrawal]) : async Result.Result<[Text], Text> {
        let patterns = identifyPatterns(deposits, withdrawals);
        
        let patternData : Types.PatternData = {
            user = user;
            deposits = deposits;
            withdrawals = withdrawals;
            patterns = patterns;
        };
        
        userPatterns.put(user, patternData);
        
        for (pattern in patterns.vals()) {
            switch (globalPatterns.get(pattern)) {
                case null { globalPatterns.put(pattern, 1); };
                case (?count) { globalPatterns.put(pattern, count + 1); };
            };
        };
        
        #ok(patterns)
    };
    
    private func identifyPatterns(deposits: [Types.Deposit], withdrawals: [Types.Withdrawal]) : [Text] {
        var patterns : [Text] = [];
        
        if (hasTimingPattern(deposits, withdrawals)) {
            patterns := Array.append(patterns, ["timing_correlation"]);
        };
        
        if (hasAmountPattern(deposits, withdrawals)) {
            patterns := Array.append(patterns, ["amount_correlation"]);
        };
        
        if (hasChainPattern(deposits, withdrawals)) {
            patterns := Array.append(patterns, ["chain_preference"]);
        };
        
        if (hasFrequencyPattern(deposits, withdrawals)) {
            patterns := Array.append(patterns, ["high_frequency"]);
        };
        
        patterns
    };
    
    private func hasTimingPattern(deposits: [Types.Deposit], withdrawals: [Types.Withdrawal]) : Bool {
        if (deposits.size() == 0 or withdrawals.size() == 0) {
            return false;
        };
        
        for (deposit in deposits.vals()) {
            for (withdrawal in withdrawals.vals()) {
                let timeDiff = Int.abs(withdrawal.timestamp - deposit.timestamp);
                if (timeDiff < 3600_000_000_000) {
                    return true;
                };
            };
        };
        
        false
    };
    
    private func hasAmountPattern(deposits: [Types.Deposit], withdrawals: [Types.Withdrawal]) : Bool {
        for (deposit in deposits.vals()) {
            for (withdrawal in withdrawals.vals()) {
                if (deposit.amount == withdrawal.amount) {
                    return true;
                };
                
                let ratio = if (deposit.amount > withdrawal.amount) {
                    deposit.amount / withdrawal.amount
                } else {
                    withdrawal.amount / deposit.amount
                };
                
                if (ratio < 2) {
                    return true;
                };
            };
        };
        
        false
    };
    
    private func hasChainPattern(deposits: [Types.Deposit], withdrawals: [Types.Withdrawal]) : Bool {
        var chainUsage = Map.HashMap<Nat, Nat>(10, Nat.equal, Hash.hash);
        
        for (deposit in deposits.vals()) {
            switch (chainUsage.get(deposit.chainId)) {
                case null { chainUsage.put(deposit.chainId, 1); };
                case (?count) { chainUsage.put(deposit.chainId, count + 1); };
            };
        };
        
        for (withdrawal in withdrawals.vals()) {
            switch (chainUsage.get(withdrawal.chainId)) {
                case null { chainUsage.put(withdrawal.chainId, 1); };
                case (?count) { chainUsage.put(withdrawal.chainId, count + 1); };
            };
        };
        
        var maxUsage = 0;
        for ((_, usage) in chainUsage.entries()) {
            if (usage > maxUsage) {
                maxUsage := usage;
            };
        };
        
        let totalTransactions = deposits.size() + withdrawals.size();
        if (totalTransactions > 0) {
            let concentration = (maxUsage * 100) / totalTransactions;
            return concentration > 70;
        };
        
        false
    };
    
    private func hasFrequencyPattern(deposits: [Types.Deposit], withdrawals: [Types.Withdrawal]) : Bool {
        let totalTransactions = deposits.size() + withdrawals.size();
        if (totalTransactions < 10) {
            return false;
        };
        
        var earliestTime = Time.now();
        var latestTime : Time.Time = 0;
        
        for (deposit in deposits.vals()) {
            if (deposit.timestamp < earliestTime) {
                earliestTime := deposit.timestamp;
            };
            if (deposit.timestamp > latestTime) {
                latestTime := deposit.timestamp;
            };
        };
        
        for (withdrawal in withdrawals.vals()) {
            if (withdrawal.timestamp < earliestTime) {
                earliestTime := withdrawal.timestamp;
            };
            if (withdrawal.timestamp > latestTime) {
                latestTime := withdrawal.timestamp;
            };
        };
        
        let timeSpan = latestTime - earliestTime;
        if (timeSpan > 0) {
            let avgInterval = timeSpan / totalTransactions;
            return avgInterval < 3600_000_000_000;
        };
        
        false
    };
    
    public func generateObfuscationStrategy(patterns: [Text]) : async Result.Result<[Text], Text> {
        var strategies : [Text] = [];
        
        for (pattern in patterns.vals()) {
            switch (pattern) {
                case ("timing_correlation") {
                    strategies := Array.append(strategies, ["add_random_delay", "batch_transactions"]);
                };
                case ("amount_correlation") {
                    strategies := Array.append(strategies, ["split_amounts", "add_noise_transactions"]);
                };
                case ("chain_preference") {
                    strategies := Array.append(strategies, ["diversify_chains", "use_bridge_hops"]);
                };
                case ("high_frequency") {
                    strategies := Array.append(strategies, ["randomize_intervals", "create_decoy_transactions"]);
                };
                case (_) {};
            };
        };
        
        for (strategy in strategies.vals()) {
            switch (obfuscationStrategies.get(strategy)) {
                case null { obfuscationStrategies.put(strategy, 1); };
                case (?count) { obfuscationStrategies.put(strategy, count + 1); };
            };
        };
        
        #ok(strategies)
    };
    
    public func applyObfuscation(
        transaction: Types.Route,
        strategies: [Text]
    ) : async Result.Result<Types.Route, Text> {
        var modifiedTransaction = transaction;
        
        for (strategy in strategies.vals()) {
            switch (strategy) {
                case ("add_random_delay") {
                    
                };
                case ("split_amounts") {
                    if (transaction.amount > 1000) {
                        modifiedTransaction := {
                            sourceChain = transaction.sourceChain;
                            destChain = transaction.destChain;
                            tokenId = transaction.tokenId;
                            amount = transaction.amount / 2;
                            fee = transaction.fee;
                        };
                    };
                };
                case ("add_noise_transactions") {
                    
                };
                case (_) {};
            };
        };
        
        #ok(modifiedTransaction)
    };
    
    public query func getUserPatterns(user: Principal) : async ?Types.PatternData {
        userPatterns.get(user)
    };
    
    public query func getGlobalPatternFrequency(pattern: Text) : async Nat {
        switch (globalPatterns.get(pattern)) {
            case null { 0 };
            case (?frequency) { frequency };
        }
    };
    
    public query func getMostCommonPatterns() : async [(Text, Nat)] {
        let entries = Iter.toArray(globalPatterns.entries());
        Array.sort(entries, func(a: (Text, Nat), b: (Text, Nat)) : {#less; #equal; #greater} {
            if (a.1 > b.1) { #less }
            else if (a.1 < b.1) { #greater }
            else { #equal }
        })
    };
}
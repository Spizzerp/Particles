import Principal "mo:base/Principal";
import Map "mo:base/HashMap";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Iter "mo:base/Iter";
import Float "mo:base/Float";
import Types "../types/Types";

actor ParticleRouter {
    private stable var nextRouteId : Nat = 0;
    private var routes = Map.HashMap<Text, Types.Route>(10, Text.equal, Text.hash);
    private var liquidityPools = Map.HashMap<Text, Nat>(10, Text.equal, Text.hash);
    private var routingTable = Map.HashMap<Text, [Text]>(10, Text.equal, Text.hash);
    
    private stable var routeEntries : [(Text, Types.Route)] = [];
    private stable var liquidityEntries : [(Text, Nat)] = [];
    private stable var routingTableEntries : [(Text, [Text])] = [];
    
    system func preupgrade() {
        routeEntries := Iter.toArray(routes.entries());
        liquidityEntries := Iter.toArray(liquidityPools.entries());
        routingTableEntries := Iter.toArray(routingTable.entries());
    };
    
    system func postupgrade() {
        routes := Map.fromIter<Text, Types.Route>(routeEntries.vals(), 10, Text.equal, Text.hash);
        liquidityPools := Map.fromIter<Text, Nat>(liquidityEntries.vals(), 10, Text.equal, Text.hash);
        routingTable := Map.fromIter<Text, [Text]>(routingTableEntries.vals(), 10, Text.equal, Text.hash);
    };
    
    private func getRouteKey(sourceChain: Types.ChainId, destChain: Types.ChainId, tokenId: Types.TokenId) : Text {
        Nat.toText(sourceChain) # "-" # Nat.toText(destChain) # "-" # tokenId
    };
    
    private func getPoolKey(chainId: Types.ChainId, tokenId: Types.TokenId) : Text {
        Nat.toText(chainId) # "-" # tokenId
    };
    
    public func createRoute(
        sourceChain: Types.ChainId,
        destChain: Types.ChainId,
        tokenId: Types.TokenId,
        baseFee: Types.Amount
    ) : async Result.Result<Text, Text> {
        let routeKey = getRouteKey(sourceChain, destChain, tokenId);
        
        let newRoute : Types.Route = {
            sourceChain = sourceChain;
            destChain = destChain;
            tokenId = tokenId;
            amount = 0;
            fee = baseFee;
        };
        
        routes.put(routeKey, newRoute);
        
        let sourceKey = Nat.toText(sourceChain);
        switch (routingTable.get(sourceKey)) {
            case null {
                routingTable.put(sourceKey, [routeKey]);
            };
            case (?existingRoutes) {
                routingTable.put(sourceKey, Array.append(existingRoutes, [routeKey]));
            };
        };
        
        #ok(routeKey)
    };
    
    public func findOptimalRoute(
        sourceChain: Types.ChainId,
        destChain: Types.ChainId,
        tokenId: Types.TokenId,
        amount: Types.Amount
    ) : async Result.Result<Types.Route, Text> {
        let directRouteKey = getRouteKey(sourceChain, destChain, tokenId);
        
        switch (routes.get(directRouteKey)) {
            case (?route) {
                let sourcePoolKey = getPoolKey(sourceChain, tokenId);
                let destPoolKey = getPoolKey(destChain, tokenId);
                
                let sourceLiquidity = switch (liquidityPools.get(sourcePoolKey)) {
                    case null { 0 };
                    case (?liq) { liq };
                };
                
                let destLiquidity = switch (liquidityPools.get(destPoolKey)) {
                    case null { 0 };
                    case (?liq) { liq };
                };
                
                if (sourceLiquidity >= amount and destLiquidity > 0) {
                    let dynamicFee = calculateDynamicFee(route.fee, amount, sourceLiquidity, destLiquidity);
                    #ok({
                        sourceChain = route.sourceChain;
                        destChain = route.destChain;
                        tokenId = route.tokenId;
                        amount = amount;
                        fee = dynamicFee;
                    })
                } else {
                    #err("Insufficient liquidity for route")
                }
            };
            case null {
                #err("No route found between chains")
            };
        }
    };
    
    private func calculateDynamicFee(
        baseFee: Nat,
        amount: Nat,
        sourceLiquidity: Nat,
        destLiquidity: Nat
    ) : Nat {
        let utilizationRatio = Float.fromInt(amount) / Float.fromInt(sourceLiquidity);
        let liquidityRatio = Float.fromInt(destLiquidity) / Float.fromInt(sourceLiquidity);
        
        var feeMultiplier = 1.0;
        if (utilizationRatio > 0.5) {
            feeMultiplier += (utilizationRatio - 0.5) * 2.0;
        };
        
        if (liquidityRatio < 0.5) {
            feeMultiplier += (0.5 - liquidityRatio) * 1.5;
        };
        
        let dynamicFee = Float.toInt(Float.fromInt(baseFee) * feeMultiplier);
        Int.abs(dynamicFee)
    };
    
    public func addLiquidity(chainId: Types.ChainId, tokenId: Types.TokenId, amount: Types.Amount) : async Result.Result<(), Text> {
        let poolKey = getPoolKey(chainId, tokenId);
        
        switch (liquidityPools.get(poolKey)) {
            case null {
                liquidityPools.put(poolKey, amount);
            };
            case (?currentLiquidity) {
                liquidityPools.put(poolKey, currentLiquidity + amount);
            };
        };
        
        #ok()
    };
    
    public func removeLiquidity(chainId: Types.ChainId, tokenId: Types.TokenId, amount: Types.Amount) : async Result.Result<(), Text> {
        let poolKey = getPoolKey(chainId, tokenId);
        
        switch (liquidityPools.get(poolKey)) {
            case null {
                #err("No liquidity pool found")
            };
            case (?currentLiquidity) {
                if (currentLiquidity >= amount) {
                    liquidityPools.put(poolKey, currentLiquidity - amount);
                    #ok()
                } else {
                    #err("Insufficient liquidity")
                }
            };
        }
    };
    
    public query func getRoute(sourceChain: Types.ChainId, destChain: Types.ChainId, tokenId: Types.TokenId) : async ?Types.Route {
        let routeKey = getRouteKey(sourceChain, destChain, tokenId);
        routes.get(routeKey)
    };
    
    public query func getLiquidity(chainId: Types.ChainId, tokenId: Types.TokenId) : async Nat {
        let poolKey = getPoolKey(chainId, tokenId);
        switch (liquidityPools.get(poolKey)) {
            case null { 0 };
            case (?liquidity) { liquidity };
        }
    };
    
    public query func getAvailableRoutes(sourceChain: Types.ChainId) : async [Types.Route] {
        let sourceKey = Nat.toText(sourceChain);
        switch (routingTable.get(sourceKey)) {
            case null { [] };
            case (?routeKeys) {
                Array.mapFilter<Text, Types.Route>(routeKeys, func(key) = routes.get(key))
            };
        }
    };
}
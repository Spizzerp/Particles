import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";

module {
    // RLP (Recursive Length Prefix) encoding for Ethereum transactions
    
    public func encode(item: RLPItem) : Blob {
        switch (item) {
            case (#bytes(data)) { encodeBytes(data) };
            case (#list(items)) { encodeList(items) };
        }
    };
    
    public type RLPItem = {
        #bytes: Blob;
        #list: [RLPItem];
    };
    
    private func encodeBytes(data: Blob) : Blob {
        let bytes = Blob.toArray(data);
        let len = bytes.size();
        
        if (len == 1 and bytes[0] < 0x80) {
            // Single byte less than 0x80
            data
        } else if (len <= 55) {
            // Short string
            let prefix = Nat8.fromNat(0x80 + len);
            Blob.fromArray(Array.tabulate<Nat8>(len + 1, func(i) {
                if (i == 0) { prefix } else { bytes[i - 1] }
            }))
        } else {
            // Long string
            let lenBytes = encodeLength(len);
            let prefix = Nat8.fromNat(0xb7 + lenBytes.size());
            
            let buffer = Buffer.Buffer<Nat8>(1 + lenBytes.size() + len);
            buffer.add(prefix);
            for (b in lenBytes.vals()) { buffer.add(b) };
            for (b in bytes.vals()) { buffer.add(b) };
            
            Blob.fromArray(Buffer.toArray(buffer))
        }
    };
    
    private func encodeList(items: [RLPItem]) : Blob {
        // Encode all items
        let encodedItems = Array.map<RLPItem, Blob>(items, encode);
        
        // Calculate total length
        var totalLen = 0;
        for (item in encodedItems.vals()) {
            totalLen += Blob.toArray(item).size();
        };
        
        // Create output buffer
        let buffer = Buffer.Buffer<Nat8>(totalLen + 10);
        
        if (totalLen <= 55) {
            // Short list
            buffer.add(Nat8.fromNat(0xc0 + totalLen));
        } else {
            // Long list
            let lenBytes = encodeLength(totalLen);
            buffer.add(Nat8.fromNat(0xf7 + lenBytes.size()));
            for (b in lenBytes.vals()) { buffer.add(b) };
        };
        
        // Add encoded items
        for (item in encodedItems.vals()) {
            for (b in Blob.toArray(item).vals()) {
                buffer.add(b);
            };
        };
        
        Blob.fromArray(Buffer.toArray(buffer))
    };
    
    private func encodeLength(len: Nat) : [Nat8] {
        if (len == 0) { return [0] };
        
        let buffer = Buffer.Buffer<Nat8>(8);
        var n = len;
        
        while (n > 0) {
            buffer.add(Nat8.fromNat(n % 256));
            n /= 256;
        };
        
        Array.reverse(Buffer.toArray(buffer))
    };
    
    // Helper to encode Nat as bytes (big-endian)
    public func natToBytes(n: Nat) : Blob {
        // RLP spec: zero is encoded as empty bytes
        // This is correct for RLP encoding itself
        if (n == 0) { return Blob.fromArray([]) };
        
        let buffer = Buffer.Buffer<Nat8>(32);
        var num = n;
        
        while (num > 0) {
            buffer.add(Nat8.fromNat(num % 256));
            num /= 256;
        };
        
        Blob.fromArray(Array.reverse(Buffer.toArray(buffer)))
    };
}
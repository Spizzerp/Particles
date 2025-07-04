import Nat8 "mo:base/Nat8";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Char "mo:base/Char";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Result "mo:base/Result";

module {
    // Convert byte array to hex string
    public func encode(bytes: [Nat8]) : Text {
        let hex = Array.foldLeft<Nat8, Text>(bytes, "", func (acc, byte) {
            acc # byteToHex(byte)
        });
        hex
    };

    // Convert hex string to byte array
    public func decode(hex: Text) : Result.Result<[Nat8], Text> {
        let chars = Text.toArray(hex);
        
        // Remove 0x prefix if present
        let hexChars = if (chars.size() >= 2 and chars[0] == '0' and chars[1] == 'x') {
            Array.subArray(chars, 2, chars.size() - 2)
        } else {
            chars
        };
        
        if (hexChars.size() % 2 != 0) {
            return #err("Hex string must have even length");
        };
        
        let bytes = Array.init<Nat8>(hexChars.size() / 2, 0);
        
        var i = 0;
        while (i < hexChars.size()) {
            let highNibble = charToNibble(hexChars[i]);
            let lowNibble = charToNibble(hexChars[i + 1]);
            
            switch (highNibble, lowNibble) {
                case (?h, ?l) {
                    bytes[i / 2] := (h * 16) + l;
                };
                case _ {
                    return #err("Invalid hex character");
                };
            };
            
            i += 2;
        };
        
        #ok(Array.freeze(bytes))
    };

    // Convert hex string to Nat
    public func hexToNat(hex: Text) : Result.Result<Nat, Text> {
        let chars = Text.toArray(hex);
        
        // Remove 0x prefix if present
        let hexChars = if (chars.size() >= 2 and chars[0] == '0' and chars[1] == 'x') {
            Array.subArray(chars, 2, chars.size() - 2)
        } else {
            chars
        };
        
        var result : Nat = 0;
        var power : Nat = 1;
        
        // Process from right to left
        var i = hexChars.size();
        while (i > 0) {
            i -= 1;
            switch (charToNibble(hexChars[i])) {
                case (?nibble) {
                    result += Nat8.toNat(nibble) * power;
                    power *= 16;
                };
                case null {
                    return #err("Invalid hex character");
                };
            };
        };
        
        #ok(result)
    };

    // Convert Nat to hex string
    public func natToHex(n: Nat) : Text {
        if (n == 0) {
            return "0x0";
        };
        
        var num = n;
        var hex = "";
        
        while (num > 0) {
            let remainder = num % 16;
            hex := Text.fromChar(nibbleToChar(Nat8.fromNat(remainder))) # hex;
            num := num / 16;
        };
        
        "0x" # hex
    };

    // Helper: Convert byte to hex string
    private func byteToHex(byte: Nat8) : Text {
        let high = byte / 16;
        let low = byte % 16;
        let highChar = Text.fromChar(nibbleToChar(high));
        let lowChar = Text.fromChar(nibbleToChar(low));
        highChar # lowChar
    };

    // Helper: Convert nibble to hex character
    private func nibbleToChar(nibble: Nat8) : Char {
        if (nibble < 10) {
            Char.fromNat32(Char.toNat32('0') + Nat32.fromNat(Nat8.toNat(nibble)))
        } else {
            Char.fromNat32(Char.toNat32('a') + Nat32.fromNat(Nat8.toNat(nibble - 10)))
        }
    };

    // Helper: Convert hex character to nibble
    private func charToNibble(c: Char) : ?Nat8 {
        if (c >= '0' and c <= '9') {
            ?Nat8.fromNat(Nat32.toNat(Char.toNat32(c) - Char.toNat32('0')))
        } else if (c >= 'a' and c <= 'f') {
            ?Nat8.fromNat(Nat32.toNat(Char.toNat32(c) - Char.toNat32('a')) + 10)
        } else if (c >= 'A' and c <= 'F') {
            ?Nat8.fromNat(Nat32.toNat(Char.toNat32(c) - Char.toNat32('A')) + 10)
        } else {
            null
        }
    };
}
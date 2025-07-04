import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Debug "mo:base/Debug";

actor {
    public func testPrincipalToBlob(p: Principal) : async Text {
        let blob = Principal.toBlob(p);
        let bytes = Blob.toArray(blob);
        Debug.print("Blob size: " # Nat.toText(bytes.size()));
        "Size: " # Nat.toText(bytes.size())
    };
}

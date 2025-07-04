import Blob "mo:base/Blob";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";

module {
    // This module serves as an interface to the Keccak256 canister
    // The actual hashing is performed by a separate Rust canister
    
    // Type definitions for inter-canister calls
    public type HashRequest = {
        data: Blob;
    };
    
    public type HashResponse = {
        hash: Blob;
    };
    
    // Interface for the Keccak256 canister
    public type Keccak256Canister = actor {
        keccak256 : (HashRequest) -> async HashResponse;
        keccak256_hex : (HashRequest) -> async Text;
    };
    
    // The canister ID will be set after deployment
    // For local development, this will be updated dynamically
    public let KECCAK256_CANISTER_ID = "be2us-64aaa-aaaaa-qaabq-cai"; // Placeholder - will be updated
    
    // Function to call the Keccak256 canister
    public func keccak256Async(canisterId: Text, data: Blob) : async Blob {
        let keccak256Canister : Keccak256Canister = actor(canisterId);
        let response = await keccak256Canister.keccak256({ data = data });
        response.hash
    };
    
    // Note: The synchronous version is replaced with async
    // Callers must use await when calling this function
    public func keccak256(data: Blob) : Blob {
        Debug.print("ERROR: Synchronous keccak256 called - use keccak256Async instead");
        // Return empty blob - this should never be used
        Blob.fromArray([])
    };
}
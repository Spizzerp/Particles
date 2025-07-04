use candid::{CandidType, Deserialize};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use sha3::{Digest, Keccak256};

#[derive(CandidType, Deserialize)]
pub struct HashRequest {
    pub data: Vec<u8>,
}

#[derive(CandidType, Deserialize)]
pub struct HashResponse {
    pub hash: Vec<u8>,
}

/// Compute Keccak256 hash of the input data
#[update]
fn keccak256(request: HashRequest) -> HashResponse {
    // Accept any cycles sent with the call
    let available = ic_cdk::api::call::msg_cycles_available128();
    if available > 0 {
        ic_cdk::api::call::msg_cycles_accept128(available);
    }
    
    let mut hasher = Keccak256::new();
    hasher.update(&request.data);
    let result = hasher.finalize();
    
    HashResponse {
        hash: result.to_vec(),
    }
}

/// Compute Keccak256 hash and return as hex string
#[update]
fn keccak256_hex(request: HashRequest) -> String {
    // Accept any cycles sent with the call
    let available = ic_cdk::api::call::msg_cycles_available128();
    if available > 0 {
        ic_cdk::api::call::msg_cycles_accept128(available);
    }
    
    let mut hasher = Keccak256::new();
    hasher.update(&request.data);
    let result = hasher.finalize();
    
    hex::encode(result)
}

/// Health check
#[query]
fn health() -> String {
    "Keccak256 service is running".to_string()
}

/// Get the version of the canister
#[query]
fn version() -> String {
    "0.1.0".to_string()
}

#[init]
fn init() {
    ic_cdk::println!("Keccak256 canister initialized");
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {}

// Export the candid interface
ic_cdk::export_candid!();
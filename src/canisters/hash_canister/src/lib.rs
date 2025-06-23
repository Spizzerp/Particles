use candid::{CandidType, Deserialize};
use ic_cdk_macros::*;
use std::cell::RefCell;

mod mimc;
use mimc::{MiMC, MimcBn254};


thread_local! {
    static CALL_COUNT: RefCell<u64> = RefCell::new(0);
}

#[derive(CandidType, Deserialize)]
pub struct HashRequest {
    pub inputs: Vec<Vec<u8>>,
}

#[derive(CandidType, Deserialize)]
pub struct HashResponse {
    pub hash: Vec<u8>,
}

#[derive(CandidType, Deserialize)]
pub struct Stats {
    pub total_calls: u64,
}

/// Hash a single input using MiMC
#[update]
fn hash_single(input: Vec<u8>) -> HashResponse {
    increment_call_count();
    
    let mut hasher = MimcBn254::new();
    hasher.update(&input);
    let result = hasher.finalize();
    
    HashResponse {
        hash: result.to_vec()
    }
}

/// Hash multiple inputs using MiMC sponge construction
#[update]
fn hash_multiple(inputs: Vec<Vec<u8>>) -> HashResponse {
    increment_call_count();
    
    let mut hasher = MimcBn254::new();
    for input in inputs {
        hasher.update(&input);
    }
    let result = hasher.finalize();
    
    HashResponse {
        hash: result.to_vec()
    }
}

/// Hash two inputs (optimized for Merkle tree)
#[update]
fn hash_pair(left: Vec<u8>, right: Vec<u8>) -> HashResponse {
    increment_call_count();
    
    let mut hasher = MimcBn254::new();
    hasher.update(&left);
    hasher.update(&right);
    let result = hasher.finalize();
    
    HashResponse {
        hash: result.to_vec()
    }
}

/// Compute nullifier hash = hash(nullifier)
#[update]
fn compute_nullifier_hash(nullifier: Vec<u8>) -> HashResponse {
    increment_call_count();
    
    let mut hasher = MimcBn254::new();
    hasher.update(&nullifier);
    let result = hasher.finalize();
    
    HashResponse {
        hash: result.to_vec()
    }
}

/// Compute commitment = hash(secret, nullifier, amount)
#[update]
fn compute_commitment(secret: Vec<u8>, nullifier: Vec<u8>, amount: Vec<u8>) -> HashResponse {
    increment_call_count();
    
    let mut hasher = MimcBn254::new();
    hasher.update(&secret);
    hasher.update(&nullifier);
    hasher.update(&amount);
    let result = hasher.finalize();
    
    HashResponse {
        hash: result.to_vec()
    }
}

/// Get statistics
#[query]
fn get_stats() -> Stats {
    CALL_COUNT.with(|count| Stats {
        total_calls: *count.borrow(),
    })
}

/// Health check
#[query]
fn health() -> String {
    "Hash canister is healthy".to_string()
}

fn increment_call_count() {
    CALL_COUNT.with(|count| {
        *count.borrow_mut() += 1;
    });
}

// Candid interface
ic_cdk::export_candid!();
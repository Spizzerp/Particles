use candid::{CandidType, Deserialize, Principal};

#[derive(Clone, CandidType, Deserialize)]
pub struct Config {
    pub ecdsa_key_name: String,
    pub chain_id: u64,
    pub evm_rpc_canister_id: Principal,
}

#[derive(CandidType, Deserialize)]
pub struct TransactionResult {
    pub tx_hash: String,
    pub tx_hex: String,
}

#[derive(Clone)]
pub struct Transaction {
    pub nonce: u64,
    pub gas_price: u64,
    pub gas_limit: u64,
    pub to: String,
    pub value: u128,
    pub data: Vec<u8>,
    pub chain_id: u64,
}

#[derive(Clone)]
pub struct EIP1559Transaction {
    pub nonce: u64,
    pub max_fee_per_gas: u64,
    pub max_priority_fee_per_gas: u64,
    pub gas_limit: u64,
    pub to: String,
    pub value: u128,
    pub data: Vec<u8>,
    pub chain_id: u64,
}

#[derive(Clone, CandidType, Deserialize)]
pub struct SignedTransaction {
    pub tx_hex: String,
    pub tx_hash: String,
}
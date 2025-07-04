use candid::{CandidType, Deserialize, Principal};
use std::cell::RefCell;
use std::collections::HashMap;

use crate::types::Config;

#[derive(Clone, CandidType, Deserialize)]
pub struct State {
    pub config: Config,
    pub nonces: HashMap<String, u64>,
}

impl Default for State {
    fn default() -> Self {
        Self {
            config: Config {
                ecdsa_key_name: "key_1".to_string(), // Mainnet ECDSA key
                chain_id: 1, // Ethereum mainnet
                evm_rpc_canister_id: Principal::from_text("7hfb6-caaaa-aaaar-qadga-cai").unwrap(), // EVM RPC canister
            },
            nonces: HashMap::new(),
        }
    }
}

impl State {
    pub fn get_nonce(&self, address: &str) -> u64 {
        self.nonces.get(address).copied().unwrap_or(0)
    }
    
    pub fn increment_nonce(&mut self, address: &str) {
        let current = self.get_nonce(address);
        self.nonces.insert(address.to_string(), current + 1);
    }
}

thread_local! {
    pub static STATE: RefCell<State> = RefCell::new(State::default());
}
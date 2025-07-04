use candid::Principal;
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};

mod evm_rpc;
mod state;
mod types;
mod utils;

use state::{State, STATE};
use types::*;

#[init]
fn init() {
    ic_cdk::println!("Ethereum Transaction Handler initialized");
}

#[pre_upgrade]
fn pre_upgrade() {
    STATE.with(|s| {
        let state = s.borrow();
        ic_cdk::storage::stable_save((state.clone(),)).unwrap();
    });
}

#[post_upgrade]
fn post_upgrade() {
    let (state,): (State,) = ic_cdk::storage::stable_restore().unwrap();
    STATE.with(|s| {
        *s.borrow_mut() = state;
    });
}

/// Test function to verify canister is working
#[query]
fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}

/// Generate an Ethereum address for a given principal and derivation path
#[update]
async fn generate_address(principal: Principal, path_bytes: Vec<u8>) -> Result<String, String> {
    let derivation_path = vec![path_bytes];
    
    let key_id = ic_cdk::api::management_canister::ecdsa::EcdsaKeyId {
        curve: ic_cdk::api::management_canister::ecdsa::EcdsaCurve::Secp256k1,
        name: get_key_name(),
    };
    
    let public_key = utils::get_canister_public_key(
        key_id,
        Some(principal),
        derivation_path
    ).await?;
    
    let address = utils::pubkey_to_address(&public_key)?;
    Ok(address)
}

/// Forward funds from a deposit address to the pool contract - simplified for testing
#[update]
async fn test_sign_transaction(
    _from_principal: Principal,
    path_bytes: Vec<u8>,
) -> Result<SignedTransaction, String> {
    let derivation_path = vec![path_bytes];
    
    // Create a simple test transaction
    let tx = Transaction {
        nonce: 0,
        gas_price: 2_000_000_000, // 2 gwei
        gas_limit: 21_000,
        to: "0x9b0721C174b103facEC1EeE435679Ae9C493163C".to_string(), // mainnet pool contract
        value: 1_000_000_000_000_000, // 0.001 ETH
        data: vec![],
        chain_id: 1, // Ethereum mainnet
    };
    
    // Sign the transaction
    let key_id = ic_cdk::api::management_canister::ecdsa::EcdsaKeyId {
        curve: ic_cdk::api::management_canister::ecdsa::EcdsaCurve::Secp256k1,
        name: get_key_name(),
    };
    
    let signed_tx = utils::sign_transaction(tx, key_id, derivation_path).await?;
    Ok(signed_tx)
}

/// Forward deposit with full implementation (legacy transactions)
#[update]
async fn forward_deposit(
    from_principal: Principal,
    path_bytes: Vec<u8>,
    to_address: String,
    amount_wei: String, // This parameter will be ignored in favor of balance - gas
    commitment: String,
) -> Result<TransactionResult, String> {
    let derivation_path = vec![path_bytes];
    
    // First, generate the deposit address to check its balance
    let key_id = ic_cdk::api::management_canister::ecdsa::EcdsaKeyId {
        curve: ic_cdk::api::management_canister::ecdsa::EcdsaCurve::Secp256k1,
        name: get_key_name(),
    };
    
    let public_key = utils::get_canister_public_key(
        key_id.clone(),
        Some(from_principal),
        derivation_path.clone()
    ).await?;
    
    let deposit_address = utils::pubkey_to_address(&public_key)?;
    ic_cdk::println!("Checking balance for deposit address: {}", deposit_address);
    
    // Get balance from EVM RPC
    let rpc_services = evm_rpc::RpcServices::EthMainnet(Some(vec![evm_rpc::EthMainnetService::Alchemy, evm_rpc::EthMainnetService::Ankr]));
    let config = Some(evm_rpc::RpcConfig {
        response_size_estimate: Some(64),
    });
    
    // Prepare balance request
    let balance_request = format!(
        r#"{{"jsonrpc":"2.0","method":"eth_getBalance","params":["{}","latest"],"id":1}}"#,
        deposit_address
    );
    
    // Get balance using request method
    let balance_response = evm_rpc::request(
        get_evm_rpc_canister_id(),
        evm_rpc::RpcService::EthMainnet(evm_rpc::EthMainnetService::Alchemy),
        balance_request,
        2048,
        2_000_000_000, // 2B cycles for balance check
    ).await
    .map_err(|e| format!("Failed to get balance: {:?}", e))?;
    
    let current_balance = match balance_response {
        (evm_rpc::RequestResult::Ok(json),) => {
            // Parse the balance from JSON response
            parse_balance_from_json(&json)?
        }
        (evm_rpc::RequestResult::Err(e),) => {
            return Err(format!("Failed to get balance: {:?}", e));
        }
    };
    
    ic_cdk::println!("Current balance: {} wei", current_balance);
    
    // Calculate gas cost
    let gas_price: u128 = 2_000_000_000; // 2 gwei
    let gas_limit: u128 = 100_000; // Standard for contract call
    let total_gas_cost = gas_price * gas_limit;
    
    ic_cdk::println!("Gas cost: {} wei", total_gas_cost);
    
    // Ensure we have enough balance to cover gas
    if current_balance <= total_gas_cost {
        return Err(format!(
            "Insufficient funds: balance {} wei, need at least {} wei for gas",
            current_balance, total_gas_cost
        ));
    }
    
    // Calculate amount to forward (balance - gas)
    let value = current_balance - total_gas_cost;
    ic_cdk::println!("Amount to forward: {} wei", value);
    
    // Get nonce from state
    let nonce = STATE.with(|s| {
        let mut state = s.borrow_mut();
        let current = state.get_nonce(&from_principal.to_string());
        state.increment_nonce(&from_principal.to_string());
        current
    });
    
    // Build the transaction data for deposit(bytes32)
    let method_id = hex::decode("b214faa5")
        .map_err(|e| format!("Failed to decode method ID: {}", e))?;
    let commitment_bytes = hex::decode(commitment.trim_start_matches("0x"))
        .map_err(|e| format!("Failed to decode commitment: {}", e))?;
    
    if commitment_bytes.len() != 32 {
        return Err("Commitment must be 32 bytes".to_string());
    }
    
    let mut data = Vec::new();
    data.extend_from_slice(&method_id);
    data.extend_from_slice(&commitment_bytes);
    
    // Create transaction with calculated value
    let tx = Transaction {
        nonce,
        gas_price: gas_price as u64,
        gas_limit: gas_limit as u64,
        to: to_address.clone(),
        value,
        data,
        chain_id: get_chain_id(),
    };
    
    // Sign the transaction
    let signed_tx = utils::sign_transaction(tx, key_id, derivation_path).await?;
    
    ic_cdk::println!("Signed transaction hex: {}", &signed_tx.tx_hex);
    
    // Submit via EVM RPC
    let rpc_services = evm_rpc::RpcServices::EthMainnet(Some(vec![evm_rpc::EthMainnetService::Alchemy, evm_rpc::EthMainnetService::Ankr]));
    let config = Some(evm_rpc::RpcConfig {
        response_size_estimate: Some(256),
    });
    
    ic_cdk::println!("Calling EVM RPC canister: {:?}", get_evm_rpc_canister_id());
    
    // Attach 10 billion cycles for the EVM RPC call
    let cycles = 10_000_000_000u128;
    
    match evm_rpc::send_raw_transaction_with_cycles(
        get_evm_rpc_canister_id(),
        rpc_services,
        config,
        signed_tx.tx_hex.clone(),
        cycles,
    ).await {
        Ok((multi_result,)) => {
            match multi_result {
                evm_rpc::MultiSendRawTransactionResult::Consistent(result) => {
                    match result {
                        evm_rpc::SendRawTransactionResult::Ok(status) => {
                            match status {
                                evm_rpc::SendRawTransactionStatus::Ok(Some(hash)) => {
                                    Ok(TransactionResult {
                                        tx_hash: hash,
                                        tx_hex: signed_tx.tx_hex,
                                    })
                                }
                                evm_rpc::SendRawTransactionStatus::Ok(None) => {
                                    Ok(TransactionResult {
                                        tx_hash: signed_tx.tx_hash,
                                        tx_hex: signed_tx.tx_hex,
                                    })
                                }
                                evm_rpc::SendRawTransactionStatus::InsufficientFunds => {
                                    Err("Insufficient funds for transaction".to_string())
                                }
                                evm_rpc::SendRawTransactionStatus::NonceTooLow => {
                                    Err("Nonce too low".to_string())
                                }
                                evm_rpc::SendRawTransactionStatus::NonceTooHigh => {
                                    Err("Nonce too high".to_string())
                                }
                            }
                        }
                        evm_rpc::SendRawTransactionResult::Err(e) => {
                            Err(format!("RPC error: {:?}", e))
                        }
                    }
                }
                evm_rpc::MultiSendRawTransactionResult::Inconsistent(results) => {
                    // Log all the results for debugging
                    ic_cdk::println!("Inconsistent results from providers:");
                    for (service, result) in results.iter() {
                        ic_cdk::println!("  Service: {:?}, Result: {:?}", service, result);
                    }
                    
                    // Try to find a successful result
                    for (service, result) in results.iter() {
                        match result {
                            evm_rpc::SendRawTransactionResult::Ok(status) => {
                                match status {
                                    evm_rpc::SendRawTransactionStatus::Ok(Some(hash)) => {
                                        ic_cdk::println!("Found successful result from {:?}: {}", service, hash);
                                        return Ok(TransactionResult {
                                            tx_hash: hash.clone(),
                                            tx_hex: signed_tx.tx_hex,
                                        });
                                    }
                                    evm_rpc::SendRawTransactionStatus::Ok(None) => {
                                        ic_cdk::println!("Provider {:?} returned Ok but no hash", service);
                                    }
                                    evm_rpc::SendRawTransactionStatus::InsufficientFunds => {
                                        ic_cdk::println!("Provider {:?} reports insufficient funds", service);
                                    }
                                    evm_rpc::SendRawTransactionStatus::NonceTooLow => {
                                        ic_cdk::println!("Provider {:?} reports nonce too low", service);
                                    }
                                    evm_rpc::SendRawTransactionStatus::NonceTooHigh => {
                                        ic_cdk::println!("Provider {:?} reports nonce too high", service);
                                    }
                                }
                            }
                            evm_rpc::SendRawTransactionResult::Err(e) => {
                                ic_cdk::println!("Provider {:?} returned error: {:?}", service, e);
                            }
                        }
                    }
                    
                    // If we have any InsufficientFunds errors, report that specifically
                    let has_insufficient_funds = results.iter().any(|(_, result)| {
                        matches!(result, 
                            evm_rpc::SendRawTransactionResult::Ok(
                                evm_rpc::SendRawTransactionStatus::InsufficientFunds
                            )
                        )
                    });
                    
                    if has_insufficient_funds {
                        Err("Insufficient funds in deposit address".to_string())
                    } else {
                        Err("All RPC providers failed to submit the transaction".to_string())
                    }
                }
            }
        }
        Err(e) => {
            ic_cdk::println!("EVM RPC call failed: {:?}", e);
            Err(format!("Failed to send transaction: {:?}", e))
        }
    }
}

/// Forward deposit with EIP-1559 transaction
#[update]
async fn forward_deposit_eip1559(
    from_principal: Principal,
    path_bytes: Vec<u8>,
    to_address: String,
    amount_wei: String, // This parameter will be ignored in favor of balance - gas
    commitment: String,
) -> Result<TransactionResult, String> {
    let derivation_path = vec![path_bytes];
    
    // First, generate the deposit address to check its balance
    let key_id = ic_cdk::api::management_canister::ecdsa::EcdsaKeyId {
        curve: ic_cdk::api::management_canister::ecdsa::EcdsaCurve::Secp256k1,
        name: get_key_name(),
    };
    
    let public_key = utils::get_canister_public_key(
        key_id.clone(),
        Some(from_principal),
        derivation_path.clone()
    ).await?;
    
    let deposit_address = utils::pubkey_to_address(&public_key)?;
    ic_cdk::println!("Checking balance for deposit address: {}", deposit_address);
    
    // Get balance from EVM RPC
    let balance_request = format!(
        r#"{{"jsonrpc":"2.0","method":"eth_getBalance","params":["{}","latest"],"id":1}}"#,
        deposit_address
    );
    
    // Get balance using request method
    let balance_response = evm_rpc::request(
        get_evm_rpc_canister_id(),
        evm_rpc::RpcService::EthMainnet(evm_rpc::EthMainnetService::Alchemy),
        balance_request,
        2048,
        2_000_000_000, // 2B cycles for balance check
    ).await
    .map_err(|e| format!("Failed to get balance: {:?}", e))?;
    
    let current_balance = match balance_response {
        (evm_rpc::RequestResult::Ok(json),) => {
            // Parse the balance from JSON response
            parse_balance_from_json(&json)?
        }
        (evm_rpc::RequestResult::Err(e),) => {
            return Err(format!("Failed to get balance: {:?}", e));
        }
    };
    
    ic_cdk::println!("Current balance: {} wei", current_balance);
    
    // Get current gas prices
    let (base_fee, max_priority_fee) = get_gas_prices().await?;
    
    // Calculate max fee per gas (base fee + priority fee + buffer)
    let max_fee_per_gas = base_fee + max_priority_fee + (base_fee / 5); // 20% buffer
    
    // Calculate gas cost for the transaction
    let gas_limit: u128 = 100_000; // Standard for contract call
    let max_gas_cost = (max_fee_per_gas as u128) * gas_limit;
    
    ic_cdk::println!("Base fee: {} wei, Priority fee: {} wei", base_fee, max_priority_fee);
    ic_cdk::println!("Max fee per gas: {} wei", max_fee_per_gas);
    ic_cdk::println!("Max gas cost: {} wei", max_gas_cost);
    
    // Ensure we have enough balance to cover gas
    if current_balance <= max_gas_cost {
        return Err(format!(
            "Insufficient funds: balance {} wei, need at least {} wei for gas",
            current_balance, max_gas_cost
        ));
    }
    
    // Calculate amount to forward (balance - max gas cost)
    let value = current_balance - max_gas_cost;
    ic_cdk::println!("Amount to forward: {} wei", value);
    
    // Get nonce from state
    let nonce = STATE.with(|s| {
        let mut state = s.borrow_mut();
        let current = state.get_nonce(&from_principal.to_string());
        state.increment_nonce(&from_principal.to_string());
        current
    });
    
    // Build the transaction data for deposit(bytes32)
    let method_id = hex::decode("b214faa5")
        .map_err(|e| format!("Failed to decode method ID: {}", e))?;
    let commitment_bytes = hex::decode(commitment.trim_start_matches("0x"))
        .map_err(|e| format!("Failed to decode commitment: {}", e))?;
    
    if commitment_bytes.len() != 32 {
        return Err("Commitment must be 32 bytes".to_string());
    }
    
    let mut data = Vec::new();
    data.extend_from_slice(&method_id);
    data.extend_from_slice(&commitment_bytes);
    
    // Create EIP-1559 transaction
    let tx = types::EIP1559Transaction {
        nonce,
        max_fee_per_gas,
        max_priority_fee_per_gas: max_priority_fee,
        gas_limit: gas_limit as u64,
        to: to_address.clone(),
        value,
        data,
        chain_id: get_chain_id(),
    };
    
    // Sign the EIP-1559 transaction
    let signed_tx = utils::sign_eip1559_transaction(tx, key_id, derivation_path).await?;
    
    ic_cdk::println!("Signed EIP-1559 transaction hex: {}", &signed_tx.tx_hex);
    
    // Submit via EVM RPC
    let rpc_services = evm_rpc::RpcServices::EthMainnet(Some(vec![evm_rpc::EthMainnetService::Alchemy, evm_rpc::EthMainnetService::Ankr]));
    let config = Some(evm_rpc::RpcConfig {
        response_size_estimate: Some(256),
    });
    
    ic_cdk::println!("Submitting EIP-1559 transaction to EVM RPC canister...");
    
    // Attach 10 billion cycles for the EVM RPC call
    let cycles = 10_000_000_000u128;
    
    match evm_rpc::send_raw_transaction_with_cycles(
        get_evm_rpc_canister_id(),
        rpc_services,
        config,
        signed_tx.tx_hex.clone(),
        cycles,
    ).await {
        Ok((multi_result,)) => {
            match multi_result {
                evm_rpc::MultiSendRawTransactionResult::Consistent(result) => {
                    match result {
                        evm_rpc::SendRawTransactionResult::Ok(status) => {
                            match status {
                                evm_rpc::SendRawTransactionStatus::Ok(Some(hash)) => {
                                    Ok(TransactionResult {
                                        tx_hash: hash,
                                        tx_hex: signed_tx.tx_hex,
                                    })
                                }
                                evm_rpc::SendRawTransactionStatus::Ok(None) => {
                                    Ok(TransactionResult {
                                        tx_hash: signed_tx.tx_hash,
                                        tx_hex: signed_tx.tx_hex,
                                    })
                                }
                                evm_rpc::SendRawTransactionStatus::InsufficientFunds => {
                                    Err("Insufficient funds for transaction".to_string())
                                }
                                evm_rpc::SendRawTransactionStatus::NonceTooLow => {
                                    Err("Nonce too low".to_string())
                                }
                                evm_rpc::SendRawTransactionStatus::NonceTooHigh => {
                                    Err("Nonce too high".to_string())
                                }
                            }
                        }
                        evm_rpc::SendRawTransactionResult::Err(e) => {
                            Err(format!("RPC error: {:?}", e))
                        }
                    }
                }
                evm_rpc::MultiSendRawTransactionResult::Inconsistent(results) => {
                    // Log all the results for debugging
                    ic_cdk::println!("Inconsistent results from providers:");
                    for (service, result) in results.iter() {
                        ic_cdk::println!("  Service: {:?}, Result: {:?}", service, result);
                    }
                    
                    // Try to find a successful result
                    for (service, result) in results.iter() {
                        match result {
                            evm_rpc::SendRawTransactionResult::Ok(status) => {
                                match status {
                                    evm_rpc::SendRawTransactionStatus::Ok(Some(hash)) => {
                                        ic_cdk::println!("Found successful result from {:?}: {}", service, hash);
                                        return Ok(TransactionResult {
                                            tx_hash: hash.clone(),
                                            tx_hex: signed_tx.tx_hex,
                                        });
                                    }
                                    _ => {}
                                }
                            }
                            _ => {}
                        }
                    }
                    
                    Err("All RPC providers failed to submit the EIP-1559 transaction".to_string())
                }
            }
        }
        Err(e) => {
            ic_cdk::println!("EVM RPC call failed: {:?}", e);
            Err(format!("Failed to send EIP-1559 transaction: {:?}", e))
        }
    }
}

/// Helper function to parse balance from JSON response
fn parse_balance_from_json(json: &str) -> Result<u128, String> {
    // Simple JSON parsing for eth_getBalance response
    // Response format: {"jsonrpc":"2.0","id":1,"result":"0x..."}
    
    if let Some(start) = json.find("\"result\":\"") {
        let result_start = start + 10; // length of "result":"
        if let Some(end) = json[result_start..].find("\"") {
            let hex_balance = &json[result_start..result_start + end];
            // Parse hex string to u128
            let hex_str = hex_balance.trim_start_matches("0x");
            u128::from_str_radix(hex_str, 16)
                .map_err(|e| format!("Failed to parse balance: {}", e))
        } else {
            Err("Invalid JSON format".to_string())
        }
    } else {
        Err("Balance not found in response".to_string())
    }
}

/// Get the current nonce for an address
#[query]
fn get_nonce(address: String) -> u64 {
    STATE.with(|s| s.borrow().get_nonce(&address))
}

/// Set configuration
#[update]
fn set_config(config: Config) -> Result<(), String> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.config = config;
    });
    Ok(())
}

/// Get configuration
#[query]
fn get_config() -> Config {
    STATE.with(|s| s.borrow().config.clone())
}

// Helper functions
fn get_key_name() -> String {
    STATE.with(|s| s.borrow().config.ecdsa_key_name.clone())
}

fn get_chain_id() -> u64 {
    STATE.with(|s| s.borrow().config.chain_id)
}

fn get_evm_rpc_canister_id() -> Principal {
    STATE.with(|s| s.borrow().config.evm_rpc_canister_id)
}

/// Get current gas prices for EIP-1559
async fn get_gas_prices() -> Result<(u64, u64), String> {
    // Get latest block to determine base fee
    let block_request = r#"{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["latest",false],"id":1}"#.to_string();
    
    let block_response = evm_rpc::request(
        get_evm_rpc_canister_id(),
        evm_rpc::RpcService::EthMainnet(evm_rpc::EthMainnetService::Alchemy),
        block_request,
        4096,
        2_000_000_000, // 2B cycles
    ).await
    .map_err(|e| format!("Failed to get block: {:?}", e))?;
    
    let base_fee = match block_response {
        (evm_rpc::RequestResult::Ok(json),) => {
            // Parse baseFeePerGas from block
            parse_base_fee_from_json(&json)?
        }
        (evm_rpc::RequestResult::Err(e),) => {
            ic_cdk::println!("Failed to get base fee, using default: {:?}", e);
            1_000_000_000 // Default 1 gwei
        }
    };
    
    // For Sepolia, use a reasonable priority fee
    let max_priority_fee = 2_000_000_000; // 2 gwei
    
    Ok((base_fee, max_priority_fee))
}

/// Parse base fee from block JSON
fn parse_base_fee_from_json(json: &str) -> Result<u64, String> {
    // Look for baseFeePerGas field
    if let Some(start) = json.find("\"baseFeePerGas\":\"") {
        let result_start = start + 17; // length of "baseFeePerGas":"
        if let Some(end) = json[result_start..].find("\"") {
            let hex_fee = &json[result_start..result_start + end];
            let hex_str = hex_fee.trim_start_matches("0x");
            u64::from_str_radix(hex_str, 16)
                .map_err(|e| format!("Failed to parse base fee: {}", e))
        } else {
            Err("Invalid JSON format for base fee".to_string())
        }
    } else {
        // If baseFeePerGas not found, use default
        Ok(1_000_000_000) // 1 gwei default
    }
}
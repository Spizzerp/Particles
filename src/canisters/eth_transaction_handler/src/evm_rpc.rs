use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult;

// EVM RPC Types
#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum RpcServices {
    EthSepolia(Option<Vec<EthSepoliaService>>),
    EthMainnet(Option<Vec<EthMainnetService>>),
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum RpcService {
    EthSepolia(EthSepoliaService),
    EthMainnet(EthMainnetService),
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum EthSepoliaService {
    Alchemy,
    Ankr,
    BlockPi,
    PublicNode,
    Sepolia,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum EthMainnetService {
    Alchemy,
    Ankr,
    BlockPi,
    Cloudflare,
    PublicNode,
    Llama,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct RpcConfig {
    #[serde(rename = "responseSizeEstimate")]
    pub response_size_estimate: Option<u64>,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum SendRawTransactionStatus {
    Ok(Option<String>),
    NonceTooLow,
    NonceTooHigh,
    InsufficientFunds,
}

// Multi result type
#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum MultiSendRawTransactionResult {
    Consistent(SendRawTransactionResult),
    Inconsistent(Vec<(RpcService, SendRawTransactionResult)>),
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum SendRawTransactionResult {
    Ok(SendRawTransactionStatus),
    Err(RpcError),
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum RpcError {
    JsonRpcError(JsonRpcError),
    ProviderError(ProviderError),
    ValidationError(ValidationError),
    HttpOutcallError(HttpOutcallError),
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct JsonRpcError {
    pub code: i64,
    pub message: String,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum ProviderError {
    TooFewCycles { expected: u128, received: u128 },
    MissingRequiredProvider,
    ProviderNotFound,
    NoPermission,
    InvalidRpcConfig(String),
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum ValidationError {
    Custom(String),
    InvalidHex(String),
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum HttpOutcallError {
    IcError { code: RejectionCode, message: String },
    InvalidHttpJsonRpcResponse { status: u16, body: String, #[serde(rename = "parsingError")] parsing_error: Option<String> },
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum RejectionCode {
    NoError,
    CanisterError,
    SysTransient,
    DestinationInvalid,
    Unknown,
    SysFatal,
    CanisterReject,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum RequestResult {
    Ok(String),
    Err(RpcError),
}

// Call the EVM RPC canister to send a raw transaction
pub async fn send_raw_transaction(
    canister_id: Principal,
    rpc_services: RpcServices,
    config: Option<RpcConfig>,
    tx_hex: String,
) -> CallResult<(MultiSendRawTransactionResult,)> {
    ic_cdk::call(
        canister_id,
        "eth_sendRawTransaction",
        (rpc_services, config, tx_hex),
    ).await
}

// Call the EVM RPC canister to send a raw transaction with cycles
pub async fn send_raw_transaction_with_cycles(
    canister_id: Principal,
    rpc_services: RpcServices,
    config: Option<RpcConfig>,
    tx_hex: String,
    cycles: u128,
) -> CallResult<(MultiSendRawTransactionResult,)> {
    ic_cdk::api::call::call_with_payment128(
        canister_id,
        "eth_sendRawTransaction",
        (rpc_services, config, tx_hex),
        cycles,
    ).await
}

// Call the EVM RPC canister with a raw JSON-RPC request
pub async fn request(
    canister_id: Principal,
    rpc_service: RpcService,
    json: String,
    max_response_bytes: u64,
    cycles: u128,
) -> CallResult<(RequestResult,)> {
    ic_cdk::api::call::call_with_payment128(
        canister_id,
        "request",
        (rpc_service, json, max_response_bytes),
        cycles,
    ).await
}
use ic_cdk::api::management_canister::ecdsa::{
    ecdsa_public_key, sign_with_ecdsa, EcdsaKeyId, EcdsaPublicKeyArgument, SignWithEcdsaArgument,
};
use candid::Principal;
use sha3::{Keccak256, Digest};
use crate::types::{Transaction, EIP1559Transaction, SignedTransaction};

/// Gets the canister's ECDSA public key
pub async fn get_canister_public_key(
    key_id: EcdsaKeyId,
    canister_id: Option<Principal>,
    derivation_path: Vec<Vec<u8>>,
) -> Result<Vec<u8>, String> {
    let (key,) = ecdsa_public_key(EcdsaPublicKeyArgument {
        canister_id,
        derivation_path,
        key_id,
    })
    .await
    .map_err(|e| format!("Failed to get public key: {:?}", e))?;
    
    Ok(key.public_key)
}

/// Convert public key to Ethereum address
pub fn pubkey_to_address(pubkey_bytes: &[u8]) -> Result<String, String> {
    // IC returns SEC1 encoded public key
    if pubkey_bytes.len() != 33 {
        return Err("Expected compressed public key (33 bytes)".to_string());
    }
    
    // For now, we'll use the compressed key directly
    // In production, you'd decompress this to get the full public key
    // But for address generation, we can work with what we have
    
    // For compressed keys, we need to decompress first
    // This is a simplified version - in production use a proper crypto library
    let uncompressed = decompress_pubkey(pubkey_bytes)?;
    
    // Hash the public key (excluding the 0x04 prefix)
    let mut hasher = Keccak256::new();
    hasher.update(&uncompressed[1..]);
    let hash = hasher.finalize();
    
    // Take last 20 bytes as address
    let address_bytes = &hash[12..32];
    
    // Convert to checksummed address
    let address = format!("0x{}", hex::encode(address_bytes));
    Ok(to_checksum_address(&address))
}

/// Decompress a compressed public key
fn decompress_pubkey(compressed: &[u8]) -> Result<Vec<u8>, String> {
    use k256::PublicKey;
    use k256::elliptic_curve::sec1::ToEncodedPoint;
    
    if compressed.len() != 33 {
        return Err("Invalid compressed key length".to_string());
    }
    
    // Parse the compressed public key
    let pubkey = PublicKey::from_sec1_bytes(compressed)
        .map_err(|e| format!("Failed to parse compressed key: {:?}", e))?;
    
    // Get uncompressed bytes
    let uncompressed = pubkey.to_encoded_point(false);
    
    Ok(uncompressed.as_bytes().to_vec())
}

/// Convert address to checksum format
fn to_checksum_address(address: &str) -> String {
    let address = address.trim_start_matches("0x").to_lowercase();
    
    let mut hasher = Keccak256::new();
    hasher.update(address.as_bytes());
    let hash = hasher.finalize();
    
    let mut result = String::from("0x");
    for (i, ch) in address.chars().enumerate() {
        if ch.is_alphabetic() {
            let hash_byte = hash[i / 2];
            let hash_nibble = if i % 2 == 0 { hash_byte >> 4 } else { hash_byte & 0xf };
            if hash_nibble >= 8 {
                result.push(ch.to_ascii_uppercase());
            } else {
                result.push(ch);
            }
        } else {
            result.push(ch);
        }
    }
    
    result
}

/// Sign a transaction
pub async fn sign_transaction(
    tx: Transaction,
    key_id: EcdsaKeyId,
    derivation_path: Vec<Vec<u8>>,
) -> Result<SignedTransaction, String> {
    // Get public key for recovery
    let public_key = get_canister_public_key(key_id.clone(), None, derivation_path.clone()).await?;
    
    // Encode transaction for signing (EIP-155)
    let unsigned_tx_bytes = encode_transaction(&tx);
    
    // Hash the transaction
    let mut hasher = Keccak256::new();
    hasher.update(&unsigned_tx_bytes);
    let tx_hash = hasher.finalize();
    
    // Sign the transaction
    let (signature,) = sign_with_ecdsa(SignWithEcdsaArgument {
        message_hash: tx_hash.to_vec(),
        derivation_path,
        key_id,
    })
    .await
    .map_err(|e| format!("Failed to sign transaction: {:?}", e))?;
    
    // Find correct v value
    let v = find_recovery_id(&tx_hash, &signature.signature, &public_key)?;
    
    // Encode signed transaction
    let signed_tx_bytes = encode_signed_transaction(&tx, &signature.signature, v);
    
    // Calculate transaction hash
    let mut hasher = Keccak256::new();
    hasher.update(&signed_tx_bytes);
    let signed_tx_hash = hasher.finalize();
    
    Ok(SignedTransaction {
        tx_hex: format!("0x{}", hex::encode(&signed_tx_bytes)),
        tx_hash: format!("0x{}", hex::encode(signed_tx_hash)),
    })
}

/// Find the correct recovery ID (v value)
fn find_recovery_id(msg_hash: &[u8], sig: &[u8], pubkey: &[u8]) -> Result<u8, String> {
    use k256::ecdsa::{Signature, VerifyingKey};
    use k256::ecdsa::recoverable::{Id as RecoveryId, Signature as RecoverableSignature};
    
    if sig.len() != 64 {
        return Err("Invalid signature length".to_string());
    }
    
    if msg_hash.len() != 32 {
        return Err("Invalid message hash length".to_string());
    }
    
    // Parse the original public key
    let orig_key = VerifyingKey::from_sec1_bytes(pubkey)
        .map_err(|e| format!("Failed to parse public key: {:?}", e))?;
    
    // Try both recovery IDs
    for recovery_id in [0u8, 1u8] {
        let rec_id = RecoveryId::new(recovery_id)
            .map_err(|_| "Invalid recovery ID")?;
        
        // Create recoverable signature
        let mut sig_bytes = [0u8; 65];
        sig_bytes[..64].copy_from_slice(sig);
        sig_bytes[64] = recovery_id;
        
        if let Ok(recoverable_sig) = RecoverableSignature::try_from(&sig_bytes[..]) {
            // Convert msg_hash to fixed array
            let mut hash_array = [0u8; 32];
            hash_array.copy_from_slice(msg_hash);
            
            if let Ok(recovered_key) = recoverable_sig.recover_verifying_key_from_digest_bytes(&hash_array.into()) {
                if recovered_key == orig_key {
                    return Ok(recovery_id);
                }
            }
        }
    }
    
    Err("Failed to find recovery ID".to_string())
}

/// Encode transaction for signing (EIP-155)
fn encode_transaction(tx: &Transaction) -> Vec<u8> {
    use rlp::RlpStream;
    
    let mut stream = RlpStream::new_list(9);
    stream.append(&tx.nonce);
    stream.append(&tx.gas_price);
    stream.append(&tx.gas_limit);
    
    // Decode hex address
    let to_bytes = hex::decode(tx.to.trim_start_matches("0x")).unwrap_or_default();
    stream.append(&to_bytes);
    
    stream.append(&tx.value);
    stream.append(&tx.data);
    stream.append(&tx.chain_id);
    stream.append(&0u8); // r placeholder
    stream.append(&0u8); // s placeholder
    
    stream.out().to_vec()
}

/// Encode signed transaction
fn encode_signed_transaction(tx: &Transaction, sig: &[u8], v: u8) -> Vec<u8> {
    use rlp::RlpStream;
    
    let mut stream = RlpStream::new_list(9);
    stream.append(&tx.nonce);
    stream.append(&tx.gas_price);
    stream.append(&tx.gas_limit);
    
    // Decode hex address
    let to_bytes = hex::decode(tx.to.trim_start_matches("0x")).unwrap_or_default();
    stream.append(&to_bytes);
    
    stream.append(&tx.value);
    stream.append(&tx.data);
    
    // EIP-155 v value
    let adjusted_v = (tx.chain_id * 2 + 35) + v as u64;
    stream.append(&adjusted_v);
    
    // r and s from signature
    stream.append(&sig[0..32].to_vec());
    stream.append(&sig[32..64].to_vec());
    
    stream.out().to_vec()
}

/// Sign an EIP-1559 transaction
pub async fn sign_eip1559_transaction(
    tx: EIP1559Transaction,
    key_id: EcdsaKeyId,
    derivation_path: Vec<Vec<u8>>,
) -> Result<SignedTransaction, String> {
    // Get public key for recovery
    let public_key = get_canister_public_key(key_id.clone(), None, derivation_path.clone()).await?;
    
    // Encode transaction for signing
    let unsigned_tx_bytes = encode_eip1559_transaction(&tx);
    
    // Hash the transaction
    let mut hasher = Keccak256::new();
    hasher.update(&unsigned_tx_bytes);
    let tx_hash = hasher.finalize();
    
    // Sign the transaction
    let (signature,) = sign_with_ecdsa(SignWithEcdsaArgument {
        message_hash: tx_hash.to_vec(),
        derivation_path,
        key_id,
    })
    .await
    .map_err(|e| format!("Failed to sign transaction: {:?}", e))?;
    
    // For EIP-1559, we use y-parity (0 or 1) instead of v
    let y_parity = find_recovery_id(&tx_hash, &signature.signature, &public_key)?;
    
    // Encode signed transaction
    let signed_tx_bytes = encode_signed_eip1559_transaction(&tx, &signature.signature, y_parity);
    
    // Calculate transaction hash
    let mut hasher = Keccak256::new();
    hasher.update(&signed_tx_bytes);
    let signed_tx_hash = hasher.finalize();
    
    Ok(SignedTransaction {
        tx_hex: format!("0x{}", hex::encode(&signed_tx_bytes)),
        tx_hash: format!("0x{}", hex::encode(signed_tx_hash)),
    })
}

/// Encode EIP-1559 transaction for signing
fn encode_eip1559_transaction(tx: &EIP1559Transaction) -> Vec<u8> {
    use rlp::RlpStream;
    
    let mut stream = RlpStream::new_list(9);
    stream.append(&tx.chain_id);
    stream.append(&tx.nonce);
    stream.append(&tx.max_priority_fee_per_gas);
    stream.append(&tx.max_fee_per_gas);
    stream.append(&tx.gas_limit);
    
    // Decode hex address
    let to_bytes = hex::decode(tx.to.trim_start_matches("0x")).unwrap_or_default();
    stream.append(&to_bytes);
    
    stream.append(&tx.value);
    stream.append(&tx.data);
    stream.append_raw(&[0xc0], 1); // Access list (empty list) - RLP encoding of empty list is 0xc0
    
    let rlp_encoded = stream.out().to_vec();
    
    // Prepend transaction type (0x02 for EIP-1559)
    let mut result = vec![0x02];
    result.extend_from_slice(&rlp_encoded);
    result
}

/// Encode signed EIP-1559 transaction
fn encode_signed_eip1559_transaction(tx: &EIP1559Transaction, sig: &[u8], y_parity: u8) -> Vec<u8> {
    use rlp::RlpStream;
    
    let mut stream = RlpStream::new_list(12);
    stream.append(&tx.chain_id);
    stream.append(&tx.nonce);
    stream.append(&tx.max_priority_fee_per_gas);
    stream.append(&tx.max_fee_per_gas);
    stream.append(&tx.gas_limit);
    
    // Decode hex address
    let to_bytes = hex::decode(tx.to.trim_start_matches("0x")).unwrap_or_default();
    stream.append(&to_bytes);
    
    stream.append(&tx.value);
    stream.append(&tx.data);
    stream.append_raw(&[0xc0], 1); // Access list (empty list) - RLP encoding of empty list is 0xc0
    
    // y-parity (0 or 1)
    stream.append(&y_parity);
    
    // r and s from signature
    stream.append(&sig[0..32].to_vec());
    stream.append(&sig[32..64].to_vec());
    
    let rlp_encoded = stream.out().to_vec();
    
    // Prepend transaction type (0x02 for EIP-1559)
    let mut result = vec![0x02];
    result.extend_from_slice(&rlp_encoded);
    result
}
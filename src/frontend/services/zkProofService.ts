import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { Principal } from '@dfinity/principal';
import { plonkProverService } from './plonkProverService';

export interface WithdrawalProof {
  nullifier: string;
  commitment: string;
  merkleRoot: string;
  merkleProof: string[];
  recipient: string;
  amount: string;
  chainId: string;
  // PLONK proof format
  proof: {
    lro: [string, string][];
    z: [string, string];
    h1: [string, string];
    h2: [string, string];
    wire_values_at_z: string[];
    wire_values_at_z_omega: string[];
  };
}

export interface DepositData {
  depositId: string;
  commitment: string;
  secret: string;
  nullifier: string;
  amount: string;
  token: string;
  chain: string;
}

/**
 * Parse deposit data from commitment string or JSON
 */
export function parseDepositData(input: string): DepositData | null {
  try {
    // Try parsing as JSON first
    if (input.startsWith('{')) {
      return JSON.parse(input) as DepositData;
    }
    
    // Try parsing as commitment hash only
    if (input.startsWith('0x') || input.length === 64) {
      // User only provided commitment, we can't recover other data
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to parse deposit data:', error);
    return null;
  }
}

/**
 * Generate a withdrawal proof using PLONK
 */
export async function generateWithdrawalProof(
  depositData: DepositData,
  recipient: string,
  merkleRoot: string,
  merkleProof: string[],
  leafIndex?: number
): Promise<WithdrawalProof> {
  // Ensure PLONK prover is initialized
  if (!plonkProverService.isInitialized()) {
    console.log('Initializing PLONK prover...');
    await plonkProverService.initialize();
  }
  
  // Generate nullifier hash from nullifier
  const nullifierHash = depositData.nullifier; // Already a hash from deposit
  
  // Use leaf index from deposit ID if not provided
  const index = leafIndex !== undefined ? leafIndex : parseInt(depositData.depositId, 10);
  
  // Generate the PLONK proof
  const generatedProof = await plonkProverService.generateWithdrawalProof(
    depositData.secret,
    depositData.nullifier,
    depositData.amount,
    recipient,
    merkleRoot,
    merkleProof,
    index
  );
  
  return {
    nullifier: nullifierHash,
    commitment: depositData.commitment,
    merkleRoot,
    merkleProof,
    recipient,
    amount: depositData.amount,
    chainId: depositData.chain,
    proof: generatedProof.proof
  };
}

/**
 * Verify that a commitment exists in the merkle tree
 * This is a client-side pre-check before generating the proof
 */
export function verifyCommitmentInTree(
  commitment: string,
  merkleRoot: string,
  merkleProof: string[]
): boolean {
  let currentHash = hexToBytes(commitment.replace('0x', ''));
  
  for (const proofElement of merkleProof) {
    const proofBytes = hexToBytes(proofElement.replace('0x', ''));
    
    // Determine ordering
    const shouldSwap = (() => {
      for (let i = 0; i < Math.min(currentHash.length, proofBytes.length); i++) {
        if (currentHash[i] < proofBytes[i]) return false;
        if (currentHash[i] > proofBytes[i]) return true;
      }
      return currentHash.length > proofBytes.length;
    })();
    
    // Combine hashes in correct order
    const combined = new Uint8Array(currentHash.length + proofBytes.length);
    if (shouldSwap) {
      combined.set(proofBytes, 0);
      combined.set(currentHash, proofBytes.length);
    } else {
      combined.set(currentHash, 0);
      combined.set(proofBytes, currentHash.length);
    }
    
    currentHash = sha256(combined);
  }
  
  return bytesToHex(currentHash) === merkleRoot.replace('0x', '');
}

/**
 * Format recipient address based on chain
 */
export function formatRecipientAddress(address: string, chainId: string): string {
  // Validate and format based on chain
  switch (chainId) {
    case 'ICP':
      // ICP uses Principal format
      try {
        Principal.fromText(address);
        return address;
      } catch {
        throw new Error('Invalid ICP Principal address');
      }
    
    case 'BTC':
      // Basic Bitcoin address validation
      // P2PKH: starts with 1 or m/n (testnet)
      // P2SH: starts with 3 or 2 (testnet)
      // Bech32: starts with bc1 or tb1 (testnet)
      if (!address.match(/^(bc1|tb1|[13mn2])[a-zA-HJ-NP-Z0-9]{25,87}$/)) {
        throw new Error('Invalid Bitcoin address');
      }
      return address;
    
    case '1': // Ethereum
    case '56': // BSC
    case '137': // Polygon
    case '42161': // Arbitrum
      // EVM address validation
      if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid EVM address');
      }
      return address.toLowerCase();
    
    default:
      throw new Error('Unsupported chain');
  }
}

/**
 * Estimate withdrawal gas/fees
 */
export async function estimateWithdrawalFees(
  chainId: string,
  amount: string
): Promise<{ networkFee: string; protocolFee: string; total: string }> {
  // Base network fees (in smallest unit)
  const networkFees: Record<string, bigint> = {
    'ICP': BigInt(10000), // 0.0001 ICP
    'BTC': BigInt(2000), // 2000 satoshis
    '1': BigInt(100000 * 20 * 1e9), // 100k gas * 20 gwei (for proof verification)
    '56': BigInt(100000 * 5 * 1e9), // 100k gas * 5 gwei
    '137': BigInt(100000 * 30 * 1e9), // 100k gas * 30 gwei
    '42161': BigInt(100000 * 0.1 * 1e9), // 100k gas * 0.1 gwei
  };
  
  const networkFee = networkFees[chainId] || BigInt(0);
  
  // Protocol fee: 0.1% of amount
  const protocolFee = BigInt(amount) / BigInt(1000);
  
  const total = networkFee + protocolFee;
  
  return {
    networkFee: networkFee.toString(),
    protocolFee: protocolFee.toString(),
    total: total.toString()
  };
}
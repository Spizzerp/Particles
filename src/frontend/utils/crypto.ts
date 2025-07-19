// Cryptographic utilities for commitment generation and verification
import { Principal } from '@dfinity/principal';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes, bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { mimc } from './mimc';

export interface Commitment {
  commitment: string;
  secret: string;
  nullifier: string;
}

/**
 * Generate a commitment for a deposit
 * Commitment = Hash(nullifier || amount || chainId)
 * where nullifier = Hash(secret)
 */
export async function generateCommitment(
  amount: string,
  chainId: number
): Promise<Commitment> {
  // Generate random secret (32 bytes)
  const secretBytes = randomBytes(32);
  const secret = bytesToHex(secretBytes);
  
  // Generate nullifier from secret
  const nullifierBytes = sha256(secretBytes);
  const nullifier = bytesToHex(nullifierBytes);
  
  // Create commitment
  const encoder = new TextEncoder();
  const amountPadded = amount.padStart(32, '0');
  const chainIdPadded = chainId.toString().padStart(8, '0');
  
  const commitmentData = new Uint8Array(
    nullifierBytes.length + 
    encoder.encode(amountPadded).length + 
    encoder.encode(chainIdPadded).length
  );
  
  let offset = 0;
  commitmentData.set(nullifierBytes, offset);
  offset += nullifierBytes.length;
  commitmentData.set(encoder.encode(amountPadded), offset);
  offset += encoder.encode(amountPadded).length;
  commitmentData.set(encoder.encode(chainIdPadded), offset);
  
  const commitment = bytesToHex(sha256(commitmentData));
  
  return {
    commitment,
    secret,
    nullifier
  };
}

/**
 * Generate a deterministic address from a principal for a specific chain
 */
export function generateDeterministicAddress(
  principal: Principal,
  chainId: number
): string {
  const principalBytes = principal.toUint8Array();
  const chainBytes = new TextEncoder().encode(chainId.toString());
  
  const addressData = new Uint8Array(principalBytes.length + chainBytes.length);
  addressData.set(principalBytes, 0);
  addressData.set(chainBytes, principalBytes.length);
  
  const hash = sha256(addressData);
  
  // For Ethereum-like addresses, take first 20 bytes
  if (chainId === 11155111) { // Sepolia testnet
    return '0x' + bytesToHex(hash.slice(0, 20));
  }
  
  // For Bitcoin, we'd need proper address encoding
  // This is simplified - real implementation would use proper Bitcoin address format
  return bytesToHex(hash);
}

/**
 * Verify a withdrawal proof (client-side validation)
 */
export function verifyWithdrawalProof(
  nullifier: string,
  recipient: string,
  amount: string,
  merkleRoot: string,
  proof: any
): boolean {
  // This is a placeholder - actual implementation would verify the ZK proof
  // In production, this would use a SNARK verification library
  console.log('Verifying proof:', { nullifier, recipient, amount, merkleRoot });
  
  // Basic validation
  if (!nullifier || nullifier.length !== 64) return false;
  if (!recipient || recipient.length === 0) return false;
  
  // Handle amount validation with decimal support
  try {
    let amountValue: bigint;
    if (amount.includes('.')) {
      // Assume 18 decimals for validation purposes
      amountValue = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, 18)));
    } else {
      amountValue = BigInt(amount);
    }
    if (amountValue <= 0) return false;
  } catch {
    return false;
  }
  
  if (!merkleRoot || merkleRoot.length !== 64) return false;
  
  return true;
}

/**
 * Parse deposit secret from note
 */
export function parseDepositNote(note: string): { secret: string; commitment: string } | null {
  try {
    // Expected format: "particlefund-{chainId}-{commitment}-{secret}"
    const parts = note.split('-');
    if (parts.length !== 4 || parts[0] !== 'particlefund') {
      return null;
    }
    
    return {
      commitment: parts[2],
      secret: parts[3]
    };
  } catch (error) {
    console.error('Failed to parse deposit note:', error);
    return null;
  }
}

/**
 * Generate deposit note for users to save
 */
export function generateDepositNote(
  chainId: number,
  commitment: string,
  secret: string
): string {
  return `particlefund-${chainId}-${commitment}-${secret}`;
}

/**
 * Estimate cross-chain transaction fees
 */
export async function estimateFees(
  chainId: number,
  amount: string
): Promise<{ baseFee: string; dynamicFee: string; total: string }> {
  // Base fees per chain (in smallest unit)
  const baseFees: Record<number, bigint> = {
    0: BigInt(1000), // Bitcoin: 1000 satoshis
    1: BigInt(21000 * 20 * 1e9), // Ethereum: 21000 gas * 20 gwei
    2: BigInt(10000), // ICP: 0.0001 ICP
  };
  
  const baseFee = baseFees[chainId] || BigInt(0);
  
  // Dynamic fee based on amount (0.1%)
  // Handle decimal amounts by converting to wei first
  let amountBigInt: bigint;
  if (amount.includes('.')) {
    // Determine decimals based on chainId
    const decimals = chainId === 0 ? 8 :  // Bitcoin
                    chainId === 11155111 ? 18 : // Sepolia testnet
                    8; // ICP default
    amountBigInt = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
  } else {
    amountBigInt = BigInt(amount);
  }
  
  const dynamicFee = amountBigInt / BigInt(1000);
  
  const total = baseFee + dynamicFee;
  
  return {
    baseFee: baseFee.toString(),
    dynamicFee: dynamicFee.toString(),
    total: total.toString()
  };
}

/**
 * Format amount for display based on chain
 */
export function formatAmount(amount: string, chainId: number): string {
  const decimals: Record<number, number> = {
    0: 8,  // Bitcoin
    11155111: 18, // Sepolia testnet
    2: 8,  // ICP
  };
  
  const decimal = decimals[chainId] || 18;
  
  // Handle decimal amounts by converting to smallest unit first
  let value: bigint;
  if (amount.includes('.')) {
    // Amount is already in decimal format (e.g., "0.005" ETH)
    value = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimal)));
  } else {
    // Amount is already in smallest unit (wei/satoshis)
    value = BigInt(amount);
  }
  const divisor = BigInt(10 ** decimal);
  
  const whole = value / divisor;
  const fraction = value % divisor;
  
  const fractionStr = fraction.toString().padStart(decimal, '0');
  const trimmedFraction = fractionStr.replace(/0+$/, '');
  
  if (trimmedFraction.length === 0) {
    return whole.toString();
  }
  
  return `${whole}.${trimmedFraction}`;
}

/**
 * Parse amount from user input to smallest unit
 */
export function parseAmount(input: string, chainId: number): string {
  const decimals: Record<number, number> = {
    0: 8,  // Bitcoin
    11155111: 18, // Sepolia testnet
    2: 8,  // ICP
  };
  
  const decimal = decimals[chainId] || 18;
  
  // Remove any commas and trim
  const cleanInput = input.replace(/,/g, '').trim();
  
  // Split by decimal point
  const parts = cleanInput.split('.');
  const whole = parts[0] || '0';
  const fraction = parts[1] || '';
  
  // Pad or truncate fraction to correct decimals
  const paddedFraction = fraction.padEnd(decimal, '0').slice(0, decimal);
  
  // Combine whole and fraction
  const combined = whole + paddedFraction;
  
  // Remove leading zeros
  return combined.replace(/^0+/, '') || '0';
}

// Simple hash function for non-crypto use
export function simpleHash(data: Uint8Array | ArrayBuffer | string): string {
  let input: Uint8Array;
  
  if (typeof data === 'string') {
    input = new TextEncoder().encode(data);
  } else if (data instanceof ArrayBuffer) {
    input = new Uint8Array(data);
  } else {
    input = data;
  }
  
  return bytesToHex(sha256(input));
}

// Convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.replace('0x', '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to hex string
function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Enhanced Merkle tree implementation using MiMC
export function buildMerkleTree(leaves: string[]): string {
  if (leaves.length === 0) return "";
  
  // Work with string representations for MiMC
  let currentLevel = leaves.map(leaf => {
    // Remove 0x prefix and ensure it's a valid field element
    const cleanLeaf = leaf.replace('0x', '');
    return BigInt('0x' + cleanLeaf).toString();
  });
  
  while (currentLevel.length > 1) {
    const nextLevel = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : "0"; // Use "0" for padding
      
      // Hash using MiMC: parent = MiMC(left, right)
      const parent = mimc.hash([left, right]);
      nextLevel.push(parent);
    }
    
    currentLevel = nextLevel;
  }
  
  // Convert final root to hex format
  const rootBigInt = BigInt(currentLevel[0]);
  return '0x' + rootBigInt.toString(16).padStart(64, '0');
}

// Generate Merkle proof for a leaf using MiMC
export function generateMerkleProof(leaves: string[], targetLeaf: string): string[] {
  if (leaves.length === 0) return [];
  
  // Find the target leaf (handle both with and without 0x prefix)
  const targetLeafClean = targetLeaf.replace('0x', '').toLowerCase();
  const targetIndex = leaves.findIndex(leaf => 
    leaf.replace('0x', '').toLowerCase() === targetLeafClean
  );
  
  if (targetIndex === -1) return [];
  
  const proof: string[] = [];
  
  // Convert leaves to field elements for MiMC
  let currentLevel = leaves.map(leaf => {
    const cleanLeaf = leaf.replace('0x', '');
    return BigInt('0x' + cleanLeaf).toString();
  });
  
  let currentIndex = targetIndex;
  
  // For a complete tree with depth 20, we need to pad with zeros
  const treeDepth = 20;
  
  // Build proof by going up the tree
  for (let level = 0; level < treeDepth; level++) {
    // Pad current level to be a power of 2
    const levelSize = Math.pow(2, treeDepth - level);
    while (currentLevel.length < levelSize) {
      currentLevel.push("0");
    }
    
    // Find the sibling
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
    
    // Add sibling to proof (not the current node!)
    if (siblingIndex < currentLevel.length) {
      const siblingValue = currentLevel[siblingIndex];
      const siblingHex = '0x' + BigInt(siblingValue).toString(16).padStart(64, '0');
      proof.push(siblingHex);
    } else {
      proof.push('0x' + '0'.padStart(64, '0'));
    }
    
    // Build next level using MiMC
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : "0";
      
      // Hash using MiMC: parent = MiMC(left, right)
      const parent = mimc.hash([left, right]);
      nextLevel.push(parent);
    }
    
    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
    
    // If we've reduced to a single element and haven't finished all levels,
    // we continue with that element
    if (currentLevel.length === 1 && level < treeDepth - 1) {
      // For sparse tree, continue with zeros as siblings
      for (let remainingLevel = level + 1; remainingLevel < treeDepth; remainingLevel++) {
        proof.push('0x' + '0'.padStart(64, '0'));
      }
      break;
    }
  }
  
  return proof;
}

// Verify a Merkle proof
export function verifyMerkleProof(
  leaf: string,
  proof: string[],
  root: string
): boolean {
  let currentHash = hexToUint8Array(leaf);
  
  for (const proofElement of proof) {
    const proofBytes = hexToUint8Array(proofElement);
    
    // Compare for consistent ordering
    const shouldSwap = (() => {
      for (let j = 0; j < Math.min(currentHash.length, proofBytes.length); j++) {
        if (currentHash[j] < proofBytes[j]) return false;
        if (currentHash[j] > proofBytes[j]) return true;
      }
      return currentHash.length > proofBytes.length;
    })();
    
    const combined = new Uint8Array(currentHash.length + proofBytes.length);
    if (shouldSwap) {
      combined.set(proofBytes, 0);
      combined.set(currentHash, proofBytes.length);
    } else {
      combined.set(currentHash, 0);
      combined.set(proofBytes, currentHash.length);
    }
    
    const hash = simpleHash(combined);
    currentHash = hexToUint8Array(hash);
  }
  
  return '0x' + uint8ArrayToHex(currentHash) === root;
}
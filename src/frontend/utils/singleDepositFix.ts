import { mimc } from './mimc';

/**
 * Handle the edge case where there's only one deposit in the merkle tree.
 * The canister incorrectly returns the commitment as the root instead of
 * hashing it up through all levels.
 */
export function handleSingleDepositCase(
  merkleRoot: string,
  commitment: string,
  totalDeposits: number
): { actualRoot: string; isSingleDeposit: boolean } {
  // Check if this is the single deposit edge case
  if (totalDeposits === 1 && merkleRoot === commitment) {
    console.log('⚠️ Detected single deposit edge case - applying workaround');
    
    // The canister returned the commitment as root, but the circuit expects
    // the commitment to be hashed with empty siblings all the way up
    const EMPTY_LEAF = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const TREE_DEPTH = 20;
    
    // Convert commitment to field element
    let currentHash = BigInt(commitment).toString();
    
    // Hash up the tree with empty siblings
    for (let level = 0; level < TREE_DEPTH; level++) {
      // For index 0, sibling is always on the right
      const left = currentHash;
      const right = BigInt(EMPTY_LEAF).toString();
      
      // Hash using MiMC
      currentHash = mimc.hash([left, right]);
    }
    
    // Convert back to hex
    const actualRoot = '0x' + BigInt(currentHash).toString(16).padStart(64, '0');
    
    console.log('Original root (commitment):', merkleRoot);
    console.log('Computed actual root:', actualRoot);
    
    return {
      actualRoot,
      isSingleDeposit: true
    };
  }
  
  // Not the edge case, use the root as-is
  return {
    actualRoot: merkleRoot,
    isSingleDeposit: false
  };
} 
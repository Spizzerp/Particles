import { groth16 } from 'snarkjs';

// Circuit parameters
const MERKLE_TREE_HEIGHT = 20;

// Types for circuit inputs
export interface CircuitInputs {
  // Public inputs
  root: string;
  nullifierHash: string;
  recipient: string;
  relayer: string;
  fee: string;
  amount: string;
  chainId: string;
  
  // Private inputs
  nullifier: string;
  secret: string;
  pathElements: string[];
  pathIndices: number[];
}

export interface SNARKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}

export interface ProofData {
  proof: {
    a: string;
    b: string;
    c: string;
  };
  publicSignals: string[];
}

// Convert hex string to decimal string for circuit
function hexToDecimalString(hex: string): string {
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }
  // For large numbers, we need to use BigInt
  const decimal = BigInt('0x' + hex);
  return decimal.toString();
}

// Convert field element to hex string
function fieldToHex(field: string): string {
  const decimal = BigInt(field);
  return '0x' + decimal.toString(16).padStart(64, '0');
}

// Poseidon hash function (simplified - in production use circomlib)
async function poseidon(inputs: bigint[]): Promise<bigint> {
  // This is a placeholder - in production, use the actual Poseidon implementation
  // For now, we'll use a simple hash combining inputs
  let hash = BigInt(0);
  for (const input of inputs) {
    hash = hash ^ input;
  }
  return hash;
}

// Generate nullifier hash from nullifier
export async function generateNullifierHash(nullifier: string): Promise<string> {
  const nullifierBigInt = BigInt(nullifier);
  const hash = await poseidon([nullifierBigInt]);
  return hash.toString();
}

// Generate commitment from components
export async function generateCommitment(
  nullifier: string,
  secret: string,
  amount: string,
  chainId: string
): Promise<string> {
  const inputs = [
    BigInt(nullifier),
    BigInt(secret),
    BigInt(amount),
    BigInt(chainId)
  ];
  const commitment = await poseidon(inputs);
  return fieldToHex(commitment.toString());
}

// Convert address to field element
function addressToField(address: string): string {
  if (address.startsWith('0x')) {
    // Ethereum address - convert to decimal
    return BigInt(address).toString();
  } else {
    // For other addresses, hash them to get a field element
    // In production, use proper encoding
    let hash = BigInt(0);
    for (let i = 0; i < address.length; i++) {
      hash = (hash * BigInt(256)) + BigInt(address.charCodeAt(i));
    }
    return hash.toString();
  }
}

// Generate ZK proof for withdrawal
export async function generateWithdrawalProof(
  inputs: CircuitInputs
): Promise<ProofData> {
  try {
    // For development, we'll use a mock proof
    // In production, this would load the actual WASM and zkey files
    
    // Convert inputs to the format expected by snarkjs
    const circuitInputs = {
      // Public inputs
      root: hexToDecimalString(inputs.root),
      nullifierHash: inputs.nullifierHash,
      recipient: addressToField(inputs.recipient),
      relayer: addressToField(inputs.relayer),
      fee: inputs.fee,
      amount: inputs.amount,
      chainId: inputs.chainId,
      
      // Private inputs
      nullifier: inputs.nullifier,
      secret: inputs.secret,
      pathElements: inputs.pathElements.map(el => hexToDecimalString(el)),
      pathIndices: inputs.pathIndices
    };

    // In production, load these files:
    // const wasmPath = "/circuits/withdraw.wasm";
    // const zkeyPath = "/circuits/withdraw_final.zkey";
    
    // For now, generate a mock proof
    const mockProof = {
      pi_a: [
        "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, '0'),
        "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, '0')
      ],
      pi_b: [
        [
          "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, '0'),
          "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, '0')
        ],
        [
          "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, '0'),
          "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, '0')
        ]
      ],
      pi_c: [
        "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, '0'),
        "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, '0')
      ]
    };

    const publicSignals = [
      circuitInputs.root,
      circuitInputs.nullifierHash,
      circuitInputs.recipient,
      circuitInputs.relayer,
      circuitInputs.fee,
      circuitInputs.amount,
      circuitInputs.chainId
    ];

    // Convert to our expected format
    const proof = {
      a: mockProof.pi_a[0] + mockProof.pi_a[1].slice(2),
      b: mockProof.pi_b[0][0] + mockProof.pi_b[0][1].slice(2),
      c: mockProof.pi_c[0] + mockProof.pi_c[1].slice(2)
    };

    return {
      proof,
      publicSignals
    };

    // Production code:
    // const { proof, publicSignals } = await groth16.fullProve(
    //   circuitInputs,
    //   wasmPath,
    //   zkeyPath
    // );
    // 
    // return { proof, publicSignals };
  } catch (error) {
    console.error('Failed to generate proof:', error);
    throw new Error('Proof generation failed');
  }
}

// Verify a proof
export async function verifyProof(
  proof: ProofData['proof'],
  publicSignals: string[]
): Promise<boolean> {
  try {
    // In production, load the verification key
    // const vKey = await fetch('/circuits/verification_key.json').then(res => res.json());
    // return await groth16.verify(vKey, publicSignals, proof);
    
    // For development, return true
    return true;
  } catch (error) {
    console.error('Proof verification failed:', error);
    return false;
  }
}

// Helper to prepare withdrawal inputs
export function prepareWithdrawalInputs(
  depositData: {
    nullifier: string;
    secret: string;
    amount: string;
    chainId: string;
  },
  recipient: string,
  merkleRoot: string,
  merkleProof: string[],
  fee: string = "0"
): CircuitInputs {
  // Generate path indices (for a balanced tree, this determines left/right at each level)
  // In production, this should be calculated based on the leaf position
  const pathIndices = new Array(MERKLE_TREE_HEIGHT).fill(0).map(() => 
    Math.random() > 0.5 ? 1 : 0
  );
  
  // Ensure we have enough path elements
  const pathElements = [...merkleProof];
  while (pathElements.length < MERKLE_TREE_HEIGHT) {
    pathElements.push('0x' + '0'.repeat(64));
  }
  
  return {
    // Public inputs
    root: merkleRoot,
    nullifierHash: depositData.nullifier, // This should be hashed, but we're using it directly for now
    recipient: recipient,
    relayer: "0x0000000000000000000000000000000000000000", // No relayer for direct withdrawal
    fee: fee,
    amount: depositData.amount,
    chainId: depositData.chainId,
    
    // Private inputs
    nullifier: depositData.nullifier,
    secret: depositData.secret,
    pathElements: pathElements.slice(0, MERKLE_TREE_HEIGHT),
    pathIndices: pathIndices
  };
}
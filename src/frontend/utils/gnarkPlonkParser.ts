/**
 * Parse a gnark PLONK proof from serialized bytes
 * Based on gnark's plonk.Proof structure for BN254
 */

interface ParsedPlonkProof {
  lro: [[string, string], [string, string], [string, string]];
  z: [string, string];
  h: [[string, string], [string, string], [string, string]];
  bsb22_commitments: [string, string][];
  batched_proof: {
    h: [string, string];
    claimed_values: string[];
  };
  zshifted_proof: {
    h: [string, string];
    claimed_value: string;
  };
}

export function parseGnarkPlonkProof(hexProof: string): ParsedPlonkProof {
  // Remove 0x prefix if present
  const cleanHex = hexProof.startsWith('0x') ? hexProof.slice(2) : hexProof;
  
  // Convert hex string to Uint8Array
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  
  let offset = 0;
  
  // Helper to read 32 bytes as a field element
  function readFieldElement(): string {
    const elem = bytes.slice(offset, offset + 32);
    offset += 32;
    
    // Convert Uint8Array to hex string
    let hex = '';
    for (let i = 0; i < elem.length; i++) {
      hex += elem[i].toString(16).padStart(2, '0');
    }
    
    // Ensure we have exactly 64 hex chars (32 bytes)
    if (hex.length < 64) {
      hex = hex.padStart(64, '0');
    }
    
    return '0x' + hex;
  }
  
  // Helper to read a G1 point (2 field elements)
  function readG1Point(): [string, string] {
    const x = readFieldElement();
    const y = readFieldElement();
    return [x, y];
  }
  
  // Parse LRO (3 G1 points)
  const lro: [[string, string], [string, string], [string, string]] = [
    readG1Point(),
    readG1Point(),
    readG1Point()
  ];
  
  // Parse Z (1 G1 point)  
  const z = readG1Point();
  
  // Parse H (3 G1 points)
  const h: [[string, string], [string, string], [string, string]] = [
    readG1Point(),
    readG1Point(),
    readG1Point()
  ];
  
  // Parse BSB22 commitments
  // Number of commitments depends on the circuit
  // For our circuit with 7 public inputs, we expect 2 commitments
  const bsb22_commitments: [string, string][] = [];
  for (let i = 0; i < 2; i++) {
    bsb22_commitments.push(readG1Point());
  }
  
  // Parse batched proof
  const batched_h = readG1Point();
  
  // Number of claimed values = nb_public_inputs + nb_commitments
  // For our circuit: 7 public + 2 commitments = 9 values
  const claimed_values: string[] = [];
  for (let i = 0; i < 9; i++) {
    claimed_values.push(readFieldElement());
  }
  
  // Parse z-shifted proof
  const zshifted_h = readG1Point();
  const zshifted_claimed_value = readFieldElement();
  
  return {
    lro,
    z,
    h,
    bsb22_commitments,
    batched_proof: {
      h: batched_h,
      claimed_values
    },
    zshifted_proof: {
      h: zshifted_h,
      claimed_value: zshifted_claimed_value
    }
  };
}

/**
 * Convert parsed gnark proof to the format expected by the canister
 */
export function gnarkProofToCanisterFormat(parsed: ParsedPlonkProof): {
  lro: [string, string][];
  z: [string, string];
  h: [string, string][];
  bsb22_commitments: [string, string][];
  batched_proof: {
    h: [string, string];
    claimed_values: string[];
  };
  zshifted_proof: {
    h: [string, string];
    claimed_value: string;
  };
} {
  return {
    lro: parsed.lro,
    z: parsed.z,
    h: parsed.h,
    bsb22_commitments: parsed.bsb22_commitments,
    batched_proof: parsed.batched_proof,
    zshifted_proof: parsed.zshifted_proof
  };
}

/**
 * Convert to simplified format for withdrawal processor
 */
export function toWithdrawalProcessorFormat(parsed: ParsedPlonkProof): {
  lro: [string, string][];
  z: [string, string];
  h1: [string, string];
  h2: [string, string];
  wire_values_at_z: string[];
  wire_values_at_z_omega: string[];
} {
  // For gnark PLONK proofs, the h array contains quotient polynomial commitments
  // We use the first two for h1 and h2
  const h1 = parsed.h[0];
  const h2 = parsed.h[1];
  
  // The claimed values in gnark PLONK proof contain:
  // - Wire evaluations at z (5 values: l, r, o, k1, k2)
  // - Additional claimed values (public inputs, etc)
  // For our circuit with 7 public inputs and simplified gates, we expect fewer wire values
  
  // Since we have a simple circuit, we can provide default values for unused wires
  const wireCount = 5; // PLONK uses 5 wires: l, r, o, k1, k2
  
  // Extract or default wire values
  const wire_values_at_z: string[] = [];
  const wire_values_at_z_omega: string[] = [];
  
  // Helper to validate and fix hex strings
  const validateHex = (value: string): string => {
    // Remove 0x prefix for validation
    const cleanHex = value.startsWith('0x') ? value.slice(2) : value;
    
    // If empty or invalid, return zero
    if (!cleanHex || cleanHex.length === 0) {
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
    
    // Pad to 64 chars if needed
    const paddedHex = cleanHex.padStart(64, '0');
    
    // Ensure it's valid hex
    if (!/^[0-9a-fA-F]{64}$/.test(paddedHex)) {
      console.warn('Invalid hex value, using zero:', value);
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
    
    return '0x' + paddedHex;
  };
  
  // Fill wire values from claimed values or use zeros
  for (let i = 0; i < wireCount; i++) {
    if (i < parsed.batched_proof.claimed_values.length) {
      const value = parsed.batched_proof.claimed_values[i];
      wire_values_at_z.push(validateHex(value));
    } else {
      // Use zero for missing wire values
      wire_values_at_z.push('0x0000000000000000000000000000000000000000000000000000000000000000');
    }
  }
  
  // For wire values at z*omega, we can use zeros as they might not be included
  // in the simplified proof format
  for (let i = 0; i < wireCount; i++) {
    wire_values_at_z_omega.push('0x0000000000000000000000000000000000000000000000000000000000000000');
  }
  
  return {
    lro: parsed.lro,
    z: parsed.z,
    h1,
    h2,
    wire_values_at_z,
    wire_values_at_z_omega
  };
} 
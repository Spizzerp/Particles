import { PlonkProof, WitnessData } from './types';

// Load Go WASM runtime
declare global {
  interface Window {
    Go: any;
    particleFundProver: any;
  }
}

export interface ProverInputs {
  secret: string;
  nullifier: string;
  amount: string;
  merklePath: string[];
  merkleIndices: number[];
  merkleRoot: string;
  nullifierHash: string;
  recipient: string;
  relayer?: string;
  fee?: string;
  refund?: string;
}

export interface GeneratedProof {
  proof: {
    lro: [string, string][];
    z: [string, string];
    h1: [string, string];
    h2: [string, string];
    wire_values_at_z: string[];
    wire_values_at_z_omega: string[];
  };
  publicSignals: string[];
  nullifierHash: string;
  merkleRoot: string;
  amount: string;
}

class PlonkProverService {
  private static instance: PlonkProverService;
  private initialized = false;
  private go: any;
  private proverReady = false;

  private constructor() {}

  static getInstance(): PlonkProverService {
    if (!PlonkProverService.instance) {
      PlonkProverService.instance = new PlonkProverService();
    }
    return PlonkProverService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load wasm_exec.js if not already loaded
      if (!window.Go) {
        await this.loadScript('/wasm/wasm_exec.js');
      }

      // Initialize Go runtime
      this.go = new window.Go();

      // Fetch production WASM
      console.log('Loading production PLONK prover (20MB)...');
      const response = await fetch('/wasm/particlefund_production_real.wasm');
      if (!response.ok) {
        throw new Error('Failed to load PLONK prover WASM');
      }

      const buffer = await response.arrayBuffer();
      console.log('Instantiating WASM...');
      
      const result = await WebAssembly.instantiate(buffer, this.go.importObject);
      
      // Set up message capture
      this.setupMessageCapture();
      
      // Run WASM
      this.go.run(result.instance);
      
      // Wait for prover to be ready
      await this.waitForProver();
      
      // Initialize the prover
      if (window.particleFundProver && window.particleFundProver.initialize) {
        window.particleFundProver.initialize();
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for initialization
      }
      
      this.initialized = true;
      this.proverReady = true;
      console.log('PLONK prover initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PLONK prover:', error);
      throw error;
    }
  }

  private async loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  private setupMessageCapture(): void {
    // Capture messages from WASM
    const originalPostMessage = window.postMessage.bind(window);
    window.postMessage = (data: any) => {
      if (typeof data === 'string' && data.startsWith('{')) {
        try {
          const parsed = JSON.parse(data);
          console.log('WASM message:', parsed);
          // Store proof when generated
          if (parsed.proof) {
            (window as any).lastGeneratedProof = parsed;
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
      originalPostMessage(data, '*');
    };
  }

  private async waitForProver(): Promise<void> {
    let attempts = 0;
    while (!window.particleFundProver && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.particleFundProver) {
      throw new Error('PLONK prover not available after initialization');
    }
  }

  async generateProof(inputs: ProverInputs): Promise<GeneratedProof> {
    if (!this.proverReady) {
      throw new Error('PLONK prover not initialized');
    }

    console.log('Generating PLONK proof with inputs:', inputs);
    
    // Reset last generated proof
    (window as any).lastGeneratedProof = null;
    
    // Call prover
    window.particleFundProver.generateProof(JSON.stringify(inputs));
    
    // Wait for proof generation (up to 30 seconds)
    let attempts = 0;
    while (!(window as any).lastGeneratedProof && attempts < 300) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    const generatedProof = (window as any).lastGeneratedProof;
    if (!generatedProof) {
      throw new Error('Proof generation timeout');
    }
    
    if (!generatedProof.success) {
      throw new Error(generatedProof.error || 'Proof generation failed');
    }
    
    console.log('Proof generated successfully:', generatedProof);
    
    // Parse and validate the proof
    const proofData = generatedProof.proof;
    
    // Ensure all proof components are present
    if (!proofData.lro || !proofData.z || !proofData.h1 || !proofData.h2 || 
        !proofData.wire_values_at_z || !proofData.wire_values_at_z_omega) {
      throw new Error('Generated proof is missing required components');
    }
    
    return {
      proof: {
        lro: proofData.lro,
        z: proofData.z,
        h1: proofData.h1,
        h2: proofData.h2,
        wire_values_at_z: proofData.wire_values_at_z,
        wire_values_at_z_omega: proofData.wire_values_at_z_omega
      },
      publicSignals: proofData.publicSignals || [],
      nullifierHash: inputs.nullifierHash,
      merkleRoot: inputs.merkleRoot,
      amount: inputs.amount
    };
  }

  async generateWithdrawalProof(
    secret: string,
    nullifier: string,
    amount: string,
    recipient: string,
    merkleRoot: string,
    merklePath: string[],
    leafIndex: number
  ): Promise<GeneratedProof> {
    // Generate nullifier hash
    const nullifierHash = await this.computeNullifierHash(nullifier);
    
    // Convert leaf index to binary indices for merkle proof
    // The circuit expects indices from ROOT to LEAF (MSB first)
    const depth = merklePath.length;
    const merkleIndices: number[] = [];
    
    // Generate indices in MSB-first order
    for (let i = depth - 1; i >= 0; i--) {
      const bit = (leafIndex >> i) & 1;
      merkleIndices.push(bit);
    }
    
    console.log(`Leaf index ${leafIndex} converted to merkle indices:`, merkleIndices);
    
    // Convert amount to wei if it's in decimal format
    let amountInWei: string;
    if (amount.includes('.')) {
      // Assume ETH with 18 decimals
      amountInWei = Math.floor(parseFloat(amount) * Math.pow(10, 18)).toString();
    } else {
      amountInWei = amount;
    }
    
    // Ensure all hex values have 0x prefix
    const formatHex = (value: string): string => {
      return value.startsWith('0x') ? value : `0x${value}`;
    };
    
    // Helper to pad hex values to specified byte length
    const padHexToBytes = (hex: string, targetBytes: number): string => {
      let formatted = formatHex(hex);
      const hexWithoutPrefix = formatted.slice(2);
      
      // Fix odd-length hex strings
      if (hexWithoutPrefix.length % 2 === 1) {
        formatted = '0x0' + hexWithoutPrefix;
      }
      
      // Pad to target byte length
      const currentHexLength = formatted.slice(2).length;
      const targetHexLength = targetBytes * 2;
      if (currentHexLength < targetHexLength) {
        const paddingNeeded = targetHexLength - currentHexLength;
        formatted = '0x' + '0'.repeat(paddingNeeded) + formatted.slice(2);
      }
      
      return formatted;
    };
    
    // Pad secret to 32 bytes (31 bytes are padded to 32)
    const formattedSecret = padHexToBytes(secret, 32);
    if (formattedSecret !== formatHex(secret)) {
      console.log('Padded secret to 32 bytes:', formattedSecret);
    }
    
    // Pad nullifier to 32 bytes if it's 31 bytes
    let formattedNullifier = formatHex(nullifier);
    
    // Remove 0x prefix for length checking
    const hexWithoutPrefix = formattedNullifier.slice(2);
    
    // If hex string has odd length, pad with leading zero
    if (hexWithoutPrefix.length % 2 === 1) {
      formattedNullifier = '0x0' + hexWithoutPrefix;
      console.log('Padded odd-length nullifier:', formattedNullifier);
    }
    
    // Now check if it's less than 32 bytes (64 hex chars)
    const currentHexLength = formattedNullifier.slice(2).length;
    if (currentHexLength < 64) {
      // Pad with leading zeros to make it 32 bytes
      const paddingNeeded = 64 - currentHexLength;
      formattedNullifier = '0x' + '0'.repeat(paddingNeeded) + formattedNullifier.slice(2);
      console.log('Padded nullifier to 32 bytes:', formattedNullifier);
    }
    
    const inputs: ProverInputs = {
      secret: formattedSecret,
      nullifier: formattedNullifier,
      amount: amountInWei,
      merklePath: merklePath.map(formatHex),
      merkleIndices,
      merkleRoot: formatHex(merkleRoot),
      nullifierHash: formatHex(nullifierHash),
      recipient: formatHex(recipient),
      relayer: "0x0000000000000000000000000000000000000000",
      fee: "0",
      refund: "0"
    };
    
    // Debug log to check merkleRoot type
    console.log('Prover inputs:', {
      ...inputs,
      merkleRootType: typeof merkleRoot,
      merkleRootValue: merkleRoot,
      merkleRootIsArray: Array.isArray(merkleRoot)
    });
    
    return this.generateProof(inputs);
  }

  private async computeNullifierHash(nullifier: string): Promise<string> {
    // For privacy pools, nullifierHash = hash(nullifier)
    // The nullifier is a secret value, nullifierHash is what gets revealed
    
    console.log('Computing nullifier hash for:', nullifier);
    console.log('Nullifier length:', nullifier.length);
    
    // Handle nullifier with or without 0x prefix
    const cleanNullifier = nullifier.startsWith('0x') ? nullifier : `0x${nullifier}`;
    console.log('Clean nullifier:', cleanNullifier);
    console.log('Clean nullifier length:', cleanNullifier.length);
    
    // Fix odd-length hex strings
    let fixedNullifier = cleanNullifier;
    const hexWithoutPrefix = cleanNullifier.slice(2);
    if (hexWithoutPrefix.length % 2 === 1) {
      fixedNullifier = '0x0' + hexWithoutPrefix;
      console.log('Fixed odd-length nullifier:', fixedNullifier);
    }
    
    // Check if it's a valid hex value (31 or 32 bytes are both valid)
    // Old deposits might have 31 bytes, new ones have 32 bytes
    // 31 bytes = 62 hex chars, 32 bytes = 64 hex chars (plus 0x prefix)
    const hexLength = fixedNullifier.slice(2).length;
    const byteLength = hexLength / 2;
    const isValid31Bytes = byteLength === 31 && /^0x[0-9a-fA-F]+$/.test(fixedNullifier);
    const isValid32Bytes = byteLength === 32 && /^0x[0-9a-fA-F]+$/.test(fixedNullifier);
    
    console.log('Hex length:', hexLength, 'Byte length:', byteLength);
    console.log('Is valid 31 bytes:', isValid31Bytes);
    console.log('Is valid 32 bytes:', isValid32Bytes);
    
    if (isValid31Bytes || isValid32Bytes) {
      // Import the computeNullifierHash helper that uses MiMC
      const { computeNullifierHash } = await import('../utils/mimc');
      
      // Pad to 32 bytes by adding leading zeros
      let paddedNullifier = fixedNullifier;
      if (hexLength < 64) {
        const paddingNeeded = 64 - hexLength;
        paddedNullifier = '0x' + '0'.repeat(paddingNeeded) + fixedNullifier.slice(2);
        console.log('Padded nullifier to 32 bytes for hashing:', paddedNullifier);
      }
      
      // Use the helper function that matches the circuit
      const nullifierHashDecimal = computeNullifierHash(paddedNullifier);
      
      // Convert decimal result to hex format
      const nullifierHashBigInt = BigInt(nullifierHashDecimal);
      return '0x' + nullifierHashBigInt.toString(16).padStart(64, '0');
    }
    
    throw new Error('Invalid nullifier format - must be a 31 or 32-byte hex value');
  }

  isInitialized(): boolean {
    return this.initialized && this.proverReady;
  }
}

export const plonkProverService = PlonkProverService.getInstance();
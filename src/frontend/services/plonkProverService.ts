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
    const depth = merklePath.length;
    const merkleIndices: number[] = [];
    let index = leafIndex;
    for (let i = 0; i < depth; i++) {
      merkleIndices.push(index % 2);
      index = Math.floor(index / 2);
    }
    
    const inputs: ProverInputs = {
      secret,
      nullifier,
      amount,
      merklePath,
      merkleIndices,
      merkleRoot,
      nullifierHash,
      recipient,
      relayer: "0x0000000000000000000000000000000000000000",
      fee: "0",
      refund: "0"
    };
    
    return this.generateProof(inputs);
  }

  private async computeNullifierHash(nullifier: string): Promise<string> {
    // The nullifier should already be a hash from the deposit process
    // Validate it's a proper hash format
    if (nullifier.startsWith('0x') && nullifier.length === 66) {
      return nullifier;
    }
    
    throw new Error('Invalid nullifier format - must be a 32-byte hex hash');
  }

  isInitialized(): boolean {
    return this.initialized && this.proverReady;
  }
}

export const plonkProverService = PlonkProverService.getInstance();
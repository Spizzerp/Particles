import { PlonkProof, PlonkPublicSignals } from './zkProof';

// Web Worker for proof generation (to avoid blocking UI)
let proverWorker: Worker | null = null;

// WASM memory configuration for PLONK
const WASM_MEMORY_PAGES = 65536; // 4GB (65536 * 64KB)

export interface ProverConfig {
  wasmPath: string;
  provingKeyPath: string;
  constraintSystemPath: string;
  srsPath: string;
}

export interface WitnessInput {
  // Private inputs
  secret: string;
  nullifier: string;
  merklePath: string[];
  merkleIndices: number[];
  
  // Public inputs
  merkleRoot: string;
  nullifierHash: string;
  recipient: string;
  amount: string;
  relayer?: string;
  fee?: string;
  refund?: string;
}

export class PlonkProverService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  
  async initialize(config: ProverConfig): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._initialize(config);
    await this.initPromise;
    this.initialized = true;
  }
  
  private async _initialize(config: ProverConfig): Promise<void> {
    // Create Web Worker for proof generation
    proverWorker = new Worker(
      new URL('./plonkWorker.js', import.meta.url),
      { type: 'module' }
    );
    
    // Initialize the worker with WASM and keys
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Prover initialization timeout'));
      }, 60000); // 60 second timeout
      
      proverWorker!.onmessage = (event) => {
        if (event.data.type === 'initialized') {
          clearTimeout(timeout);
          resolve();
        } else if (event.data.type === 'error') {
          clearTimeout(timeout);
          reject(new Error(event.data.error));
        }
      };
      
      proverWorker!.postMessage({
        type: 'initialize',
        config: config,
        memoryPages: WASM_MEMORY_PAGES
      });
    });
  }
  
  async generateProof(witness: WitnessInput): Promise<{
    proof: PlonkProof;
    publicSignals: PlonkPublicSignals;
  }> {
    if (!this.initialized || !proverWorker) {
      throw new Error('Prover not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Proof generation timeout'));
      }, 300000); // 5 minute timeout
      
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'proof') {
          clearTimeout(timeout);
          proverWorker!.removeEventListener('message', messageHandler);
          
          // Parse the proof from the worker
          const proof = this.parseProof(event.data.proof);
          const publicSignals = event.data.publicSignals;
          
          resolve({ proof, publicSignals });
        } else if (event.data.type === 'error') {
          clearTimeout(timeout);
          proverWorker!.removeEventListener('message', messageHandler);
          reject(new Error(event.data.error));
        } else if (event.data.type === 'progress') {
          console.log('Proof generation progress:', event.data.message);
        }
      };
      
      proverWorker!.addEventListener('message', messageHandler);
      
      proverWorker!.postMessage({
        type: 'generateProof',
        witness: witness
      });
    });
  }
  
  private parseProof(proofHex: string): PlonkProof {
    // Parse the hex proof into our PlonkProof structure
    // This is a simplified version - actual parsing would need to match
    // the exact gnark serialization format
    
    const proofBytes = this.hexToBytes(proofHex);
    let offset = 0;
    
    // Read points (32 bytes each for compressed format)
    const readPoint = (): [string, string] => {
      const x = this.bytesToHex(proofBytes.slice(offset, offset + 32));
      offset += 32;
      // For compressed format, we only have x coordinate
      // y would be computed from x, but for now we'll use placeholder
      return [x, "0x0"];
    };
    
    // Read LRO commitments (3 points)
    const ar = readPoint();
    const bs = readPoint();
    const krs = readPoint();
    
    // Read Z commitment
    const z = readPoint();
    
    // Read H commitments (3 points)
    const h1 = readPoint();
    const h2 = readPoint();
    const h3 = readPoint();
    
    // Read batched proof
    const batchedH = readPoint();
    
    // Read claimed values length (4 bytes)
    const claimedValuesLen = new DataView(proofBytes.buffer, offset, 4).getUint32(0);
    offset += 4;
    
    // Read claimed values
    const claimedValues: string[] = [];
    for (let i = 0; i < claimedValuesLen; i++) {
      const value = this.bytesToHex(proofBytes.slice(offset, offset + 32));
      claimedValues.push(value);
      offset += 32;
    }
    
    // Read z shifted proof
    const zShiftedH = readPoint();
    const zShiftedValue = this.bytesToHex(proofBytes.slice(offset, offset + 32));
    offset += 32;
    
    // Read BSB22 commitments length (4 bytes)
    const bsb22Len = new DataView(proofBytes.buffer, offset, 4).getUint32(0);
    offset += 4;
    
    // Read BSB22 commitments
    const bsb22Commitments: Array<[string, string]> = [];
    for (let i = 0; i < bsb22Len; i++) {
      const point = readPoint();
      bsb22Commitments.push(point);
    }
    
    return {
      lro: [ar, bs, krs],  // L, R, O commitments
      z: z,
      h: [h1, h2, h3],     // h0, h1, h2
      batched_proof: {
        h: batchedH,
        claimed_values: claimedValues
      },
      zshifted_proof: {
        h: zShiftedH,
        claimed_value: zShiftedValue
      },
      bsb22_commitments: bsb22Commitments
    };
  }
  
  private hexToBytes(hex: string): Uint8Array {
    if (hex.startsWith('0x')) hex = hex.slice(2);
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }
  
  private bytesToHex(bytes: Uint8Array): string {
    return '0x' + Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  destroy() {
    if (proverWorker) {
      proverWorker.terminate();
      proverWorker = null;
    }
    this.initialized = false;
    this.initPromise = null;
  }
}

// Singleton instance
export const plonkProver = new PlonkProverService();
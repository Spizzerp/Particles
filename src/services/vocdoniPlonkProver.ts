/**
 * Vocdoni-style PLONK prover integration
 * This adapts Vocdoni's approach to work with our Particle Fund circuit
 */

import { PlonkProof, PlonkPublicSignals } from './zkProof';

// Web Worker for non-blocking proof generation
let proverWorker: Worker | null = null;

interface ProverConfig {
  wasmPath: string;
  wasmExecPath: string;
}

interface ProverMessage {
  type: 'init' | 'prove' | 'ready' | 'proof' | 'error';
  data?: any;
  error?: string;
}

class VocdoniPlonkProver {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  
  async initialize(config: ProverConfig): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._initialize(config);
    return this.initPromise;
  }
  
  private async _initialize(config: ProverConfig): Promise<void> {
    // Create Web Worker
    const workerCode = `
      let Go;
      let wasmModule;
      let proverReady = false;
      
      self.onmessage = async function(e) {
        const { type, data } = e.data;
        
        if (type === 'init') {
          try {
            // Load wasm_exec.js
            importScripts(data.wasmExecPath);
            
            // Initialize Go runtime
            Go = self.Go;
            const go = new Go();
            
            // Load WASM module
            const response = await fetch(data.wasmPath);
            const wasmBuffer = await response.arrayBuffer();
            
            // Instantiate with 4GB memory for PLONK
            const wasmMemory = new WebAssembly.Memory({
              initial: 65536, // 4GB initial (65536 * 64KB)
              maximum: 65536  // 4GB max
            });
            
            const importObject = go.importObject;
            importObject.env = importObject.env || {};
            importObject.env.memory = wasmMemory;
            
            const result = await WebAssembly.instantiate(wasmBuffer, importObject);
            wasmModule = result.instance;
            
            // Run Go program
            go.run(wasmModule);
            
            // Wait for prover to be ready
            setTimeout(() => {
              proverReady = true;
              self.postMessage({ type: 'ready' });
            }, 100);
            
          } catch (error) {
            self.postMessage({ 
              type: 'error', 
              error: 'Failed to initialize: ' + error.message 
            });
          }
        }
        
        if (type === 'prove') {
          if (!proverReady) {
            self.postMessage({ 
              type: 'error', 
              error: 'Prover not ready' 
            });
            return;
          }
          
          try {
            // Call the generateProof function exposed by WASM
            const result = self.generateProof(JSON.stringify(data));
            const response = JSON.parse(result);
            
            if (response.success) {
              // Parse the proof from base64
              const proofData = JSON.parse(atob(response.proof));
              
              self.postMessage({
                type: 'proof',
                data: {
                  proof: proofData,
                  publicSignals: response.publicSignals,
                  timeMs: response.timeMs
                }
              });
            } else {
              self.postMessage({
                type: 'error',
                error: response.error
              });
            }
          } catch (error) {
            self.postMessage({
              type: 'error',
              error: 'Proof generation failed: ' + error.message
            });
          }
        }
      };
    `;
    
    // Create worker from blob
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    proverWorker = new Worker(workerUrl);
    
    // Initialize worker
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 30000);
      
      proverWorker!.onmessage = (e: MessageEvent<ProverMessage>) => {
        if (e.data.type === 'ready') {
          clearTimeout(timeout);
          this.initialized = true;
          resolve();
        } else if (e.data.type === 'error') {
          clearTimeout(timeout);
          reject(new Error(e.data.error));
        }
      };
      
      proverWorker!.postMessage({
        type: 'init',
        data: config
      });
    });
  }
  
  async generateProof(inputs: {
    secret: string;
    nullifier: string;
    merklePath: string[];
    merkleIndices: number[];
    merkleRoot: string;
    nullifierHash: string;
    recipient: string;
    amount: string;
    relayer: string;
    fee: string;
    refund: string;
  }): Promise<{ proof: PlonkProof; publicSignals: PlonkPublicSignals }> {
    if (!this.initialized || !proverWorker) {
      throw new Error('Prover not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Proof generation timeout (5 minutes)'));
      }, 5 * 60 * 1000);
      
      const handler = (e: MessageEvent<ProverMessage>) => {
        if (e.data.type === 'proof') {
          clearTimeout(timeout);
          proverWorker!.removeEventListener('message', handler);
          
          const { proof, publicSignals, timeMs } = e.data.data;
          console.log(`Proof generated in ${timeMs}ms`);
          
          resolve({ proof, publicSignals });
        } else if (e.data.type === 'error') {
          clearTimeout(timeout);
          proverWorker!.removeEventListener('message', handler);
          reject(new Error(e.data.error));
        }
      };
      
      proverWorker!.addEventListener('message', handler);
      proverWorker!.postMessage({
        type: 'prove',
        data: inputs
      });
    });
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

// Export singleton instance
export const vocdoniPlonkProver = new VocdoniPlonkProver();
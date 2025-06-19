// Web Worker for PLONK proof generation
// This runs in a separate thread to avoid blocking the UI

let go = null;
let wasmModule = null;
let proverReady = false;

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, ...data } = event.data;
  
  switch (type) {
    case 'initialize':
      await initializeProver(data);
      break;
      
    case 'generateProof':
      await generateProof(data.witness);
      break;
      
    default:
      self.postMessage({
        type: 'error',
        error: `Unknown message type: ${type}`
      });
  }
};

async function initializeProver({ config, memoryPages }) {
  try {
    self.postMessage({ type: 'progress', message: 'Loading WASM runtime...' });
    
    // Import wasm_exec.js for TinyGo
    // This provides the Go runtime for WASM
    importScripts(config.wasmPath.replace('particle_fund_prover.wasm', 'wasm_exec.js'));
    
    // Initialize Go runtime
    go = new Go();
    
    // Configure memory
    go.importObject.env = go.importObject.env || {};
    go.importObject.env.memory = new WebAssembly.Memory({
      initial: memoryPages,
      maximum: memoryPages
    });
    
    self.postMessage({ type: 'progress', message: 'Loading WASM module...' });
    
    // Load WASM module
    const response = await fetch(config.wasmPath);
    const wasmBuffer = await response.arrayBuffer();
    
    self.postMessage({ type: 'progress', message: 'Instantiating WASM...' });
    
    const result = await WebAssembly.instantiate(wasmBuffer, go.importObject);
    wasmModule = result.instance;
    
    // Run the Go program
    go.run(wasmModule);
    
    self.postMessage({ type: 'progress', message: 'Loading proving keys...' });
    
    // Load proving key, constraint system, and SRS
    const [pkResponse, ccsResponse, srsResponse] = await Promise.all([
      fetch(config.provingKeyPath),
      fetch(config.constraintSystemPath),
      fetch(config.srsPath)
    ]);
    
    const [pkData, ccsData, srsData] = await Promise.all([
      pkResponse.arrayBuffer(),
      ccsResponse.arrayBuffer(),
      srsResponse.arrayBuffer()
    ]);
    
    // Initialize the prover with keys
    if (global.particleFundProver && global.particleFundProver.initialize) {
      self.postMessage({ type: 'progress', message: 'Initializing prover...' });
      
      await new Promise((resolve, reject) => {
        // Set up message handler for initialization response
        global.onmessage = (msgString) => {
          try {
            const msg = JSON.parse(msgString);
            if (msg.success) {
              resolve();
            } else {
              reject(new Error(msg.error));
            }
          } catch (e) {
            reject(e);
          }
        };
        
        // Call initialize
        global.particleFundProver.initialize({
          provingKey: new Uint8Array(pkData),
          constraintSystem: new Uint8Array(ccsData),
          srs: new Uint8Array(srsData)
        });
      });
      
      proverReady = true;
      self.postMessage({ type: 'initialized' });
    } else {
      throw new Error('Prover functions not found in WASM module');
    }
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: `Initialization failed: ${error.message}`
    });
  }
}

async function generateProof(witness) {
  if (!proverReady) {
    self.postMessage({
      type: 'error',
      error: 'Prover not initialized'
    });
    return;
  }
  
  try {
    self.postMessage({ type: 'progress', message: 'Starting proof generation...' });
    
    const startTime = Date.now();
    
    // Generate proof using WASM
    await new Promise((resolve, reject) => {
      // Set up message handler for proof response
      global.onmessage = (msgString) => {
        try {
          const msg = JSON.parse(msgString);
          if (msg.success) {
            const elapsed = Date.now() - startTime;
            self.postMessage({
              type: 'progress',
              message: `Proof generated in ${elapsed}ms`
            });
            
            self.postMessage({
              type: 'proof',
              proof: msg.proof,
              publicSignals: msg.publicSignals
            });
            
            resolve();
          } else {
            reject(new Error(msg.error));
          }
        } catch (e) {
          reject(e);
        }
      };
      
      // Call generateProof
      const witnessJson = JSON.stringify({
        secret: witness.secret,
        nullifier: witness.nullifier,
        merklePath: witness.merklePath,
        merkleIndices: witness.merkleIndices,
        merkleRoot: witness.merkleRoot,
        nullifierHash: witness.nullifierHash,
        recipient: witness.recipient,
        amount: witness.amount,
        relayer: witness.relayer || '0x0000000000000000000000000000000000000000',
        fee: witness.fee || '0',
        refund: witness.refund || '0'
      });
      
      global.particleFundProver.generateProof(witnessJson);
    });
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: `Proof generation failed: ${error.message}`
    });
  }
}
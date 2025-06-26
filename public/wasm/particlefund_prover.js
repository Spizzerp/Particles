// ParticleFund Production WASM Wrapper
class ParticleFundProver {
    constructor() {
        this.go = null;
        this.instance = null;
        this.ready = false;
    }

    async init() {
        if (this.ready) return;

        // Initialize Go WASM runtime
        this.go = new Go();
        
        // Fetch and instantiate WASM
        const response = await fetch('/wasm/particlefund_prover.wasm');
        const buffer = await response.arrayBuffer();
        
        const result = await WebAssembly.instantiate(buffer, this.go.importObject);
        this.instance = result.instance;
        
        // Run WASM
        this.go.run(this.instance);
        
        // Wait for WASM to be ready
        await this.waitForReady();
        
        this.ready = true;
    }

    async waitForReady() {
        // Wait for global functions to be available
        let attempts = 0;
        while (attempts < 50) {
            // Check for Step 5 functions
            if (window.generateProof && window.getCircuitInfo) {
                console.log('Step 5 WASM functions available:', {
                    generateProof: typeof window.generateProof,
                    getCircuitInfo: typeof window.getCircuitInfo,
                    buildTestTree: typeof window.buildTestTree
                });
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (attempts >= 50) {
            console.error('WASM functions not available. Found:', Object.keys(window).filter(k => 
                k.includes('generate') || k.includes('proof') || k.includes('circuit')
            ));
            throw new Error('WASM functions not available after initialization');
        }
    }

    getCircuitInfo() {
        if (!this.ready) throw new Error('Prover not initialized');
        
        // Call WASM function if available
        if (window.getCircuitInfo) {
            try {
                const infoJson = window.getCircuitInfo();
                return JSON.parse(infoJson);
            } catch (e) {
                console.error('Error parsing circuit info:', e);
            }
        }
        
        // Default info
        return {
            name: "Particle Fund Withdrawal Circuit (Step 5)",
            constraints: 17577,
            publicInputs: 7,
            version: "production"
        };
    }

    async computeCommitment(secret, nullifier, amount) {
        if (!this.ready) throw new Error('Prover not initialized');
        
        if (window.computeCommitment) {
            return window.computeCommitment(secret, nullifier, amount);
        }
        
        // Placeholder
        return "0x" + "0".repeat(64);
    }

    async computeNullifierHash(nullifier) {
        if (!this.ready) throw new Error('Prover not initialized');
        
        if (window.computeNullifierHash) {
            return window.computeNullifierHash(nullifier);
        }
        
        // Placeholder
        return "0x" + "1".repeat(64);
    }

    async generateWithdrawalProof(inputs) {
        if (!this.ready) throw new Error('Prover not initialized');
        
        if (!window.generateProof) {
            throw new Error('generateProof function not available');
        }
        
        // Convert inputs to JSON string for WASM
        const inputsJson = JSON.stringify(inputs);
        
        console.log('Calling Step 5 generateProof with inputs:', inputsJson);
        
        try {
            // Call Step 5 WASM function
            const resultString = window.generateProof(inputsJson);
            
            console.log('WASM returned:', resultString);
            
            // Check for error
            if (resultString.startsWith('Error:')) {
                throw new Error(resultString);
            }
            
            // Parse the result
            const result = JSON.parse(resultString);
            
            // Convert Step 5 format to our expected format
            return {
                proof: result.proof,
                publicSignals: result.publicSignals
            };
        } catch (e) {
            console.error('Error calling WASM function:', e);
            throw e;
        }
    }
}

// Export for use
window.ParticleFundProver = ParticleFundProver;
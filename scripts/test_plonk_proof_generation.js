#!/usr/bin/env node

const { readFileSync, writeFileSync } = require('fs');
const { spawn } = require('child_process');
const path = require('path');

async function testPlonkProofGeneration() {
    console.log('🧪 Testing PLONK Proof Generation with Test Data\n');
    
    try {
        // Load the generated test data
        const testData = JSON.parse(readFileSync('./test_data.json', 'utf8'));
        const witnessData = JSON.parse(readFileSync('./witness.json', 'utf8'));
        
        console.log('📊 Test Data Loaded:');
        console.log('- Commitment:', testData.deposit.commitment);
        console.log('- Nullifier Hash:', testData.withdrawal.nullifierHash);
        console.log('- Merkle Root:', testData.withdrawal.merkleRoot);
        console.log('- Amount:', testData.deposit.amount, 'wei');
        console.log('\n');
        
        // Create a simple HTML file to test locally
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>PLONK Proof Test</title>
</head>
<body>
    <h1>Testing PLONK Proof Generation</h1>
    <div id="status">Loading...</div>
    <pre id="output"></pre>
    
    <script src="/wasm/wasm_exec.js"></script>
    <script>
        const witnessData = ${JSON.stringify(witnessData, null, 2)};
        
        async function testProof() {
            const output = document.getElementById('output');
            const status = document.getElementById('status');
            
            try {
                status.textContent = 'Loading WASM...';
                
                const go = new Go();
                const response = await fetch('/wasm/particlefund_production_real.wasm');
                const buffer = await response.arrayBuffer();
                const result = await WebAssembly.instantiate(buffer, go.importObject);
                
                // Set up message capture
                let proofResult = null;
                window.addEventListener('message', (event) => {
                    if (typeof event.data === 'string' && event.data.startsWith('{')) {
                        try {
                            const parsed = JSON.parse(event.data);
                            if (parsed.proof) {
                                proofResult = parsed;
                            }
                        } catch (e) {}
                    }
                });
                
                go.run(result.instance);
                
                // Wait for prover
                let attempts = 0;
                while (!window.particleFundProver && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (!window.particleFundProver) {
                    throw new Error('Prover not available');
                }
                
                status.textContent = 'Initializing prover...';
                window.particleFundProver.initialize();
                
                // Wait a bit for initialization
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                status.textContent = 'Generating proof...';
                
                // Convert witness data to test inputs format
                const testInputs = {
                    secret: witnessData.Secret,
                    nullifier: witnessData.Nullifier,
                    amount: witnessData.Amount,
                    merklePath: witnessData.MerklePath,
                    merkleIndices: witnessData.MerkleIndices.map(idx => parseInt(idx)),
                    merkleRoot: witnessData.MerkleRoot,
                    nullifierHash: witnessData.NullifierHash,
                    recipient: witnessData.Recipient,
                    relayer: witnessData.Relayer,
                    fee: witnessData.Fee,
                    refund: witnessData.Refund
                };
                
                window.particleFundProver.generateProof(JSON.stringify(testInputs));
                
                // Wait for proof
                attempts = 0;
                while (!proofResult && attempts < 300) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (!proofResult) {
                    throw new Error('Proof generation timeout');
                }
                
                if (proofResult.success) {
                    status.textContent = '✅ Proof generated successfully!';
                    output.textContent = JSON.stringify(proofResult, null, 2);
                    
                    // Save the proof for further analysis
                    const proofData = {
                        proof: proofResult.proof,
                        publicSignals: proofResult.publicSignals,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Send to parent if in iframe
                    if (window.parent !== window) {
                        window.parent.postMessage({ type: 'proofGenerated', data: proofData }, '*');
                    }
                } else {
                    throw new Error(proofResult.error || 'Proof generation failed');
                }
                
            } catch (error) {
                status.textContent = '❌ Error: ' + error.message;
                output.textContent = error.stack || error.toString();
            }
        }
        
        testProof();
    </script>
</body>
</html>`;
        
        writeFileSync('./public/test_plonk_standalone.html', htmlContent);
        console.log('✅ Created test HTML file: public/test_plonk_standalone.html');
        
        console.log('\n📋 Next steps:');
        console.log('1. Start a local server: python3 -m http.server 8080');
        console.log('2. Open: http://localhost:8080/public/test_plonk_standalone.html');
        console.log('3. Watch the browser console for results');
        console.log('\nThe test will attempt to generate a PLONK proof using the test witness data.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testPlonkProofGeneration();
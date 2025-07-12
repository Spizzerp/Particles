#!/usr/bin/env node

const fetch = require('node-fetch');
const crypto = require('crypto');

async function verifyWasmCache() {
  console.log('Verifying WASM cache...\n');
  
  try {
    // Try to fetch WASM from local dev server
    const url = 'http://localhost:5173/wasm/particlefund_production_real.wasm';
    console.log(`Fetching WASM from ${url}...`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
      console.log('\nMake sure the frontend dev server is running: npm run dev');
      return;
    }
    
    const buffer = await response.buffer();
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    console.log(`\nWASM file size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`SHA256: ${hash}`);
    
    // Check if this is the new WASM
    const expectedHash = 'd665a5462e5a162defb26d40018a17eb965d4f188f9081e6d2d9ee05d77d1995';
    if (hash === expectedHash) {
      console.log('\n✅ WASM is correctly updated with new proving key!');
    } else {
      console.log('\n❌ WASM is still using old version!');
      console.log('Expected hash:', expectedHash);
      console.log('\nTo fix browser cache:');
      console.log('1. Open Chrome DevTools (F12)');
      console.log('2. Right-click the reload button');
      console.log('3. Select "Empty Cache and Hard Reload"');
      console.log('4. Or in DevTools Network tab, check "Disable cache"');
    }
    
    // Check build ID
    const wasmText = buffer.slice(0, 1000).toString('binary');
    const buildIdMatch = wasmText.match(/Go build ID: "([^"]+)"/);
    if (buildIdMatch) {
      console.log('\nBuild ID:', buildIdMatch[1]);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nMake sure the frontend dev server is running: npm run dev');
  }
}

verifyWasmCache();
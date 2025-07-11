#!/usr/bin/env node

// Test raw EVM RPC responses to understand the format

const https = require('https');

function makeRpcRequest(url, method, params = []) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const data = JSON.stringify({
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: 1
        });

        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const json = JSON.parse(responseData);
                    resolve(json);
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${responseData}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function testRawResponses() {
    const rpcs = [
        'https://ethereum.publicnode.com',
        'https://rpc.ankr.com/eth',
        'https://eth-mainnet.public.blastapi.io'
    ];

    for (const rpc of rpcs) {
        console.log(`\n========== Testing ${rpc} ==========\n`);

        try {
            // Test 1: eth_gasPrice
            console.log('1. eth_gasPrice:');
            const gasPriceResponse = await makeRpcRequest(rpc, 'eth_gasPrice');
            console.log('   Raw response:', JSON.stringify(gasPriceResponse, null, 2));
            if (gasPriceResponse.result) {
                const gasPrice = BigInt(gasPriceResponse.result);
                console.log(`   Parsed: ${gasPrice} wei (${gasPrice / 1000000000n} gwei)`);
            }

            // Test 2: eth_feeHistory
            console.log('\n2. eth_feeHistory:');
            const feeHistoryResponse = await makeRpcRequest(rpc, 'eth_feeHistory', ['0x5', 'latest', [25]]);
            console.log('   Raw response:', JSON.stringify(feeHistoryResponse, null, 2));
            
            if (feeHistoryResponse.result) {
                const history = feeHistoryResponse.result;
                console.log(`   Base fees count: ${history.baseFeePerGas ? history.baseFeePerGas.length : 0}`);
                console.log(`   Rewards count: ${history.reward ? history.reward.length : 0}`);
                
                if (history.baseFeePerGas && history.baseFeePerGas.length > 0) {
                    const latestBaseFee = BigInt(history.baseFeePerGas[history.baseFeePerGas.length - 1]);
                    console.log(`   Latest base fee: ${latestBaseFee} wei (${latestBaseFee / 1000000000n} gwei)`);
                }
            }

            // Test 3: eth_getBalance (to test hex response format)
            console.log('\n3. eth_getBalance (0x0000...):');
            const balanceResponse = await makeRpcRequest(rpc, 'eth_getBalance', ['0x0000000000000000000000000000000000000000', 'latest']);
            console.log('   Raw response:', JSON.stringify(balanceResponse, null, 2));

        } catch (e) {
            console.log(`   ERROR: ${e.message}`);
        }
    }
}

testRawResponses().catch(console.error);
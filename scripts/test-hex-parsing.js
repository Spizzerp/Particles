#!/usr/bin/env node

// Test hex parsing edge cases that might cause issues

function hexToNat(hex) {
    let cleanHex = hex;
    if (cleanHex.startsWith('0x')) {
        cleanHex = cleanHex.slice(2);
    }
    
    let result = 0;
    for (let char of cleanHex) {
        result = result * 16;
        switch (char.toLowerCase()) {
            case '0': result += 0; break;
            case '1': result += 1; break;
            case '2': result += 2; break;
            case '3': result += 3; break;
            case '4': result += 4; break;
            case '5': result += 5; break;
            case '6': result += 6; break;
            case '7': result += 7; break;
            case '8': result += 8; break;
            case '9': result += 9; break;
            case 'a': result += 10; break;
            case 'b': result += 11; break;
            case 'c': result += 12; break;
            case 'd': result += 13; break;
            case 'e': result += 14; break;
            case 'f': result += 15; break;
            default: 
                console.log(`Invalid hex character: ${char}`);
                return 0;
        }
    }
    return result;
}

// Test cases that might cause issues
const testCases = [
    // Valid cases
    { input: '0x0', expected: 0 },
    { input: '0x00', expected: 0 },
    { input: '0x1', expected: 1 },
    { input: '0x10', expected: 16 },
    { input: '0x100', expected: 256 },
    { input: '0x174876e800', expected: 100000000000 }, // 100 gwei
    { input: '0x1b6588d8', expected: 459639000 }, // ~0.46 gwei
    
    // Edge cases
    { input: '', expected: 0 },
    { input: '0x', expected: 0 },
    { input: '0X1', expected: 1 }, // uppercase X
    { input: '0x0000000000', expected: 0 },
    { input: '0xFFFFFFFF', expected: 4294967295 },
    
    // Invalid cases
    { input: '0xG', expected: 0 }, // invalid hex char
    { input: 'not-hex', expected: 0 },
    { input: null, expected: 0 },
    { input: undefined, expected: 0 },
];

console.log('Testing hex parsing...\n');

for (const test of testCases) {
    try {
        const result = hexToNat(test.input || '');
        const passed = result === test.expected;
        console.log(`Input: ${JSON.stringify(test.input)} => ${result} ${passed ? '✓' : `✗ (expected ${test.expected})`}`);
    } catch (e) {
        console.log(`Input: ${JSON.stringify(test.input)} => ERROR: ${e.message}`);
    }
}

// Test JSON extraction
console.log('\n\nTesting JSON extraction...\n');

function extractResultFromJson(json) {
    const parts = json.split('"result":');
    if (parts.length < 2) return '';
    
    const resultPart = parts[1].trim();
    if (resultPart.startsWith('"')) {
        const valueParts = resultPart.split('"');
        if (valueParts.length > 1) {
            return valueParts[1];
        }
    }
    return '';
}

const jsonTestCases = [
    { 
        input: '{"jsonrpc":"2.0","id":1,"result":"0x1b6588d8"}',
        expected: '0x1b6588d8'
    },
    {
        input: '{"jsonrpc":"2.0","id":1,"result":"0x0"}',
        expected: '0x0'
    },
    {
        input: '{"jsonrpc":"2.0","id":1,"result":""}',
        expected: ''
    },
    {
        input: '{"jsonrpc":"2.0","id":1,"error":{"code":-32000,"message":"error"}}',
        expected: ''
    },
    {
        input: '{"result":"0x123"}',
        expected: '0x123'
    },
    {
        input: 'not json',
        expected: ''
    }
];

for (const test of jsonTestCases) {
    const result = extractResultFromJson(test.input);
    const passed = result === test.expected;
    console.log(`JSON: ${test.input.substring(0, 50)}... => "${result}" ${passed ? '✓' : `✗ (expected "${test.expected}")`}`);
}

// Test the full flow
console.log('\n\nTesting full gas price extraction flow...\n');

function fullGasPriceExtraction(jsonResponse) {
    const hexValue = extractResultFromJson(jsonResponse);
    console.log(`  Extracted hex: ${hexValue}`);
    
    const natValue = hexValue ? hexToNat(hexValue) : 0;
    console.log(`  Parsed to nat: ${natValue}`);
    
    if (natValue === 0) {
        console.log(`  WARNING: Gas price is 0!`);
    }
    
    return natValue;
}

const realResponses = [
    '{"jsonrpc":"2.0","id":1,"result":"0x1b6588d8"}', // Real gas price response
    '{"jsonrpc":"2.0","id":1,"result":"0x0"}', // Zero response
    '{"jsonrpc":"2.0","id":1,"result":""}', // Empty response
];

for (const response of realResponses) {
    console.log(`\nProcessing: ${response}`);
    const gasPrice = fullGasPriceExtraction(response);
    console.log(`  Final gas price: ${gasPrice} wei (${gasPrice / 1e9} gwei)`);
}
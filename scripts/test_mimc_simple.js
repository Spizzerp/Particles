const crypto = require('crypto');

// BN254 field modulus
const p = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

// First few round constants
const roundConstants = [
    "227063593160049201514509818732644766896230235191445544141110657236065169432",
    "14216930871394413475885543358391969001796912808625170576412941718425727480905",
    "13091462576550089354261023627641753004926491134347784566278243144585841078417"
];

// Simple test of the MiMC block cipher
function testBlockCipher() {
    // Test with x=1, k=0 (matching Rust test)
    let x = BigInt(1);
    let k = BigInt(0);
    
    let state = (x + k) % p;
    console.log('Initial state (x + k):', state.toString());
    
    // First round only
    const c0 = BigInt(roundConstants[0]);
    state = (state + c0) % p;
    console.log('After adding c0:', state.toString());
    
    // x^5 = x * x^4 = x * (x^2)^2
    const x2 = (state * state) % p;
    const x4 = (x2 * x2) % p;
    state = (state * x4) % p;
    console.log('After x^5:', state.toString());
    
    state = (state + k) % p;
    console.log('After adding k:', state.toString());
    
    // Compare with expected
    console.log('\nFor comparison, hash(1) should eventually be:');
    console.log('Hex: 27e5458b666ef581475a9acddbc3524ca252185cae3936506e65cda9c358222b');
    console.log('Decimal:', BigInt('0x27e5458b666ef581475a9acddbc3524ca252185cae3936506e65cda9c358222b').toString());
}

testBlockCipher();
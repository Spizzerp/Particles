// Parse the deposit data from the user's console log
const depositDataStr = `{
    "commitment": "0x018dec1ce59e643f49f9900a72d7bb32308ac9886021933f5ae2a4e372e536db",
    "secret": "0x0970884fb517bf72bd25977c533017656f91d06256f6785f6ef28e96d805c97b",
    "nullifier": "0x0ac721ea4deb2c63c6db6f91271c29dda55983966507f1425f84a04f421acc43",
    "nullifierHash": "0x260eea25e5b9c98f83989d1a1f5b60aca3d50ced66164ac5019e969dbde2e748",
    "amount": "0.005",
    "amountWei": "5000000000000000",
    "token": "ETH",
    "chain": "ETH",
    "address": "0x0fa7591dce1669d7a2c8ba8f92e59865d36ad4e4",
    "depositId": "1",
    "leafIndex": "0"
}`;

const depositData = JSON.parse(depositDataStr);

console.log('\n=== USER DEPOSIT DATA ANALYSIS ===\n');
console.log('Commitment:', depositData.commitment);
console.log('Secret:', depositData.secret);
console.log('Nullifier:', depositData.nullifier);
console.log('Nullifier Hash:', depositData.nullifierHash);
console.log('Amount:', depositData.amount, depositData.token);
console.log('Amount (wei):', depositData.amountWei);
console.log('Deposit ID:', depositData.depositId);
console.log('Leaf Index:', depositData.leafIndex);

console.log('\n⚠️  ISSUE FOUND:');
console.log('- Deposit ID is "1" but should be "0" (based on canister data)');
console.log('- This mismatch is causing the withdrawal to fail');

console.log('\n📝 CORRECTED DEPOSIT DATA:');
const correctedData = {
    ...depositData,
    depositId: "0",
    leafIndex: "0"
};

console.log(JSON.stringify(correctedData, null, 2));

console.log('\n✅ Use the corrected data above for withdrawal'); 
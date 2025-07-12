const { Actor, HttpAgent } = require('@dfinity/agent');
const { IDL } = require('@dfinity/candid');
const { Principal } = require('@dfinity/principal');

// Setup agent
const agent = new HttpAgent({
  host: 'https://ic0.app',
});

// Deposit Manager V2 IDL
const depositManagerIDL = ({ IDL }) => {
  const DepositResult = IDL.Record({
    depositId: IDL.Nat,
    leafIndex: IDL.Nat,
    merkleRoot: IDL.Text,
  });
  
  const Deposit = IDL.Record({
    id: IDL.Nat,
    user: IDL.Principal,
    amount: IDL.Nat,
    tokenId: IDL.Text,
    chainId: IDL.Nat,
    commitment: IDL.Text,
    timestamp: IDL.Int,
    leafIndex: IDL.Nat,
  });
  
  return IDL.Service({
    getDeposit: IDL.Func([IDL.Nat], [IDL.Opt(Deposit)], ['query']),
    getAllDeposits: IDL.Func([], [IDL.Vec(Deposit)], ['query']),
    getTotalDeposits: IDL.Func([], [IDL.Nat], ['query']),
    getCurrentMerkleRoot: IDL.Func([], [IDL.Text], ['query']),
    getMerkleProof: IDL.Func([IDL.Nat], [IDL.Variant({ ok: IDL.Vec(IDL.Text), err: IDL.Text })], ['query']),
    getCommitmentsInOrder: IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
  });
};

async function debugMerkleTree() {
  const canisterId = 'rfun2-iaaaa-aaaac-qa7wq-cai'; // deposit_manager_v2
  const depositManager = Actor.createActor(depositManagerIDL, {
    agent,
    canisterId,
  });

  console.log('\n=== DEBUGGING MERKLE TREE ===\n');
  
  try {
    // Get total deposits
    const totalDeposits = await depositManager.getTotalDeposits();
    console.log('Total deposits:', totalDeposits.toString());
    
    // Get current merkle root
    const merkleRoot = await depositManager.getCurrentMerkleRoot();
    console.log('Current merkle root:', merkleRoot);
    
    // Get all deposits
    const allDeposits = await depositManager.getAllDeposits();
    console.log('\nDeposits in the system:');
    for (const deposit of allDeposits) {
      console.log(`  Deposit ${deposit.id}:`);
      console.log(`    - Commitment: ${deposit.commitment}`);
      console.log(`    - Leaf Index: ${deposit.leafIndex}`);
      console.log(`    - Amount: ${deposit.amount} ${deposit.tokenId}`);
    }
    
    // Get commitments in order
    const commitments = await depositManager.getCommitmentsInOrder();
    console.log('\nCommitments in order:');
    commitments.forEach((c, i) => {
      console.log(`  [${i}]: ${c}`);
    });
    
    // Test merkle proofs for each deposit
    console.log('\nTesting merkle proofs:');
    for (const deposit of allDeposits) {
      console.log(`\n  Deposit ID ${deposit.id} (leafIndex: ${deposit.leafIndex}):`);
      
      const proofResult = await depositManager.getMerkleProof(deposit.id);
      
      if ('ok' in proofResult) {
        const proof = proofResult.ok;
        console.log(`    Proof length: ${proof.length}`);
        console.log('    Proof elements:');
        proof.forEach((elem, i) => {
          console.log(`      [${i}]: ${elem}`);
        });
        
        // Check if the proof contains the commitment itself
        if (proof.length > 0 && proof[0] === deposit.commitment) {
          console.log('    ⚠️  WARNING: Proof contains the commitment itself as first element!');
        }
      } else {
        console.log(`    Error: ${proofResult.err}`);
      }
    }
    
    // Check specific commitment from the logs
    const targetCommitment = '0x018dec1ce59e643f49f9900a72d7bb32308ac9886021933f5ae2a4e372e536db';
    console.log(`\nLooking for commitment: ${targetCommitment}`);
    
    const matchingDeposit = allDeposits.find(d => d.commitment === targetCommitment);
    if (matchingDeposit) {
      console.log('Found matching deposit:');
      console.log('  - Deposit ID:', matchingDeposit.id.toString());
      console.log('  - Leaf Index:', matchingDeposit.leafIndex.toString());
      console.log('  - User:', matchingDeposit.user.toString());
      
      // Get its proof
      const proofResult = await depositManager.getMerkleProof(matchingDeposit.id);
      if ('ok' in proofResult) {
        console.log('  - Merkle proof:', proofResult.ok);
      }
    } else {
      console.log('Commitment not found in deposits!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the debug
debugMerkleTree().catch(console.error); 
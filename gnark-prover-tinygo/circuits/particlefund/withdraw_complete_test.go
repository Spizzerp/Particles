package particlefund

import (
    "math/big"
    "testing"
    
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark-crypto/hash"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/r1cs"
    "github.com/consensys/gnark/test"
)

// Helper to convert big.Int to 32-byte array
func to32BytesTest(n *big.Int) []byte {
    bytes := n.Bytes()
    if len(bytes) > 32 {
        return bytes[len(bytes)-32:]
    }
    padded := make([]byte, 32)
    copy(padded[32-len(bytes):], bytes)
    return padded
}

// Helper function to build a 20-level Merkle tree with amount in commitment
func buildCompleteTree(secret, nullifier, amount frontend.Variable, leafIndex int) (root frontend.Variable, path [20]frontend.Variable) {
    // Compute commitment = hash(secret, nullifier, amount)
    h := hash.MIMC_BN254.New()
    h.Write(to32BytesTest(secret.(*big.Int)))
    h.Write(to32BytesTest(nullifier.(*big.Int)))
    h.Write(to32BytesTest(amount.(*big.Int)))
    commitmentBytes := h.Sum(nil)
    commitment := new(big.Int).SetBytes(commitmentBytes)
    
    // Initialize path with dummy values
    for i := 0; i < 20; i++ {
        path[i] = big.NewInt(int64(i * 1000 + 42))
    }
    
    // Compute root by hashing up from the commitment
    currentHash := commitment
    currentIdx := leafIndex
    
    for level := 0; level < 20; level++ {
        h := hash.MIMC_BN254.New()
        
        if currentIdx&1 == 0 {
            h.Write(to32BytesTest(currentHash))
            h.Write(to32BytesTest(path[level].(*big.Int)))
        } else {
            h.Write(to32BytesTest(path[level].(*big.Int)))
            h.Write(to32BytesTest(currentHash))
        }
        
        hashBytes := h.Sum(nil)
        currentHash = new(big.Int).SetBytes(hashBytes)
        currentIdx = currentIdx / 2
    }
    
    root = currentHash
    return root, path
}

func TestCompleteWithdrawCircuit(t *testing.T) {
    // Test values
    secret := big.NewInt(123456789)
    nullifier := big.NewInt(987654321)
    amount := big.NewInt(1000000) // 1M units
    leafIndex := 524287 // Middle of tree
    
    // Withdrawal parameters
    recipient, _ := new(big.Int).SetString("1234567890123456", 16) // Mock address
    relayer, _ := new(big.Int).SetString("9876543210987654", 16)   // Mock relayer
    fee := big.NewInt(10000)                                       // 1% fee
    
    // Compute nullifier hash
    h2 := hash.MIMC_BN254.New()
    h2.Write(to32BytesTest(nullifier))
    nullifierHashBytes := h2.Sum(nil)
    nullifierHash := new(big.Int).SetBytes(nullifierHashBytes)
    
    // Build Merkle tree with amount
    root, merklePath := buildCompleteTree(secret, nullifier, amount, leafIndex)
    
    // Create witness
    witness := CompleteWithdrawCircuit{
        MerkleRoot:    root,
        NullifierHash: nullifierHash,
        Recipient:     recipient,
        Relayer:       relayer,
        Fee:           fee,
        Amount:        amount,
        Secret:        secret,
        Nullifier:     nullifier,
        LeafIndex:     big.NewInt(int64(leafIndex)),
        MerklePath:    merklePath,
    }
    
    // Test with test engine
    assert := test.NewAssert(t)
    assert.ProverSucceeded(&CompleteWithdrawCircuit{}, &witness, test.WithCurves(ecc.BN254))
}

func TestCompleteWithdrawCircuitSelfWithdrawal(t *testing.T) {
    // Test self-withdrawal (no relayer, no fee)
    secret := big.NewInt(123456789)
    nullifier := big.NewInt(987654321)
    amount := big.NewInt(1000000)
    leafIndex := 100000
    
    recipient, _ := new(big.Int).SetString("1234567890123456", 16)
    relayer := big.NewInt(0)    // No relayer
    fee := big.NewInt(0)        // No fee
    
    // Compute nullifier hash
    h2 := hash.MIMC_BN254.New()
    h2.Write(to32BytesTest(nullifier))
    nullifierHashBytes := h2.Sum(nil)
    nullifierHash := new(big.Int).SetBytes(nullifierHashBytes)
    
    // Build tree
    root, merklePath := buildCompleteTree(secret, nullifier, amount, leafIndex)
    
    witness := CompleteWithdrawCircuit{
        MerkleRoot:    root,
        NullifierHash: nullifierHash,
        Recipient:     recipient,
        Relayer:       relayer,
        Fee:           fee,
        Amount:        amount,
        Secret:        secret,
        Nullifier:     nullifier,
        LeafIndex:     big.NewInt(int64(leafIndex)),
        MerklePath:    merklePath,
    }
    
    assert := test.NewAssert(t)
    assert.ProverSucceeded(&CompleteWithdrawCircuit{}, &witness, test.WithCurves(ecc.BN254))
}

func TestCompleteWithdrawCircuitCompile(t *testing.T) {
    var circuit CompleteWithdrawCircuit
    
    // Compile the circuit
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), r1cs.NewBuilder, &circuit)
    if err != nil {
        t.Fatal(err)
    }
    
    // Print circuit info
    t.Logf("Step 5 Circuit compiled successfully")
    t.Logf("Number of constraints: %d", ccs.GetNbConstraints())
    t.Logf("Number of public inputs: %d", ccs.GetNbPublicVariables())
    t.Logf("Number of secret inputs: %d", ccs.GetNbSecretVariables())
    
    // Check that constraints are in expected range
    constraints := ccs.GetNbConstraints()
    if constraints < 20000 || constraints > 30000 {
        t.Logf("Warning: Constraint count %d is outside expected range (20k-30k)", constraints)
    }
}
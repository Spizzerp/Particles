package particlefund

import (
    "testing"
    "math/big"
    
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark/backend/groth16"
    "github.com/consensys/gnark/frontend"
    "github.com/consensys/gnark/frontend/cs/r1cs"
    "github.com/consensys/gnark/std/hash/mimc"
    "github.com/consensys/gnark/test"
)

func TestCommitmentCircuit(t *testing.T) {
    // Create witness values
    secret := big.NewInt(123456789)
    nullifier := big.NewInt(987654321)
    
    // Compute expected hashes
    // For nullifierHash
    mimcHasher1 := mimc.NewMiMC()
    mimcHasher1.Write(nullifier.Bytes())
    nullifierHashBytes := mimcHasher1.Sum(nil)
    nullifierHash := new(big.Int).SetBytes(nullifierHashBytes)
    
    // For commitment = hash(secret, nullifier)
    mimcHasher2 := mimc.NewMiMC()
    mimcHasher2.Write(secret.Bytes())
    mimcHasher2.Write(nullifier.Bytes())
    commitmentBytes := mimcHasher2.Sum(nil)
    commitment := new(big.Int).SetBytes(commitmentBytes)
    
    // Create circuit witness
    witness := CommitmentCircuit{
        Commitment:    commitment,
        NullifierHash: nullifierHash,
        Secret:        secret,
        Nullifier:     nullifier,
    }
    
    // Test with test engine
    assert := test.NewAssert(t)
    assert.ProverSucceeded(&CommitmentCircuit{}, &witness, test.WithCurves(ecc.BN254))
}

func TestCommitmentCircuitCompile(t *testing.T) {
    var circuit CommitmentCircuit
    
    // Compile the circuit
    ccs, err := frontend.Compile(ecc.BN254.ScalarField(), r1cs.NewBuilder, &circuit)
    if err != nil {
        t.Fatal(err)
    }
    
    // Print circuit info
    t.Logf("Step 2 Circuit compiled successfully")
    t.Logf("Number of constraints: %d", ccs.GetNbConstraints())
    t.Logf("Number of public inputs: %d", ccs.GetNbPublicVariables()) 
    t.Logf("Number of secret inputs: %d", ccs.GetNbSecretVariables())
    
    // Generate dummy witness for proof testing
    witness := CommitmentCircuit{
        Commitment:    1234,
        NullifierHash: 5678,
        Secret:        42,
        Nullifier:     99,
    }
    
    // Setup
    pk, vk, err := groth16.Setup(ccs)
    if err != nil {
        t.Fatal(err)
    }
    
    // Create witness
    w, err := frontend.NewWitness(&witness, ecc.BN254.ScalarField())
    if err != nil {
        t.Fatal(err)
    }
    
    // Prove
    proof, err := groth16.Prove(ccs, pk, w)
    if err != nil {
        t.Fatal(err)
    }
    
    // Verify
    publicWitness, err := w.Public()
    if err != nil {
        t.Fatal(err)
    }
    
    err = groth16.Verify(proof, vk, publicWitness)
    if err != nil {
        t.Fatal(err)
    }
    
    t.Log("Step 2 proof generation and verification successful!")
}
//go:build js && wasm
// +build js,wasm

package main

import (
    "bytes"
    "errors"
    
    "github.com/consensys/gnark-crypto/ecc"
    "github.com/consensys/gnark-crypto/kzg"
    "github.com/consensys/gnark/backend/plonk"
    "github.com/consensys/gnark/backend/witness"
    "github.com/consensys/gnark/std"
)

// GenerateProofPlonkInternal generates a PLONK proof using the current gnark version
// without any console output that would require WASI
func GenerateProofPlonkInternal(ccsBytes, srsBytes, pkBytes, witnessJSON []byte) ([]byte, []byte, error) {
    // Register hints first (needed for MiMC)
    std.RegisterHints()
    // Load constraint system
    ccs := plonk.NewCS(ecc.BN254)
    _, err := ccs.ReadFrom(bytes.NewReader(ccsBytes))
    if err != nil {
        return nil, nil, errors.New("failed to read constraint system")
    }
    
    // Load SRS (Structured Reference String)
    srs := kzg.NewSRS(ecc.BN254)
    _, err = srs.ReadFrom(bytes.NewReader(srsBytes))
    if err != nil {
        return nil, nil, errors.New("failed to read SRS")
    }
    
    // Load proving key
    pk := plonk.NewProvingKey(ecc.BN254)
    _, err = pk.ReadFrom(bytes.NewReader(pkBytes))
    if err != nil {
        return nil, nil, errors.New("failed to read proving key")
    }
    
    // In newer gnark, KZG is initialized differently
    // The proving key should already have the KZG data from Setup
    
    // Create witness from JSON directly (like gnark-prover-tinygo does)
    w, err := witness.New(ecc.BN254.ScalarField())
    if err != nil {
        return nil, nil, errors.New("failed to create witness")
    }
    
    // The gnark-prover-tinygo library expects the witness as JSON bytes directly
    _, err = w.ReadFrom(bytes.NewReader(witnessJSON))
    if err != nil {
        return nil, nil, errors.New("failed to read witness data: " + err.Error())
    }
    
    // Generate the proof
    proof, err := plonk.Prove(ccs, pk, w)
    if err != nil {
        return nil, nil, errors.New("failed to generate proof")
    }
    
    // Get public witness
    publicWitness, err := w.Public()
    if err != nil {
        return nil, nil, errors.New("failed to extract public witness")
    }
    
    // Serialize proof
    var proofBuf bytes.Buffer
    _, err = proof.WriteTo(&proofBuf)
    if err != nil {
        return nil, nil, errors.New("failed to serialize proof")
    }
    
    // Serialize public witness
    var publicBuf bytes.Buffer
    _, err = publicWitness.WriteTo(&publicBuf)
    if err != nil {
        return nil, nil, errors.New("failed to serialize public witness")
    }
    
    return proofBuf.Bytes(), publicBuf.Bytes(), nil
}
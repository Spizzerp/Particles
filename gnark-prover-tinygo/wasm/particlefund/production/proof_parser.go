//go:build js && wasm
// +build js,wasm

package main

import (
    "bytes"
    "encoding/binary"
    "encoding/hex"
    "errors"
)

// parsePlonkProof parses binary PLONK proof from gnark into ICP-compatible format
func parsePlonkProof(proofBytes []byte) (*PlonkProof, error) {
    buf := bytes.NewReader(proofBytes)
    
    // Helper to read 32 bytes as hex string
    read32BytesAsHex := func() (string, error) {
        data := make([]byte, 32)
        _, err := buf.Read(data)
        if err != nil {
            return "", errors.New("failed to read 32 bytes")
        }
        return "0x" + hex.EncodeToString(data), nil
    }
    
    // Helper to read G1 point (compressed format - 32 bytes)
    readG1Point := func() (Point, error) {
        x, err := read32BytesAsHex()
        if err != nil {
            return Point{}, err
        }
        // For compressed format, y coordinate is determined by sign bit
        // For ICP compatibility, we'll use a placeholder y
        y := "0x0000000000000000000000000000000000000000000000000000000000000000"
        return Point{X: x, Y: y}, nil
    }
    
    // Read 4-byte integer (big-endian)
    readUint32 := func() (uint32, error) {
        var val uint32
        err := binary.Read(buf, binary.BigEndian, &val)
        return val, err
    }
    
    proof := &PlonkProof{}
    
    // 1. Read LRO commitments (3 G1 points)
    proof.LRO = make([]Point, 3)
    for i := 0; i < 3; i++ {
        point, err := readG1Point()
        if err != nil {
            return nil, errors.New("failed to read LRO")
        }
        proof.LRO[i] = point
    }
    
    // 2. Read Z commitment (G1 point)
    z, err := readG1Point()
    if err != nil {
        return nil, errors.New("failed to read Z")
    }
    proof.Z = z
    
    // 3. Read H commitments (3 G1 points for quotient polynomial)
    proof.H = make([]Point, 3)
    for i := 0; i < 3; i++ {
        point, err := readG1Point()
        if err != nil {
            return nil, errors.New("failed to read H")
        }
        proof.H[i] = point
    }
    
    // 4. Read batched proof
    batchedH, err := readG1Point()
    if err != nil {
        return nil, errors.New("failed to read batched proof H")
    }
    
    // Read number of claimed values
    numClaimedValues, err := readUint32()
    if err != nil {
        return nil, errors.New("failed to read num claimed values")
    }
    
    // Read claimed values
    claimedValues := make([]string, numClaimedValues)
    for i := uint32(0); i < numClaimedValues; i++ {
        val, err := read32BytesAsHex()
        if err != nil {
            return nil, errors.New("failed to read claimed value")
        }
        claimedValues[i] = val
    }
    
    proof.BatchedProof = BatchedProof{
        H:             batchedH,
        ClaimedValues: claimedValues,
    }
    
    // 5. Read Z shifted proof
    zShiftedH, err := readG1Point()
    if err != nil {
        return nil, errors.New("failed to read z shifted H")
    }
    
    zShiftedValue, err := read32BytesAsHex()
    if err != nil {
        return nil, errors.New("failed to read z shifted value")
    }
    
    proof.ZShiftedProof = ZShiftedProof{
        H:            zShiftedH,
        ClaimedValue: zShiftedValue,
    }
    
    // 6. Read BSB22 commitments (if any bytes remaining)
    if buf.Len() >= 4 {
        numBSB22, err := readUint32()
        if err != nil {
            return nil, errors.New("failed to read num BSB22 commitments")
        }
        
        proof.Bsb22Commitments = make([]Point, numBSB22)
        for i := uint32(0); i < numBSB22; i++ {
            point, err := readG1Point()
            if err != nil {
                return nil, errors.New("failed to read BSB22")
            }
            proof.Bsb22Commitments[i] = point
        }
    } else {
        proof.Bsb22Commitments = []Point{}
    }
    
    return proof, nil
}

// parsePublicWitness parses binary public witness from gnark
func parsePublicWitness(witnessBytes []byte) ([]string, error) {
    buf := bytes.NewReader(witnessBytes)
    
    // Read number of public inputs
    var numInputs uint32
    if err := binary.Read(buf, binary.BigEndian, &numInputs); err != nil {
        return nil, errors.New("failed to read num public inputs")
    }
    
    publicSignals := make([]string, numInputs)
    
    // Read each public input (32 bytes each)
    for i := uint32(0); i < numInputs; i++ {
        data := make([]byte, 32)
        _, err := buf.Read(data)
        if err != nil {
            return nil, errors.New("failed to read public input")
        }
        publicSignals[i] = "0x" + hex.EncodeToString(data)
    }
    
    return publicSignals, nil
}
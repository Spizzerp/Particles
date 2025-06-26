//go:build js && wasm
// +build js,wasm

package main

import (
    "bytes"
    "encoding/binary"
    "encoding/json"
    "errors"
    "math/big"
)

// ConvertJSONWitnessToBinary converts our JSON witness format to binary format that gnark expects
func ConvertJSONWitnessToBinary(jsonWitness []byte) ([]byte, error) {
    // Parse JSON witness
    var witness map[string]interface{}
    if err := json.Unmarshal(jsonWitness, &witness); err != nil {
        return nil, errors.New("failed to unmarshal JSON: " + err.Error())
    }
    
    // The witness values in order (7 public, then private)
    witnessValues := make([]*big.Int, 0)
    
    // Helper to convert value to big.Int
    toBigInt := func(v interface{}) (*big.Int, error) {
        switch val := v.(type) {
        case string:
            // Remove 0x prefix if present
            if len(val) > 2 && val[:2] == "0x" {
                // Convert hex to decimal
                n := new(big.Int)
                _, ok := n.SetString(val[2:], 16)
                if !ok {
                    return nil, errors.New("invalid hex value")
                }
                return n, nil
            }
            // Try as decimal
            n := new(big.Int)
            _, ok := n.SetString(val, 10)
            if !ok {
                return nil, errors.New("invalid decimal value")
            }
            return n, nil
        case float64:
            // Convert float to big.Int
            return big.NewInt(int64(val)), nil
        case int:
            return big.NewInt(int64(val)), nil
        default:
            return big.NewInt(0), nil
        }
    }
    
    // Public inputs (7 total in order)
    publicFields := []string{"MerkleRoot", "NullifierHash", "Recipient", "Relayer", "Fee", "Amount", "Refund"}
    for _, field := range publicFields {
        val, err := toBigInt(witness[field])
        if err != nil {
            return nil, errors.New("failed to convert " + field + ": " + err.Error())
        }
        witnessValues = append(witnessValues, val)
    }
    
    // Private inputs
    // Secret
    secret, err := toBigInt(witness["Secret"])
    if err != nil {
        return nil, errors.New("failed to convert Secret: " + err.Error())
    }
    witnessValues = append(witnessValues, secret)
    
    // Nullifier
    nullifier, err := toBigInt(witness["Nullifier"])
    if err != nil {
        return nil, errors.New("failed to convert Nullifier: " + err.Error())
    }
    witnessValues = append(witnessValues, nullifier)
    
    // LeafIndex - compute from MerkleIndices
    leafIndex := big.NewInt(0)
    if indices, ok := witness["MerkleIndices"].([]interface{}); ok {
        for i, idx := range indices {
            idxVal, err := toBigInt(idx)
            if err != nil {
                return nil, errors.New("failed to convert MerkleIndices: " + err.Error())
            }
            if idxVal.Cmp(big.NewInt(1)) == 0 {
                leafIndex.SetBit(leafIndex, i, 1)
            }
        }
    }
    witnessValues = append(witnessValues, leafIndex)
    
    // MerklePath (20 elements)
    if path, ok := witness["MerklePath"].([]interface{}); ok {
        for i := 0; i < 20; i++ {
            if i < len(path) {
                val, err := toBigInt(path[i])
                if err != nil {
                    return nil, errors.New("failed to convert MerklePath: " + err.Error())
                }
                witnessValues = append(witnessValues, val)
            } else {
                witnessValues = append(witnessValues, big.NewInt(0))
            }
        }
    } else {
        // Add 20 zeros if no path provided
        for i := 0; i < 20; i++ {
            witnessValues = append(witnessValues, big.NewInt(0))
        }
    }
    
    // Now encode to binary format
    var buf bytes.Buffer
    
    // Write number of public values (uint32)
    binary.Write(&buf, binary.BigEndian, uint32(7))
    
    // Write number of secret values (uint32)  
    // 1 (secret) + 1 (nullifier) + 1 (leafIndex) + 20 (merklePath) = 23
    binary.Write(&buf, binary.BigEndian, uint32(23))
    
    // Write vector length (uint32) = total number of values
    binary.Write(&buf, binary.BigEndian, uint32(len(witnessValues)))
    
    // Write each field element as 32 bytes (big-endian)
    for _, val := range witnessValues {
        // Ensure the value fits in 32 bytes
        valBytes := val.Bytes()
        if len(valBytes) > 32 {
            return nil, errors.New("value too large for field element")
        }
        
        // Pad to 32 bytes
        padded := make([]byte, 32)
        copy(padded[32-len(valBytes):], valBytes)
        
        buf.Write(padded)
    }
    
    return buf.Bytes(), nil
}
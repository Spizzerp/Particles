package main

import (
    "bytes"
    "fmt"
    "os"
    
    csbn254 "github.com/consensys/gnark/constraint/bn254"
)

func main() {
    // Try to read the CCS file
    data, err := os.ReadFile("circuits/build/withdraw_complete.ccs")
    if err != nil {
        fmt.Println("Error reading file:", err)
        return
    }
    
    fmt.Println("File size:", len(data), "bytes")
    
    // Try to parse as SparseR1CS (what gnark-prover-tinygo expects)
    ccs := &csbn254.SparseR1CS{}
    if _, err := ccs.ReadFrom(bytes.NewReader(data)); err != nil {
        fmt.Println("Error parsing as SparseR1CS:", err)
        fmt.Println("This suggests the file is in a different format")
    } else {
        fmt.Println("Successfully parsed as SparseR1CS")
    }
}
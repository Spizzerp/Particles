package main

import (
	"fmt"
	"math/big"
	
	"github.com/consensys/gnark-crypto/ecc/bn254/fr"
	"github.com/consensys/gnark-crypto/hash/mimc"
)

func main() {
	// Test MiMC with gnark-crypto
	mimcHash := mimc.NewMiMC()
	
	// Test 1: hash(1)
	one := big.NewInt(1)
	var oneFr fr.Element
	oneFr.SetBigInt(one)
	
	mimcHash.Reset()
	mimcHash.Write(oneFr.Marshal())
	result1 := mimcHash.Sum(nil)
	
	fmt.Printf("hash(1) bytes: %x\n", result1)
	
	// Convert to field element to get decimal representation
	var resultFr fr.Element
	resultFr.SetBytes(result1)
	fmt.Printf("hash(1) decimal: %s\n", resultFr.String())
	
	// Test 2: hash(empty) - no write
	mimcHash.Reset()
	result2 := mimcHash.Sum(nil)
	fmt.Printf("\nhash(empty) bytes: %x\n", result2)
	
	// Test 3: hash(secret, nullifier, amount)
	secret := big.NewInt(123456789)
	nullifier := big.NewInt(987654321)
	amount, _ := new(big.Int).SetString("1000000000000000000", 10)
	
	var secretFr, nullifierFr, amountFr fr.Element
	secretFr.SetBigInt(secret)
	nullifierFr.SetBigInt(nullifier)
	amountFr.SetBigInt(amount)
	
	mimcHash.Reset()
	mimcHash.Write(secretFr.Marshal())
	mimcHash.Write(nullifierFr.Marshal())
	mimcHash.Write(amountFr.Marshal())
	result3 := mimcHash.Sum(nil)
	
	var result3Fr fr.Element
	result3Fr.SetBytes(result3)
	fmt.Printf("\nhash(123456789, 987654321, 1ETH) decimal: %s\n", result3Fr.String())
}
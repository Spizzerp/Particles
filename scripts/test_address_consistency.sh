#!/bin/bash

echo "🔍 Testing Address Generation Consistency"
echo "========================================"
echo ""

# The migration found the correct derivation but the signed transaction uses a different address
# This suggests the publicKeyToEthereumAddress function might be inconsistent

echo "From the logs:"
echo "- Migration found address: 0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e ✅"
echo "- But signed transaction from: 0xff0b5a436a03E394A08164FaEB4834Bb3C9ecd79 ❌"
echo ""
echo "This suggests:"
echo "1. The ECDSA public key derivation is correct and consistent"
echo "2. But the publicKeyToEthereumAddress conversion is different"
echo ""
echo "Possible issues:"
echo "- The public key might be compressed (33 bytes) in one place and uncompressed (65 bytes) in another"
echo "- The keccak256 hash might be applied to different data"
echo ""
echo "The fact that the same principal generates 0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e in the migration check"
echo "but 0xff0b5a436a03E394A08164FaEB4834Bb3C9ecd79 in the actual signing suggests the address"
echo "generation logic is not consistent."
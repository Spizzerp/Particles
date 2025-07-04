#!/bin/bash

echo "🔍 Verifying Derivation Consistency"
echo "==================================="
echo ""

echo "Let's trace through the forwarding logic:"
echo ""
echo "1. Deposit info stored:"
dfx canister --network ic call 55iy2-vaaaa-aaaas-amn7a-cai getDepositInfo '("0xfcdcce7b6c5782bfb5f656eb9e8d0f67ce94f04e")'

echo ""
echo "2. From the code (line 1753-1755), the forwarding uses:"
echo "   - userHash = keccak256(Principal.toText(info.userId))"
echo "   - derivationPath = [first 4 bytes of userHash]"
echo ""
echo "3. This SHOULD generate the same address as when it was created"
echo "   But debugAddressGeneration shows a different address"
echo ""
echo "Possible issues:"
echo "a) The keccak256 implementation changed"
echo "b) The principal text encoding changed"
echo "c) The public key to address conversion changed"
echo "d) Something else in the derivation logic changed"
echo ""
echo "Let's check if the keccak256 canister was updated recently..."
dfx canister --network ic status keccak256
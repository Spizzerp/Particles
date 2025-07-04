#!/bin/bash

echo "Testing balance check for deposit address..."

# Create a custom Candid call to test balance checking
DEPOSIT_ADDRESS="0x48f3cecedb8b4c6518bf78c201acddf31067d2d4"

echo "Checking pending deposits..."
dfx canister --network ic call ethereum_adapter getPendingDeposits | grep -A10 "$DEPOSIT_ADDRESS"

echo -e "\nProcessing deposits (with verbose output)..."
dfx canister --network ic call ethereum_adapter processDepositAddresses

echo -e "\nChecking pending deposits after processing..."
dfx canister --network ic call ethereum_adapter getPendingDeposits | grep -A10 "$DEPOSIT_ADDRESS"
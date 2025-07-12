#!/bin/bash

echo "Checking canister cycles balances..."

# Get canister IDs from dfx.json
FRONTEND_ID=$(dfx canister id frontend 2>/dev/null || echo "Not found")
DEPOSIT_MANAGER_ID=$(dfx canister id deposit_manager_v2 2>/dev/null || echo "Not found")
WITHDRAWAL_PROCESSOR_ID=$(dfx canister id withdrawal_processor 2>/dev/null || echo "Not found")
PLONK_VERIFIER_ID=$(dfx canister id plonk_verifier 2>/dev/null || echo "Not found")

echo ""
echo "Canister IDs:"
echo "Frontend: $FRONTEND_ID"
echo "Deposit Manager V2: $DEPOSIT_MANAGER_ID"
echo "Withdrawal Processor: $WITHDRAWAL_PROCESSOR_ID"
echo "PLONK Verifier: $PLONK_VERIFIER_ID"

echo ""
echo "Checking cycles balances..."

if [ "$FRONTEND_ID" != "Not found" ]; then
    echo -n "Frontend cycles: "
    dfx canister status frontend 2>&1 | grep -E "Balance:|Cycles:" || echo "Unable to fetch"
fi

if [ "$DEPOSIT_MANAGER_ID" != "Not found" ]; then
    echo -n "Deposit Manager V2 cycles: "
    dfx canister status deposit_manager_v2 2>&1 | grep -E "Balance:|Cycles:" || echo "Unable to fetch"
fi

if [ "$WITHDRAWAL_PROCESSOR_ID" != "Not found" ]; then
    echo -n "Withdrawal Processor cycles: "
    dfx canister status withdrawal_processor 2>&1 | grep -E "Balance:|Cycles:" || echo "Unable to fetch"
fi

if [ "$PLONK_VERIFIER_ID" != "Not found" ]; then
    echo -n "PLONK Verifier cycles: "
    dfx canister status plonk_verifier 2>&1 | grep -E "Balance:|Cycles:" || echo "Unable to fetch"
fi

echo ""
echo "Note: If cycles are low (< 1T), you may need to top up with:"
echo "dfx canister deposit-cycles <amount> <canister-name>" 
#!/bin/bash

echo "💰 Converting ICP to Cycles..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Check ICP balance
echo -e "${GREEN}Checking ICP balance...${NC}"
dfx ledger balance --network ic

echo -e "\n${YELLOW}To convert ICP to cycles:${NC}"
echo "1. First, ensure you have ICP in your account"
echo "2. Create a cycles wallet (if you don't have one):"
echo "   dfx identity get-wallet --network ic"
echo ""
echo "3. Convert ICP to cycles (1 ICP = ~1 trillion cycles):"
echo "   dfx cycles convert 0.5 --network ic"
echo ""
echo "4. Check your cycles balance:"
echo "   dfx wallet balance --network ic"
echo ""
echo "5. Deploy with cycles:"
echo "   dfx deploy ethereum_adapter --network ic --with-cycles 1000000000000"

echo -e "\n${GREEN}Alternative: Buy cycles from exchanges${NC}"
echo "- CycleOps: https://cycleops.dev"
echo "- Entrepot: https://entrepot.app"
#!/bin/bash

# Monitor specific deposit address

ADDRESS="0x9b514d9c4e4d96a5e892bdc1322f0359d18535ff"
ETHEREUM_ADAPTER="icmw4-miaaa-aaaad-qhmmq-cai"

echo "🔍 Monitoring Ethereum Deposit"
echo "=============================="
echo "Address: $ADDRESS"
echo ""

# Show Etherscan link
echo "📊 View on Sepolia Etherscan:"
echo "https://sepolia.etherscan.io/address/$ADDRESS"
echo ""

# Function to check and process
check_deposit() {
    echo "🔄 Attempt $1: Processing deposit addresses..."
    
    # Process deposit addresses
    RESULT=$(dfx canister call $ETHEREUM_ADAPTER processDepositAddresses --ic 2>&1)
    echo "Result: $RESULT"
    
    if [[ $RESULT == *"ok"* ]] && [[ $RESULT != *"vec {}"* ]]; then
        echo ""
        echo "✅ DEPOSIT PROCESSED!"
        echo "$RESULT"
        
        # Extract transaction hash if present
        if [[ $RESULT =~ 0x[a-fA-F0-9]{64} ]]; then
            TX_HASH="${BASH_REMATCH[0]}"
            echo ""
            echo "📜 Forward transaction hash: $TX_HASH"
            echo "View on Etherscan: https://sepolia.etherscan.io/tx/$TX_HASH"
        fi
        return 0
    else
        echo "⏳ No deposits detected yet..."
        return 1
    fi
}

echo "Ready to process your deposit!"
echo "Please send 0.01 ETH to: $ADDRESS"
echo ""
echo "Once you've sent the transaction, press Enter to start monitoring..."
read -p "Press Enter when ready: "

echo ""
echo "Starting monitoring..."

# Monitor for 10 minutes
for i in {1..60}; do
    if check_deposit $i; then
        echo ""
        echo "🎉 Success! Your deposit has been processed."
        echo "The funds have been forwarded to the pool contract."
        echo "Your commitment has been added to the Merkle tree."
        exit 0
    fi
    
    if [ $i -lt 60 ]; then
        echo "Waiting 10 seconds before next check..."
        sleep 10
    fi
done

echo ""
echo "⏱️  Monitoring timed out after 10 minutes."
echo "You can run this script again or manually check with:"
echo "dfx canister call $ETHEREUM_ADAPTER processDepositAddresses --ic"
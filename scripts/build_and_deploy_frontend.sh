#!/bin/bash

echo "🚀 Building and Deploying Frontend to ICP"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# 1. Install dependencies
echo -e "\n1️⃣ Installing dependencies..."
npm install

# 2. Build the frontend
echo -e "\n2️⃣ Building frontend..."
npm run build

# 3. Check if dist directory was created
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed - dist directory not found"
    exit 1
fi

# 4. Deploy to local network
echo -e "\n3️⃣ Deploying frontend canister..."
if [ "$1" == "ic" ]; then
    echo "Deploying to IC mainnet..."
    dfx deploy frontend --network ic
else
    echo "Deploying to local network..."
    dfx deploy frontend
fi

# 5. Get the canister ID
echo -e "\n4️⃣ Frontend deployed!"
if [ "$1" == "ic" ]; then
    FRONTEND_ID=$(dfx canister id frontend --network ic)
    echo "Frontend URL: https://$FRONTEND_ID.icp0.io"
else
    FRONTEND_ID=$(dfx canister id frontend)
    echo "Frontend URL: http://localhost:8000/?canisterId=$FRONTEND_ID"
fi

echo -e "\n✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Visit the URL above to access your dApp"
echo "2. Test deposit and withdrawal flows"
echo "3. Monitor canister logs with: dfx canister logs frontend"
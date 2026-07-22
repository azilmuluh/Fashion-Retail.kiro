#!/bin/bash

# Fashion Retail App - Quick Restart Script
# Fixes all build issues and starts the web app

set -e  # Exit on error

echo "🚀 Fashion Retail App - Quick Restart"
echo "===================================="
echo ""

# Step 1: Kill existing process on port 8085
echo "1️⃣  Killing any existing process on port 8085..."
lsof -ti:8085 | xargs kill -9 2>/dev/null || echo "   ✓ Port 8085 is free"
echo ""

# Step 2: Navigate to mobile app
echo "2️⃣  Navigating to mobile app directory..."
cd /Users/azilnwi/Documents/AWSredeploy/FASHION/apps/mobile
echo "   ✓ In directory: $(pwd)"
echo ""

# Step 3: Clear Expo cache
echo "3️⃣  Clearing Expo cache..."
rm -rf .expo
echo "   ✓ Cache cleared"
echo ""

# Step 4: Start the web app
echo "4️⃣  Starting web server..."
echo "   This may take 10-15 seconds..."
echo ""
echo "📱 App will be available at: http://localhost:8085"
echo "🔐 Login: azilmuluh@gmail.com / Test1234!"
echo ""
echo "⏳ Starting Metro bundler..."
echo ""

npx expo start --clear --web --port 8085

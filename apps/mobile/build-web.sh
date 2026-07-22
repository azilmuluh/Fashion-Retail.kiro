#!/bin/bash

# Build script for Expo web deployment
# This script prepares the app for Netlify deployment

echo "🚀 Starting Expo web build..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist
rm -rf .expo/web

# Build web version
echo "🏗️  Building web version..."
npx expo export:web

# Check if build was successful
if [ -d "dist" ]; then
  echo "✅ Build successful! Output directory: dist"
  echo "📊 Build size:"
  du -sh dist
  echo ""
  echo "🌐 Ready to deploy to Netlify!"
  echo ""
  echo "Next steps:"
  echo "1. Push to GitHub"
  echo "2. Connect repository to Netlify"
  echo "3. Set environment variables in Netlify dashboard:"
  echo "   - EXPO_PUBLIC_SUPABASE_URL"
  echo "   - EXPO_PUBLIC_SUPABASE_ANON_KEY"
  echo "4. Deploy!"
else
  echo "❌ Build failed!"
  exit 1
fi

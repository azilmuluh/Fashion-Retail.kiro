#!/bin/bash

# Fashion Retail Platform - Setup Script
# This script initializes the development environment

set -e

echo "🚀 Fashion Retail Platform - Setup"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✓ npm version: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo ""
    echo "⚠️  Supabase CLI is not installed."
    echo "   Install it globally: npm install -g supabase"
    echo "   Or continue without local Supabase (you can use cloud only)"
    read -p "   Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✓ Supabase CLI version: $(supabase --version)"
fi

# Check if Docker is running (required for local Supabase)
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        echo "✓ Docker is running"
    else
        echo "⚠️  Docker is installed but not running"
        echo "   Start Docker Desktop to use local Supabase"
    fi
else
    echo "⚠️  Docker is not installed"
    echo "   Install Docker Desktop to run Supabase locally"
fi

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo ""
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "✓ Created .env.local"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.local and add your Supabase credentials!"
    echo "   You can get these from: https://app.supabase.com"
else
    echo ""
    echo "✓ .env.local already exists"
fi

# Summary
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo ""
echo "1. Set up Supabase:"
echo "   - Option A (Local): Run 'npm run supabase:start'"
echo "   - Option B (Cloud): Create project at https://app.supabase.com"
echo ""
echo "2. Update .env.local with your Supabase credentials"
echo ""
echo "3. View the design system demo:"
echo "   open packages/design-system/demo.html"
echo ""
echo "4. Read the documentation:"
echo "   - README.md (project overview)"
echo "   - supabase/README.md (database setup)"
echo "   - packages/design-system/README.md (design system)"
echo ""
echo "5. Start building!"
echo "   - Next task: Mobile and Web apps (coming soon)"
echo ""

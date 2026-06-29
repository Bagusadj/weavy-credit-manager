#!/bin/bash

echo "=== Weavy Bulk Credit Manager - Setup Script ==="
echo ""

# Create required directories
mkdir -p /home/ubuntu/auto-credit-manager/backend/data
mkdir -p /home/ubuntu/auto-credit-manager/backend/uploads

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd /home/ubuntu/auto-credit-manager/backend
npm install

# Make scripts executable
chmod +x /home/ubuntu/auto-credit-manager/start.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Start server:"
echo "   cd /home/ubuntu/auto-credit-manager"
echo "   ./start.sh"
echo ""
echo "🌐 Open browser:"
echo "   http://localhost:3000"
echo ""
echo "📝 Format file .txt:"
echo "   email:password"
echo "   email:password:api_key"
echo ""
echo "📄 Sample file:"
echo "   sample_accounts.txt"
echo ""
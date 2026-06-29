#!/bin/bash

echo "🚀 Deploy to Render.com"
echo "========================"
echo ""

# Check GitHub username
read -p "GitHub username: " GITHUB_USER

if [ -z "$GITHUB_USER" ]; then
    echo "❌ GitHub username required!"
    exit 1
fi

echo ""
echo "📤 Pushing to GitHub..."
git remote add origin https://github.com/$GITHUB_USER/weavy-credit-manager.git 2>/dev/null
git branch -M main 2>/dev/null
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Code pushed to GitHub!"
    echo ""
    echo "🌐 Next steps:"
    echo "1. Buka: https://render.com"
    echo "2. Sign up/login"
    echo "3. Click 'New +' → 'Web Service'"
    echo "4. Connect repo: weavy-credit-manager"
    echo "5. Click 'Create Web Service'"
    echo ""
    echo "🔗 App URL:"
    echo "   https://weavy-credit-manager.onrender.com"
else
    echo ""
    echo "❌ Push failed! Check:"
    echo "   - GitHub username benar?"
    echo "   - GitHub password/token diminta?"
    echo "   - Repo sudah di-create?"
fi
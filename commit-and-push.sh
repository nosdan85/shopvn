#!/bin/bash

# Script to commit and push all changes

echo "🔧 Committing bug fixes..."

cd "C:\Users\shhshs\Documents\shopvn-main"

# Add all changes
git add .

# Commit with detailed message
git commit -m "Fix: Auth pages improvements

- Add Vietnamese diacritics (Đăng Ký, Mật Khẩu, etc.)
- Add 'Quay về Cửa Hàng' button on login/register pages
- Fix redirect from /shop to /cua-hang after auth
- Fix admin pages import AuthVietContext
- Add debug docs (BUGS_TO_FIX.md, DEBUG_BACKEND.md)"

# Push to main
git push origin main

echo "✅ Done! Changes pushed to GitHub"
echo ""
echo "Next steps:"
echo "1. Vercel will auto-deploy frontend"
echo "2. Check Render logs for backend errors"
echo "3. Test register at https://nosroblox.com/dang-ky"

#!/bin/bash

# Woza Mali Collector App - Vercel Deployment Script
# This script helps deploy the Collector App to Vercel

echo "🚀 Woza Mali Collector App - Vercel Deployment"
echo "=============================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing now..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel:"
    vercel login
fi

echo "📦 Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build successful!"

echo "🌐 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo "📱 Your Collector App is now live on Vercel!"
    echo ""
    echo "Next steps:"
    echo "1. Set up environment variables in Vercel dashboard"
    echo "2. Update Supabase redirect URLs"
    echo "3. Test the deployed application"
    echo "4. Update other apps with the new Collector URL"
else
    echo "❌ Deployment failed. Please check the errors above."
    exit 1
fi

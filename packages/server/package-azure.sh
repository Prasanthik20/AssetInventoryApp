#!/bin/bash
set -e

DEPLOY_DIR="azure-deploy"
ZIP_NAME="azure-deploy.zip"

echo "🚀 Installing dependencies..."
npm install

echo "🚀 Building Next.js..."
npm run build

echo "📦 Preparing Azure standalone package..."
rm -rf $DEPLOY_DIR $ZIP_NAME
mkdir -p $DEPLOY_DIR

# Copy the standalone server (includes root node_modules and packages/server)
cp -r .next/standalone/* $DEPLOY_DIR/

# Ensure static files are present in the correct nested structure
mkdir -p $DEPLOY_DIR/packages/server/.next/static
cp -r .next/static/* $DEPLOY_DIR/packages/server/.next/static/

if [ -d "public" ]; then
  cp -r public $DEPLOY_DIR/packages/server/
fi

# Create a root server.js entrypoint for Azure App Service
echo "require('./packages/server/server.js');" > $DEPLOY_DIR/server.js

# Copy Prisma schema and migrations if they exist
if [ -d "prisma" ]; then
  cp -r prisma $DEPLOY_DIR/
fi

echo "🗜 Creating ZIP..."
cd $DEPLOY_DIR
zip -r ../$ZIP_NAME . > /dev/null
cd ..

echo "✅ DONE!"
echo "ZIP created: $ZIP_NAME"

#!/bin/bash
set -e

DEPLOY_DIR="azure-deploy"
ZIP_NAME="azure-deploy.zip"

echo "🚀 Installing dependencies..."
npm install

echo "🚀 Building Next.js..."
npm run build

echo "📦 Preparing Azure package..."

rm -rf $DEPLOY_DIR $ZIP_NAME
mkdir -p $DEPLOY_DIR

echo "👉 Copying server.js..."
cp packages/server/server.js $DEPLOY_DIR/

echo "👉 Copying package.json..."
cp package.json $DEPLOY_DIR/

echo "👉 Copying node_modules..."
cp -r node_modules $DEPLOY_DIR/

echo "👉 Copying Next build output..."
cp -r .next $DEPLOY_DIR/

echo "👉 Copying public assets..."
if [ -d "public" ]; then
  cp -r public $DEPLOY_DIR/
fi

echo "🗜 Creating ZIP..."

cd $DEPLOY_DIR
zip -r ../$ZIP_NAME . > /dev/null
cd ..

echo "✅ DONE!"
echo "ZIP created: $ZIP_NAME"

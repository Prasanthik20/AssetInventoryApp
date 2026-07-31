# Windows PowerShell Deployment Script
$ErrorActionPreference = "Stop"

# Write-Host "1. Syncing database schema with Prisma (npx prisma db push)..." -ForegroundColor Cyan
# npx prisma db push --schema=prisma/schema.prisma

Write-Host "2. Building server..." -ForegroundColor Cyan
npm run build

Write-Host "3. Preparing deploy_exact directory..." -ForegroundColor Cyan
if (Test-Path deploy_exact) {
    # Delete contents instead of the directory itself to avoid handle locking issues
    Get-ChildItem -Path deploy_exact | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path deploy_exact -Force | Out-Null
}
New-Item -ItemType Directory -Path deploy_exact\.next -Force | Out-Null

Write-Host "4. Copying standalone files..." -ForegroundColor Cyan
Copy-Item .next\standalone\packages\server\server.js deploy_exact\
Copy-Item .next\standalone\packages\server\.env deploy_exact\
Copy-Item .next\standalone\packages\server\package.json deploy_exact\

Write-Host "5. Copying node_modules..." -ForegroundColor Cyan
if (Test-Path .next\standalone\node_modules) {
    Copy-Item -Recurse -Force .next\standalone\node_modules deploy_exact\
}
if (Test-Path .next\standalone\packages\server\node_modules) {
    # Copy/merge sub node_modules individually to avoid PowerShell folder merge errors
    Get-ChildItem -Path .next\standalone\packages\server\node_modules | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination deploy_exact\node_modules\ -Recurse -Force
    }
}

Write-Host "6. Copying static, server and public assets..." -ForegroundColor Cyan
if (Test-Path .next\standalone\packages\server\.next) {
    Copy-Item -Recurse -Force .next\standalone\packages\server\.next deploy_exact\
}
if (Test-Path .next\static) {
    if (!(Test-Path deploy_exact\.next)) {
        New-Item -ItemType Directory -Path deploy_exact\.next -Force | Out-Null
    }
    Copy-Item -Recurse -Force .next\static deploy_exact\.next\static
}
if (Test-Path public) {
    Copy-Item -Recurse -Force public deploy_exact\public
}

Write-Host "7. Compressing package into deploy.zip..." -ForegroundColor Cyan
if (Test-Path deploy.zip) {
    Remove-Item deploy.zip -Force
}
Compress-Archive -Path deploy_exact\* -DestinationPath deploy.zip -Force

Write-Host "8. Deploying to Azure Web App..." -ForegroundColor Cyan
az webapp deploy --name asq-asset-api --resource-group asquaretechrg --src-path deploy.zip --type zip

Write-Host "Deployment completed successfully!" -ForegroundColor Green

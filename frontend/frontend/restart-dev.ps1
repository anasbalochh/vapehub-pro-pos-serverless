# PowerShell script to properly restart the dev server with environment variables
# Run this script: .\restart-dev.ps1

Write-Host "🔄 Restarting Vite Dev Server with Environment Variables..." -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
Set-Location $PSScriptRoot

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: .env file not found in frontend directory!" -ForegroundColor Red
    Write-Host "   Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY" -ForegroundColor Yellow
    exit 1
}

# Check if .env has the required variables
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "VITE_SUPABASE_URL") {
    Write-Host "❌ ERROR: VITE_SUPABASE_URL not found in .env file!" -ForegroundColor Red
    exit 1
}
if ($envContent -notmatch "VITE_SUPABASE_ANON_KEY") {
    Write-Host "❌ ERROR: VITE_SUPABASE_ANON_KEY not found in .env file!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ .env file found and validated" -ForegroundColor Green

# Clear Vite cache
if (Test-Path "node_modules\.vite") {
    Write-Host "🗑️  Clearing Vite cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
    Write-Host "✅ Vite cache cleared" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No Vite cache to clear" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🚀 Starting dev server..." -ForegroundColor Cyan
Write-Host "   After the server starts, check the browser console for:" -ForegroundColor Yellow
Write-Host "   - Vite environment variables (VITE_*): { VITE_SUPABASE_URL: '***SET***', ... }" -ForegroundColor Gray
Write-Host "   - Supabase URL: https://..." -ForegroundColor Gray
Write-Host ""

# Start the dev server
npm run dev


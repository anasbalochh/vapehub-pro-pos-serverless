# Git Push Script for Mobile UI Fixes
# Run this script after Git is installed

Write-Host "Starting Git operations..." -ForegroundColor Green

# Check if git is available
try {
    $gitVersion = git --version
    Write-Host "Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Git is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Check if .git exists, if not initialize
if (-not (Test-Path ".git")) {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    git init
}

# Check if remote exists
$remoteExists = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Adding remote repository..." -ForegroundColor Yellow
    git remote add origin https://github.com/anasbalochh/vapehub-pro-pos-serverless.git
} else {
    Write-Host "Remote already exists: $remoteExists" -ForegroundColor Green
    # Update remote URL to ensure it's correct
    git remote set-url origin https://github.com/anasbalochh/vapehub-pro-pos-serverless.git
}

# Add all changes
Write-Host "Adding all changes..." -ForegroundColor Yellow
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit." -ForegroundColor Yellow
    exit 0
}

# Commit changes
Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m "Fix mobile responsiveness and improve stock page UX

- Fixed mobile view issues: elements staying within sections, prices wrapping properly
- Added overflow protection and responsive padding across all pages
- Improved Products, Dashboard, POS, and Stock pages for mobile devices
- Enhanced Card and Table components with responsive padding and break-words
- Stock page improvements: optimistic UI updates, individual loading states, faster response
- Removed full data reload on stock updates for better performance
- Added refresh button and better error handling with rollback
- Better visual feedback with loading spinners and disabled states"

# Push to main branch
Write-Host "Pushing to main branch..." -ForegroundColor Yellow
git branch -M main 2>$null
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed changes to GitHub!" -ForegroundColor Green
} else {
    Write-Host "Push failed. You may need to authenticate." -ForegroundColor Red
    Write-Host "Try running: git push -u origin main" -ForegroundColor Yellow
}


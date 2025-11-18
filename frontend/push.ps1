# Git Push Script
Write-Host "Checking for Git..." -ForegroundColor Yellow
try {
    git --version | Out-Null
    Write-Host "Git is available!" -ForegroundColor Green
    
    Write-Host "Initializing repository if needed..." -ForegroundColor Yellow
    if (-not (Test-Path ".git")) { git init }
    
    Write-Host "Setting up remote..." -ForegroundColor Yellow
    git remote remove origin 2>$null
    git remote add origin https://github.com/anasbalochh/vapehub-pro-pos-serverless.git
    
    Write-Host "Adding files..." -ForegroundColor Yellow
    git add .
    
    Write-Host "Committing..." -ForegroundColor Yellow
    git commit -m "Fix mobile UI: Convert tables to card layouts, fix price displays, improve responsive design"
    
    Write-Host "Pushing to main..." -ForegroundColor Yellow
    git branch -M main
    git push -u origin main
    
    Write-Host "Done!" -ForegroundColor Green
} catch {
    Write-Host "Git is not available. Please install Git first." -ForegroundColor Red
}

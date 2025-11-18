# Script to cleanup branches and push to main repository
# This will remove all branches except main and push changes

Write-Host "=== Cleaning up branches and pushing to main ===" -ForegroundColor Cyan

# Try to find Git in common locations
$gitPath = $null
$commonGitPaths = @(
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\cmd\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe",
    "git"  # Try PATH last
)

foreach ($path in $commonGitPaths) {
    try {
        if ($path -eq "git") {
            $gitVersion = & git --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                $gitPath = "git"
                Write-Host "Git found in PATH: $gitVersion" -ForegroundColor Green
                break
            }
        } else {
            if (Test-Path $path) {
                $gitVersion = & $path --version 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $gitPath = $path
                    Write-Host "Git found at: $path - $gitVersion" -ForegroundColor Green
                    break
                }
            }
        }
    } catch {
        continue
    }
}

if (-not $gitPath) {
    Write-Host "ERROR: Git is not installed or not found." -ForegroundColor Red
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Or add Git to your PATH environment variable." -ForegroundColor Yellow
    exit 1
}

# Function to run git commands
function Run-Git {
    param([string]$Command)
    if ($gitPath -eq "git") {
        Invoke-Expression "git $Command"
    } else {
        & $gitPath $Command.Split(' ')
    }
}

# Set git user config if not set
Write-Host "`nConfiguring git user..." -ForegroundColor Yellow
$gitUser = Run-Git "config user.name" 2>$null
$gitEmail = Run-Git "config user.email" 2>$null

if ([string]::IsNullOrWhiteSpace($gitUser)) {
    Write-Host "Setting git user name to 'Anas Baloch'..." -ForegroundColor Gray
    Run-Git "config user.name `"Anas Baloch`""
}

if ([string]::IsNullOrWhiteSpace($gitEmail)) {
    Write-Host "Setting git user email..." -ForegroundColor Gray
    # Try to get email from git config or use a default
    Run-Git "config user.email `"anasbalochh@users.noreply.github.com`""
}

# Ensure we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    Run-Git "init"
}

# Handle embedded git repository in frontend folder
if (Test-Path "frontend\.git") {
    Write-Host "`nRemoving embedded git repository from frontend folder..." -ForegroundColor Yellow
    Remove-Item -Path "frontend\.git" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Embedded repository removed" -ForegroundColor Green
}

# Set remote to the correct repository
Write-Host "`nSetting up remote repository..." -ForegroundColor Yellow
Run-Git "remote remove origin" 2>$null
Run-Git "remote add origin https://github.com/anasbalochh/vapehub-pro-pos-serverless.git"
Run-Git "remote set-url origin https://github.com/anasbalochh/vapehub-pro-pos-serverless.git"
Write-Host "Remote set to: anasbalochh/vapehub-pro-pos-serverless" -ForegroundColor Green

# Fetch to get remote branches
Write-Host "`nFetching remote branches..." -ForegroundColor Yellow
Run-Git "fetch origin" 2>$null

# Switch to main branch (create if doesn't exist)
Write-Host "`nSwitching to main branch..." -ForegroundColor Yellow
$currentBranch = Run-Git "branch --show-current" 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($currentBranch)) {
    Run-Git "checkout -b main" 2>$null
} else {
    if ($currentBranch.Trim() -ne "main") {
        # Check if main exists locally
        $mainExists = Run-Git "branch --list main" 2>$null
        if ($mainExists) {
            Run-Git "checkout main"
        } else {
            Run-Git "checkout -b main"
        }
    }
}
Run-Git "branch -M main" 2>$null
Write-Host "Now on main branch" -ForegroundColor Green

# Get all local branches except main
Write-Host "`nFinding branches to delete..." -ForegroundColor Yellow
$allBranches = Run-Git "branch" 2>$null
$branchesToDelete = $allBranches | Where-Object { 
    $_ -notmatch '\*' -and $_ -notmatch 'main' -and $_.Trim() -ne ''
} | ForEach-Object { $_.Trim() }

if ($branchesToDelete.Count -gt 0) {
    Write-Host "Deleting local branches: $($branchesToDelete -join ', ')" -ForegroundColor Yellow
    foreach ($branch in $branchesToDelete) {
        Run-Git "branch -D $branch" 2>$null
        Write-Host "  Deleted local branch: $branch" -ForegroundColor Gray
    }
} else {
    Write-Host "No local branches to delete (only main exists)" -ForegroundColor Green
}

# Delete remote branches (except main)
Write-Host "`nChecking remote branches..." -ForegroundColor Yellow
$remoteBranches = Run-Git "branch -r" 2>$null
$remoteBranchesToDelete = $remoteBranches | Where-Object { 
    $_ -match 'origin/' -and $_ -notmatch 'origin/main' -and $_ -notmatch 'HEAD'
} | ForEach-Object { 
    $_.Trim() -replace 'origin/', ''
} | Where-Object { $_ -ne 'main' }

if ($remoteBranchesToDelete.Count -gt 0) {
    Write-Host "Deleting remote branches: $($remoteBranchesToDelete -join ', ')" -ForegroundColor Yellow
    foreach ($branch in $remoteBranchesToDelete) {
        Run-Git "push origin --delete $branch" 2>$null
        Write-Host "  Deleted remote branch: $branch" -ForegroundColor Gray
    }
} else {
    Write-Host "No remote branches to delete (only main exists)" -ForegroundColor Green
}

# Add all changes
Write-Host "`nAdding all changes..." -ForegroundColor Yellow
Run-Git "add ."

# Check if there are changes to commit
$status = Run-Git "status --porcelain" 2>$null
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit." -ForegroundColor Yellow
} else {
    # Commit changes
    Write-Host "Committing changes..." -ForegroundColor Yellow
    $commitMessage = @"
Fix mobile responsiveness and improve stock page UX

- Fixed mobile view issues: elements staying within sections, prices wrapping properly
- Added overflow protection and responsive padding across all pages
- Improved Products, Dashboard, POS, and Stock pages for mobile devices
- Enhanced Card and Table components with responsive padding and break-words
- Stock page improvements: optimistic UI updates, individual loading states, faster response
- Removed full data reload on stock updates for better performance
- Added refresh button and better error handling with rollback
- Better visual feedback with loading spinners and disabled states
"@
    Run-Git "commit -m `"$commitMessage`""
    Write-Host "Changes committed!" -ForegroundColor Green
}

# Push to main branch
Write-Host "`nPushing to main branch..." -ForegroundColor Yellow
Run-Git "push -u origin main --force"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
    Write-Host "Successfully pushed changes to main branch!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/anasbalochh/vapehub-pro-pos-serverless" -ForegroundColor Cyan
} else {
    Write-Host "`n=== PUSH FAILED ===" -ForegroundColor Red
    Write-Host "You may need to authenticate with GitHub." -ForegroundColor Yellow
    Write-Host "Try running manually: git push -u origin main --force" -ForegroundColor Yellow
    Write-Host "Or set up authentication using:" -ForegroundColor Yellow
    Write-Host "  - Personal Access Token (recommended)" -ForegroundColor Gray
    Write-Host "  - GitHub CLI (gh auth login)" -ForegroundColor Gray
    Write-Host "  - SSH keys" -ForegroundColor Gray
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan


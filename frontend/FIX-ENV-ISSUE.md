# Fix: Supabase Environment Variables Not Loading

## The Problem

Vite is not reading your `.env` file even though it exists and has the correct values.

## Solution Steps (Do ALL of these):

### Step 1: Verify .env File Location

The `.env` file MUST be in the `frontend` directory:

```
vapehub-pro-pos-main/
  └── frontend/
      ├── .env          ← MUST BE HERE
      ├── vite.config.ts
      ├── package.json
      └── src/
```

### Step 2: Verify .env File Content

Open `frontend/.env` and make sure it looks EXACTLY like this (no quotes, no spaces):

```env
VITE_SUPABASE_URL=https://wfmllkabeisedfvrmscm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmbWxsa2FiZWlzZWRmdnJtc2NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODMyMTAsImV4cCI6MjA3NTY1OTIxMH0.NDPccHACcbqPANu7EEp7mAJbdNOwPszZUr_ah8jEnmw
```

**Important:**

- No spaces around the `=` sign
- No quotes around values
- Each variable on its own line
- No trailing spaces

### Step 3: Stop the Dev Server

1. Go to the terminal where `npm run dev` is running
2. Press `Ctrl+C` to stop it
3. Wait until it's completely stopped

### Step 4: Clear Vite Cache

Run this command in PowerShell (from the `frontend` directory):

```powershell
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
```

### Step 5: Restart Dev Server

**IMPORTANT:** Make sure you're in the `frontend` directory:

```powershell
cd frontend
npm run dev
```

### Step 6: Check Terminal Output

When the server starts, you should see in the terminal:

```
🔍 Vite Config - Environment Variables Check:
🔍 Loading .env from directory: D:\...\frontend
🔍 VITE_SUPABASE_URL: ✅ SET
🔍 VITE_SUPABASE_ANON_KEY: ✅ SET
```

If you see `❌ MISSING`, the .env file is not being read.

### Step 7: Check Browser Console

Open your browser console (F12) and look for:

```
🔍 DEBUG: All import.meta.env keys: [...]
🔍 Vite environment variables (VITE_*): { VITE_SUPABASE_URL: '***SET***', ... }
Supabase URL: https://wfmllkabeisedfvrmscm.supabase.co...
Supabase Key: eyJ...
```

If you see `MISSING` instead of `***SET***`, the variables are not loaded.

## Common Issues

### Issue 1: Running from Wrong Directory

**Problem:** Running `npm run dev` from the root directory instead of `frontend/`
**Solution:** Always run from `frontend/` directory

### Issue 2: .env File Encoding

**Problem:** .env file might have wrong encoding (should be UTF-8)
**Solution:**

1. Open .env in VS Code
2. Check bottom right corner - should say "UTF-8"
3. If not, click it and select "Save with Encoding" → "UTF-8"

### Issue 3: Hidden Characters

**Problem:** Invisible characters in .env file
**Solution:**

1. Delete the .env file
2. Create a new one
3. Type the variables manually (don't copy-paste)

### Issue 4: File Not Saved

**Problem:** .env file changes not saved
**Solution:** Make sure you save the file (Ctrl+S) before restarting

## Still Not Working?

If after all these steps it still doesn't work:

1. **Check the terminal output** when starting the dev server - does it show the variables as SET or MISSING?
2. **Check browser console** - what does it show for `import.meta.env` keys?
3. **Try creating a test variable:**
   - Add `VITE_TEST=hello` to your .env
   - Restart server
   - In browser console, type: `import.meta.env.VITE_TEST`
   - If it shows `undefined`, Vite is not reading .env at all

## Quick Test Script

Run this in PowerShell from the `frontend` directory to verify your .env file:

```powershell
$envFile = ".env"
if (Test-Path $envFile) {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    $content = Get-Content $envFile -Raw
    if ($content -match "VITE_SUPABASE_URL") {
        Write-Host "✅ VITE_SUPABASE_URL found" -ForegroundColor Green
    } else {
        Write-Host "❌ VITE_SUPABASE_URL NOT found" -ForegroundColor Red
    }
    if ($content -match "VITE_SUPABASE_ANON_KEY") {
        Write-Host "✅ VITE_SUPABASE_ANON_KEY found" -ForegroundColor Green
    } else {
        Write-Host "❌ VITE_SUPABASE_ANON_KEY NOT found" -ForegroundColor Red
    }
} else {
    Write-Host "❌ .env file NOT found in current directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
}
```

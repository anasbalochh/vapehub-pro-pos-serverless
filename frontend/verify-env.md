# Environment Variables Verification Guide

## Quick Fix Steps

1. **Stop your development server** (Ctrl+C in the terminal where it's running)

2. **Verify your .env file is in the correct location:**
   - The `.env` file MUST be in the `frontend` directory (same folder as `vite.config.ts`)
   - NOT in the root directory

3. **Check your .env file format:**
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   - No spaces around the `=` sign
   - No quotes needed (unless the value contains spaces)
   - Each variable on its own line

4. **Clear Vite cache and restart:**
   ```bash
   cd frontend
   rm -rf node_modules/.vite  # On Windows: rmdir /s /q node_modules\.vite
   npm run dev
   ```

5. **Check the browser console** - You should see debug logs showing:
   - `Vite environment variables (VITE_*): { VITE_SUPABASE_URL: '***SET***', ... }`
   - `Supabase URL: https://...`
   - `Supabase Key: eyJ...`

## Common Issues

### Issue: Variables not loading after creating .env
**Solution:** Vite only loads .env files on startup. You MUST restart the dev server.

### Issue: Variables show as MISSING in console
**Solution:**
- Check the variable names start with `VITE_`
- Check there are no typos
- Check there are no extra spaces
- Make sure the file is named exactly `.env` (not `.env.local` or `.env.development`)

### Issue: File in wrong location
**Solution:** The `.env` file must be in the `frontend` directory, not the root directory.

## Verification

After restarting, open your browser console and look for:
- ✅ `Vite environment variables (VITE_*): { VITE_SUPABASE_URL: '***SET***', VITE_SUPABASE_ANON_KEY: '***SET***' }`
- ✅ `Supabase URL: https://wfmllkabeisedfvrmscm.supabase.co...`
- ✅ `Supabase Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

If you see `MISSING` instead of `***SET***`, the variables are not being loaded.


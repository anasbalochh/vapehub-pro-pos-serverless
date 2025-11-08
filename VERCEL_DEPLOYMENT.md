# Vercel Deployment Guide

## ⚠️ Important: Vercel Dashboard Settings

For this monorepo structure to work correctly on Vercel, you **MUST** configure the Root Directory in Vercel Dashboard:

### Steps to Fix Deployment:

1. **Go to Vercel Dashboard:**

   - Visit: https://vercel.com/dashboard
   - Select your project: `vapehub-pro-pos-serverless`

2. **Open Project Settings:**

   - Click on your project
   - Go to **Settings** → **General**

3. **Set Root Directory:**

   - Find **Root Directory** section
   - Click **Edit**
   - Set it to: `frontend`
   - Click **Save**

4. **Verify Build Settings:**

   - Go to **Settings** → **General** → **Build & Development Settings**
   - **Framework Preset:** Should be `Other` or `Vite`
   - **Build Command:** Should be `npm run build` (Vercel will run this in the frontend folder)
   - **Output Directory:** Should be `dist`
   - **Install Command:** Should be `npm install`

5. **Redeploy:**
   - Go to **Deployments** tab
   - Click the **⋯** (three dots) on the latest deployment
   - Click **Redeploy**

## Alternative: If Root Directory Setting Doesn't Work

If setting Root Directory doesn't work, you can:

1. **Delete the project from Vercel**
2. **Re-import from GitHub**
3. **During import, set Root Directory to `frontend`**

## Current Configuration

The `vercel.json` in the root is configured with:

- `buildCommand`: `cd frontend && npm install && npm run build`
- `outputDirectory`: `frontend/dist`
- `installCommand`: `cd frontend && npm install`
- `rewrites`: All routes → `/index.html` (for SPA routing)

## Verification

After setting Root Directory and redeploying, check:

- ✅ Homepage loads: `vapehub-pro-pos.vercel.app`
- ✅ Login page works: `vapehub-pro-pos.vercel.app/login`
- ✅ All routes work (no 404 errors)
- ✅ Direct URL access works (e.g., `/dashboard`, `/products`)

## Troubleshooting

### Still getting 404?

1. Check Vercel deployment logs for build errors
2. Verify Root Directory is set to `frontend`
3. Check that `frontend/dist/index.html` exists after build
4. Verify environment variables are set in Vercel dashboard

### Build fails?

1. Check that `frontend/package.json` has a `build` script
2. Verify all dependencies are in `package.json`
3. Check build logs in Vercel dashboard

### Routes not working?

1. Verify `rewrites` in `vercel.json` are correct
2. Check that React Router is configured correctly
3. Ensure `index.html` is being served for all routes

# Email Confirmation Setup Guide

## The Problem
If email confirmation links redirect to `localhost:3000` instead of your production URL, you need to configure both your code AND Supabase Dashboard.

## Solution (3 Steps Required)

### Step 1: Set Environment Variable in Production
Add this to your production environment variables (e.g., Vercel, Netlify, etc.):
```
VITE_SITE_URL=https://your-production-domain.com
```
Replace `your-production-domain.com` with your actual deployed URL.

### Step 2: Configure Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** > **URL Configuration**
4. Set **Site URL** to: `https://your-production-domain.com`
5. Add to **Redirect URLs**:
   - `https://your-production-domain.com/auth/confirm`
   - `https://your-production-domain.com/**` (wildcard for all routes)

### Step 3: Rebuild and Redeploy
After setting the environment variable:
1. Rebuild your application
2. Redeploy to production
3. Test with a new signup

## Important Notes

- **Supabase Dashboard Site URL** is what gets used in the email confirmation links
- The `emailRedirectTo` in code only affects redirects AFTER confirmation
- If you change the Site URL in Supabase, existing confirmation emails will still use the old URL
- New signups after the fix will work correctly

## Testing

1. Sign up a new user in production
2. Check the confirmation email
3. The link should point to: `https://your-production-domain.com/auth/confirm#access_token=...`
4. Clicking it should show the confirmation page, not localhost:3000

## Troubleshooting

If links still point to localhost:
1. Verify `VITE_SITE_URL` is set in your production environment
2. Verify Supabase Dashboard Site URL is set correctly
3. Clear browser cache and try a new signup
4. Check Supabase Dashboard > Authentication > Email Templates to see what URL is being used


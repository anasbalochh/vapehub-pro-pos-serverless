# Vercel Domain Configuration

## Setting Custom Domain: vapehub-pro.vercel.app

### Steps to Configure Domain:

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `vapehub-pro-pos-serverless`

2. **Open Project Settings:**
   - Click on your project
   - Go to **Settings** → **Domains**

3. **Add Domain:**
   - Click **Add Domain**
   - Enter: `vapehub-pro.vercel.app`
   - Click **Add**

4. **Verify Domain:**
   - Vercel will automatically configure the domain
   - Wait for DNS propagation (usually instant for `.vercel.app` domains)
   - Your app will be available at `vapehub-pro.vercel.app`

### Alternative: Rename Project

If you want to change the default Vercel domain:

1. **Go to Project Settings:**
   - Settings → **General**
   - Find **Project Name**
   - Click **Edit**
   - Change to: `vapehub-pro`
   - Click **Save**

2. **New Domain:**
   - Your project will be available at: `vapehub-pro.vercel.app`
   - Old domain will redirect to new one

### Current Configuration:

- **Project Name:** `vapehub-pro-pos-serverless`
- **Default Domain:** `vapehub-pro-pos-serverless.vercel.app`
- **Target Domain:** `vapehub-pro.vercel.app`

### After Configuration:

Once the domain is set up:
- ✅ App accessible at: `https://vapehub-pro.vercel.app`
- ✅ All routes work: `/login`, `/dashboard`, `/products`, etc.
- ✅ HTTPS automatically enabled
- ✅ Custom domain configured


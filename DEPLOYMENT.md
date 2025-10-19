# VapeHub Pro POS System

A modern, serverless Point of Sale (POS) system built with React, TypeScript, and Supabase.

## 🌐 Custom Domain Setup

This project is configured to deploy to GitHub Pages with a custom domain `vapehub.com`.

### Deployment Steps:

1. **Enable GitHub Pages:**
   - Go to your repository settings
   - Navigate to "Pages" section
   - Select "GitHub Actions" as source

2. **Configure Custom Domain:**
   - In Pages settings, add custom domain: `vapehub.com`
   - GitHub will automatically create a CNAME file

3. **DNS Configuration:**
   - Add these DNS records to your domain provider:
   ```
   Type: CNAME
   Name: www
   Value: anasbalochh.github.io
   
   Type: A
   Name: @
   Value: 185.199.108.153
   Value: 185.199.109.153
   Value: 185.199.110.153
   Value: 185.199.111.153
   ```

4. **Automatic Deployment:**
   - Push to `main` branch triggers automatic deployment
   - GitHub Actions will build and deploy your app
   - Custom domain will be active after DNS propagation

### Local Development:

```bash
# Install dependencies
npm run install-deps

# Start development server
npm run dev

# Build for production
npm run build
```

### Features:

- ✅ Multi-industry support
- ✅ Dynamic field configuration
- ✅ Real-time inventory management
- ✅ Customizable product fields
- ✅ Modern React + TypeScript
- ✅ Supabase backend
- ✅ Responsive design

### Tech Stack:

- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Supabase (PostgreSQL, Auth, Real-time)
- **UI:** Radix UI, Tailwind CSS
- **Deployment:** GitHub Pages, GitHub Actions

---

**Live Demo:** [vapehub.com](https://vapehub.com)

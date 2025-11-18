# VapeHub Pro POS System

Professional Point of Sale (POS) system for managing products, inventory, sales, and analytics.

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**How to get your Supabase credentials:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Navigate to **Settings** > **API**
4. Copy the **Project URL** and **anon/public** key
5. Paste them into your `.env` file

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8080`

### 4. Build for Production

```bash
npm run build
```

## Features

- ✅ Secure authentication with email confirmation
- ✅ Product management
- ✅ Inventory tracking
- ✅ Point of Sale (POS) system
- ✅ Sales reports and analytics
- ✅ Returns management
- ✅ Printer integration
- ✅ Multi-user support with role-based access

## Security Features

- Email confirmation required for new users
- Secure password handling via Supabase Auth
- Input validation and sanitization
- XSS and CSRF protection
- Security headers configured

## Troubleshooting

### Supabase Configuration Error

If you see "Supabase configuration is missing":
1. Make sure you've created a `.env` file in the root directory
2. Verify the file contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Restart your development server after creating/updating the `.env` file

### Email Confirmation Issues

- Check your spam folder for the confirmation email
- Make sure email confirmation is enabled in your Supabase project settings
- Verify the redirect URL is set correctly in Supabase Auth settings

## Browser Extension Errors

If you see errors related to `evmAsk.js` or `ethereum` property:
- These are typically caused by browser extensions (like MetaMask or other wallet extensions)
- The application handles these gracefully and they won't affect functionality
- You can safely ignore these warnings

## Deployment

### Vercel

The project includes a `vercel.json` configuration file with security headers. Simply deploy to Vercel and your security headers will be automatically configured.

### Other Platforms

For other hosting platforms, configure the following HTTP headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.supabase.in; frame-ancestors 'none';`

## License

Private - All rights reserved

import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";
import path from "path";
import { defineConfig, loadEnv, type Plugin } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Explicitly load environment variables from the frontend directory (where this config file is)
  // __dirname points to the directory containing vite.config.ts (frontend/)
  const env = loadEnv(mode, __dirname, '');

  // Debug: Log environment variables in development
  if (mode === 'development') {
    console.log('🔍 Vite Config - Environment Variables Check:');
    console.log('🔍 Loading .env from directory:', __dirname);
    console.log('🔍 VITE_SUPABASE_URL:', env.VITE_SUPABASE_URL ? '✅ SET' : '❌ MISSING');
    console.log('🔍 VITE_SUPABASE_ANON_KEY:', env.VITE_SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING');

    if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
      console.error('❌ ERROR: Environment variables not found!');
      console.error('   Make sure .env file exists in:', __dirname);
      console.error('   File should contain:');
      console.error('   VITE_SUPABASE_URL=https://your-project.supabase.co');
      console.error('   VITE_SUPABASE_ANON_KEY=eyJ...');
    }
  }

  return {
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
    // Enable HTTP/2 for faster loading
    http2: true,
    // Fix 404 on refresh - serve index.html for all routes (SPA fallback)
    fs: {
      strict: false,
    },
    // Optimize pre-bundling
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query',
      ],
      exclude: ['@vite/client', '@vite/env'],
    },
  },
  // Configure preview server for production testing
  preview: {
    port: 8080,
    host: "::",
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Plugin to handle SPA routing - serve index.html for all routes
    {
      name: 'spa-fallback',
      configureServer(server) {
        return () => {
          server.middlewares.use((req, res, next) => {
            // Skip API routes
            if (req.url?.startsWith('/api')) {
              return next();
            }
            // Skip static assets (files with extensions like .js, .css, .png, etc.)
            if (req.url && /\.\w+$/.test(req.url) && !req.url.endsWith('.html')) {
              return next();
            }
            // Skip Vite's internal routes
            if (req.url?.startsWith('/@') || req.url?.startsWith('/node_modules')) {
              return next();
            }
            // For all other routes (SPA routes), serve index.html
            req.url = '/index.html';
            next();
          });
        };
      }
    } as Plugin
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }

          // Router
          if (id.includes('react-router')) {
            return 'router';
          }

          // Radix UI components - split into smaller chunks
          if (id.includes('@radix-ui')) {
            if (id.includes('dialog') || id.includes('alert-dialog')) {
              return 'ui-dialogs';
            }
            if (id.includes('dropdown') || id.includes('select') || id.includes('popover')) {
              return 'ui-dropdowns';
            }
            if (id.includes('tabs') || id.includes('accordion') || id.includes('collapsible')) {
              return 'ui-navigation';
            }
            if (id.includes('toast') || id.includes('tooltip') || id.includes('hover-card')) {
              return 'ui-feedback';
            }
            if (id.includes('checkbox') || id.includes('switch') || id.includes('radio-group') || id.includes('slider')) {
              return 'ui-inputs';
            }
            return 'ui-other';
          }

          // Charts
          if (id.includes('recharts')) {
            return 'charts';
          }

          // Forms
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
            return 'forms';
          }

          // Supabase
          if (id.includes('@supabase')) {
            return 'supabase';
          }

          // Icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }

          // React Query
          if (id.includes('@tanstack/react-query')) {
            return 'query';
          }

          // Carousel
          if (id.includes('embla-carousel')) {
            return 'carousel';
          }

          // Other utilities
          if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority') || id.includes('date-fns')) {
            return 'utils';
          }

          // Other libraries
          if (id.includes('axios') || id.includes('sonner') || id.includes('cmdk') || id.includes('input-otp') || id.includes('next-themes') || id.includes('vaul')) {
            return 'other';
          }

          // Split large API file
          if (id.includes('lib/api')) {
            return 'api';
          }

          // Split large pages
          if (id.includes('pages/')) {
            const pageName = id.split('pages/')[1]?.split('/')[0];
            if (pageName) {
              return `page-${pageName}`;
            }
          }
        },
        chunkFileNames: (chunkInfo) => {
          return `assets/[name]-[hash].js`;
        }
      }
    },
    chunkSizeWarningLimit: 500, // Keep warning at 500KB to catch issues
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false, // Disable sourcemaps for production to reduce size
    // Enable compression
    cssCodeSplit: true,
    // Optimize asset handling
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
  },
  // Performance optimizations
  esbuild: {
    // Drop console and debugger in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  // Ensure proper base path for Vercel deployment
  base: '/',
  };
});

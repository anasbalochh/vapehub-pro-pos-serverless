import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
  },
  // Ensure proper base path for deployment
  base: process.env.NODE_ENV === 'production' ? '/' : '/',
}));

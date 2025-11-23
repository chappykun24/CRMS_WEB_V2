import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    })
  ],
  optimizeDeps: {
    exclude: ['xlsx'] // Exclude xlsx since we're loading it dynamically
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime']
  },
  server: {
    port: 3000,
    open: true,
    host: true, // Allow external connections
    hmr: {
      port: 3000, // Use the same port for HMR
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemap for production
    minify: 'esbuild', // Use esbuild instead of terser
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Don't manually chunk React - let Vite handle it automatically
          // This prevents React initialization issues
          if (id.includes('node_modules')) {
            // Exclude React from manual chunking - Vite will handle it
            if (id.includes('/react/') || id.includes('\\react\\') || 
                id.includes('/react-dom/') || id.includes('\\react-dom\\') ||
                id.includes('/react/jsx-runtime') || id.includes('\\react\\jsx-runtime')) {
              return; // Let Vite handle React chunks automatically
            }
            // React Router
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            // Charting library (recharts can be large)
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
            // UI icon libraries
            if (id.includes('@heroicons') || id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            // Axios
            if (id.includes('axios')) {
              return 'http-vendor';
            }
            // xlsx - keep separate
            if (id.includes('xlsx')) {
              return 'xlsx-vendor';
            }
            // Other vendor libraries
            return 'vendor';
          }
        }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  }
}) 
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
    include: ['xlsx'],
    exclude: []
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
          // Node modules chunk
          if (id.includes('node_modules')) {
            // React core libraries
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
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
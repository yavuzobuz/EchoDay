import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to fix asset paths for Electron
    {
      name: 'fix-electron-paths',
      enforce: 'post',
      transformIndexHtml(html) {
        // Replace ./ with / in all src/href attributes for Electron compatibility
        return html.replace(/(src|href)="\.\/([^"]+)"/g, '$1="/$2"');
      }
    }
  ],
  base: '', // Empty for Electron file:// protocol compatibility
  server: {
    host: '0.0.0.0',
    port: 5173,
    headers: {
      // Security headers for development
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // CSP for development (less strict)
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' http://localhost:* ws://localhost:* https://generativelanguage.googleapis.com https://*.googleapis.com https://fonts.googleapis.com https://*.supabase.co wss://*.supabase.co; media-src 'self' blob: mediastream:; worker-src 'self' blob: 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cyberpunk: resolve(__dirname, 'index-cyberpunk.html')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
        // Manual chunks for better code splitting
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ai': ['@google/generative-ai'],
          'vendor-capacitor': [
            '@capacitor/core',
            '@capacitor/clipboard',
            '@capacitor/geolocation',
            '@capacitor/haptics',
            '@capacitor/splash-screen',
            '@capacitor/status-bar'
          ],
          'vendor-ui': ['@heroicons/react', 'dompurify'],
          'vendor-utils': ['uuid', 'dexie-react-hooks']
        }
      }
    }
  },
  // ESBuild configuration for development
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  },
  // Define global constants
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production')
  }
})

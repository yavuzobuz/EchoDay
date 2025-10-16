import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'electron-index-html-fix',
      enforce: 'post',
      transformIndexHtml(html) {
        // Remove any crossorigin attributes to avoid file:// CORS issues in Electron
        return html.replace(/\s+crossorigin(=("[^"]*"|'[^']*'|[^\s>]+))?/g, '');
      },
    },
  ],
  base: './', // Relative paths for Electron file:// protocol
  server: {
    host: 'localhost',
    port: 5173,
    // Completely disable HMR and websockets for mobile
    hmr: process.env.MOBILE_BUILD === 'true' ? false : {
      port: 5174,
      host: 'localhost'
    },
    // Disable file watching for mobile to prevent any websocket connections
    watch: process.env.MOBILE_BUILD === 'true' ? null : undefined,
    headers: {
      // Security headers for development
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // CSP for development (less strict) - allow AI providers (Gemini, OpenAI, Anthropic)
      'Content-Security-Policy': process.env.MOBILE_BUILD === 'true' 
        ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' http://*:* ws://*:* wss://*:* https://generativelanguage.googleapis.com https://*.googleapis.com https://api.openai.com https://api.anthropic.com https://fonts.googleapis.com https://*.supabase.co; media-src 'self' blob: mediastream:; worker-src 'self' blob: 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
        : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' http://localhost:* ws://localhost:* https://generativelanguage.googleapis.com https://*.googleapis.com https://api.openai.com https://api.anthropic.com https://fonts.googleapis.com https://*.supabase.co wss://*.supabase.co; media-src 'self' blob: mediastream:; worker-src 'self' blob: 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Chunk size warning limit - daha küçük chunk'lar için
    chunkSizeWarningLimit: 300,
    // Minification settings - daha agresif
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 2, // İki geçiş yaparak daha iyi optimizasyon
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true
      },
      format: {
        comments: false
      },
      mangle: {
        safari10: true
      }
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cyberpunk: resolve(__dirname, 'index-cyberpunk.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Manual chunks for better code splitting - daha detaylı
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ai': ['@google/generative-ai'],
          'vendor-capacitor-core': ['@capacitor/core'],
          'vendor-capacitor-plugins': [
            '@capacitor/clipboard',
            '@capacitor/geolocation',
            '@capacitor/haptics',
            '@capacitor/splash-screen',
            '@capacitor/status-bar',
            '@capacitor-community/speech-recognition'
          ],
          'vendor-ui': ['@heroicons/react'],
          'vendor-utils': ['uuid', 'dexie-react-hooks', 'dompurify']
        }
      },
      // Tree shaking optimizasyonu
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    },
    // CSS optimizasyonu
    cssCodeSplit: true,
    // Source map'leri mobile build'de devre dışı bırak
    sourcemap: process.env.MOBILE_BUILD !== 'true'
  },
  // ESBuild configuration for development
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // JSX optimizasyonu
    jsxDev: false,
    // Daha agresif minification
    minifyIdentifiers: process.env.NODE_ENV === 'production',
    minifySyntax: process.env.NODE_ENV === 'production',
    minifyWhitespace: process.env.NODE_ENV === 'production'
  },
  // Define global constants
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production')
  },
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid'
    ],
    exclude: [
      // Electron-specific packages
      'electron'
    ]
  }
})

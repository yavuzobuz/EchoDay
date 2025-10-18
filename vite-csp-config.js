// CSP Configuration for Vite Dev Server
export const cspConfig = {
  directives: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'", 
      "'wasm-unsafe-eval'", 
      'https://apis.google.com'
    ],
    'style-src': [
      "'self'", 
      "'unsafe-inline'", // Required for CSS-in-JS and dev server
      'https://fonts.googleapis.com'
    ],
    'font-src': [
      "'self'", 
      'data:', 
      'https://fonts.gstatic.com'
    ],
    'img-src': [
      "'self'", 
      'data:', 
      'blob:', 
      'https:'
    ],
    'connect-src': [
      "'self'",
      'http://localhost:5173',
      'http://localhost:*',
      'ws://localhost:*',
      'https://generativelanguage.googleapis.com',
      'https://*.googleapis.com',
      'https://accounts.google.com',
      'https://fonts.googleapis.com',
      'https://*.supabase.co',
      'wss://*.supabase.co'
    ],
    'media-src': [
      "'self'", 
      'blob:', 
      'mediastream:'
    ],
    'worker-src': [
      "'self'", 
      'blob:'
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    // NOTE: frame-ancestors should NOT be set in meta tags, only in HTTP headers
    'upgrade-insecure-requests': []
  }
};

// Function to generate CSP string for meta tag (without frame-ancestors)
export function generateMetaCSP() {
  return Object.entries(cspConfig.directives)
    .filter(([directive]) => directive !== 'frame-ancestors') // Remove frame-ancestors for meta tag
    .map(([directive, sources]) => {
      if (sources.length === 0) return directive;
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

// Function to generate full CSP string for HTTP headers
export function generateHeaderCSP() {
  return Object.entries(cspConfig.directives)
    .map(([directive, sources]) => {
      if (sources.length === 0) return directive;
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ') + "; frame-ancestors 'none'"; // Add frame-ancestors for headers
}
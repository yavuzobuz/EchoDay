import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file
const envPath = path.join(__dirname, '../.env');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
} else {
  console.warn('[inject-env-android] .env not found, proceeding with empty env');
}

// Parse environment variables
const envVars = {};
const lines = envContent.split('\n');
lines.forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim().replace(/^\"(.*)\"$/, '$1').replace(/^'(.*)'$/, '$1');
    }
  }
});

// Create JavaScript object with safe mobile vars only
const androidEnv = {};
const allowList = new Set([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_GEMINI_API_KEY', // optional
  'VITE_GOOGLE_AI_API_KEY', // optional
  'VITE_ENABLE_MANUAL_IMAP', // dev only
  'VITE_MAIL_BRIDGE_URL' // dev only
]);
Object.keys(envVars).forEach(key => {
  const isSecretLike = /SECRET/i.test(key) || /CLIENT_SECRET/i.test(key);
  if (allowList.has(key) && !isSecretLike) {
    androidEnv[key] = envVars[key];
  } else if (isSecretLike) {
    console.warn(`[inject-env-android] Skipping secret-like key for mobile bundle: ${key}`);
  }
});

// Convert to JavaScript code
const androidEnvCode = `window.androidEnv = ${JSON.stringify(androidEnv, null, 2)};`;

// 1) Write into dist so that Cap sync copies it into Android assets
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  const distOutput = path.join(distPath, 'android-env.js');
  fs.writeFileSync(distOutput, androidEnvCode);
  console.log('[inject-env-android] Wrote to dist:', distOutput);
} else {
  console.warn('[inject-env-android] dist/ not found. Did you run "npm run build"?');
}

// 2) Also write directly to Android assets directory (useful if building without sync)
const androidAssetsPath = path.join(__dirname, '../android/app/src/main/assets/public');
if (!fs.existsSync(androidAssetsPath)) {
  fs.mkdirSync(androidAssetsPath, { recursive: true });
}

const outputPath = path.join(androidAssetsPath, 'android-env.js');
fs.writeFileSync(outputPath, androidEnvCode);

console.log('Android environment variables injected successfully to:', outputPath);

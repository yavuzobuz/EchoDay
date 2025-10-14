import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables
const envVars = {};
const lines = envContent.split('\n');
lines.forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    }
  }
});

// Create JavaScript object with only VITE_ variables
const androidEnv = {};
Object.keys(envVars).forEach(key => {
  if (key.startsWith('VITE_')) {
    androidEnv[key] = envVars[key];
  }
});

// Convert to JavaScript code
const androidEnvCode = `window.androidEnv = ${JSON.stringify(androidEnv, null, 2)};`;

// Write to Android assets directory
const androidAssetsPath = path.join(__dirname, '../android/app/src/main/assets/public');
if (!fs.existsSync(androidAssetsPath)) {
  fs.mkdirSync(androidAssetsPath, { recursive: true });
}

const outputPath = path.join(androidAssetsPath, 'android-env.js');
fs.writeFileSync(outputPath, androidEnvCode);

console.log('Android environment variables injected successfully to:', outputPath);
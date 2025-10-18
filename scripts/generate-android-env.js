import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env dosyasını oku
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Environment variable'ları parse et
const envVars = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
    if (key && value) {
      envVars[key] = value;
    }
  }
});

// android-env.js dosyasını oluştur
const androidEnvContent = `window.androidEnv = ${JSON.stringify(envVars, null, 2)};`;

// dist ve android assets klasörlerine yaz
const distPath = path.resolve(__dirname, '../dist/android-env.js');
const androidPath = path.resolve(__dirname, '../android/app/src/main/assets/public/android-env.js');

fs.writeFileSync(distPath, androidEnvContent);
console.log('✓ Generated dist/android-env.js');

// Android klasörü varsa oraya da yaz
if (fs.existsSync(path.dirname(androidPath))) {
  fs.writeFileSync(androidPath, androidEnvContent);
  console.log('✓ Generated android/app/src/main/assets/public/android-env.js');
}

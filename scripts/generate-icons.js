// Generate app icons for Electron and Android from a single square source PNG
// Usage:
// 1) Put your final 1024x1024 PNG at: public/app-icon.png (transparent bg preferred)
// 2) Run: npm run icons:generate
// 3) For Android: npx cap sync android (copies mipmaps)

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(path.join(__dirname, '..'));
const SRC = path.join(root, 'public', 'app-icon.png');

if (!fs.existsSync(SRC)) {
  console.error('[icons] Source not found:', SRC);
  console.error('[icons] Please save your 1024x1024 PNG as public/app-icon.png and re-run.');
  process.exit(1);
}

// Ensure dirs
const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };

// Electron (and general) PNGs
const electronSizes = [512, 256, 128, 64, 32];
const publicDir = path.join(root, 'public');
ensureDir(publicDir);

(async () => {
  console.log('[icons] Generating Electron/web PNGs...');
  for (const size of electronSizes) {
    const out = path.join(publicDir, `icon-${size}.png`);
    await sharp(SRC).resize(size, size, { fit: 'contain' }).png().toFile(out);
    console.log('  ✓', path.relative(root, out));
  }
  // Also write canonical icon-512.png expected by electron-builder
  const icon512 = path.join(publicDir, 'icon-512.png');
  await sharp(SRC).resize(512, 512, { fit: 'contain' }).png().toFile(icon512);

  // Android mipmaps
  console.log('[icons] Generating Android mipmaps...');
  const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
  const densities = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];
  for (const d of densities) {
    const dir = path.join(androidRes, d.dir);
    ensureDir(dir);
    const out = path.join(dir, 'ic_launcher.png');
    const outRound = path.join(dir, 'ic_launcher_round.png');
    await sharp(SRC).resize(d.size, d.size, { fit: 'cover' }).png().toFile(out);
    await sharp(SRC).resize(d.size, d.size, { fit: 'cover' }).png().toFile(outRound);
    console.log('  ✓', path.relative(root, out));
  }

  console.log('\n[icons] Done. Next steps:');
  console.log('- Electron uses public/icon-512.png automatically (electron-builder).');
  console.log('- Android: run "npx cap sync android" to copy resources.');
})();
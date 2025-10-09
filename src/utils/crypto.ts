/**
 * API Key Obfuscation Utility
 * NOT: Bu GEÇİCİ bir çözümdür. Production'da backend proxy kullanılmalı!
 * 
 * Bu sadece casual inspection'dan korur, gerçek güvenlik sağlamaz.
 * Gelecekte backend proxy server implementasyonu gerekli.
 */

const SALT = 'ECH0D4Y_2025_S3CR3T_S4LT';
const XOR_KEY = 'ECHODAY_XOR_2025';

/**
 * Basit XOR cipher ile string şifreleme
 */
function xorCipher(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

/**
 * API key'i obfuscate et (encode)
 * Build time'da kullanılacak
 */
export function obfuscateKey(key: string): string {
  try {
    // 1. Salt ekle
    const salted = key + SALT;
    
    // 2. XOR cipher uygula
    const xored = xorCipher(salted, XOR_KEY);
    
    // 3. Base64 encode
    const base64 = btoa(xored);
    
    // 4. Reverse (extra layer)
    const reversed = base64.split('').reverse().join('');
    
    return reversed;
  } catch (error) {
    console.error('Obfuscation failed:', error);
    return '';
  }
}

/**
 * API key'i deobfuscate et (decode)
 * Runtime'da kullanılacak
 */
export function deobfuscateKey(encoded: string): string {
  try {
    // 1. Reverse
    const unreversed = encoded.split('').reverse().join('');
    
    // 2. Base64 decode
    const decoded = atob(unreversed);
    
    // 3. XOR decrypt
    const unxored = xorCipher(decoded, XOR_KEY);
    
    // 4. Salt'ı çıkar
    const original = unxored.replace(SALT, '');
    
    return original;
  } catch (error) {
    console.error('Deobfuscation failed:', error);
    return '';
  }
}

/**
 * Runtime'da environment variable varsa onu kullan, yoksa obfuscated key'i decode et
 */
export function getSecureKey(envKey: string | undefined, obfuscatedFallback: string): string {
  // Development'ta env variable kullan
  if (import.meta.env.DEV && envKey) {
    return envKey;
  }
  
  // Production'da obfuscated key'i decode et
  if (obfuscatedFallback) {
    return deobfuscateKey(obfuscatedFallback);
  }
  
  console.warn('No API key found!');
  return '';
}

/**
 * Build-time helper: Environment variable'ları obfuscate edilmiş stringe çevir
 * 
 * Kullanım:
 * 1. .env dosyasındaki key'i al
 * 2. obfuscateKey() ile encode et
 * 3. Sonucu kodda constant olarak kullan
 * 
 * Örnek:
 * const OBFUSCATED_GEMINI_KEY = obfuscateKey(import.meta.env.VITE_GEMINI_API_KEY);
 */
export function generateObfuscatedKeys() {
  // Bu fonksiyon sadece development'ta build time'da kullanılacak
  if (import.meta.env.DEV) {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('=== OBFUSCATED KEYS (COPY TO CODE) ===');
    if (geminiKey) {
      console.log('GEMINI_KEY:', obfuscateKey(geminiKey));
    }
    if (supabaseKey) {
      console.log('SUPABASE_KEY:', obfuscateKey(supabaseKey));
    }
    console.log('=======================================');
  }
}

// Development'ta obfuscated key'leri generate et
if (import.meta.env.DEV) {
  // generateObfuscatedKeys(); // İhtiyaç olduğunda uncomment et
}

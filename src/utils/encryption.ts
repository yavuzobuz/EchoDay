// Simple AES-GCM encryption utilities for end-to-end encrypted notes
// NOTE: Keys are derived client-side from a user passphrase; server never sees plaintext.

function getSubtle(): SubtleCrypto {
  const g: any = typeof window !== 'undefined' ? window : (globalThis as any);
  if (!g.crypto || !g.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  return g.crypto.subtle as SubtleCrypto;
}

export function randomBytes(length = 16): Uint8Array {
  const g: any = typeof window !== 'undefined' ? window : (globalThis as any);
  const buf = new Uint8Array(length);
  g.crypto.getRandomValues(buf);
  return buf;
}

function strToUint8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function uint8ToStr(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const salt = fromB64(saltB64);
  const subtle = getSubtle();
  const keyMaterial = await subtle.importKey(
    'raw',
    strToUint8(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 250_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptText(plaintext: string, passphrase: string): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const subtle = getSubtle();
  const salt = toB64(randomBytes(16));
  const key = await deriveKey(passphrase, salt);
  const ivBytes = randomBytes(12);
  const enc = await subtle.encrypt({ name: 'AES-GCM', iv: ivBytes }, key, strToUint8(plaintext));
  return { ciphertext: toB64(enc), iv: toB64(ivBytes), salt };
}

export async function decryptText(ciphertextB64: string, ivB64: string, saltB64: string, passphrase: string): Promise<string> {
  const subtle = getSubtle();
  const key = await deriveKey(passphrase, saltB64);
  const dec = await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(ivB64) }, key, fromB64(ciphertextB64));
  return uint8ToStr(new Uint8Array(dec));
}

import { encryptText, decryptText } from '../utils/encryption';
import type { Note } from '../types';

let _passphrase: string | null = null;

// Optional async passphrase provider (UI should set this)
let _provider: ((mode: 'set' | 'enter') => Promise<string | null>) | null = null;

export const encryptedNotesService = {
  isUnlocked(): boolean {
    return !!_passphrase;
  },
  setPassphrase(p: string) {
    _passphrase = (p || '').trim() || null;
  },
  clear() {
    _passphrase = null;
  },
  setProvider(fn: (mode: 'set' | 'enter') => Promise<string | null>) {
    _provider = fn;
  },
  async ensurePassphraseForEncrypt(): Promise<string> {
    if (_passphrase) return _passphrase;
    // Ask UI via provider if available
    if (_provider) {
      const p = await _provider('set');
      if (p && p.trim()) {
        _passphrase = p.trim();
        return _passphrase;
      }
    }
    // No provider -> signal to UI
    const err: any = new Error('PASS_REQUIRED_ENCRYPT');
    err.code = 'PASS_REQUIRED_ENCRYPT';
    throw err;
  },
  async ensurePassphraseForDecrypt(): Promise<string> {
    if (_passphrase) return _passphrase;
    if (_provider) {
      const p = await _provider('enter');
      if (p && p.trim()) {
        _passphrase = p.trim();
        return _passphrase;
      }
    }
    const err: any = new Error('PASS_REQUIRED_DECRYPT');
    err.code = 'PASS_REQUIRED_DECRYPT';
    throw err;
  },
  async encrypt(text: string): Promise<{ ciphertext: string; iv: string; salt: string }> {
    const pass = await this.ensurePassphraseForEncrypt();
    return await encryptText(text, pass);
  },
  async decrypt(note: Pick<Note, 'ciphertext' | 'iv' | 'salt'>): Promise<string> {
    if (!note.ciphertext || !note.iv || !note.salt) throw new Error('Eksik şifreli not verisi');
    const pass = await this.ensurePassphraseForDecrypt();
    try {
      return await decryptText(note.ciphertext, note.iv, note.salt, pass);
    } catch (e) {
      // wrong password
      this.clear();
      throw e;
    }
  }
};

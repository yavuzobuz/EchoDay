import { encryptText, decryptText } from '../utils/encryption';
import type { Note } from '../types';

let _passphrase: string | null = null;

function promptSetPassphrase(): string | null {
  const p = window.prompt('Şifreli notlar için bir parola belirleyin (unutmayın!):');
  if (!p || !p.trim()) return null;
  _passphrase = p.trim();
  return _passphrase;
}

function promptEnterPassphrase(): string | null {
  const p = window.prompt('Şifreli notlar için parolanızı girin:');
  if (!p || !p.trim()) return null;
  _passphrase = p.trim();
  return _passphrase;
}

export const encryptedNotesService = {
  isUnlocked(): boolean {
    return !!_passphrase;
  },
  setPassphrase(p: string) {
    _passphrase = p;
  },
  clear() {
    _passphrase = null;
  },
  async ensurePassphraseForEncrypt(): Promise<string> {
    if (_passphrase) return _passphrase;
    const p = promptSetPassphrase();
    if (!p) throw new Error('Parola ayarlanmadı.');
    return p;
  },
  async ensurePassphraseForDecrypt(): Promise<string> {
    if (_passphrase) return _passphrase;
    const p = promptEnterPassphrase();
    if (!p) throw new Error('Parola girilmedi.');
    return p;
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

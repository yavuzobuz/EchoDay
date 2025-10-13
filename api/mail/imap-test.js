import { ImapFlow } from 'imapflow';

export default async function handler(req, res) {
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { host, port = 993, secure = true, user, pass } = req.body || {};

  // Gerekli alanları kontrol et
  if (!host || !user || !pass) {
    return res.status(400).json({ 
      success: false, 
      error: `Eksik bilgiler: ${!host ? 'sunucu adresi ' : ''}${!user ? 'email ' : ''}${!pass ? 'şifre' : ''}`.trim()
    });
  }

  const client = new ImapFlow({ 
    host, 
    port, 
    secure, 
    auth: { user, pass },
    logger: false // Vercel'de log kapatmak performansı artırır
  });

  try {
    await client.connect();
    await client.logout();
    return res.status(200).json({ 
      success: true, 
      data: { ok: true, message: 'Bağlantı başarılı!' } 
    });
  } catch (error) {
    console.error('IMAP bağlantı hatası:', error.message);
    return res.status(400).json({ 
      success: false, 
      error: error.message || 'Bağlantı kurulamadı' 
    });
  }
}
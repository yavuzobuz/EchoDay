import { ImapFlow } from 'imapflow';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { host, port = 993, secure = true, user, pass, mailbox = 'INBOX', limit = 20 } = req.body || {};
  
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
    logger: false
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);
    const total = client.mailbox.exists;
    const start = Math.max(1, total - limit + 1);
    const messages = [];
    
    for await (let msg of client.fetch(`${start}:*`, { 
      envelope: true, 
      internalDate: true, 
      bodyStructure: true, 
      uid: true 
    })) {
      const hasAttachments = !!(msg.bodyStructure?.childNodes || [])
        .find(p => p.disposition && /attachment|inline/i.test(p.disposition.type));
      
      messages.push({
        id: String(msg.uid),
        messageId: String(msg.uid),
        subject: msg.envelope?.subject || '(Konu yok)',
        from: { 
          address: msg.envelope?.from?.[0]?.address || '', 
          name: msg.envelope?.from?.[0]?.name || '' 
        },
        to: [{ 
          address: msg.envelope?.to?.[0]?.address || '', 
          name: msg.envelope?.to?.[0]?.name || '' 
        }],
        date: (msg.internalDate || new Date()).toISOString(),
        snippet: '',
        isRead: false,
        hasAttachments,
      });
    }
    
    lock.release();
    await client.logout();
    
    return res.status(200).json({ 
      success: true, 
      data: messages.reverse() 
    });
  } catch (error) {
    console.error('IMAP liste hatası:', error.message);
    return res.status(400).json({ 
      success: false, 
      error: error.message || 'Emailler alınamadı' 
    });
  }
}
/* Simple Mail Bridge Server (IMAP/POP3) - Dev use only
   WARNING: Do not expose publicly without auth/HTTPS.
*/
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const POP3Client = require('poplib');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const PORT = process.env.MAIL_BRIDGE_PORT || 5123;

// Helpers
function ok(res, data) { return res.json({ success: true, data }); }
function fail(res, error) { console.error(error); return res.status(400).json({ success: false, error: error.message || String(error) }); }

// IMAP: Test connection
app.post('/imap/test', async (req, res) => {
  console.log('[IMAP Test] Request received');
  console.log('[IMAP Test] Request body:', JSON.stringify(req.body));
  console.log('[IMAP Test] Content-Type:', req.get('Content-Type'));
  
  const { host, port = 993, secure = true, user, pass } = req.body || {};

  // Validate required fields for clearer messages
  if (!host || !user || !pass) {
    const error = `Missing required fields: ${!host ? 'host ' : ''}${!user ? 'user ' : ''}${!pass ? 'pass' : ''}`.trim();
    console.error('[IMAP Test] Validation error:', error);
    return res.status(400).json({ 
      success: false, 
      error
    });
  }

  console.log(`[IMAP Test] Attempting connection to ${host}:${port} for user ${user.substring(0, 3)}***`);
  const client = new ImapFlow({ host, port, secure, auth: { user, pass } });
  try {
    await client.connect();
    console.log('[IMAP Test] Connection successful');
    await client.logout();
    ok(res, { ok: true });
  } catch (e) { 
    console.error('[IMAP Test] Connection failed:', e.message);
    fail(res, e); 
  }
});

// IMAP: List messages
app.post('/imap/list', async (req, res) => {
  const { host, port = 993, secure = true, user, pass, mailbox = 'INBOX', limit = 20 } = req.body || {};
  
  // Validate required fields
  if (!host || !user || !pass) {
    return res.status(400).json({ 
      success: false, 
      error: `Missing required fields: ${!host ? 'host ' : ''}${!user ? 'user ' : ''}${!pass ? 'pass' : ''}`.trim() 
    });
  }
  
  const client = new ImapFlow({ host, port, secure, auth: { user, pass } });
  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);
    const total = client.mailbox.exists;
    const start = Math.max(1, total - limit + 1);
    const messages = [];
    // Fetch messages with UID option to get UIDs
    for await (let msg of client.fetch(`${start}:*`, { envelope: true, internalDate: true, bodyStructure: true, uid: true })) {
      const hasAttachments = !!(msg.bodyStructure?.childNodes || []).find(p => p.disposition && /attachment|inline/i.test(p.disposition.type));
      messages.push({
        id: String(msg.uid),
        messageId: String(msg.uid),
        subject: msg.envelope?.subject || '(No subject)',
        from: { address: msg.envelope?.from?.[0]?.address || '', name: msg.envelope?.from?.[0]?.name || '' },
        to: [{ address: msg.envelope?.to?.[0]?.address || '', name: msg.envelope?.to?.[0]?.name || '' }],
        date: (msg.internalDate || new Date()).toISOString(),
        snippet: '',
        isRead: false,
        hasAttachments,
      });
    }
    lock.release();
    await client.logout();
    ok(res, messages.reverse());
  } catch (e) { fail(res, e); }
});

// IMAP: Message detail (HTML + inline images)
app.post('/imap/message', async (req, res) => {
  const { host, port = 993, secure = true, user, pass, mailbox = 'INBOX', uid } = req.body || {};
  
  console.log('[IMAP] Message request:', { host, port, secure, user: user?.substring(0, 3) + '***', mailbox, uid });
  
  // Validate required fields
  if (!host || !user || !pass || !uid) {
    const error = `Missing required fields: ${!host ? 'host ' : ''}${!user ? 'user ' : ''}${!pass ? 'pass ' : ''}${!uid ? 'uid' : ''}`.trim();
    console.error('[IMAP] Validation error:', error);
    return res.status(400).json({ success: false, error });
  }
  
  const client = new ImapFlow({ host, port, secure, auth: { user, pass } });
  try {
    console.log('[IMAP] Connecting to server...');
    await client.connect();
    console.log('[IMAP] Connected, locking mailbox:', mailbox);
    const lock = await client.getMailboxLock(mailbox);
    console.log('[IMAP] Mailbox locked, downloading message uid:', uid, 'as number:', Number(uid));
    // Fetch the message body using UID
    let buffer = Buffer.alloc(0);
    const { content } = await client.download(String(uid), false, { uid: true });
    
    // content is an async iterable (readable stream)
    for await (const chunk of content) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    
    console.log('[IMAP] Downloaded', buffer.length, 'bytes');
    const parsed = await simpleParser(buffer);

    // Inline attachments (cid)
    const attachments = [];
    const cidMap = {};
    for (const att of parsed.attachments || []) {
      const dataUrl = `data:${att.contentType};base64,${att.content.toString('base64')}`;
      attachments.push({ filename: att.filename, mimeType: att.contentType, size: att.size, contentId: att.cid, inline: !!att.cid, dataUrl });
      if (att.cid) cidMap[att.cid] = dataUrl;
    }
    let html = parsed.html || (parsed.textAsHtml || '');
    if (html) {
      html = html.replace(/src=["']cid:([^"']+)["']/gi, (m, cid) => cidMap[cid] ? `src="${cidMap[cid]}"` : m);
    }
    console.log('[IMAP] Message downloaded successfully');
    lock.release();
    await client.logout();
    ok(res, { bodyHtml: html, attachments });
  } catch (e) { 
    console.error('[IMAP] Error:', e.message || String(e));
    console.error('[IMAP] Stack:', e.stack);
    fail(res, e); 
  }
});

// POP3: Test connection
app.post('/pop/test', async (req, res) => {
  const { host, port = 995, secure = true, user, pass } = req.body || {};
  const client = new POP3Client(port, host, { tlserrs: false, enabletls: secure, debug: false });
  client.on('error', (err) => fail(res, err));
  client.on('connect', () => client.login(user, pass));
  client.on('login', (status) => { status ? ok(res, { ok: true }) : fail(res, new Error('POP3 login failed')); client.quit(); });
});

// POP3: List (headers only)
app.post('/pop/list', async (req, res) => {
  const { host, port = 995, secure = true, user, pass, limit = 20 } = req.body || {};
  const client = new POP3Client(port, host, { tlserrs: false, enabletls: secure, debug: false });
  let total = 0; const messages = [];
  client.on('error', err => fail(res, err));
  client.on('connect', () => client.login(user, pass));
  client.on('login', (status) => {
    if (!status) { fail(res, new Error('POP3 login failed')); client.quit(); return; }
    client.stat();
  });
  client.on('stat', (status, data) => {
    if (!status) { fail(res, new Error('POP3 STAT failed')); client.quit(); return; }
    total = data.count || 0;
    const start = Math.max(1, total - limit + 1);
    // Retrieve headers via TOP
    let idx = total >= start ? total : 0;
    const fetchNext = () => {
      if (idx < start) { ok(res, messages.reverse()); client.quit(); return; }
      client.top(idx, 0); // headers only
    };
    client.on('top', (status, msgnumber, data) => {
      if (status) {
        const subj = (data.match(/^Subject:\s*(.*)$/im) || [,''])[1];
        const from = (data.match(/^From:\s*(.*)$/im) || [,''])[1];
        const date = (data.match(/^Date:\s*(.*)$/im) || [,''])[1];
        messages.push({ id: String(msgnumber), messageId: String(msgnumber), subject: subj || '(No subject)', from: { address: from }, to: [], date: new Date(date || Date.now()).toISOString(), snippet: '', isRead: true, hasAttachments: false });
      }
      idx -= 1; fetchNext();
    });
    fetchNext();
  });
});

app.get('/', (_, res) => res.send('Mail bridge is running'));

app.listen(PORT, () => console.log(`[mail-bridge] listening on http://localhost:${PORT}`));

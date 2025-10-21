/* Simple Mail Bridge Server (IMAP/POP3) - Dev use only
   WARNING: Do not expose publicly without auth/HTTPS.
*/
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max
const XLSX = require('xlsx');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const POP3Client = require('poplib');
const nodemailer = require('nodemailer');
const Sugg = require('./suggestions.cjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.MAIL_BRIDGE_PORT || 5123;

// Helpers
function ok(res, data) { return res.json({ success: true, data }); }
function fail(res, error) { console.error(error); return res.status(400).json({ success: false, error: error.message || String(error) }); }

// Local task factory (mock persistence)
function createTaskForUser(userId, payload) {
  const { title, description, source, priority, date, tags, meta } = payload || {};
  const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const task = {
    id,
    title,
    description: description || '',
    source: source || 'api',
    priority: priority || 'medium',
    date: date || new Date().toISOString(),
    tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(/[,;]+/).map(s=>s.trim()).filter(Boolean) : []),
    meta: meta || {},
    userId: userId || 'demo',
    completed: false,
    createdAt: new Date().toISOString()
  };
  try {
    Sugg.onTaskCreated(task.userId, `${task.title} ${task.description}`, task.date, task.meta?.location || null);
  } catch (e) {
    console.warn('[SUGG] onTaskCreated hook failed:', e?.message || e);
  }
  return task;
}

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
    
    // ImapFlow download method fix - use UID directly as number
    const uidNumber = Number(uid);
    console.log('[IMAP] Using UID number:', uidNumber);
    const { content } = await client.download(uidNumber, false, { uid: true });
    
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

// SMTP: Send email
app.post('/smtp/send', async (req, res) => {
  const { host, port = 587, secure = false, user, pass, from, to, subject, text, html, inReplyTo, references, attachments } = req.body || {};
  
  console.log('[SMTP Send] Request received');
  
  // Validate required fields
  if (!host || !user || !pass || !from || !to || !subject) {
    const error = `Missing required fields: ${!host ? 'host ' : ''}${!user ? 'user ' : ''}${!pass ? 'pass ' : ''}${!from ? 'from ' : ''}${!to ? 'to ' : ''}${!subject ? 'subject' : ''}`.trim();
    console.error('[SMTP Send] Validation error:', error);
    return res.status(400).json({ success: false, error });
  }
  
  try {
    console.log(`[SMTP Send] Creating transport for ${host}:${port}`);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false // For self-signed certs in dev
      }
    });
    
    const mailOptions = {
      from,
      to,
      subject,
      text,
      html,
      inReplyTo,
      references
    };
    
    // Add attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      mailOptions.attachments = attachments.map(att => ({
        filename: att.name,
        content: att.data, // Base64 string
        encoding: 'base64'
      }));
      console.log(`[SMTP Send] Added ${attachments.length} attachments`);
    }
    
    console.log('[SMTP Send] Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('[SMTP Send] Email sent:', info.messageId);
    
    ok(res, { messageId: info.messageId });
  } catch (e) {
    console.error('[SMTP Send] Error:', e.message);
    fail(res, e);
  }
});

// API: Create task (also triggers suggestion engine)
app.post('/api/tasks', async (req, res) => {
  try {
    const { user_id = 'demo', title, description, source, priority, date, tags, meta, location } = req.body || {};
    if (!title) return res.status(400).json({ success: false, error: 'title is required' });

    console.log('[API] Task creation request:', { user_id, title, source });

    const task = createTaskForUser(user_id, { title, description, source: source || 'webhook', priority, date, tags, meta: { ...(meta||{}), location: location || (meta?.location) } });
    console.log('[API] Task created:', task.id);
    return res.json({ success: true, task });
  } catch (e) {
    console.error('[API] Task creation error:', e.message || String(e));
    return res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// API: Get next suggestions for a user
app.post('/api/suggestions/next', async (req, res) => {
  try {
    const { user_id = 'demo', limit = 5 } = req.body || {};
    const items = Sugg.getSuggestions(user_id, Math.max(1, Math.min(20, Number(limit)||5)));
    return res.json({ success: true, suggestions: items });
  } catch (e) {
    console.error('[API] Suggestions next error:', e.message || String(e));
    return res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// API: Apply a suggestion (1-click -> add tasks)
app.post('/api/suggestions/apply', async (req, res) => {
  try {
    const { user_id = 'demo', suggestion_id } = req.body || {};
    if (!suggestion_id) return res.status(400).json({ success: false, error: 'suggestion_id is required' });
    const sug = Sugg.getSuggestionById(user_id, suggestion_id);
    if (!sug) return res.status(404).json({ success: false, error: 'Suggestion not found' });

    const createdIds = [];
    for (const act of sug.actions || []) {
      if (act.type === 'add_tasks' && Array.isArray(act.tasks)) {
        for (const t of act.tasks) {
          if (!t?.title) continue;
          const task = createTaskForUser(user_id, t);
          createdIds.push(task.id);
        }
      }
    }
    Sugg.removeSuggestionById(user_id, suggestion_id);
    return res.json({ success: true, created_task_ids: createdIds });
  } catch (e) {
    console.error('[API] Suggestions apply error:', e.message || String(e));
    return res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// API: Import tasks (rows[] or excelBase64)
app.post('/api/tasks/import', async (req, res) => {
  try {
    const { user_id = 'demo', rows, excelBase64, sheet, column_map } = req.body || {};
    let parsed = [];
    if (Array.isArray(rows)) {
      parsed = rows;
    } else if (excelBase64) {
      let XLSX;
      try { XLSX = require('xlsx'); } catch (e) {
        return res.status(501).json({ success: false, error: 'xlsx module not installed. Run: npm i xlsx' });
      }
      const buf = Buffer.from(excelBase64, 'base64');
      const wb = XLSX.read(buf, { type: 'buffer' });
      const ws = wb.Sheets[sheet || wb.SheetNames[0]];
      if (!ws) return res.status(400).json({ success: false, error: 'Sheet not found' });
      parsed = XLSX.utils.sheet_to_json(ws);
    } else {
      return res.status(400).json({ success: false, error: 'rows or excelBase64 is required' });
    }

    const map = Object.assign({ title: 'title', due_date: 'due_date', case_no: 'case_no', tags: 'tags' }, column_map || {});
    const createdIds = [];
    for (const r of parsed) {
      const title = r?.[map.title];
      if (!title) continue;
      const rawDate = r?.[map.due_date];
      const dt = rawDate ? new Date(rawDate) : null;
      const payload = {
        title,
        date: dt && !isNaN(dt) ? dt.toISOString() : undefined,
        tags: r?.[map.tags] ? String(r[map.tags]).split(/[,;]+/).map(s=>s.trim()).filter(Boolean) : [],
        meta: {}
      };
      if (map.case_no && r?.[map.case_no]) payload.meta.case_no = r[map.case_no];
      const task = createTaskForUser(user_id, payload);
      createdIds.push(task.id);
    }
    return res.json({ success: true, created_task_ids: createdIds, count: createdIds.length });
  } catch (e) {
    console.error('[API] Tasks import error:', e.message || String(e));
    return res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// API: Generate case suggestions for due cases within N days
app.post('/api/suggestions/check-cases', async (req, res) => {
  try {
    const { user_id = 'demo', within_days = 1 } = req.body || {};
    const created = Sugg.collectDueCaseSuggestions(user_id, Number(within_days) || 1);
    return res.json({ success: true, created_suggestion_ids: created.map(s => s.suggestion_id) });
  } catch (e) {
    console.error('[API] Check cases error:', e.message || String(e));
    return res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// File upload page short link
app.get('/import', (req, res) => {
  res.redirect('/import.html');
});

// API: Multipart Excel upload (with group task option)
app.post('/api/tasks/import-upload', upload.single('file'), async (req, res) => {
  try {
    console.log('[Import-Upload] Request received');
    console.log('[Import-Upload] req.file:', req.file ? { name: req.file.originalname, size: req.file.size } : 'NO FILE');
    console.log('[Import-Upload] req.body:', req.body);
    
    const user_id = req.body.user_id || 'demo';
    if (!req.file) {
      console.error('[Import-Upload] No file provided');
      return res.status(400).json({ success: false, error: 'file is required' });
    }
    const sheet = req.body.sheet;
    const groupByDate = req.body.group_by_date === 'true' || req.body.group_by_date === true; // grup oluştur
    const groupByColumn = req.body.group_by_column; // hangi sütuna göre
    const map = {
      title: req.body.map_title || 'title',
      due_date: req.body.map_due_date || 'due_date',
      case_no: req.body.map_case_no || 'case_no',
      tags: req.body.map_tags || 'tags',
    };

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[sheet || wb.SheetNames[0]];
    if (!ws) return res.status(400).json({ success: false, error: 'Sheet not found' });
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

    const createdIds = [];
    
    if (groupByDate) {
      // Tarih bazında grupla
      const groups = {};
      for (const r of rows) {
        const title = r?.[map.title];
        if (!title) continue;
        const rawDate = r?.[map.due_date];
        const key = rawDate ? new Date(rawDate).toISOString().split('T')[0] : 'Tarihsiz';
        if (!groups[key]) groups[key] = [];
        groups[key].push(title);
      }
      // Her grup için bir görev oluştur
      for (const [dateKey, items] of Object.entries(groups)) {
        const groupTitle = `${dateKey} - ${items.length} kişi/görev`;
        const groupDesc = items.join(', ');
        const task = createTaskForUser(user_id, {
          title: groupTitle,
          description: groupDesc,
          date: new Date(dateKey).toISOString(),
          tags: ['grup-görev', 'excel-import'],
          meta: { item_count: items.length, items }
        });
        createdIds.push(task.id);
      }
    } else {
      // Tek tek görev
      for (const r of rows) {
        const title = r?.[map.title];
        if (!title) continue;
        const rawDate = r?.[map.due_date];
        let dtISO;
        if (rawDate) {
          const dt = new Date(rawDate);
          if (!isNaN(dt)) dtISO = dt.toISOString();
        }
        const payload = {
          title,
          date: dtISO,
          tags: r?.[map.tags] ? String(r[map.tags]).split(/[,;]+/).map(s=>s.trim()).filter(Boolean) : [],
          meta: {}
        };
        if (map.case_no && r?.[map.case_no]) payload.meta.case_no = r[map.case_no];
        const task = createTaskForUser(user_id, payload);
        createdIds.push(task.id);
      }
    }
    return res.json({ success: true, created_task_ids: createdIds, count: createdIds.length, grouped: groupByDate });
  } catch (e) {
    console.error('[API] Import-upload error:', e.message || String(e));
    return res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// API: Import Excel by URL (for chat attachments with signed URLs)
app.post('/api/tasks/import-from-url', async (req, res) => {
  try {
    const { user_id = 'demo', file_url, sheet, column_map } = req.body || {};
    if (!file_url) return res.status(400).json({ success: false, error: 'file_url is required' });
    const r = await fetch(file_url);
    if (!r.ok) return res.status(400).json({ success: false, error: `fetch failed: ${r.status}` });
    const buf = Buffer.from(await r.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[sheet || wb.SheetNames[0]];
    if (!ws) return res.status(400).json({ success: false, error: 'Sheet not found' });
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

    const map = Object.assign({ title: 'title', due_date: 'due_date', case_no: 'case_no', tags: 'tags' }, column_map || {});
    const createdIds = [];
    for (const r of rows) {
      const title = r?.[map.title];
      if (!title) continue;
      const rawDate = r?.[map.due_date];
      let dtISO;
      if (rawDate) {
        const dt = new Date(rawDate);
        if (!isNaN(dt)) dtISO = dt.toISOString();
      }
      const payload = {
        title,
        date: dtISO,
        tags: r?.[map.tags] ? String(r[map.tags]).split(/[,;]+/).map(s=>s.trim()).filter(Boolean) : [],
        meta: {}
      };
      if (map.case_no && r?.[map.case_no]) payload.meta.case_no = r[map.case_no];
      const task = createTaskForUser(user_id, payload);
      createdIds.push(task.id);
    }
    return res.json({ success: true, created_task_ids: createdIds, count: createdIds.length });
  } catch (e) {
    console.error('[API] Import-from-url error:', e.message || String(e));
    return res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// Generic Webhook Proxy (DEV ONLY)
// WARNING: Do not expose publicly. No auth/validation.
app.post('/proxy/webhook', async (req, res) => {
  try {
    const { url, payload, headers } = req.body || {};
    if (!url) return res.status(400).json({ success: false, error: 'url is required' });

    console.log('[Proxy] Forwarding to:', url);
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {})
      },
      body: JSON.stringify(payload ?? {})
    });

    const text = await resp.text();
    return res.status(resp.status).json({ success: resp.ok, status: resp.status, body: text });
  } catch (e) {
    console.error('[Proxy] Error:', e.message || String(e));
    return res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

app.get('/', (_, res) => res.send('Mail bridge is running'));

app.listen(PORT, '0.0.0.0', () => console.log(`[mail-bridge] listening on http://0.0.0.0:${PORT}`));

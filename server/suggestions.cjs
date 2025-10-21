/* Suggestion engine (in-memory, dev-only)
   Provides: topic tracking (e.g., "gitar"), legal case tracking (e.g., 2025/123),
   event bundle + case deadline suggestions, and suggestion queue per user.
*/

const store = {
  topicScores: new Map(),       // userId -> { [topic]: number }
  cases: new Map(),             // userId -> Map(caseNo -> { caseNo, dueAtISO })
  suggestions: new Map(),       // userId -> [suggestion]
  cooldowns: new Map(),         // userId_topic -> timestamp (ms)
};

function getTopicBucket(userId) {
  if (!store.topicScores.has(userId)) store.topicScores.set(userId, {});
  return store.topicScores.get(userId);
}
function getCaseBucket(userId) {
  if (!store.cases.has(userId)) store.cases.set(userId, new Map());
  return store.cases.get(userId);
}
function getSugQueue(userId) {
  if (!store.suggestions.has(userId)) store.suggestions.set(userId, []);
  return store.suggestions.get(userId);
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// --- Topic & case extraction ---
function extractTopics(text) {
  const topics = [];
  if (!text) return topics;
  const t = String(text).toLowerCase();
  if (/\bgitar\b|\bguitar\b/.test(t)) topics.push('gitar');
  return topics;
}
function parseCaseNo(text) {
  if (!text) return null;
  const m = String(text).match(/\b(\d{4}\/\d+)\b/);
  return m ? m[1] : null;
}

function updateTopicScores(userId, topics, inc = 1) {
  const bucket = getTopicBucket(userId);
  for (const tp of topics) bucket[tp] = (bucket[tp] || 0) + inc;
  return bucket;
}
function topicScore(userId, topic) {
  const bucket = getTopicBucket(userId);
  return bucket[topic] || 0;
}

// --- Suggestion queue ---
function enqueueSuggestion(userId, suggestion) {
  const q = getSugQueue(userId);
  const sug = { suggestion_id: suggestion.suggestion_id || id('sug'), created_at: new Date().toISOString(), ...suggestion };
  q.push(sug);
  return sug;
}
function getSuggestions(userId, limit = 5) {
  const q = getSugQueue(userId);
  return q.slice(0, limit);
}
function popSuggestions(userId, count = 1) {
  const q = getSugQueue(userId);
  return q.splice(0, count);
}
function getSuggestionById(userId, suggestionId) {
  const q = getSugQueue(userId);
  return q.find(s => s.suggestion_id === suggestionId) || null;
}
function removeSuggestionById(userId, suggestionId) {
  const q = getSugQueue(userId);
  const idx = q.findIndex(s => s.suggestion_id === suggestionId);
  if (idx >= 0) q.splice(idx, 1);
}

// --- Event search (stub/demo) ---
function searchEvents({ query, when = 'this_week', location, limit = 3 }) {
  // Demo data; integrate real providers later.
  const base = [
    { title: 'Akustik Jam Night - Kadıköy', date: offsetISO(3, 18), meta: { location: 'Kadıköy', source: 'demo', event_id: 'ev_akustik' } },
    { title: 'Gitar Atölyesi - Başlangıç/Orta', date: offsetISO(5, 10), meta: { location: 'Şişli', source: 'demo', event_id: 'ev_atolye' } },
    { title: 'Canlı Müzik - Indie Gecesi', date: offsetISO(6, 21), meta: { location: 'Beşiktaş', source: 'demo', event_id: 'ev_indie' } }
  ];
  const items = base
    .filter(e => !query || new RegExp(query, 'i').test(e.title))
    .map(e => ({ ...e, meta: { ...e.meta, location_hint: location || null } }))
    .slice(0, limit);
  return items;
}
function offsetISO(daysFromNow, hour) {
  const d = new Date(); d.setDate(d.getDate() + daysFromNow); d.setHours(hour, 0, 0, 0); return d.toISOString();
}

// --- Suggestion builders ---
function buildEventBundleSuggestion(userId, topic, events) {
  return enqueueSuggestion(userId, {
    type: 'event_bundle',
    title: `Bu hafta ${topic} için öneriler`,
    reason: `${topic} ilgin yüksek görünüyor`,
    actions: [
      {
        type: 'add_tasks',
        tasks: [
          { title: `${capitalize(topic)} Prova (45dk)`, due_at: offsetISO(1, 19), tags: [topic, 'pratik'] },
          ...events.map(e => ({ title: e.title, due_at: e.date, meta: e.meta }))
        ]
      }
    ]
  });
}
function buildCaseCheckSuggestion(userId, caseNo) {
  const now = new Date(); now.setHours(9, 0, 0, 0);
  return enqueueSuggestion(userId, {
    type: 'legal_deadline',
    title: `${caseNo} dosyasının kesinleşmesini bugün kontrol edin`,
    reason: 'Takvim kontrolü',
    actions: [
      {
        type: 'add_tasks',
        tasks: [
          { title: `Kesinleşme kontrolü - ${caseNo}`, due_at: now.toISOString(), meta: { case_no: caseNo } },
          { title: `Karar/dekont yükle - ${caseNo}`, due_at: offsetISO(0, 11) },
          { title: `Müvekkile bilgi ver - ${caseNo}`, due_at: offsetISO(0, 15) }
        ]
      }
    ]
  });
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// --- Case tracking ---
function upsertCase(userId, caseNo, inferredDeadlineISO) {
  const cases = getCaseBucket(userId);
  const rec = cases.get(caseNo) || { caseNo, dueAtISO: null, updatedAt: new Date().toISOString() };
  if (inferredDeadlineISO) rec.dueAtISO = inferredDeadlineISO;
  rec.updatedAt = new Date().toISOString();
  cases.set(caseNo, rec);
  return rec;
}
function collectDueCaseSuggestions(userId, withinDays = 1) {
  const cases = getCaseBucket(userId);
  const now = new Date();
  const max = new Date(); max.setDate(now.getDate() + withinDays);
  const created = [];
  for (const rec of cases.values()) {
    if (!rec.dueAtISO) continue;
    const due = new Date(rec.dueAtISO);
    if (due >= startOfDay(now) && due <= endOfDay(max)) {
      created.push(buildCaseCheckSuggestion(userId, rec.caseNo));
    }
  }
  return created;
}
function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }

// --- Main hook ---
function onTaskCreated(userId, text, dueAtISO, location) {
  const topics = extractTopics(text);
  updateTopicScores(userId, topics, 1);
  const caseNo = parseCaseNo(text);
  if (caseNo) upsertCase(userId, caseNo, dueAtISO);

  // Event suggestion for frequent topic (with simple cooldown)
  if (topics.includes('gitar')) {
    const score = topicScore(userId, 'gitar');
    const key = `${userId}::gitar`;
    const last = store.cooldowns.get(key) || 0;
    const now = Date.now();
    const COOLDOWN_MS = 1000 * 60 * 60 * 24; // 24h
    if (score >= 5 && now - last > COOLDOWN_MS) {
      const events = searchEvents({ query: 'gitar', when: 'this_week', location, limit: 3 });
      buildEventBundleSuggestion(userId, 'gitar', events);
      store.cooldowns.set(key, now);
    }
  }
}

module.exports = {
  // extraction
  extractTopics, parseCaseNo,
  // scores
  updateTopicScores, topicScore,
  // queue
  enqueueSuggestion, getSuggestions, popSuggestions, getSuggestionById, removeSuggestionById,
  // builders
  buildEventBundleSuggestion, buildCaseCheckSuggestion,
  // cases
  upsertCase, collectDueCaseSuggestions,
  // hook
  onTaskCreated,
};

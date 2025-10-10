// Utility to parse Turkish date/time expressions from free text
// Supported patterns:
// - Zaman: 13 Eki 2025 11:00
// - 13 Eki 2025 11:00
// - 13.10.2025 11:00 or 13/10/2025 11:00
// Returns ISO string (local time) or null

export function parseZamanFromText(text?: string): string | null {
  if (!text) return null;
  const s = text.trim();

  // Month mapping (Turkish short names)
  const months: Record<string, number> = {
    'oca': 0, 'ocak': 0,
    'şub': 1, 'sub': 1, 'şubat': 1,
    'mar': 2, 'mart': 2,
    'nis': 3, 'nisan': 3,
    'may': 4, 'mayıs': 4, 'mayis': 4,
    'haz': 5, 'haziran': 5,
    'tem': 6, 'temmuz': 6,
    'ağu': 7, 'agu': 7, 'ağus': 7, 'ağustos': 7, 'agustos': 7,
    'eyl': 8, 'eylül': 8, 'eylul': 8,
    'eki': 9, 'ekim': 9,
    'kas': 10, 'kasım': 10, 'kasim': 10,
    'ara': 11, 'aralık': 11, 'aralik': 11,
  };

  // default time for date-only forms (e.g., Son gün: 16 Ekim 2025)
  const defaultHour = 17; // 17:00 = iş günü sonu varsayımı
  const defaultMinute = 0;

  // Helper to build ISO safely
  const buildISO = (y: number, m: number, d: number, hh?: number, mm?: number) => {
    const dt = new Date(y, m, d, hh ?? defaultHour, mm ?? defaultMinute, 0, 0);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  };

  // 1) Explicit "Zaman:" prefix with textual month (with or without time)
  //    Zaman: 13 Eki 2025 11:00
  //    Zaman: 13 Ekim 2025
  let m: RegExpMatchArray | null = null;
  const zamanRegexWithTime = /zaman\s*:\s*(\d{1,2})\s*([A-Za-zÇÖŞİĞÜçöşığıü]+)\s*(\d{4})\s*(\d{1,2}):(\d{2})/i;
  m = s.match(zamanRegexWithTime);
  if (m) {
    const day = Number(m[1]);
    const monKey = m[2].toLowerCase();
    const year = Number(m[3]);
    const hour = Number(m[4]);
    const min = Number(m[5]);
    const mon = months[monKey];
    if (Number.isInteger(day) && Number.isInteger(year) && mon != null) {
      return buildISO(year, mon, day, hour, min);
    }
  }
  const zamanDateOnly = /zaman\s*:\s*(\d{1,2})\s*([A-Za-zÇÖŞİĞÜçöşığıü]+)\s*(\d{4})(?![^\n]*\d{1,2}[:.]\d{2})/i;
  m = s.match(zamanDateOnly);
  if (m) {
    const day = Number(m[1]);
    const monKey = m[2].toLowerCase();
    const year = Number(m[3]);
    const mon = months[monKey];
    if (Number.isInteger(day) && Number.isInteger(year) && mon != null) {
      return buildISO(year, mon, day);
    }
  }
  const zamanNumericDateOnly = /zaman\s*:\s*(\d{1,2})[./](\d{1,2})[./](\d{4})(?![^\n]*\d{1,2}[:.]\d{2})/i;
  m = s.match(zamanNumericDateOnly);
  if (m) {
    const day = Number(m[1]);
    const mon = Number(m[2]) - 1;
    const year = Number(m[3]);
    return buildISO(year, mon, day);
  }

  // 2) "Son gün/Son tarih/Son ödeme" (deadline) with textual month or numeric date, optional time
  const duePrefix = /(son\s*g[üu]n|son\s*tarih|son\s*[öo]deme|deadline|due)/i;
  const dueTextual = new RegExp(duePrefix.source + "\\s*:?\\s*(\\d{1,2})\\s*([A-Za-zÇÖŞİĞÜçöşığıü]+)\\s*(\\d{4})(?:\\s*(?:saat\\s*)?(\\d{1,2})(?:[:.](\\d{2}))?)?", 'i');
  m = s.match(dueTextual);
  if (m) {
    const day = Number(m[2]);
    const monKey = (m[3] as string).toLowerCase();
    const year = Number(m[4]);
    const hour = m[5] ? Number(m[5]) : defaultHour;
    const min = m[6] ? Number(m[6]) : defaultMinute;
    const mon = months[monKey];
    if (Number.isInteger(day) && Number.isInteger(year) && mon != null) {
      return buildISO(year, mon, day, hour, min);
    }
  }
  const dueNumeric = new RegExp(duePrefix.source + "\\s*:?\\s*(\\d{1,2})[./](\\d{1,2})[./](\\d{4})(?:\\s*(?:saat\\s*)?(\\d{1,2})(?:[:.](\\d{2}))?)?", 'i');
  m = s.match(dueNumeric);
  if (m) {
    const day = Number(m[2]);
    const mon = Number(m[3]) - 1;
    const year = Number(m[4]);
    const hour = m[5] ? Number(m[5]) : defaultHour;
    const min = m[6] ? Number(m[6]) : defaultMinute;
    return buildISO(year, mon, day, hour, min);
  }

  // 3) Textual month without explicit prefix (date + time or date-only)
  const textMonthWithTime = /(\d{1,2})\s*([A-Za-zÇÖŞİĞÜçöşığıü]+)\s*(\d{4})\s*(\d{1,2}):(\d{2})/i;
  m = s.match(textMonthWithTime);
  if (m) {
    const day = Number(m[1]);
    const monKey = m[2].toLowerCase();
    const year = Number(m[3]);
    const hour = Number(m[4]);
    const min = Number(m[5]);
    const mon = months[monKey];
    if (Number.isInteger(day) && Number.isInteger(year) && mon != null) {
      return buildISO(year, mon, day, hour, min);
    }
  }
  const textMonthDateOnly = /(\d{1,2})\s*([A-Za-zÇÖŞİĞÜçöşığıü]+)\s*(\d{4})(?![^\n]*\d{1,2}[:.]\d{2})/i;
  m = s.match(textMonthDateOnly);
  if (m) {
    const day = Number(m[1]);
    const monKey = m[2].toLowerCase();
    const year = Number(m[3]);
    const mon = months[monKey];
    if (Number.isInteger(day) && Number.isInteger(year) && mon != null) {
      return buildISO(year, mon, day);
    }
  }

  // 4) Numeric dd.MM.yyyy HH:mm or dd/MM/yyyy HH:mm
  const numRegex = /(\d{1,2})[./](\d{1,2})[./](\d{4})\s+(\d{1,2}):(\d{2})/;
  m = s.match(numRegex);
  if (m) {
    const day = Number(m[1]);
    const mon = Number(m[2]) - 1; // JS months 0-based
    const year = Number(m[3]);
    const hour = Number(m[4]);
    const min = Number(m[5]);
    return buildISO(year, mon, day, hour, min);
  }
  // Numeric date-only
  const numDateOnly = /(\d{1,2})[./](\d{1,2})[./](\d{4})(?![^\n]*\d{1,2}[:.]\d{2})/;
  m = s.match(numDateOnly);
  if (m) {
    const day = Number(m[1]);
    const mon = Number(m[2]) - 1; // JS months 0-based
    const year = Number(m[3]);
    return buildISO(year, mon, day);
  }

  return null;
}

// Parse relative Turkish expressions like "yarın", "yarına 11:00", "bugün 18:00", "bu akşam"
export function parseRelativeTurkishDateTime(text?: string, baseDate: Date = new Date()): string | null {
  if (!text) return null;
  const s = text.toLowerCase();

  const normalize = (t: string) =>
    t
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'g')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'u')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'c');

  const n = normalize(s);

  // Time inference defaults
  let hour = 10;
  let minute = 0;

  // Named periods
  if (/\bsabah\b/.test(n)) { hour = 9; }
  if (/\boglen|ogle(n)?|oglen\b/.test(n)) { hour = 12; }
  if (/\bogleden\s*sonra\b/.test(n)) { hour = 15; }
  if (/\baksam|aksam\b/.test(n)) { hour = 19; }
  if (/\bgece\b/.test(n)) { hour = 22; }

  // Specific time like "saat 11" or "11:30"
  const timeMatch = n.match(/(?:saat\s*)?(\d{1,2})(?:[:.](\d{2}))?/);
  if (timeMatch) {
    const h = Number(timeMatch[1]);
    const m = timeMatch[2] != null ? Number(timeMatch[2]) : 0;
    if (!isNaN(h) && h >= 0 && h <= 23) {
      hour = h; minute = m;
    }
  }

  // Quarter expressions: "5'e ceyrek kala/var" => 04:45, "5'i ceyrek gece/geciyor" => 05:15
  const quarterTo = n.match(/(?:saat\s*)?(\d{1,2})\s*'?e\s*ceyrek\s*(?:kala|var)\b/);
  if (quarterTo) {
    const h = Number(quarterTo[1]);
    if (!isNaN(h) && h >= 0 && h <= 23) {
      hour = (h + 23) % 24; // previous hour
      minute = 45;
    }
  }
  const quarterPast = n.match(/(?:saat\s*)?(\d{1,2})\s*'?(?:i|yi)\s*ceyrek\s*(?:gece|geciyor|gecti)\b/);
  if (quarterPast) {
    const h = Number(quarterPast[1]);
    if (!isNaN(h) && h >= 0 && h <= 23) {
      hour = h;
      minute = 15;
    }
  }

  // Helper: clamp day to month length
  const clampDay = (y: number, m: number, d: number) => {
    const days = new Date(y, m + 1, 0).getDate();
    return Math.min(Math.max(1, d), days);
  };

  // Hours/minutes later like "3 saat sonra", "15 dakika sonra"
  const numWords: Record<string, number> = { bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, onbir: 11, oniki: 12 };
  const hoursLater = n.match(/\b(bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|onbir|oniki|\d{1,2})\s*saat\s*sonra\b/);
  const minutesLater = n.match(/\b(bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|\d{1,3})\s*(dk|dakika)\s*sonra\b/);
  if (hoursLater || minutesLater) {
    const base = new Date(baseDate);
    if (hoursLater) {
      const val = hoursLater[1];
      const num = /\d/.test(val) ? Number(val) : (numWords[val] || 0);
      if (num > 0) base.setHours(base.getHours() + num);
    }
    if (minutesLater) {
      const val = minutesLater[1];
      const num = /\d/.test(val) ? Number(val) : (numWords[val] || 0);
      if (num > 0) base.setMinutes(base.getMinutes() + num);
    }
    return base.toISOString();
  }

  // "bu ayin 28'i" or "gelecek ayin 5'i"
  const thisMonthMatch = n.match(/\bbu\s*ayin\s*(\d{1,2})(?:['’]?(?:i|inci)?)?(?:\s*(?:saat\s*)?(\d{1,2})(?:[:.](\d{2}))?)?/);
  const nextMonthMatch = n.match(/\b(gelecek|onumuzdeki)\s*ayin\s*(\d{1,2})(?:['’]?(?:i|inci)?)?(?:\s*(?:saat\s*)?(\d{1,2})(?:[:.](\d{2}))?)?/);
  if (thisMonthMatch || nextMonthMatch) {
    const b = new Date(baseDate);
    const set = (y: number, m: number, day: number, hh: number, mm: number) => {
      const clamped = clampDay(y, m, day);
      const dt = new Date(y, m, clamped, hh, mm, 0, 0);
      return dt.toISOString();
    };
    if (thisMonthMatch) {
      const day = Number(thisMonthMatch[1]);
      const hh = thisMonthMatch[2] ? Number(thisMonthMatch[2]) : hour;
      const mm = thisMonthMatch[3] ? Number(thisMonthMatch[3]) : minute;
      const iso = set(b.getFullYear(), b.getMonth(), day, hh, mm);
      const dt = new Date(iso);
      if (dt.getTime() < b.getTime()) {
        // if past, move to next month to avoid past scheduling
        return set(b.getFullYear(), b.getMonth() + 1, day, hh, mm);
      }
      return iso;
    }
    if (nextMonthMatch) {
      const day = Number(nextMonthMatch[2]);
      const hh = nextMonthMatch[3] ? Number(nextMonthMatch[3]) : hour;
      const mm = nextMonthMatch[4] ? Number(nextMonthMatch[4]) : minute;
      return set(b.getFullYear(), b.getMonth() + 1, day, hh, mm);
    }
  }

  // "hafta sonu" → nearest Saturday/Sunday
  if (/\bhafta\s*sonu\b/.test(n)) {
    const b = new Date(baseDate);
    const baseDow = b.getDay();
    const candidates = [6, 0]; // Sat, Sun
    let best: Date | null = null;
    for (const d of candidates) {
      const delta = (d - baseDow + 7) % 7;
      const t = new Date(b);
      t.setDate(b.getDate() + delta);
      t.setHours(hour, minute, 0, 0);
      if (!best || t.getTime() < best.getTime()) best = t;
    }
    return best ? best.toISOString() : null;
  }

  // Day-of-week mapping (JS: 0=Sunday ... 6=Saturday)
  const dowMap: Record<string, number> = {
    'pazar': 0,
    'pazartesi': 1,
    'sali': 2,
    'carsamba': 3,
    'persembe': 4,
    'cuma': 5,
    'cumartesi': 6,
  };

  const dowMatch = n.match(/\b(pazartesi|sali|carsamba|persembe|cuma|cumartesi|pazar)\b/);
  const mentionsNext = /\b(gelecek|onumuzdeki|ertesi|sonraki)\b/.test(n);
  const hasNextWeek = /\bhaftaya\b|\bgelecek\s*hafta\b|\bonumuzdeki\s*hafta\b/.test(n) || mentionsNext;
  const isThisWeek = /\bbu\s*hafta\b/.test(n) || /\bbu\s+(pazartesi|sali|carsamba|persembe|cuma|cumartesi|pazar)\b/.test(n);

  const base = new Date(baseDate);
  base.setSeconds(0,0);

  // Handle "haftaiçi" (next business day Mon-Fri)
  if (/\bhafta\s*i(ci)?\b/.test(n)) {
    let target = new Date(base);
    target.setHours(0,0,0,0);
    // start from next day to avoid picking past today
    for (let i = 1; i <= 7; i++) {
      const d = new Date(target);
      d.setDate(target.getDate() + i);
      const day = d.getDay();
      if (day >= 1 && day <= 5) { // Mon-Fri
        d.setHours(hour, minute, 0, 0);
        return isNaN(d.getTime()) ? null : d.toISOString();
      }
    }
  }

  if (dowMatch) {
    const wantedKey = dowMatch[1] as keyof typeof dowMap;
    const wantedDow = dowMap[wantedKey];
    const baseDow = base.getDay();
    let target = new Date(base);
    target.setHours(0,0,0,0);

    if (hasNextWeek) {
      // Find next Monday (or next week's start), then offset to wanted day
      const nextMondayDelta = ((1 - baseDow + 7) % 7) || 7; // at least +7
      const nextMonday = new Date(target);
      nextMonday.setDate(target.getDate() + nextMondayDelta);
      const deltaFromMon = (wantedDow - 1 + 7) % 7;
      target = new Date(nextMonday);
      target.setDate(nextMonday.getDate() + deltaFromMon);
    } else if (isThisWeek) {
      // Take this week's wanted day (Mon=1). If already passed, pick next week's same day
      const thisMonday = new Date(target);
      thisMonday.setDate(target.getDate() + (baseDow === 0 ? -6 : -baseDow + 1)); // move to Monday of this week
      target = new Date(thisMonday);
      target.setDate(thisMonday.getDate() + ((wantedDow - 1 + 7) % 7));
      if (target.getTime() < base.getTime()) {
        target.setDate(target.getDate() + 7);
      }
    } else {
      // Upcoming occurrence of the wanted day (could be same week)
      let delta = (wantedDow - baseDow + 7) % 7;
      target.setDate(target.getDate() + delta);
    }

    target.setHours(hour, minute, 0, 0);
    return isNaN(target.getTime()) ? null : target.toISOString();
  }

  // Day of month like "ayin 15'i 10:30" or "ayın 15 10:30"
  const dayOfMonth = n.match(/\bay(?:in)?\s*(\d{1,2})(?:['’]?(?:i|inci)?)?(?:\s*(?:saat\s*)?(\d{1,2})(?:[:.](\d{2}))?)?/);
  if (dayOfMonth) {
    const day = Number(dayOfMonth[1]);
    const h = dayOfMonth[2] ? Number(dayOfMonth[2]) : hour;
    const m = dayOfMonth[3] ? Number(dayOfMonth[3]) : minute;
    const dt = new Date(base);
    dt.setHours(0,0,0,0);
    dt.setDate(1); // start of month
    dt.setMonth(base.getMonth());
    dt.setDate(day);
    dt.setHours(h, m, 0, 0);
    if (dt.getTime() < base.getTime()) {
      // move to next month if already passed
      const next = new Date(base);
      next.setMonth(base.getMonth() + 1, 1);
      next.setDate(day);
      next.setHours(h, m, 0, 0);
      return isNaN(next.getTime()) ? null : next.toISOString();
    }
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  // Numeric relative days like "2 gun sonra"
  const wordsMap: Record<string, number> = { bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10 };
  const relDays = n.match(/\b(bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|\d{1,2})\s*gun\s*sonra\b/);
  if (relDays) {
    const val = relDays[1];
    const num = /\d/.test(val) ? Number(val) : (wordsMap[val] || 0);
    if (num > 0) {
      const dt = new Date(base);
      dt.setHours(0,0,0,0);
      dt.setDate(dt.getDate() + num);
      dt.setHours(hour, minute, 0, 0);
      return isNaN(dt.getTime()) ? null : dt.toISOString();
    }
  }

  // Simple relative words (yarin, bugun, yarindan sonra, haftaya)
  let daysToAdd: number | null = null;
  if (/\byarin(a)?\b/.test(n)) daysToAdd = 1;
  else if (/\bbugun\b/.test(n)) daysToAdd = 0;
  else if (/\byarindan\s*sonra\b/.test(n) || /\bobur\s*gun\b/.test(n)) daysToAdd = 2;
  else if (/\bhaftaya\b/.test(n)) daysToAdd = 7;

  if (daysToAdd == null) return null;

  const dt = new Date(base);
  dt.setHours(0,0,0,0);
  dt.setDate(dt.getDate() + daysToAdd);
  dt.setHours(hour, minute, 0, 0);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

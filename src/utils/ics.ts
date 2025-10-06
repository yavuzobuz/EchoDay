export interface ICSOptions {
  calendarName?: string;
  timezone?: string; // IANA TZ, e.g., Europe/Istanbul
}

function formatDateTime(dt: Date): string {
  // Format as local time in floating format (without TZ) to avoid DST mishaps in simple export
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    dt.getFullYear().toString() +
    pad(dt.getMonth() + 1) +
    pad(dt.getDate()) + 'T' +
    pad(dt.getHours()) +
    pad(dt.getMinutes()) +
    pad(dt.getSeconds())
  );
}

export function generateICS(events: Array<{ id: string; title: string; start?: string | null; durationMinutes?: number }>, opts: ICSOptions = {}): string {
  const tz = opts.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const calName = opts.calendarName || 'EchoDay';

  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//EchoDay//EN');
  lines.push(`X-WR-CALNAME:${calName}`);
  lines.push(`X-WR-TIMEZONE:${tz}`);

  const now = new Date();
  const dtstamp = formatDateTime(now) + 'Z';

  events.forEach((e) => {
    const start = e.start ? new Date(e.start) : null;
    if (!start) return;
    const dtStart = formatDateTime(start); // floating local time
    const dur = Math.max(15, e.durationMinutes || 60); // minimum 15 dk
    const end = new Date(start.getTime() + dur * 60 * 1000);
    const dtEnd = formatDateTime(end);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.id}@echoday.local`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function downloadICS(filename: string, icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
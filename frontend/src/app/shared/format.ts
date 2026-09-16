import { Urgency } from '../core/api/models';

export function urgencyClass(u: Urgency): string {
  switch (u) {
    case 'OVERDUE':
      return 'chip bad';
    case 'DUE':
      return 'chip warn';
    case 'DONE':
      return 'chip ok';
    default:
      return 'chip';
  }
}

export function statusClass(s: string): string {
  switch (s) {
    case 'ACTIVE':
      return 'chip ok';
    case 'IN_REPAIR':
      return 'chip warn';
    case 'ARCHIVED':
      return 'chip bad';
    default:
      return 'chip';
  }
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** A fresh Idempotency-Key per create attempt; retries of the same attempt reuse it. */
export function idempotencyKey(): string {
  return crypto.randomUUID();
}

/** RFC 4180 CSV with a UTF-8 BOM so Excel opens it with the right encoding. */
export function toCsv(rows: Record<string, string | number | boolean | null>[]): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const cell = (v: string | number | boolean | null): string => {
    const s = v === null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '\ufeff' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
}

export function downloadText(fileName: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** "3 days ago", "in 2 weeks" for timelines; falls back to the date when the distance is large. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = (new Date(iso).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), 'month');
  return rtf.format(Math.round(diff / (86400 * 365)), 'year');
}

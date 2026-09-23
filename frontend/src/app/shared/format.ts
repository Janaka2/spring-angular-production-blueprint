import { Urgency } from '../core/api/models';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'accent' | '';

const STATUS: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Active', tone: 'ok' },
  IN_REPAIR: { label: 'In repair', tone: 'warn' },
  RETIRED: { label: 'Retired', tone: '' },
  ARCHIVED: { label: 'Archived', tone: 'bad' },
};
const URGENCY: Record<Urgency, { label: string; tone: Tone }> = {
  OVERDUE: { label: 'Overdue', tone: 'bad' },
  DUE: { label: 'Due soon', tone: 'warn' },
  PLANNED: { label: 'Planned', tone: 'info' },
  DONE: { label: 'Done', tone: 'ok' },
  CANCELLED: { label: 'Cancelled', tone: '' },
};
const OPERATION: Record<string, { label: string; icon: string; tone: Tone }> = {
  CREATE: { label: 'Created', icon: 'add', tone: 'ok' },
  UPDATE: { label: 'Updated', icon: 'edit', tone: 'accent' },
  STATUS_CHANGE: { label: 'Status changed', icon: 'swap_horiz', tone: 'warn' },
  ARCHIVE: { label: 'Archived', icon: 'archive', tone: 'bad' },
  RESTORE: { label: 'Restored', icon: 'unarchive', tone: 'ok' },
  DELETE: { label: 'Deleted', icon: 'delete', tone: 'bad' },
  ATTACH: { label: 'File attached', icon: 'attach_file', tone: 'info' },
  DETACH: { label: 'File removed', icon: 'link_off', tone: '' },
};
const CATEGORY_ICON: Record<string, string> = {
  COMPUTER: 'laptop_mac',
  PHONE: 'smartphone',
  VEHICLE: 'directions_car',
  APPLIANCE: 'kitchen',
  EQUIPMENT: 'construction',
  FURNITURE: 'chair',
  OTHER: 'category',
};

export const statusLabel = (s: string): string => STATUS[s]?.label ?? s;
export const urgencyLabel = (u: Urgency): string => URGENCY[u]?.label ?? u;
export const operationLabel = (op: string): string => OPERATION[op]?.label ?? op.replace(/_/g, ' ').toLowerCase();
export const operationIcon = (op: string): string => OPERATION[op]?.icon ?? 'history';
export const operationTone = (op: string): Tone => OPERATION[op]?.tone ?? '';
export const categoryIcon = (code: string | null | undefined): string => CATEGORY_ICON[code ?? ''] ?? 'inventory_2';

/** CSS classes for a status pill: `pill` plus its tone. */
export function statusClass(s: string): string {
  return `pill ${STATUS[s]?.tone ?? ''}`.trim();
}

export function urgencyClass(u: Urgency): string {
  return `pill ${URGENCY[u]?.tone ?? ''}`.trim();
}

/** Two letters for an avatar: "Alice Smith" gives "AS", "alice" gives "AL". */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? '')
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
}

/** Who did it, for people: "you" for the signed-in user, a short id for a user known only by subject, else the name. */
export function actorLabel(actor: string | null | undefined, me: string | null | undefined): string {
  if (!actor) return 'someone';
  if (me && actor === me) return 'you';
  return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(actor) ? `user …${actor.slice(-4)}` : actor;
}

/** Whole days from today to an ISO date (negative when in the past). */
export function daysUntil(isoDate: string, today: Date = new Date()): number {
  const d = new Date(isoDate + (isoDate.length === 10 ? 'T00:00:00' : ''));
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - t.getTime()) / 86400000);
}

/** "today", "tomorrow", "in 5 days", "3 days overdue". */
export function dueLabel(isoDate: string, today: Date = new Date()): string {
  const n = daysUntil(isoDate, today);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n > 1) return `in ${n} days`;
  return n === -1 ? '1 day overdue' : `${-n} days overdue`;
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

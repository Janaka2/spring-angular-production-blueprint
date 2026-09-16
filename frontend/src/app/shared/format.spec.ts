import { relativeTime, toCsv } from './format';

describe('format helpers', () => {
  it('writes RFC 4180 CSV with a BOM and quotes cells that need it', () => {
    const csv = toCsv([
      { name: 'Plain', note: 'a, b', price: 10 },
      { name: 'Quote "x"', note: null, price: 0 },
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('name,note,price');
    expect(lines[1]).toBe('Plain,"a, b",10');
    expect(lines[2]).toBe('"Quote ""x""",,0');
  });

  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('');
  });

  it('describes distances in human words', () => {
    const now = new Date('2026-09-16T12:00:00Z');
    expect(relativeTime('2026-09-16T11:59:30Z', now)).toMatch(/second/);
    expect(relativeTime('2026-09-13T12:00:00Z', now)).toMatch(/3 days ago/);
    expect(relativeTime('2026-10-16T12:00:00Z', now)).toMatch(/in 1 month|next month/);
  });
});

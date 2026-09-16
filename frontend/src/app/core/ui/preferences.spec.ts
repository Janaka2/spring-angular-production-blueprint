import { TestBed } from '@angular/core/testing';
import { PreferencesService } from './preferences';

/** The test runner's DOM has no localStorage; an in-memory one is enough to prove persistence. */
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

describe('PreferencesService', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true });
  });

  it('starts with sane defaults and persists a change', () => {
    const prefs = TestBed.inject(PreferencesService);
    expect(prefs.value()).toEqual({ theme: 'system', density: 'comfortable', pageSize: 20, defaultCurrency: 'CHF' });
    prefs.set('theme', 'dark');
    prefs.set('pageSize', 50);
    TestBed.tick();
    const stored = JSON.parse(localStorage.getItem('assetcare.preferences') ?? '{}') as Record<string, unknown>;
    expect(stored['theme']).toBe('dark');
    expect(stored['pageSize']).toBe(50);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('ignores corrupt or out-of-range stored values', () => {
    localStorage.setItem('assetcare.preferences', JSON.stringify({ theme: 'neon', pageSize: 999, defaultCurrency: 'money' }));
    const prefs = TestBed.inject(PreferencesService);
    expect(prefs.value().theme).toBe('system');
    expect(prefs.value().pageSize).toBe(20);
    expect(prefs.value().defaultCurrency).toBe('CHF');
  });
});

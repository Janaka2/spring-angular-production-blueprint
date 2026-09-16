import { effect, Injectable, signal } from '@angular/core';
import { storage } from './storage';

export type Theme = 'system' | 'light' | 'dark';
export type Density = 'comfortable' | 'compact';

export interface Preferences {
  theme: Theme;
  density: Density;
  pageSize: 10 | 20 | 50;
  defaultCurrency: string;
}

const KEY = 'assetcare.preferences';
const DEFAULTS: Preferences = { theme: 'system', density: 'comfortable', pageSize: 20, defaultCurrency: 'CHF' };

/**
 * Per-browser preferences (theme, density, page size, default currency). Stored locally: they are conveniences, not
 * data, so they need no API and survive nothing but this browser. Applied to <html> as attributes the styles react to.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  readonly value = signal<Preferences>(load());

  constructor() {
    effect(() => {
      const p = this.value();
      storage.set(KEY, JSON.stringify(p));
      const root = document.documentElement;
      root.style.colorScheme = p.theme === 'system' ? 'light dark' : p.theme;
      root.dataset['density'] = p.density;
    });
  }

  set<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
    this.value.update((p) => ({ ...p, [key]: value }));
  }

  reset(): void {
    this.value.set({ ...DEFAULTS });
  }
}

function load(): Preferences {
  try {
    const raw = storage.get(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'system',
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      pageSize: parsed.pageSize === 10 || parsed.pageSize === 50 ? parsed.pageSize : 20,
      defaultCurrency: /^[A-Z]{3}$/.test(parsed.defaultCurrency ?? '') ? (parsed.defaultCurrency as string) : 'CHF',
    };
  } catch {
    return { ...DEFAULTS };
  }
}

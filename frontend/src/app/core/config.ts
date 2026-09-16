import { Injectable, signal } from '@angular/core';

/**
 * Runtime configuration, fetched from /config.json before the app boots.
 * The same container image runs in every environment; only this file (mounted from a ConfigMap) differs.
 */
export interface AppConfig {
  apiUrl: string;
  issuer: string;
  clientId: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly current = signal<AppConfig | null>(null);

  get value(): AppConfig {
    const c = this.current();
    if (!c) throw new Error('configuration not loaded');
    return c;
  }

  async load(): Promise<void> {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`config.json: HTTP ${res.status}`);
    this.current.set((await res.json()) as AppConfig);
  }
}

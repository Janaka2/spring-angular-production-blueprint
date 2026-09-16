import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ConfigService } from './config';

export interface BuildInfo {
  version: string;
  commit: string;
  time: string;
}

/** The running API's version and commit from /actuator/info; shown in the About dialog and the footer. */
@Injectable({ providedIn: 'root' })
export class VersionService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  readonly api = signal<BuildInfo | null>(null);
  readonly ui = signal<string>('1.0.0');
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.http
      .get<{ build?: { version?: string; time?: string }; git?: { commit?: { id?: string } } }>(`${this.config.value.apiUrl}/actuator/info`)
      .subscribe({
        next: (i) =>
          this.api.set({ version: i.build?.version ?? '?', commit: (i.git?.commit?.id ?? '').slice(0, 7), time: i.build?.time ?? '' }),
        error: () => this.api.set(null),
      });
  }
}

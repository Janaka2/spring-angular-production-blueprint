import { Injectable, signal } from '@angular/core';

/** Whether the browser believes it has a network. The shell shows a banner while offline; requests would fail anyway. */
@Injectable({ providedIn: 'root' })
export class Online {
  readonly isOnline = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  constructor() {
    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));
  }
}

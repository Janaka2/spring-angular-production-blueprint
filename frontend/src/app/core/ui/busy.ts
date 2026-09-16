import { HttpInterceptorFn } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

/** Counts in-flight HTTP requests so the shell can show one thin progress bar instead of spinners everywhere. */
@Injectable({ providedIn: 'root' })
export class Busy {
  private readonly inFlight = signal(0);
  readonly active = computed(() => this.inFlight() > 0);

  start(): void {
    this.inFlight.update((n) => n + 1);
  }

  stop(): void {
    this.inFlight.update((n) => Math.max(0, n - 1));
  }
}

export const busyInterceptor: HttpInterceptorFn = (req, next) => {
  const busy = inject(Busy);
  busy.start();
  return next(req).pipe(finalize(() => busy.stop()));
};

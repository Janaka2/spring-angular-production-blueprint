import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Last line of defence for errors nobody caught: log one structured line (the browser console is what a user pastes
 * into a bug report) and tell the person something happened. HTTP errors are already turned into Problem Details by
 * the error interceptor and handled by the screens; they are only logged here if a screen let one escape.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly snackBar = inject(MatSnackBar);

  handleError(error: unknown): void {
    const detail = describe(error);
    console.error('[assetcare]', JSON.stringify({ at: new Date().toISOString(), url: location.pathname, ...detail }));
    if (detail.kind === 'chunk-load') {
      // a new release was deployed while this tab was open: the old bundle names are gone
      this.snackBar
        .open('A new version is available. Reload to continue.', 'Reload', { duration: 15000 })
        .onAction()
        .subscribe(() => location.reload());
      return;
    }
    this.snackBar.open('Something went wrong. If it keeps happening, report it with the time and the page.', 'Dismiss', {
      duration: 8000,
    });
  }
}

export function describe(error: unknown): { kind: string; message: string; requestId?: string; status?: number } {
  const e = error instanceof Error && 'rejection' in error ? (error as { rejection: unknown }).rejection : error;
  if (e instanceof HttpErrorResponse) {
    return {
      kind: 'http',
      status: e.status,
      requestId: e.headers?.get('X-Request-Id') ?? undefined,
      message: e.message,
    };
  }
  if (e instanceof Error) {
    const kind = /ChunkLoadError|Failed to fetch dynamically imported module|Loading chunk/.test(e.message) ? 'chunk-load' : 'runtime';
    return { kind, message: e.message };
  }
  return { kind: 'unknown', message: String(e) };
}

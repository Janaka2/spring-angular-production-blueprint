import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';

/**
 * One place for every toast so wording, duration and tone are consistent. Success is short and dismisses itself;
 * errors stay until read; an action (Undo, Reload) keeps the toast a little longer.
 */
@Injectable({ providedIn: 'root' })
export class Notify {
  private readonly snack = inject(MatSnackBar);

  success(message: string, action?: { label: string; run: () => void }): MatSnackBarRef<TextOnlySnackBar> {
    const ref = this.snack.open(message, action?.label, { duration: action ? 8000 : 3500, panelClass: 'toast-success' });
    if (action) ref.onAction().subscribe(() => action.run());
    return ref;
  }

  info(message: string, action?: { label: string; run: () => void }): MatSnackBarRef<TextOnlySnackBar> {
    const ref = this.snack.open(message, action?.label ?? 'Dismiss', { duration: 6000, panelClass: 'toast-info' });
    if (action) ref.onAction().subscribe(() => action.run());
    return ref;
  }

  error(message: string, action?: { label: string; run: () => void }): MatSnackBarRef<TextOnlySnackBar> {
    const ref = this.snack.open(message, action?.label ?? 'Dismiss', { duration: 10000, panelClass: 'toast-error' });
    if (action) ref.onAction().subscribe(() => action.run());
    return ref;
  }
}

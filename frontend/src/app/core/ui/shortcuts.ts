import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../auth/auth.service';

export interface Shortcut {
  keys: string;
  description: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: 'Ctrl/⌘ K', description: 'Open the command menu' },
  { keys: 'g then d', description: 'Go to the dashboard' },
  { keys: 'g then a', description: 'Go to assets' },
  { keys: 'g then s', description: 'Go to settings' },
  { keys: 'n', description: 'New asset' },
  { keys: '/', description: 'Focus the search field' },
  { keys: '?', description: 'Show this help' },
  { keys: 'Esc', description: 'Close a dialog or clear the search' },
];

/**
 * Keyboard shortcuts for people who live on the keyboard. Never active while typing in a field, so they cannot
 * swallow characters; "g" opens a one-second window for the second key, the GitHub convention.
 */
@Injectable({ providedIn: 'root' })
export class Shortcuts {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private pendingG = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  readonly focusSearch = signal(0);
  readonly openHelp = signal(0);
  readonly openPalette = signal(0);
  private installed = false;

  install(): void {
    if (this.installed) return;
    this.installed = true;
    document.addEventListener('keydown', (e) => this.handle(e));
  }

  private handle(e: KeyboardEvent): void {
    // Ctrl/⌘ K works everywhere, even while typing, as in every app that has a command menu
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.openPalette.update((n) => n + 1);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (typing && e.key !== 'Escape') return;
    if (this.dialog.openDialogs.length > 0) return;

    if (this.pendingG) {
      this.pendingG = false;
      if (this.timer) clearTimeout(this.timer);
      const go: Record<string, string> = { d: '/dashboard', a: '/assets', s: '/settings' };
      const path = go[e.key];
      if (path) {
        e.preventDefault();
        void this.router.navigateByUrl(path);
      }
      return;
    }
    switch (e.key) {
      case 'g':
        this.pendingG = true;
        this.timer = setTimeout(() => (this.pendingG = false), 1000);
        break;
      case 'n':
        if (this.auth.canWrite()) {
          e.preventDefault();
          void this.router.navigateByUrl('/assets/new');
        }
        break;
      case '/':
        e.preventDefault();
        this.focusSearch.update((n) => n + 1);
        break;
      case '?':
        e.preventDefault();
        this.openHelp.update((n) => n + 1);
        break;
      default:
        break;
    }
  }
}

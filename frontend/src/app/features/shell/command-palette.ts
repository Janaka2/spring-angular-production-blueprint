import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { AssetsApi } from '../../core/api/assets.api';
import { Asset } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { PreferencesService } from '../../core/ui/preferences';
import { categoryIcon, statusLabel } from '../../shared/format';

interface Command {
  group: string;
  label: string;
  hint?: string;
  icon: string;
  keys?: string;
  run: () => void;
}

/**
 * The command menu (Ctrl/⌘ K): one keyboard-first place to jump to a page, run an action or find an asset by name,
 * tag or serial. Commands are plain data, so a project built from this template adds its own in one list.
 */
@Component({
  selector: 'app-command-palette',
  imports: [MatIconModule],
  template: `
    <div class="palette">
      <div class="search">
        <mat-icon aria-hidden="true">search</mat-icon>
        <input
          #box
          [value]="query()"
          (input)="onInput(box.value)"
          (keydown)="onKey($event)"
          placeholder="Find an asset or type a command…"
          aria-label="Command"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-results"
          aria-autocomplete="list"
          [attr.aria-activedescendant]="items().length ? 'cmd-' + active() : null"
          autocomplete="off"
          spellcheck="false"
        />
        <kbd>Esc</kbd>
      </div>
      <div class="results" id="palette-results" role="listbox" aria-label="Results">
        @for (item of items(); track $index; let i = $index) {
          @if (i === 0 || items()[i - 1].group !== item.group) {
            <div class="group" role="presentation">{{ item.group }}</div>
          }
          <div
            class="item"
            role="option"
            [id]="'cmd-' + i"
            [attr.aria-selected]="i === active()"
            [class.active]="i === active()"
            tabindex="-1"
            (click)="run(item)"
            (keydown.enter)="run(item)"
            (mousemove)="active.set(i)"
          >
            <span class="ico"
              ><mat-icon aria-hidden="true">{{ item.icon }}</mat-icon></span
            >
            <span class="label">{{ item.label }}</span>
            @if (item.hint) {
              <span class="hint">{{ item.hint }}</span>
            }
            @if (item.keys) {
              <kbd>{{ item.keys }}</kbd>
            }
          </div>
        } @empty {
          <div class="none">No results for “{{ query() }}”</div>
        }
      </div>
      <div class="foot" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> open</span>
        <span class="spacer"></span>
        <span class="brand">AssetCare</span>
      </div>
    </div>
  `,
  styles: `
    .palette {
      display: flex;
      flex-direction: column;
      max-height: min(560px, 72vh);
      background: var(--ac-surface);
    }
    .search {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--ac-border);
      color: var(--ac-text-3);
    }
    .search input {
      flex: 1;
      border: 0;
      outline: 0;
      background: transparent;
      font: 400 16px/1.4 var(--ac-font);
      color: var(--ac-text);
    }
    .search input::placeholder {
      color: var(--ac-text-3);
    }
    .results {
      flex: 1;
      overflow-y: auto;
      padding: 6px;
    }
    .group {
      padding: 10px 12px 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--ac-text-3);
    }
    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 10px;
      cursor: pointer;
      color: var(--ac-text);
    }
    .item.active {
      background: var(--ac-surface-2);
    }
    .ico {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid var(--ac-border);
      background: var(--ac-surface);
      color: var(--ac-text-2);
    }
    .item.active .ico {
      color: var(--ac-accent);
      border-color: color-mix(in srgb, var(--ac-accent) 35%, transparent);
    }
    .ico .mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
    }
    .label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }
    .hint {
      font-size: 12.5px;
      color: var(--ac-text-3);
      white-space: nowrap;
    }
    .none {
      padding: 32px 12px;
      text-align: center;
      color: var(--ac-text-3);
    }
    .foot {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 18px;
      border-top: 1px solid var(--ac-border);
      font-size: 12px;
      color: var(--ac-text-3);
      background: var(--ac-surface-2);
    }
    .foot span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .brand {
      font-weight: 600;
    }
  `,
})
export class CommandPalette {
  private readonly ref = inject(MatDialogRef<CommandPalette>);
  private readonly router = inject(Router);
  private readonly api = inject(AssetsApi);
  private readonly auth = inject(AuthService);
  private readonly prefs = inject(PreferencesService);
  private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

  readonly query = signal('');
  readonly active = signal(0);

  /** Recent assets while the box is empty, matches once something is typed. */
  private readonly assets = toSignal(
    toObservable(this.query).pipe(
      debounceTime(150),
      map((q) => q.trim()),
      distinctUntilChanged(),
      switchMap((q) =>
        this.api
          .list({ search: q, status: '', categoryId: '', includeArchived: false, page: 0, size: q ? 6 : 4, sort: 'updatedAt,desc' })
          .pipe(
            map((p) => ({ q, items: p.items })),
            catchError(() => of({ q, items: [] as Asset[] })),
          ),
      ),
      startWith({ q: '', items: [] as Asset[] }),
    ),
    { initialValue: { q: '', items: [] as Asset[] } },
  );

  private readonly commands = computed<Command[]>(() => {
    const go = (path: string) => () => this.go(path);
    const list: Command[] = [
      { group: 'Go to', label: 'Dashboard', icon: 'space_dashboard', keys: 'G D', run: go('/dashboard') },
      { group: 'Go to', label: 'Assets', icon: 'inventory_2', keys: 'G A', run: go('/assets') },
    ];
    if (this.auth.isAdmin()) list.push({ group: 'Go to', label: 'Categories', icon: 'category', run: go('/admin/categories') });
    list.push({ group: 'Go to', label: 'Settings', icon: 'settings', keys: 'G S', run: go('/settings') });
    if (this.auth.canWrite()) list.push({ group: 'Actions', label: 'Create a new asset', icon: 'add', keys: 'N', run: go('/assets/new') });
    list.push(
      { group: 'Actions', label: 'Maintenance due soon', icon: 'event_upcoming', run: go('/dashboard') },
      { group: 'Actions', label: 'Assets in repair', icon: 'build', run: () => this.go('/assets', { status: 'IN_REPAIR' }) },
      {
        group: 'Actions',
        label: `Switch to ${this.nextTheme()} theme`,
        icon: this.nextTheme() === 'dark' ? 'dark_mode' : this.nextTheme() === 'light' ? 'light_mode' : 'brightness_auto',
        run: () => {
          this.prefs.set('theme', this.nextTheme());
          this.ref.close();
        },
      },
      {
        group: 'Actions',
        label: 'Sign out',
        icon: 'logout',
        run: () => {
          this.ref.close();
          this.auth.logout();
        },
      },
    );
    return list;
  });

  readonly items = computed<Command[]>(() => {
    const q = this.query().trim().toLowerCase();
    const found = this.assets();
    const assets: Command[] = found.items.map((a) => ({
      group: q ? 'Assets' : 'Recent assets',
      label: a.name,
      hint: [a.assetTag, statusLabel(a.status)].filter(Boolean).join(' · '),
      icon: categoryIcon(a.category.code),
      run: () => this.go(`/assets/${a.id}`),
    }));
    const commands = this.commands().filter((c) => !q || c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
    return q
      ? [...assets, ...commands]
      : [...commands.filter((c) => c.group === 'Go to'), ...assets, ...commands.filter((c) => c.group !== 'Go to')];
  });

  constructor() {
    this.ref.afterOpened().subscribe(() => this.box().nativeElement.focus());
  }

  onInput(v: string): void {
    this.query.set(v);
    this.active.set(0);
  }

  onKey(e: KeyboardEvent): void {
    const n = this.items().length;
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      this.active.update((i) => (i + 1) % n);
      this.scrollActive();
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      this.active.update((i) => (i - 1 + n) % n);
      this.scrollActive();
    } else if (e.key === 'Enter' && n) {
      e.preventDefault();
      this.run(this.items()[this.active()]);
    }
  }

  run(c: Command): void {
    c.run();
  }

  private go(path: string, queryParams?: Record<string, string>): void {
    this.ref.close();
    void this.router.navigate([path], { queryParams });
  }

  private nextTheme(): 'system' | 'light' | 'dark' {
    const order = ['system', 'light', 'dark'] as const;
    return order[(order.indexOf(this.prefs.value().theme) + 1) % order.length];
  }

  private scrollActive(): void {
    queueMicrotask(() => document.getElementById('cmd-' + this.active())?.scrollIntoView({ block: 'nearest' }));
  }
}

/** Opens the palette once; a second Ctrl/⌘ K while it is open does nothing. */
export function openCommandPalette(dialog: MatDialog): void {
  if (dialog.openDialogs.some((d) => d.componentInstance instanceof CommandPalette)) return;
  dialog.open(CommandPalette, {
    width: 'min(640px, calc(100vw - 24px))',
    maxWidth: '100vw',
    position: { top: '12vh' },
    panelClass: 'ac-palette-panel',
    autoFocus: false,
    restoreFocus: true,
  });
}

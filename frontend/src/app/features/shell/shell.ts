import { Component, computed, effect, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Busy } from '../../core/ui/busy';
import { Online } from '../../core/ui/online';
import { Shortcuts } from '../../core/ui/shortcuts';
import { PreferencesService } from '../../core/ui/preferences';
import { VersionService } from '../../core/version';
import { HelpDialog } from '../../shared/help-dialog';
import { initials } from '../../shared/format';
import { openCommandPalette } from './command-palette';

interface NavLink {
  path: string;
  label: string;
  icon: string;
}

/**
 * Application frame: a sidebar with the navigation, the command menu and the account (a drawer on phones), one thin
 * progress line for every request, an offline banner, and a footer with the running version. Everything under it
 * needs a login.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <a class="skip" href="#content">Skip to content</a>
    <div class="progress" aria-hidden="true">
      @if (busy.active()) {
        <mat-progress-bar mode="indeterminate" />
      }
    </div>

    @if (handset()) {
      <header class="mobilebar">
        <button mat-icon-button (click)="drawer.set(true)" aria-label="Open navigation" [attr.aria-expanded]="drawer()">
          <mat-icon>menu</mat-icon>
        </button>
        <a routerLink="/dashboard" class="brand" aria-label="AssetCare home">
          <span class="mark"><mat-icon aria-hidden="true">inventory_2</mat-icon></span
          ><span>AssetCare</span>
        </a>
        <span class="spacer"></span>
        <button mat-icon-button (click)="palette()" aria-label="Open command menu"><mat-icon>search</mat-icon></button>
      </header>
    }

    <mat-sidenav-container class="body">
      <mat-sidenav
        class="sidebar"
        [mode]="handset() ? 'over' : 'side'"
        [opened]="!handset() || drawer()"
        [disableClose]="!handset()"
        (closed)="drawer.set(false)"
      >
        <div class="side">
          @if (!handset()) {
            <a routerLink="/dashboard" class="brand" aria-label="AssetCare home">
              <span class="mark"><mat-icon aria-hidden="true">inventory_2</mat-icon></span
              ><span>AssetCare</span>
            </a>
          }
          <button class="cmdk" type="button" (click)="palette()" aria-label="Open command menu">
            <mat-icon aria-hidden="true">search</mat-icon>
            <span>Jump to…</span>
            <kbd>{{ mac ? '⌘' : 'Ctrl' }} K</kbd>
          </button>

          <nav aria-label="Main" class="nav">
            <div class="section" aria-hidden="true">Workspace</div>
            @for (l of links(); track l.path) {
              <a [routerLink]="l.path" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="drawer.set(false)">
                <mat-icon aria-hidden="true">{{ l.icon }}</mat-icon
                ><span>{{ l.label }}</span>
              </a>
            }
          </nav>

          <span class="spacer"></span>

          <nav aria-label="More" class="nav">
            <a routerLink="/settings" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="drawer.set(false)">
              <mat-icon aria-hidden="true">settings</mat-icon><span>Settings</span>
            </a>
            <button type="button" (click)="help()" aria-label="Help and keyboard shortcuts">
              <mat-icon aria-hidden="true">help</mat-icon><span>Help &amp; shortcuts</span>
            </button>
          </nav>

          <button type="button" class="me" [matMenuTriggerFor]="userMenu" aria-label="Account menu">
            <span class="avatar">{{ userInitials() }}</span>
            <span class="who">
              <span class="name">{{ auth.user()?.name }}</span>
              <span class="role">{{ roleLabel() }}</span>
            </span>
            <mat-icon aria-hidden="true">unfold_more</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu" yPosition="above">
            <div class="menu-head">
              <strong>{{ auth.user()?.name }}</strong>
              <span>{{ auth.user()?.roles?.join(' · ') || 'no roles' }}</span>
            </div>
            <a mat-menu-item routerLink="/settings" (click)="drawer.set(false)"><mat-icon>settings</mat-icon>Settings</a>
            <button mat-menu-item (click)="toggleTheme()">
              <mat-icon>{{ themeIcon() }}</mat-icon
              >Theme: {{ prefs.value().theme }}
            </button>
            <button mat-menu-item (click)="auth.logout()"><mat-icon>logout</mat-icon>Sign out</button>
          </mat-menu>
        </div>
      </mat-sidenav>

      <mat-sidenav-content>
        @if (!online.isOnline()) {
          <div class="banner" role="status">
            <mat-icon aria-hidden="true">cloud_off</mat-icon> You are offline. Changes cannot be saved until the connection is back.
          </div>
        }
        <main id="content" tabindex="-1">
          <router-outlet />
        </main>
        <footer class="foot no-print">
          <span
            >AssetCare {{ version.ui() }}
            @if (version.api(); as api) {
              <span> · API {{ api.version }}</span>
            }
          </span>
          <span class="links">
            <a href="https://github.com/Janaka2/spring-angular-production-blueprint" target="_blank" rel="noopener">Documentation</a>
            <button class="linklike" (click)="help()">Help</button>
          </span>
        </footer>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .progress {
      position: fixed;
      inset: 0 0 auto 0;
      height: 2px;
      z-index: 1000;
    }
    .body {
      flex: 1;
    }
    .sidebar {
      width: var(--ac-sidebar-w);
      border-right: 1px solid var(--ac-border) !important;
    }
    .side {
      display: flex;
      flex-direction: column;
      gap: 4px;
      height: 100%;
      padding: 18px 12px 12px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 4px 8px 14px;
      font-size: 15.5px;
      font-weight: 650;
      letter-spacing: -0.015em;
      color: var(--ac-text);
      text-decoration: none;
    }
    .mark {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 9px;
      color: #fff;
      background: var(--ac-accent-gradient);
      box-shadow: 0 6px 16px -6px rgb(99 102 241 / 70%);
    }
    .mark .mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .cmdk {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 36px;
      margin: 0 0 12px;
      padding: 0 8px 0 10px;
      border: 1px solid var(--ac-border);
      border-radius: 10px;
      background: var(--ac-surface-2);
      color: var(--ac-text-3);
      font: 400 13.5px var(--ac-font);
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .cmdk:hover {
      border-color: var(--ac-border-strong);
      color: var(--ac-text-2);
    }
    .cmdk span {
      flex: 1;
      text-align: left;
    }
    .cmdk .mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .section {
      padding: 8px 10px 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--ac-text-3);
    }
    .nav {
      display: grid;
      gap: 2px;
    }
    .nav a,
    .nav button {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 36px;
      padding: 0 10px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--ac-text-2);
      font: 500 13.5px var(--ac-font);
      text-decoration: none;
      cursor: pointer;
      transition:
        background-color 0.12s,
        color 0.12s;
    }
    .nav a:hover,
    .nav button:hover {
      background: var(--ac-surface-2);
      color: var(--ac-text);
    }
    .nav a.active {
      background: var(--ac-surface-2);
      color: var(--ac-text);
    }
    .nav a.active .mat-icon {
      color: var(--ac-accent);
      font-variation-settings:
        'FILL' 1,
        'wght' 400,
        'GRAD' 0,
        'opsz' 20;
    }
    .nav .mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .me {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
      padding: 8px;
      border: 1px solid var(--ac-border);
      border-radius: 12px;
      background: var(--ac-surface);
      color: var(--ac-text-3);
      text-align: left;
      cursor: pointer;
    }
    .me:hover {
      background: var(--ac-surface-2);
    }
    .who {
      flex: 1;
      display: grid;
      min-width: 0;
    }
    .name {
      font-weight: 600;
      font-size: 13px;
      color: var(--ac-text);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .role {
      font-size: 12px;
      color: var(--ac-text-3);
    }
    .menu-head {
      display: grid;
      padding: 10px 16px 8px;
      font-size: 13px;
    }
    .menu-head span {
      font-size: 12px;
      color: var(--ac-text-3);
    }
    .mobilebar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 4px;
      height: 56px;
      padding: 0 8px;
      border-bottom: 1px solid var(--ac-border);
      background: color-mix(in srgb, var(--ac-surface) 85%, transparent);
      backdrop-filter: saturate(1.4) blur(12px);
    }
    .mobilebar .brand {
      padding: 0 4px;
    }
    .spacer {
      flex: 1;
    }
    .banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 40px;
      background: var(--ac-warn-soft);
      color: var(--ac-warn);
      font-weight: 500;
    }
    main {
      outline: none;
      min-height: calc(100vh - 64px);
    }
    .foot {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      max-width: var(--ac-page-max);
      margin: 0 auto;
      padding: 16px 40px 24px;
      font-size: 12px;
      color: var(--ac-text-3);
    }
    .links {
      display: flex;
      gap: 16px;
    }
    .foot a,
    .linklike {
      color: inherit;
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      cursor: pointer;
      text-decoration: none;
    }
    .foot a:hover,
    .linklike:hover {
      color: var(--ac-text);
    }
    .skip {
      position: absolute;
      left: -999px;
      top: 8px;
      z-index: 100;
      background: var(--ac-accent);
      color: var(--ac-on-accent);
      padding: 8px 12px;
      border-radius: 8px;
    }
    .skip:focus {
      left: 8px;
    }
    @media (max-width: 720px) {
      .foot {
        padding: 16px;
      }
      .banner {
        padding: 10px 16px;
      }
    }
  `,
})
export class Shell {
  readonly auth = inject(AuthService);
  readonly busy = inject(Busy);
  readonly online = inject(Online);
  readonly prefs = inject(PreferencesService);
  readonly version = inject(VersionService);
  private readonly shortcuts = inject(Shortcuts);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  readonly drawer = signal(false);
  readonly mac = /Mac|iPhone|iPad/.test(navigator.platform);
  readonly handset = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 960px)')
      .pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  readonly links = computed<NavLink[]>(() => {
    const base: NavLink[] = [
      { path: '/dashboard', label: 'Dashboard', icon: 'space_dashboard' },
      { path: '/assets', label: 'Assets', icon: 'inventory_2' },
    ];
    return this.auth.isAdmin() ? [...base, { path: '/admin/categories', label: 'Categories', icon: 'category' }] : base;
  });
  readonly userInitials = computed(() => initials(this.auth.user()?.name));
  readonly roleLabel = computed(() => (this.auth.isAdmin() ? 'Administrator' : this.auth.isAuditor() ? 'Auditor · read only' : 'Member'));

  constructor() {
    this.shortcuts.install();
    this.version.load();
    effect(() => {
      if (this.shortcuts.openHelp() > 0) this.help();
    });
    effect(() => {
      if (this.shortcuts.openPalette() > 0) this.palette();
    });
    // move focus to the content after navigation so screen readers announce the new page
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      document.getElementById('content')?.focus({ preventScroll: true });
    });
  }

  palette(): void {
    this.drawer.set(false);
    openCommandPalette(this.dialog);
  }

  help(): void {
    if (this.dialog.openDialogs.length === 0) this.dialog.open(HelpDialog, { width: '560px' });
  }

  themeIcon(): string {
    const t = this.prefs.value().theme;
    return t === 'dark' ? 'dark_mode' : t === 'light' ? 'light_mode' : 'brightness_auto';
  }

  toggleTheme(): void {
    const order = ['system', 'light', 'dark'] as const;
    const next = order[(order.indexOf(this.prefs.value().theme) + 1) % order.length];
    this.prefs.set('theme', next);
  }
}

import { Component, effect, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
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

/**
 * Application frame: top bar, navigation (a drawer on phones), one progress bar for every request, an offline banner,
 * the account menu, and a footer with the running version. Everything under it needs a login.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatListModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <a class="skip" href="#content">Skip to content</a>
    <mat-toolbar color="primary" class="top">
      @if (handset()) {
        <button mat-icon-button (click)="drawer.set(!drawer())" aria-label="Open navigation" [attr.aria-expanded]="drawer()">
          <mat-icon>menu</mat-icon>
        </button>
      }
      <a routerLink="/dashboard" class="brand" aria-label="AssetCare home"
        ><mat-icon aria-hidden="true">inventory_2</mat-icon><span>AssetCare</span></a
      >
      @if (!handset()) {
        <nav aria-label="Main">
          @for (l of links(); track l.path) {
            <a mat-button [routerLink]="l.path" routerLinkActive="active" ariaCurrentWhenActive="page">{{ l.label }}</a>
          }
        </nav>
      }
      <span class="spacer"></span>
      <button mat-icon-button (click)="help()" aria-label="Help and keyboard shortcuts" matTooltip="Help (?)">
        <mat-icon>help_outline</mat-icon>
      </button>
      <button mat-button [matMenuTriggerFor]="userMenu" aria-label="Account menu">
        <mat-icon aria-hidden="true">account_circle</mat-icon>
        <span class="hide-sm">{{ auth.user()?.name }}</span>
      </button>
      <mat-menu #userMenu="matMenu">
        <div class="menu-roles">
          {{ auth.user()?.name }}<br /><small>Roles: {{ auth.user()?.roles?.join(', ') || 'none' }}</small>
        </div>
        <a mat-menu-item routerLink="/settings"><mat-icon>settings</mat-icon>Settings</a>
        <button mat-menu-item (click)="toggleTheme()">
          <mat-icon>{{ themeIcon() }}</mat-icon
          >Theme: {{ prefs.value().theme }}
        </button>
        <button mat-menu-item (click)="auth.logout()"><mat-icon>logout</mat-icon>Sign out</button>
      </mat-menu>
    </mat-toolbar>
    <div class="progress" aria-hidden="true">
      @if (busy.active()) {
        <mat-progress-bar mode="indeterminate" />
      }
    </div>
    @if (!online.isOnline()) {
      <div class="banner" role="status">
        <mat-icon aria-hidden="true">cloud_off</mat-icon> You are offline. Changes cannot be saved until the connection is back.
      </div>
    }

    <mat-sidenav-container class="body">
      <mat-sidenav [mode]="handset() ? 'over' : 'side'" [opened]="handset() && drawer()" (closed)="drawer.set(false)" class="drawer">
        <mat-nav-list aria-label="Main">
          @for (l of links(); track l.path) {
            <a mat-list-item [routerLink]="l.path" routerLinkActive="active" (click)="drawer.set(false)">
              <mat-icon matListItemIcon>{{ l.icon }}</mat-icon
              ><span matListItemTitle>{{ l.label }}</span>
            </a>
          }
          <a mat-list-item routerLink="/settings" routerLinkActive="active" (click)="drawer.set(false)">
            <mat-icon matListItemIcon>settings</mat-icon><span matListItemTitle>Settings</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <main id="content" tabindex="-1">
          <router-outlet />
        </main>
        <footer class="foot">
          <span
            >AssetCare {{ version.ui() }}
            @if (version.api(); as api) {
              <span class="muted"> · API {{ api.version }}</span>
            }
          </span>
          <span
            ><a href="https://github.com/Janaka2/spring-angular-production-blueprint" target="_blank" rel="noopener">Documentation</a> ·
            <button class="linklike" (click)="help()">Help</button></span
          >
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
    .top {
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: inherit;
      text-decoration: none;
      font-weight: 500;
      margin-right: 16px;
    }
    nav a.active {
      text-decoration: underline;
      text-underline-offset: 6px;
    }
    .spacer {
      flex: 1;
    }
    .progress {
      height: 4px;
      position: sticky;
      top: 64px;
      z-index: 10;
    }
    .banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .body {
      flex: 1;
    }
    .drawer {
      width: 240px;
    }
    main {
      outline: none;
      min-height: calc(100vh - 160px);
    }
    .menu-roles {
      padding: 8px 16px;
      font-size: 13px;
    }
    .foot {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 16px;
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .foot a,
    .linklike {
      color: inherit;
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      cursor: pointer;
      text-decoration: underline;
    }
    .skip {
      position: absolute;
      left: -999px;
      top: 8px;
      z-index: 100;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      padding: 8px 12px;
      border-radius: 4px;
    }
    .skip:focus {
      left: 8px;
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
  readonly handset = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 720px)')
      .pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  readonly links = signal<{ path: string; label: string; icon: string }[]>([]);

  constructor() {
    this.shortcuts.install();
    this.version.load();
    effect(() => {
      const base = [
        { path: '/dashboard', label: 'Dashboard', icon: 'space_dashboard' },
        { path: '/assets', label: 'Assets', icon: 'inventory_2' },
      ];
      this.links.set(this.auth.isAdmin() ? [...base, { path: '/admin/categories', label: 'Categories', icon: 'category' }] : base);
    });
    effect(() => {
      if (this.shortcuts.openHelp() > 0) this.help();
    });
    // move focus to the content after navigation so screen readers announce the new page
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      document.getElementById('content')?.focus({ preventScroll: true });
    });
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

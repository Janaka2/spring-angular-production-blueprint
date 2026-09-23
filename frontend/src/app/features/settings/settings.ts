import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth/auth.service';
import { Density, PreferencesService, Theme } from '../../core/ui/preferences';
import { SHORTCUTS } from '../../core/ui/shortcuts';
import { VersionService } from '../../core/version';
import { Notify } from '../../core/ui/notify';
import { initials } from '../../shared/format';

/** Who am I, and how do I like the app to look. Preferences are per browser; identity comes from Keycloak. */
@Component({
  selector: 'app-settings',
  imports: [FormsModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page page-narrow">
      <header class="page-title">
        <div>
          <h1>Settings</h1>
          <p class="subtitle">Your account and how AssetCare looks in this browser.</p>
        </div>
      </header>

      <section class="card">
        <div class="card-head"><h2>Account</h2></div>
        <div class="profile">
          <span class="avatar big">{{ userInitials() }}</span>
          <div class="who">
            <strong>{{ auth.user()?.name }}</strong>
            <span class="muted">{{ auth.user()?.roles?.join(' · ') || 'no roles' }}</span>
            <span class="mono faint">{{ auth.user()?.subject }}</span>
          </div>
          <button mat-stroked-button (click)="auth.logout()"><mat-icon>logout</mat-icon> Sign out</button>
        </div>
        <p class="foot-note">Name, email and password are managed in the identity provider, not here.</p>
      </section>

      <section class="card">
        <div class="card-head"><h2>Appearance</h2></div>
        <div class="setting">
          <div>
            <div class="s-title">Theme</div>
            <div class="s-desc">System follows your operating system.</div>
          </div>
          <mat-button-toggle-group
            [value]="prefs.value().theme"
            (change)="setTheme($event.value)"
            aria-label="Theme"
            hideSingleSelectionIndicator
          >
            <mat-button-toggle value="system"><mat-icon>brightness_auto</mat-icon> System</mat-button-toggle>
            <mat-button-toggle value="light"><mat-icon>light_mode</mat-icon> Light</mat-button-toggle>
            <mat-button-toggle value="dark"><mat-icon>dark_mode</mat-icon> Dark</mat-button-toggle>
          </mat-button-toggle-group>
        </div>
        <div class="setting">
          <div>
            <div class="s-title">Density</div>
            <div class="s-desc">Compact fits more rows on the screen.</div>
          </div>
          <mat-button-toggle-group
            [value]="prefs.value().density"
            (change)="setDensity($event.value)"
            aria-label="Density"
            hideSingleSelectionIndicator
          >
            <mat-button-toggle value="comfortable">Comfortable</mat-button-toggle>
            <mat-button-toggle value="compact">Compact</mat-button-toggle>
          </mat-button-toggle-group>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <h2>Defaults</h2>
          <button mat-button (click)="reset()">Reset to defaults</button>
        </div>
        <div class="setting">
          <div>
            <div class="s-title">Rows per page</div>
            <div class="s-desc">How many assets a list page shows.</div>
          </div>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="compact-fields">
            <mat-label>Rows per page</mat-label>
            <mat-select [value]="prefs.value().pageSize" (valueChange)="prefs.set('pageSize', $event)">
              <mat-option [value]="10">10</mat-option>
              <mat-option [value]="20">20</mat-option>
              <mat-option [value]="50">50</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="setting">
          <div>
            <div class="s-title">Default currency</div>
            <div class="s-desc">Three-letter ISO code, used when you enter a price.</div>
          </div>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="compact-fields">
            <mat-label>Default currency</mat-label>
            <input
              matInput
              [ngModel]="prefs.value().defaultCurrency"
              (ngModelChange)="setCurrency($event)"
              maxlength="3"
              style="text-transform: uppercase"
            />
          </mat-form-field>
        </div>
      </section>

      <div class="two">
        <section class="card">
          <div class="card-head"><h2>Keyboard shortcuts</h2></div>
          <dl class="kv card-pad">
            @for (s of shortcuts; track s.keys) {
              <dt>
                <kbd>{{ s.keys }}</kbd>
              </dt>
              <dd>{{ s.description }}</dd>
            }
          </dl>
        </section>
        <section class="card">
          <div class="card-head"><h2>About</h2></div>
          <dl class="kv card-pad">
            <dt>UI version</dt>
            <dd>{{ version.ui() }}</dd>
            <dt>API version</dt>
            <dd>
              @if (version.api(); as api) {
                {{ api.version }} <span class="muted mono">{{ api.commit }}</span>
              } @else {
                <span class="muted">unavailable</span>
              }
            </dd>
          </dl>
        </section>
      </div>
    </div>
  `,
  styles: `
    .page {
      display: grid;
      gap: 16px;
    }
    .page-title {
      margin-bottom: 8px;
    }
    .profile {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      padding: 20px;
    }
    .avatar.big {
      width: 52px;
      height: 52px;
      font-size: 17px;
    }
    .who {
      flex: 1;
      display: grid;
      gap: 2px;
      min-width: 200px;
    }
    .who strong {
      font-size: 15px;
    }
    .foot-note {
      margin: 0;
      padding: 12px 20px;
      border-top: 1px solid var(--ac-border);
      font-size: 12.5px;
      color: var(--ac-text-3);
    }
    .setting {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      padding: 16px 20px;
    }
    .setting + .setting {
      border-top: 1px solid var(--ac-border);
    }
    .s-title {
      font-weight: 500;
    }
    .s-desc {
      font-size: 12.5px;
      color: var(--ac-text-3);
    }
    .setting mat-form-field {
      width: 200px;
    }
    .mat-button-toggle .mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      vertical-align: -4px;
      margin-right: 2px;
    }
    .two {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      align-items: start;
    }
  `,
})
export class Settings {
  readonly userInitials = computed(() => initials(this.auth.user()?.name));
  readonly auth = inject(AuthService);
  readonly prefs = inject(PreferencesService);
  readonly version = inject(VersionService);
  private readonly notify = inject(Notify);
  readonly shortcuts = SHORTCUTS;

  constructor() {
    this.version.load();
  }

  setTheme(v: Theme): void {
    this.prefs.set('theme', v);
  }

  setDensity(v: Density): void {
    this.prefs.set('density', v);
  }

  setCurrency(v: string): void {
    const code = v.toUpperCase();
    if (/^[A-Z]{3}$/.test(code)) this.prefs.set('defaultCurrency', code);
  }

  reset(): void {
    this.prefs.reset();
    this.notify.success('Preferences reset.');
  }
}

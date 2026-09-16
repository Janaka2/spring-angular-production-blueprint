import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { AuthService } from '../../core/auth/auth.service';
import { Density, PreferencesService, Theme } from '../../core/ui/preferences';
import { SHORTCUTS } from '../../core/ui/shortcuts';
import { VersionService } from '../../core/version';
import { Notify } from '../../core/ui/notify';

/** Who am I, and how do I like the app to look. Preferences are per browser; identity comes from Keycloak. */
@Component({
  selector: 'app-settings',
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatListModule,
  ],
  template: `
    <div class="page">
      <div class="page-title"><h1>Settings</h1></div>
      <div class="cards">
        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>Account</mat-card-title></mat-card-header>
          <mat-card-content>
            <dl class="kv">
              <dt>Signed in as</dt>
              <dd>{{ auth.user()?.name }}</dd>
              <dt>Roles</dt>
              <dd>{{ auth.user()?.roles?.join(', ') || 'none' }}</dd>
              <dt>User id</dt>
              <dd class="mono">{{ auth.user()?.subject }}</dd>
            </dl>
            <p class="muted">Name, email and password are managed in the identity provider, not here.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button (click)="auth.logout()">Sign out</button>
          </mat-card-actions>
        </mat-card>

        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>Appearance</mat-card-title></mat-card-header>
          <mat-card-content>
            <p class="label">Theme</p>
            <mat-button-toggle-group [value]="prefs.value().theme" (change)="setTheme($event.value)" aria-label="Theme">
              <mat-button-toggle value="system">System</mat-button-toggle>
              <mat-button-toggle value="light">Light</mat-button-toggle>
              <mat-button-toggle value="dark">Dark</mat-button-toggle>
            </mat-button-toggle-group>
            <p class="label">Density</p>
            <mat-button-toggle-group [value]="prefs.value().density" (change)="setDensity($event.value)" aria-label="Density">
              <mat-button-toggle value="comfortable">Comfortable</mat-button-toggle>
              <mat-button-toggle value="compact">Compact</mat-button-toggle>
            </mat-button-toggle-group>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>Defaults</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline">
              <mat-label>Rows per page</mat-label>
              <mat-select [value]="prefs.value().pageSize" (valueChange)="prefs.set('pageSize', $event)">
                <mat-option [value]="10">10</mat-option>
                <mat-option [value]="20">20</mat-option>
                <mat-option [value]="50">50</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Default currency</mat-label>
              <input
                matInput
                [ngModel]="prefs.value().defaultCurrency"
                (ngModelChange)="setCurrency($event)"
                maxlength="3"
                style="text-transform:uppercase"
              />
              <mat-hint>Three-letter ISO code, used when you enter a price</mat-hint>
            </mat-form-field>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button (click)="reset()">Reset to defaults</button>
          </mat-card-actions>
        </mat-card>

        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>Keyboard shortcuts</mat-card-title></mat-card-header>
          <mat-card-content>
            <dl class="kv">
              @for (s of shortcuts; track s.keys) {
                <dt>
                  <kbd>{{ s.keys }}</kbd>
                </dt>
                <dd>{{ s.description }}</dd>
              }
            </dl>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>About</mat-card-title></mat-card-header>
          <mat-card-content>
            <dl class="kv">
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
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: `
    .label {
      margin: 12px 0 6px;
      color: var(--mat-sys-on-surface-variant);
    }
    .mono {
      font-family: ui-monospace, monospace;
      font-size: 12px;
    }
    kbd {
      font-family: ui-monospace, monospace;
      background: var(--mat-sys-surface-container-high);
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 12px;
    }
    mat-form-field {
      display: block;
      max-width: 280px;
    }
  `,
})
export class Settings {
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

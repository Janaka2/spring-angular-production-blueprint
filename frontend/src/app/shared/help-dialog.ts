import { Component, inject } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { SHORTCUTS } from '../core/ui/shortcuts';
import { VersionService } from '../core/version';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-help-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Help and shortcuts</h2>
    <mat-dialog-content>
      <h3>Keyboard shortcuts</h3>
      <table class="shortcuts" aria-label="Keyboard shortcuts">
        <tbody>
          @for (s of shortcuts; track s.keys) {
            <tr>
              <td>
                <kbd>{{ s.keys }}</kbd>
              </td>
              <td>{{ s.description }}</td>
            </tr>
          }
        </tbody>
      </table>
      <h3>Your roles</h3>
      <p>
        {{ auth.user()?.roles?.join(', ') || 'none' }}.
        <span class="muted"
          >USER manages own assets. ADMIN also manages categories and can restore or permanently delete archived assets. AUDITOR reads
          everything and changes nothing.</span
        >
      </p>
      <h3>About</h3>
      <p class="muted">
        AssetCare UI {{ version.ui() }}
        @if (version.api(); as api) {
          · API {{ api.version }} ({{ api.commit }})
        }
        ·
        <a href="https://github.com/Janaka2/spring-angular-production-blueprint" target="_blank" rel="noopener">Source and documentation</a>
      </p>
      <p class="muted">When reporting a problem, include the time, the page, and the request id shown in the error message.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button mat-dialog-close cdkFocusInitial>Close</button>
    </mat-dialog-actions>
  `,
  styles: `
    h3 {
      font: var(--mat-sys-title-small);
      margin: 12px 0 6px;
    }
    .shortcuts td {
      padding: 2px 12px 2px 0;
    }
    kbd {
      font-family: ui-monospace, monospace;
      background: var(--mat-sys-surface-container-high);
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 12px;
    }
  `,
})
export class HelpDialog {
  readonly shortcuts = SHORTCUTS;
  readonly version = inject(VersionService);
  readonly auth = inject(AuthService);
  constructor() {
    this.version.load();
  }
}

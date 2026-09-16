import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/auth/auth.service';

/** Application frame: toolbar with navigation, the signed-in user and logout. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <mat-toolbar color="primary">
      <a routerLink="/dashboard" class="brand" aria-label="AssetCare home"
        ><mat-icon aria-hidden="true">inventory_2</mat-icon><span>AssetCare</span></a
      >
      <nav aria-label="Main">
        <a mat-button routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a mat-button routerLink="/assets" routerLinkActive="active">Assets</a>
      </nav>
      <span class="spacer"></span>
      <button mat-button [matMenuTriggerFor]="userMenu" aria-label="Account menu">
        <mat-icon aria-hidden="true">account_circle</mat-icon>
        <span class="hide-sm">{{ auth.user()?.name }}</span>
      </button>
      <mat-menu #userMenu="matMenu">
        <div class="menu-roles">Roles: {{ auth.user()?.roles?.join(', ') }}</div>
        <button mat-menu-item (click)="auth.logout()"><mat-icon>logout</mat-icon>Sign out</button>
      </mat-menu>
    </mat-toolbar>
    <main>
      <router-outlet />
    </main>
  `,
  styles: `
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
    .menu-roles {
      padding: 8px 16px;
      font-size: 12px;
      opacity: 0.7;
    }
  `,
})
export class Shell {
  readonly auth = inject(AuthService);
}

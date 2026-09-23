import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `<div class="page">
    <div class="state">
      <span class="halo"><mat-icon aria-hidden="true">explore_off</mat-icon></span>
      <p class="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The address may be wrong, or the item was removed.</p>
      <a mat-flat-button routerLink="/dashboard"><mat-icon>arrow_back</mat-icon> Back to the dashboard</a>
    </div>
  </div>`,
})
export class NotFound {}

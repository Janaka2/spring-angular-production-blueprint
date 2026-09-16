import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `<div class="page state">
    <mat-icon aria-hidden="true">search_off</mat-icon>
    <h1>Page not found</h1>
    <p>The address may be wrong, or the item was removed.</p>
    <a mat-stroked-button routerLink="/dashboard">Back to the dashboard</a>
  </div>`,
})
export class NotFound {}

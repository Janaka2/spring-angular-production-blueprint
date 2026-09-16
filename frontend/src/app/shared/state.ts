import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

/** The three states every list and detail screen has besides "data": loading, empty, error. */
@Component({
  selector: 'app-loading',
  imports: [MatProgressSpinnerModule],
  template: `<div class="state" role="status" aria-live="polite">
    <mat-spinner diameter="36" />
    <p>{{ label() }}</p>
  </div>`,
})
export class Loading {
  readonly label = input('Loading…');
}

@Component({
  selector: 'app-empty',
  imports: [MatIconModule],
  template: `<div class="state">
    <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
    <p>{{ message() }}</p>
    <ng-content />
  </div>`,
})
export class Empty {
  readonly icon = input('inbox');
  readonly message = input('Nothing here yet.');
}

@Component({
  selector: 'app-error-state',
  imports: [MatIconModule, MatButtonModule],
  template: ` <div class="state" role="alert">
    <mat-icon aria-hidden="true">error_outline</mat-icon>
    <p>{{ message() }}</p>
    @if (retry()) {
      <button mat-stroked-button (click)="retry()?.()">Try again</button>
    }
  </div>`,
})
export class ErrorState {
  readonly message = input('Something went wrong.');
  readonly retry = input<(() => void) | undefined>(undefined);
}

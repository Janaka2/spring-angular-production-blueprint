import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/**
 * The states every list and detail screen has besides "data": loading, empty, error.
 * Loading is a skeleton in the shape of what is coming, so the page does not jump when the data arrives.
 */
@Component({
  selector: 'app-loading',
  template: `<div class="loading" role="status" aria-live="polite" [attr.aria-label]="label()">
    @switch (variant()) {
      @case ('table') {
        <div class="sk-table">
          @for (r of rows(); track $index) {
            <div class="sk-row">
              <span class="skeleton sq"></span>
              <span class="grow">
                <span class="skeleton" style="width: 38%; height: 12px"></span>
                <span class="skeleton" style="width: 22%; height: 10px; margin-top: 8px"></span>
              </span>
              <span class="skeleton hide-sm" style="width: 72px; height: 22px; border-radius: 999px"></span>
              <span class="skeleton hide-sm" style="width: 90px; height: 12px"></span>
            </div>
          }
        </div>
      }
      @case ('cards') {
        <div class="sk-cards">
          @for (r of rows(); track $index) {
            <div class="card card-pad">
              <span class="skeleton" style="width: 40%; height: 12px"></span>
              <span class="skeleton" style="width: 30%; height: 28px; margin-top: 14px"></span>
            </div>
          }
        </div>
      }
      @case ('detail') {
        <div class="sk-detail">
          <div class="sk-row">
            <span class="skeleton sq lg"></span>
            <span class="grow">
              <span class="skeleton" style="width: 36%; height: 22px"></span>
              <span class="skeleton" style="width: 24%; height: 12px; margin-top: 10px"></span>
            </span>
          </div>
          <span class="skeleton" style="height: 220px; margin-top: 28px; border-radius: 16px"></span>
        </div>
      }
      @default {
        <div class="sk-lines">
          @for (r of rows(); track $index) {
            <span class="skeleton" [style.width.%]="90 - $index * 12" style="height: 12px"></span>
          }
        </div>
      }
    }
    <span class="sr-only">{{ label() }}</span>
  </div>`,
  styles: `
    .loading {
      padding: 4px 0;
    }
    .sk-table {
      padding: 4px 0;
    }
    .sk-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 20px;
    }
    .sk-table .sk-row + .sk-row {
      border-top: 1px solid var(--ac-border);
    }
    .grow {
      flex: 1;
      display: grid;
    }
    .sq {
      width: 36px;
      height: 36px;
      border-radius: 10px;
    }
    .sq.lg {
      width: 52px;
      height: 52px;
      border-radius: 14px;
    }
    .sk-detail .sk-row {
      padding: 0;
    }
    .sk-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .sk-cards .card {
      display: grid;
    }
    .sk-lines {
      display: grid;
      gap: 12px;
      padding: 20px;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
})
export class Loading {
  readonly label = input('Loading…');
  readonly variant = input<'table' | 'cards' | 'detail' | 'lines'>('lines');
  readonly count = input(4);
  rows(): number[] {
    return Array.from({ length: this.count() });
  }
}

@Component({
  selector: 'app-empty',
  imports: [MatIconModule],
  template: `<div class="state">
    <span class="halo"
      ><mat-icon aria-hidden="true">{{ icon() }}</mat-icon></span
    >
    @if (heading()) {
      <h2>{{ heading() }}</h2>
    }
    <p>{{ message() }}</p>
    <ng-content />
  </div>`,
})
export class Empty {
  readonly icon = input('inbox');
  readonly heading = input<string | null>(null);
  readonly message = input('Nothing here yet.');
}

@Component({
  selector: 'app-error-state',
  imports: [MatIconModule, MatButtonModule],
  template: ` <div class="state" role="alert">
    <span class="halo bad"><mat-icon aria-hidden="true">error</mat-icon></span>
    <h2>Something went wrong</h2>
    <p>{{ message() }}</p>
    @if (retry()) {
      <button mat-stroked-button (click)="retry()?.()"><mat-icon>refresh</mat-icon> Try again</button>
    }
  </div>`,
})
export class ErrorState {
  readonly message = input('Please try again in a moment.');
  readonly retry = input<(() => void) | undefined>(undefined);
}

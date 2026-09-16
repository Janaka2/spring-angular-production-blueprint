import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { AssetsApi } from '../../core/api/assets.api';
import { AuthService } from '../../core/auth/auth.service';
import { Loading, ErrorState } from '../../shared/state';
import { urgencyClass } from '../../shared/format';
import { catchError, map, of, startWith } from 'rxjs';
import { Dashboard as DashboardModel } from '../../core/api/models';

interface State {
  loading: boolean;
  error: boolean;
  data: DashboardModel | null;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, MatCardModule, MatButtonModule, MatIconModule, MatListModule, Loading, ErrorState],
  template: `
    <div class="page">
      <div class="page-title">
        <h1>Hello, {{ auth.user()?.name }}</h1>
        @if (auth.canWrite()) {
          <a mat-flat-button routerLink="/assets/new"><mat-icon>add</mat-icon> New asset</a>
        }
      </div>
      @let s = state();
      @if (s.loading) {
        <app-loading />
      } @else if (s.error || !s.data) {
        <app-error-state message="The dashboard could not be loaded." />
      } @else {
        <div class="cards">
          <mat-card appearance="outlined">
            <mat-card-header><mat-card-title>Assets</mat-card-title></mat-card-header>
            <mat-card-content
              ><p class="big">{{ s.data.assets }}</p>
              <p class="muted">active, in repair or retired</p></mat-card-content
            >
            <mat-card-actions><a mat-button routerLink="/assets">See all</a></mat-card-actions>
          </mat-card>
          <mat-card appearance="outlined">
            <mat-card-header><mat-card-title>Due in the next 30 days</mat-card-title></mat-card-header>
            <mat-card-content>
              @if (s.data.dueSoon.length === 0) {
                <p class="muted">Nothing due. Well maintained.</p>
              } @else {
                <mat-list>
                  @for (m of s.data.dueSoon; track m.id) {
                    <mat-list-item [routerLink]="['/assets', m.assetId]" style="cursor:pointer">
                      <span matListItemTitle>{{ m.description }}</span>
                      <span matListItemLine
                        >{{ m.assetName }} · {{ m.dueDate | date: 'mediumDate' }}
                        <span [class]="urgencyClass(m.urgency)">{{ m.urgency }}</span></span
                      >
                    </mat-list-item>
                  }
                </mat-list>
              }
            </mat-card-content>
          </mat-card>
          <mat-card appearance="outlined">
            <mat-card-header><mat-card-title>Warranties ending within 60 days</mat-card-title></mat-card-header>
            <mat-card-content>
              @if (s.data.warrantyEndingSoon.length === 0) {
                <p class="muted">No warranty is about to end.</p>
              } @else {
                <mat-list>
                  @for (a of s.data.warrantyEndingSoon; track a.id) {
                    <mat-list-item [routerLink]="['/assets', a.id]" style="cursor:pointer">
                      <span matListItemTitle>{{ a.name }}</span>
                      <span matListItemLine>until {{ a.warrantyUntil | date: 'mediumDate' }}</span>
                    </mat-list-item>
                  }
                </mat-list>
              }
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: `
    .big {
      font: var(--mat-sys-display-medium);
      margin: 0;
    }
  `,
})
export class Dashboard {
  readonly auth = inject(AuthService);
  private readonly api = inject(AssetsApi);
  readonly urgencyClass = urgencyClass;
  readonly state = toSignal(
    this.api.dashboard().pipe(
      map((data): State => ({ loading: false, error: false, data })),
      catchError(() => of<State>({ loading: false, error: true, data: null })),
      startWith<State>({ loading: true, error: false, data: null }),
    ),
    { requireSync: true },
  );
}

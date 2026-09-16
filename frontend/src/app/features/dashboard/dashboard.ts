import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { forkJoin } from 'rxjs';
import { AssetsApi } from '../../core/api/assets.api';
import { AuthService } from '../../core/auth/auth.service';
import { Loading, ErrorState } from '../../shared/state';
import { urgencyClass, statusClass, relativeTime } from '../../shared/format';
import { Asset, Dashboard as DashboardModel } from '../../core/api/models';

interface State {
  loading: boolean;
  error: boolean;
  data: (DashboardModel & { byStatus: { status: string; count: number }[]; recent: Asset[] }) | null;
}

/** The morning screen: how many, what is due, what is expiring, what changed last. Every number links to the list it counts. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, MatCardModule, MatButtonModule, MatIconModule, MatListModule, Loading, ErrorState],
  template: `
    <div class="page">
      <div class="page-title">
        <div>
          <h1>Hello, {{ auth.user()?.name }}</h1>
          @if (state().data; as d) {
            <span class="count">{{ d.today | date: 'fullDate' }}</span>
          }
        </div>
        @if (auth.canWrite()) {
          <a mat-flat-button routerLink="/assets/new"><mat-icon>add</mat-icon> New asset</a>
        }
      </div>
      @let s = state();
      @if (s.loading) {
        <app-loading />
      } @else if (s.error || !s.data) {
        <app-error-state message="The dashboard could not be loaded." [retry]="reload" />
      } @else {
        <div class="tiles">
          <a class="tile" routerLink="/assets">
            <span class="big">{{ s.data.assets }}</span
            ><span class="muted">assets in use</span>
          </a>
          @for (b of s.data.byStatus; track b.status) {
            <a class="tile" routerLink="/assets" [queryParams]="{ status: b.status }">
              <span class="big">{{ b.count }}</span
              ><span [class]="statusClass(b.status)">{{ b.status }}</span>
            </a>
          }
          <a class="tile" [class.attention]="s.data.dueSoon.length > 0" routerLink="/assets">
            <span class="big">{{ s.data.dueSoon.length }}</span
            ><span class="muted">due in 30 days</span>
          </a>
        </div>
        <div class="cards">
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
          <mat-card appearance="outlined">
            <mat-card-header><mat-card-title>Recently updated</mat-card-title></mat-card-header>
            <mat-card-content>
              @if (s.data.recent.length === 0) {
                <p class="muted">Nothing yet. Add your first asset.</p>
              } @else {
                <mat-list>
                  @for (a of s.data.recent; track a.id) {
                    <mat-list-item [routerLink]="['/assets', a.id]" style="cursor:pointer">
                      <span matListItemTitle
                        >{{ a.name }} <span [class]="statusClass(a.status)">{{ a.status }}</span></span
                      >
                      <span matListItemLine>{{ relativeTime(a.updatedAt) }} by {{ a.updatedBy }}</span>
                    </mat-list-item>
                  }
                </mat-list>
              }
            </mat-card-content>
            <mat-card-actions><a mat-button routerLink="/assets">See all</a></mat-card-actions>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: `
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .tile {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 14px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      background: var(--mat-sys-surface-container-low);
    }
    .tile:hover {
      background: var(--mat-sys-surface-container);
    }
    .tile.attention {
      border-color: var(--mat-sys-secondary);
    }
    .big {
      font: var(--mat-sys-headline-medium);
    }
  `,
})
export class Dashboard {
  readonly auth = inject(AuthService);
  private readonly api = inject(AssetsApi);
  readonly urgencyClass = urgencyClass;
  readonly statusClass = statusClass;
  readonly relativeTime = relativeTime;
  readonly state = signal<State>({ loading: true, error: false, data: null });

  constructor() {
    this.reload();
  }

  readonly reload = (): void => {
    this.state.set({ loading: true, error: false, data: null });
    const count = (status: 'ACTIVE' | 'IN_REPAIR' | 'RETIRED') => this.api.list({ status, page: 0, size: 1, sort: 'updatedAt,desc' });
    forkJoin({
      dashboard: this.api.dashboard(),
      active: count('ACTIVE'),
      repair: count('IN_REPAIR'),
      retired: count('RETIRED'),
      recent: this.api.list({ page: 0, size: 5, sort: 'updatedAt,desc' }),
    }).subscribe({
      next: (r) =>
        this.state.set({
          loading: false,
          error: false,
          data: {
            ...r.dashboard,
            byStatus: [
              { status: 'ACTIVE', count: r.active.totalItems },
              { status: 'IN_REPAIR', count: r.repair.totalItems },
              { status: 'RETIRED', count: r.retired.totalItems },
            ],
            recent: r.recent.items,
          },
        }),
      error: () => this.state.set({ loading: false, error: true, data: null }),
    });
  };
}

import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { AssetsApi } from '../../core/api/assets.api';
import { AuthService } from '../../core/auth/auth.service';
import { Loading, ErrorState } from '../../shared/state';
import {
  urgencyClass,
  urgencyLabel,
  statusClass,
  statusLabel,
  relativeTime,
  categoryIcon,
  dueLabel,
  daysUntil,
  actorLabel,
} from '../../shared/format';
import { Asset, Dashboard as DashboardModel } from '../../core/api/models';

interface State {
  loading: boolean;
  error: boolean;
  data: (DashboardModel & { byStatus: { status: string; count: number }[]; recent: Asset[] }) | null;
}

/** The morning screen: how many, what is due, what is expiring, what changed last. Every number links to the list it counts. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, Loading, ErrorState],
  template: `
    <div class="page">
      <header class="page-title">
        <div>
          <p class="eyebrow">{{ today | date: 'EEEE, d MMMM y' }}</p>
          <h1>Hello, {{ auth.user()?.name }}</h1>
          <p class="subtitle">{{ summary() }}</p>
        </div>
        @if (auth.canWrite()) {
          <a mat-flat-button routerLink="/assets/new"><mat-icon>add</mat-icon> New asset</a>
        }
      </header>

      @let s = state();
      @if (s.loading) {
        <app-loading variant="cards" [count]="4" label="Loading the dashboard" />
        <div style="height: 16px"></div>
        <div class="card"><app-loading [count]="5" /></div>
      } @else if (s.error || !s.data) {
        <div class="card"><app-error-state message="The dashboard could not be loaded." [retry]="reload" /></div>
      } @else {
        @let d = s.data;
        <section class="stats" aria-label="Key figures">
          <a class="stat card" routerLink="/assets">
            <span class="stat-top"
              ><span class="label">Assets in use</span
              ><span class="tile-icon"><mat-icon aria-hidden="true">inventory_2</mat-icon></span></span
            >
            <span class="value num">{{ d.assets }}</span>
            <span class="note">Not counting archived</span>
          </a>
          <a class="stat card" routerLink="/assets" [queryParams]="{ status: 'ACTIVE' }">
            <span class="stat-top"
              ><span class="label">Active</span><span class="tile-icon ok"><mat-icon aria-hidden="true">check_circle</mat-icon></span></span
            >
            <span class="value num">{{ count('ACTIVE') }}</span>
            <span class="note">{{ share('ACTIVE') }}% of your assets</span>
          </a>
          <a class="stat card" routerLink="/assets" [queryParams]="{ status: 'IN_REPAIR' }">
            <span class="stat-top"
              ><span class="label">In repair</span><span class="tile-icon warn"><mat-icon aria-hidden="true">build</mat-icon></span></span
            >
            <span class="value num">{{ count('IN_REPAIR') }}</span>
            <span class="note">{{ count('IN_REPAIR') ? 'Waiting to come back' : 'Nothing in the workshop' }}</span>
          </a>
          <a class="stat card" [class.alert]="overdue() > 0" routerLink="/assets">
            <span class="stat-top"
              ><span class="label">Due in 30 days</span
              ><span class="tile-icon" [class.bad]="overdue() > 0" [class.neutral]="overdue() === 0"
                ><mat-icon aria-hidden="true">event_upcoming</mat-icon></span
              ></span
            >
            <span class="value num">{{ d.dueSoon.length }}</span>
            <span class="note">{{ overdue() ? overdue() + ' overdue' : 'None overdue' }}</span>
          </a>
        </section>

        @if (total() > 0) {
          <section class="card card-pad overview" aria-label="Status overview">
            <div class="overview-head">
              <h2>Status overview</h2>
              <span class="faint num">{{ total() }} assets</span>
            </div>
            <div class="bar" role="img" [attr.aria-label]="barLabel()">
              @for (b of d.byStatus; track b.status) {
                @if (b.count) {
                  <span [class]="'seg ' + b.status" [style.flex-grow]="b.count"></span>
                }
              }
            </div>
            <ul class="legend">
              @for (b of d.byStatus; track b.status) {
                <li>
                  <a routerLink="/assets" [queryParams]="{ status: b.status }"
                    ><span [class]="'dot ' + b.status"></span>{{ statusLabel(b.status) }} <span class="num faint">{{ b.count }}</span></a
                  >
                </li>
              }
            </ul>
          </section>
        }

        <div class="grid">
          <section class="card">
            <div class="card-head">
              <h2>Upcoming maintenance</h2>
              <span class="hint">Next 30 days</span>
            </div>
            @if (d.dueSoon.length === 0) {
              <div class="mini-empty">
                <span class="tile-icon ok"><mat-icon aria-hidden="true">task_alt</mat-icon></span>
                <div><strong>All clear</strong><br /><span class="muted">Nothing due. Well maintained.</span></div>
              </div>
            } @else {
              <ul class="rows">
                @for (m of d.dueSoon; track m.id) {
                  <li>
                    <a class="row" [routerLink]="['/assets', m.assetId]">
                      <span class="date" [class.late]="m.urgency === 'OVERDUE'"
                        ><span class="mon">{{ m.dueDate | date: 'MMM' }}</span
                        ><span class="day">{{ m.dueDate | date: 'd' }}</span></span
                      >
                      <span class="main">
                        <span class="line1">{{ m.description }}</span>
                        <span class="line2">{{ m.assetName }} · {{ dueLabel(m.dueDate) }}</span>
                      </span>
                      <span [class]="urgencyClass(m.urgency)">{{ urgencyLabel(m.urgency) }}</span>
                    </a>
                  </li>
                }
              </ul>
            }
          </section>

          <div class="stack">
            <section class="card">
              <div class="card-head">
                <h2>Warranties ending</h2>
                <span class="hint">Next 60 days</span>
              </div>
              @if (d.warrantyEndingSoon.length === 0) {
                <div class="mini-empty">
                  <span class="tile-icon neutral"><mat-icon aria-hidden="true">verified_user</mat-icon></span>
                  <div><strong>Nothing expiring</strong><br /><span class="muted">No warranty is about to end.</span></div>
                </div>
              } @else {
                <ul class="rows">
                  @for (a of d.warrantyEndingSoon; track a.id) {
                    <li>
                      <a class="row" [routerLink]="['/assets', a.id]">
                        <span class="tile-icon neutral"><mat-icon aria-hidden="true">verified_user</mat-icon></span>
                        <span class="main">
                          <span class="line1">{{ a.name }}</span>
                          <span class="line2">Ends {{ a.warrantyUntil | date: 'mediumDate' }}</span>
                        </span>
                        <span class="pill warn plain num">{{ daysLeft(a.warrantyUntil) }}</span>
                      </a>
                    </li>
                  }
                </ul>
              }
            </section>

            <section class="card">
              <div class="card-head">
                <h2>Recently updated</h2>
                <a class="see-all" routerLink="/assets">View all</a>
              </div>
              @if (d.recent.length === 0) {
                <div class="mini-empty">
                  <span class="tile-icon"><mat-icon aria-hidden="true">add_box</mat-icon></span>
                  <div><strong>Nothing yet</strong><br /><span class="muted">Add your first asset to get started.</span></div>
                </div>
              } @else {
                <ul class="rows">
                  @for (a of d.recent; track a.id) {
                    <li>
                      <a class="row" [routerLink]="['/assets', a.id]">
                        <span class="tile-icon neutral"
                          ><mat-icon aria-hidden="true">{{ categoryIcon(a.category.code) }}</mat-icon></span
                        >
                        <span class="main">
                          <span class="line1">{{ a.name }}</span>
                          <span class="line2"
                            >{{ relativeTime(a.updatedAt) }} · by {{ actorLabel(a.updatedBy, auth.user()?.subject) }}</span
                          >
                        </span>
                        <span [class]="statusClass(a.status)">{{ statusLabel(a.status) }}</span>
                      </a>
                    </li>
                  }
                </ul>
              }
            </section>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    .stat {
      display: grid;
      gap: 6px;
      padding: 18px 20px;
      color: inherit;
      text-decoration: none;
      transition:
        border-color 0.15s,
        box-shadow 0.15s,
        transform 0.15s var(--ac-ease);
    }
    .stat:hover {
      border-color: var(--ac-border-strong);
      box-shadow: var(--ac-shadow);
      transform: translateY(-1px);
    }
    .stat.alert {
      border-color: color-mix(in srgb, var(--ac-danger) 40%, var(--ac-border));
    }
    .stat-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .label {
      font-size: 13px;
      font-weight: 500;
      color: var(--ac-text-2);
    }
    .value {
      font-size: 32px;
      line-height: 1.1;
      font-weight: 650;
      letter-spacing: -0.03em;
    }
    .note {
      font-size: 12.5px;
      color: var(--ac-text-3);
    }
    .overview {
      margin-bottom: 16px;
    }
    .overview-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .overview h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
    .bar {
      display: flex;
      gap: 3px;
      height: 10px;
    }
    .seg {
      flex-basis: 0;
      border-radius: 999px;
      min-width: 6px;
    }
    .ACTIVE {
      background: var(--ac-success);
    }
    .IN_REPAIR {
      background: var(--ac-warn);
    }
    .RETIRED {
      background: var(--ac-border-strong);
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 20px;
      margin: 14px 0 0;
      padding: 0;
      list-style: none;
      font-size: 13px;
    }
    .legend a {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--ac-text-2);
      text-decoration: none;
    }
    .legend a:hover {
      color: var(--ac-text);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }
    .grid > * {
      min-width: 0;
    }
    .stack {
      min-width: 0;
      display: grid;
      gap: 16px;
    }
    .date {
      display: grid;
      place-items: center;
      flex: none;
      width: 44px;
      height: 46px;
      border-radius: 10px;
      border: 1px solid var(--ac-border);
      background: var(--ac-surface);
      line-height: 1.1;
    }
    .date .mon {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--ac-accent);
    }
    .date .day {
      font-size: 17px;
      font-weight: 650;
    }
    .date.late .mon {
      color: var(--ac-danger);
    }
    .mini-empty {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 22px 20px;
      font-size: 13.5px;
    }
    .see-all {
      font-size: 12.5px;
      font-weight: 500;
      text-decoration: none;
    }
    @media (max-width: 1080px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 720px) {
      .stats {
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .stat {
        padding: 14px;
      }
      .value {
        font-size: 26px;
      }
      .note {
        display: none;
      }
    }
  `,
})
export class Dashboard {
  readonly auth = inject(AuthService);
  private readonly api = inject(AssetsApi);
  readonly urgencyClass = urgencyClass;
  readonly urgencyLabel = urgencyLabel;
  readonly statusClass = statusClass;
  readonly statusLabel = statusLabel;
  readonly relativeTime = relativeTime;
  readonly categoryIcon = categoryIcon;
  readonly dueLabel = dueLabel;
  readonly actorLabel = actorLabel;
  readonly today = new Date();
  readonly state = signal<State>({ loading: true, error: false, data: null });

  readonly total = computed(() => this.state().data?.byStatus.reduce((n, b) => n + b.count, 0) ?? 0);
  readonly overdue = computed(() => this.state().data?.dueSoon.filter((m) => m.urgency === 'OVERDUE').length ?? 0);
  readonly summary = computed(() => {
    const d = this.state().data;
    if (!d) return 'Here is what is happening with your assets.';
    const due = d.dueSoon.length;
    const ending = d.warrantyEndingSoon.length;
    if (this.overdue() > 0) return `${this.overdue()} maintenance ${this.overdue() === 1 ? 'item is' : 'items are'} overdue. Start there.`;
    if (due + ending === 0) return 'Everything is in good shape. Nothing needs your attention.';
    const parts = [
      due ? `${due} maintenance ${due === 1 ? 'item' : 'items'} coming up` : '',
      ending ? `${ending} ${ending === 1 ? 'warranty' : 'warranties'} ending soon` : '',
    ];
    return parts.filter(Boolean).join(' and ') + '.';
  });
  readonly barLabel = computed(
    () =>
      this.state()
        .data?.byStatus.map((b) => `${statusLabel(b.status)} ${b.count}`)
        .join(', ') ?? '',
  );

  constructor() {
    this.reload();
  }

  count(status: string): number {
    return this.state().data?.byStatus.find((b) => b.status === status)?.count ?? 0;
  }

  share(status: string): number {
    return this.total() ? Math.round((this.count(status) / this.total()) * 100) : 0;
  }

  daysLeft(date: string | null): string {
    if (!date) return '';
    const n = daysUntil(date);
    return n <= 0 ? 'today' : `${n} ${n === 1 ? 'day' : 'days'}`;
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

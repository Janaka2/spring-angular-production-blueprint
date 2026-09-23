import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { AssetsApi } from '../../core/api/assets.api';
import { Asset, AssetStatus, Category, Page } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { Loading, Empty, ErrorState } from '../../shared/state';
import { statusClass, statusLabel, categoryIcon, relativeTime, toCsv, downloadText } from '../../shared/format';
import { PreferencesService } from '../../core/ui/preferences';
import { Shortcuts } from '../../core/ui/shortcuts';
import { Notify } from '../../core/ui/notify';

/**
 * Search, filter, sort and paginate assets. Every input is a signal; a computed query drives one HTTP call per change.
 * Reload after navigation keeps the last query in the URL-free state of this component only; deep links open details.
 */
@Component({
  selector: 'app-asset-list',
  imports: [
    RouterLink,
    DatePipe,
    CurrencyPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatMenuModule,
    Loading,
    Empty,
    ErrorState,
  ],
  template: `
    <div class="page">
      <header class="page-title">
        <div>
          <h1>Assets</h1>
          <p class="subtitle" aria-live="polite">
            @if (result().data; as d) {
              {{ d.totalItems }} {{ d.totalItems === 1 ? 'asset' : 'assets' }}
              @if (hasFilter()) {
                matching your filters
              }
            } @else {
              Everything you own, in one place
            }
          </p>
        </div>
        <div class="actions">
          <button mat-icon-button (click)="reload()" aria-label="Refresh" matTooltip="Refresh"><mat-icon>refresh</mat-icon></button>
          <button mat-stroked-button [matMenuTriggerFor]="exportMenu" [disabled]="!result().data?.totalItems" aria-label="Export">
            <mat-icon>download</mat-icon> Export
          </button>
          <mat-menu #exportMenu="matMenu">
            <button mat-menu-item (click)="exportCsv(false)"><mat-icon>description</mat-icon>This page as CSV</button>
            <button mat-menu-item (click)="exportCsv(true)"><mat-icon>dataset</mat-icon>All matching assets as CSV</button>
          </mat-menu>
          @if (auth.canWrite()) {
            <a mat-flat-button routerLink="/assets/new"><mat-icon>add</mat-icon> New asset</a>
          }
        </div>
      </header>

      <div class="filters compact-fields">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search">
          <mat-label>Search</mat-label>
          <mat-icon matPrefix aria-hidden="true">search</mat-icon>
          <input
            matInput
            #searchBox
            [formControl]="search"
            placeholder="Name, tag, serial, manufacturer, model"
            autocomplete="off"
            (keydown.escape)="search.setValue('')"
          />
          @if (search.value) {
            <button matSuffix mat-icon-button aria-label="Clear search" (click)="search.setValue('')"><mat-icon>close</mat-icon></button>
          } @else {
            <kbd matSuffix class="hide-sm" aria-hidden="true">/</kbd>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Status</mat-label>
          <mat-select [value]="status()" (valueChange)="status.set($event); page.set(0)">
            <mat-option value="">Any (not archived)</mat-option>
            <mat-option value="ACTIVE">Active</mat-option>
            <mat-option value="IN_REPAIR">In repair</mat-option>
            <mat-option value="RETIRED">Retired</mat-option>
            <mat-option value="ARCHIVED">Archived</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Category</mat-label>
          <mat-select [value]="categoryId()" (valueChange)="categoryId.set($event); page.set(0)">
            <mat-option value="">All</mat-option>
            @for (c of categories(); track c.id) {
              <mat-option [value]="c.id">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (hasFilter()) {
          <button mat-button (click)="clearFilters()"><mat-icon>filter_alt_off</mat-icon> Clear filters</button>
        }
      </div>

      @let r = result();
      <div class="card table-card" [class.refreshing]="r.loading && !!r.data">
        @if (r.loading && !r.data) {
          <app-loading variant="table" [count]="6" label="Loading assets" />
        } @else if (r.error) {
          <app-error-state message="Assets could not be loaded." [retry]="reload" />
        } @else if (r.data && r.data.totalItems === 0) {
          @if (hasFilter()) {
            <app-empty icon="search_off" heading="Nothing found" message="No assets match these filters.">
              <button mat-stroked-button (click)="clearFilters()">Clear filters</button>
            </app-empty>
          } @else {
            <app-empty
              icon="inventory_2"
              heading="No assets yet"
              message="Add the things you own and AssetCare reminds you when they need care."
            >
              @if (auth.canWrite()) {
                <a mat-flat-button routerLink="/assets/new"><mat-icon>add</mat-icon> Add your first asset</a>
              }
            </app-empty>
          }
        } @else if (r.data) {
          <div class="table-scroll">
            <table
              mat-table
              [dataSource]="r.data.items"
              matSort
              [matSortActive]="sortField()"
              [matSortDirection]="sortDir()"
              (matSortChange)="onSort($event)"
              aria-label="Assets"
            >
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                <td mat-cell *matCellDef="let a">
                  <div class="cell-main">
                    <span class="tile-icon neutral"
                      ><mat-icon aria-hidden="true">{{ categoryIcon(a.category.code) }}</mat-icon></span
                    >
                    <div>
                      <strong>{{ a.name }}</strong>
                      @if (a.manufacturer || a.model) {
                        <div class="sub">{{ a.manufacturer }} {{ a.model }}</div>
                      }
                    </div>
                  </div>
                </td>
              </ng-container>
              <ng-container matColumnDef="assetTag">
                <th mat-header-cell *matHeaderCellDef class="hide-sm">Tag</th>
                <td mat-cell *matCellDef="let a" class="hide-sm">
                  @if (a.assetTag) {
                    <span class="mono muted">{{ a.assetTag }}</span>
                  } @else {
                    <span class="faint">—</span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef class="hide-sm">Category</th>
                <td mat-cell *matCellDef="let a" class="hide-sm muted">{{ a.category.name }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let a">
                  <span [class]="statusClass(a.status)">{{ statusLabel(a.status) }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="warrantyUntil">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="hide-sm">Warranty</th>
                <td mat-cell *matCellDef="let a" class="hide-sm muted num">
                  {{ a.warrantyUntil ? (a.warrantyUntil | date: 'mediumDate') : '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="purchasePrice">
                <th mat-header-cell *matHeaderCellDef class="hide-sm right">Price</th>
                <td mat-cell *matCellDef="let a" class="hide-sm right num">
                  {{ a.purchasePrice !== null ? (a.purchasePrice | currency: a.currency ?? 'CHF') : '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="updatedAt">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Updated</th>
                <td mat-cell *matCellDef="let a" class="muted" [title]="a.updatedAt | date: 'medium'">{{ relativeTime(a.updatedAt) }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr
                mat-row
                *matRowDef="let a; columns: columns"
                class="row-link"
                tabindex="0"
                role="link"
                [attr.aria-label]="'Open ' + a.name"
                (click)="open(a)"
                (keydown.enter)="open(a)"
              ></tr>
            </table>
          </div>
          <mat-paginator
            [length]="r.data.totalItems"
            [pageIndex]="page()"
            [pageSize]="size()"
            [pageSizeOptions]="[10, 20, 50]"
            (page)="onPage($event)"
            aria-label="Pages"
          />
        }
      </div>
    </div>
  `,
  styles: `
    .filters {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 16px;
    }
    .filters mat-form-field {
      flex: 1 1 180px;
      max-width: 240px;
    }
    .filters .search {
      flex: 2 1 280px;
      max-width: none;
    }
    .filters .mat-icon[matPrefix] {
      margin: 0 4px 0 10px;
      color: var(--ac-text-3);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .filters kbd {
      margin-right: 10px;
    }
    .table-card {
      transition: opacity 0.2s;
    }
    @media (max-width: 720px) {
      .filters mat-form-field {
        flex: 1 1 140px;
        max-width: none;
      }
      .filters .search {
        flex-basis: 100%;
      }
    }
    .table-card.refreshing {
      opacity: 0.6;
    }
  `,
})
export class AssetList {
  readonly auth = inject(AuthService);
  private readonly api = inject(AssetsApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly prefs = inject(PreferencesService);
  private readonly shortcuts = inject(Shortcuts);
  private readonly notify = inject(Notify);
  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  readonly columns = ['name', 'assetTag', 'category', 'status', 'warrantyUntil', 'purchasePrice', 'updatedAt'];
  readonly statusClass = statusClass;
  readonly statusLabel = statusLabel;
  readonly categoryIcon = categoryIcon;
  readonly relativeTime = relativeTime;

  readonly search = new FormControl(this.route.snapshot.queryParamMap.get('q') ?? '', { nonNullable: true });
  private readonly searchValue = toSignal(
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), startWith(this.search.value)),
    { initialValue: this.search.value },
  );
  readonly status = signal<AssetStatus | ''>(asStatus(this.route.snapshot.queryParamMap.get('status')));
  readonly categoryId = signal(this.route.snapshot.queryParamMap.get('category') ?? '');
  readonly page = signal(Number(this.route.snapshot.queryParamMap.get('page') ?? 0) || 0);
  readonly size = signal(Number(this.route.snapshot.queryParamMap.get('size') ?? 0) || this.prefs.value().pageSize);
  readonly sortField = signal(this.route.snapshot.queryParamMap.get('sort')?.split(',')[0] ?? 'updatedAt');
  readonly sortDir = signal<'asc' | 'desc'>(this.route.snapshot.queryParamMap.get('sort')?.split(',')[1] === 'asc' ? 'asc' : 'desc');

  readonly categories = signal<Category[]>([]);
  readonly result = signal<{ loading: boolean; error: boolean; data: Page<Asset> | null }>({ loading: true, error: false, data: null });
  readonly hasFilter = computed(() => !!this.searchValue() || !!this.status() || !!this.categoryId());

  private readonly query = computed(() => ({
    search: this.searchValue(),
    status: this.status(),
    categoryId: this.categoryId(),
    includeArchived: this.status() === 'ARCHIVED',
    page: this.page(),
    size: this.size(),
    sort: `${this.sortField()},${this.sortDir()}`,
  }));

  constructor() {
    this.api.categories().subscribe({ next: (c) => this.categories.set(c) });
    effect(() => {
      const q = this.query();
      this.result.update((r) => ({ ...r, loading: true, error: false }));
      this.api.list(q).subscribe({
        next: (data) => this.result.set({ loading: false, error: false, data }),
        error: () => this.result.set({ loading: false, error: true, data: null }),
      });
      // the URL is the state: reload, back button and shared links all restore this exact view
      void this.router.navigate([], {
        relativeTo: this.route,
        replaceUrl: true,
        queryParams: {
          q: q.search || null,
          status: q.status || null,
          category: q.categoryId || null,
          page: q.page || null,
          size: q.size === this.prefs.value().pageSize ? null : q.size,
          sort: q.sort === 'updatedAt,desc' ? null : q.sort,
        },
      });
    });
    effect(() => {
      if (this.shortcuts.focusSearch() > 0) this.searchBox()?.nativeElement.focus();
    });
  }

  readonly reload = (): void => {
    this.result.update((r) => ({ ...r, loading: true, error: false }));
    this.api.list(this.query()).subscribe({
      next: (data) => this.result.set({ loading: false, error: false, data }),
      error: () => this.result.set({ loading: false, error: true, data: null }),
    });
  };

  clearFilters(): void {
    this.search.setValue('');
    this.status.set('');
    this.categoryId.set('');
    this.page.set(0);
  }

  onPage(e: PageEvent): void {
    this.size.set(e.pageSize);
    this.page.set(e.pageIndex);
    if (e.pageSize === 10 || e.pageSize === 20 || e.pageSize === 50) this.prefs.set('pageSize', e.pageSize);
  }

  onSort(s: Sort): void {
    this.sortField.set(s.active);
    this.sortDir.set(s.direction === 'asc' ? 'asc' : 'desc');
    this.page.set(0);
  }

  open(a: Asset): void {
    void this.router.navigate(['/assets', a.id]);
  }

  /** CSV of the current page, or of every asset matching the filter (fetched page by page, up to 5 000 rows). */
  exportCsv(all: boolean): void {
    const rows = (items: Asset[]) =>
      items.map((a) => ({
        name: a.name,
        tag: a.assetTag ?? '',
        category: a.category.name,
        status: a.status,
        manufacturer: a.manufacturer ?? '',
        model: a.model ?? '',
        serial: a.serialNumber ?? '',
        purchaseDate: a.purchaseDate ?? '',
        price: a.purchasePrice ?? '',
        currency: a.currency ?? '',
        warrantyUntil: a.warrantyUntil ?? '',
        location: a.location ?? '',
        updatedAt: a.updatedAt,
        id: a.id,
      }));
    const stamp = new Date().toISOString().slice(0, 10);
    if (!all) {
      downloadText(`assets-${stamp}.csv`, toCsv(rows(this.result().data?.items ?? [])), 'text/csv');
      return;
    }
    const q = { ...this.query(), page: 0, size: 100 };
    const collected: Asset[] = [];
    const next = (): void => {
      this.api.list(q).subscribe({
        next: (p) => {
          collected.push(...p.items);
          if (p.page + 1 < p.totalPages && collected.length < 5000) {
            q.page += 1;
            next();
          } else {
            downloadText(`assets-${stamp}.csv`, toCsv(rows(collected)), 'text/csv');
            this.notify.success(`Exported ${collected.length} assets.`);
          }
        },
        error: () => this.notify.error('The export could not be completed.'),
      });
    };
    next();
  }
}

function asStatus(v: string | null): AssetStatus | '' {
  return v === 'ACTIVE' || v === 'IN_REPAIR' || v === 'RETIRED' || v === 'ARCHIVED' ? v : '';
}

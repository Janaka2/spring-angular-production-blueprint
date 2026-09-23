import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AssetsApi } from '../../core/api/assets.api';
import { Category, CategoryRequest } from '../../core/api/models';
import { asProblem } from '../../core/api/problem';
import { Notify } from '../../core/ui/notify';
import { Loading, Empty, ErrorState } from '../../shared/state';
import { categoryIcon } from '../../shared/format';

@Component({
  selector: 'app-category-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit category' : 'New category' }}</h2>
    <mat-dialog-content>
      <div class="form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Code</mat-label>
          <input
            matInput
            [(ngModel)]="c.code"
            maxlength="40"
            [disabled]="!!data"
            style="text-transform:uppercase"
            required
            placeholder="VEHICLE"
          />
          <mat-hint>Stable key: capital letters, digits, underscore. Cannot change later.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="c.name" maxlength="80" required />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Description</mat-label>
          <input matInput [(ngModel)]="c.description" maxlength="500" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Sort order</mat-label>
          <input matInput type="number" [(ngModel)]="c.sortOrder" min="0" step="10" />
          <mat-hint>Lower comes first in dropdowns</mat-hint>
        </mat-form-field>
        <div style="display:flex;align-items:center">
          <mat-slide-toggle [(ngModel)]="c.active">Active (available for new assets)</mat-slide-toggle>
        </div>
      </div>
      @if (error()) {
        <p class="mat-error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [disabled]="!valid() || saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save' }}</button>
    </mat-dialog-actions>
  `,
})
export class CategoryDialog {
  readonly data = inject<Category | null>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<CategoryDialog>);
  private readonly api = inject(AssetsApi);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly c: CategoryRequest = this.data
    ? {
        code: this.data.code,
        name: this.data.name,
        description: this.data.description ?? '',
        sortOrder: this.data.sortOrder,
        active: this.data.active,
      }
    : { code: '', name: '', description: '', sortOrder: 100, active: true };

  valid(): boolean {
    return /^[A-Z][A-Z0-9_]{1,39}$/.test(this.c.code.toUpperCase()) && this.c.name.trim().length > 0;
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    const req: CategoryRequest = {
      ...this.c,
      code: this.c.code.toUpperCase(),
      name: this.c.name.trim(),
      description: this.c.description?.trim() || null,
    };
    const call = this.data ? this.api.updateCategory(this.data.id, req) : this.api.createCategory(req);
    call.subscribe({
      next: (saved) => this.ref.close(saved),
      error: (err: unknown) => {
        this.saving.set(false);
        const p = asProblem(err);
        this.error.set(p?.errors?.map((e) => `${e.field}: ${e.message}`).join('; ') ?? p?.detail ?? 'Could not save.');
      },
    });
  }
}

/** ADMIN: the reference data every asset points at. Deactivate instead of delete so existing assets keep their category. */
@Component({
  selector: 'app-categories',
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule, Loading, Empty, ErrorState],
  styles: `
    tr.inactive .cell-main {
      opacity: 0.55;
    }
  `,
  template: `
    <div class="page">
      <div class="page-title">
        <div>
          <h1>Categories</h1>
          <p class="subtitle">Reference data for every asset. Inactive categories stay on existing assets but are hidden for new ones.</p>
        </div>
        <button mat-flat-button (click)="edit(null)"><mat-icon>add</mat-icon> New category</button>
      </div>
      @let s = state();
      <div class="card table-card">
        @if (s.loading) {
          <app-loading variant="table" [count]="6" label="Loading categories" />
        } @else if (s.error) {
          <app-error-state message="Categories could not be loaded." [retry]="reload" />
        } @else if (!s.data?.length) {
          <app-empty icon="category" heading="No categories yet" message="Categories group assets and power the filters." />
        } @else {
          <table mat-table [dataSource]="s.data ?? []" aria-label="Categories">
            <ng-container matColumnDef="sortOrder">
              <th mat-header-cell *matHeaderCellDef class="hide-sm">Order</th>
              <td mat-cell *matCellDef="let c" class="hide-sm faint num">{{ c.sortOrder }}</td>
            </ng-container>
            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef>Code</th>
              <td mat-cell *matCellDef="let c">
                <code>{{ c.code }}</code>
              </td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let c">
                <div class="cell-main">
                  <span class="tile-icon neutral"
                    ><mat-icon aria-hidden="true">{{ categoryIcon(c.code) }}</mat-icon></span
                  >
                  <div>
                    <strong>{{ c.name }}</strong>
                    <div class="sub hide-sm">{{ c.description }}</div>
                  </div>
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="active">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let c">
                <span [class]="c.active ? 'pill ok' : 'pill'">{{ c.active ? 'Active' : 'Inactive' }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef><span class="cdk-visually-hidden">Actions</span></th>
              <td mat-cell *matCellDef="let c" style="text-align:right">
                <button mat-icon-button (click)="edit(c)" aria-label="Edit category" matTooltip="Edit"><mat-icon>edit</mat-icon></button>
                <button
                  mat-icon-button
                  (click)="toggle(c)"
                  [attr.aria-label]="c.active ? 'Deactivate category' : 'Activate category'"
                  [matTooltip]="c.active ? 'Deactivate' : 'Activate'"
                >
                  <mat-icon>{{ c.active ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let c; columns: columns" [class.inactive]="!c.active"></tr>
          </table>
        }
      </div>
    </div>
  `,
})
export class Categories {
  readonly categoryIcon = categoryIcon;
  private readonly api = inject(AssetsApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  readonly columns = ['sortOrder', 'code', 'name', 'active', 'actions'];
  readonly state = signal<{ loading: boolean; error: boolean; data: Category[] | null }>({ loading: true, error: false, data: null });

  constructor() {
    this.reload();
  }

  readonly reload = (): void => {
    this.state.update((s) => ({ ...s, loading: true, error: false }));
    this.api.categories().subscribe({
      next: (data) => this.state.set({ loading: false, error: false, data }),
      error: () => this.state.set({ loading: false, error: true, data: null }),
    });
  };

  edit(c: Category | null): void {
    this.dialog
      .open(CategoryDialog, { width: '640px', data: c })
      .afterClosed()
      .subscribe((saved?: Category) => {
        if (!saved) return;
        this.notify.success(c ? 'Category saved.' : 'Category created.');
        this.reload();
      });
  }

  toggle(c: Category): void {
    this.api
      .updateCategory(c.id, { code: c.code, name: c.name, description: c.description, sortOrder: c.sortOrder, active: !c.active })
      .subscribe({
        next: () => {
          this.notify.success(c.active ? `${c.name} deactivated.` : `${c.name} activated.`);
          this.reload();
        },
        error: (err: unknown) => this.notify.error(asProblem(err)?.detail ?? 'Could not update the category.'),
      });
  }
}

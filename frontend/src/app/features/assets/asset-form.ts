import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { AssetsApi } from '../../core/api/assets.api';
import { AssetRequest, Category } from '../../core/api/models';
import { asProblem, problemCode } from '../../core/api/problem';
import { Loading } from '../../shared/state';
import { Confirm } from '../../shared/confirm-dialog';
import { idempotencyKey } from '../../shared/format';

/**
 * Create and edit. On edit the ETag from the load is sent as If-Match; a 409 means someone else saved first,
 * and the dialog offers to reload their version rather than overwrite it.
 */
@Component({
  selector: 'app-asset-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatCardModule,
    Loading,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="page">
      <div class="page-title">
        <h1>{{ id() ? 'Edit asset' : 'New asset' }}</h1>
      </div>
      @if (loading()) {
        <app-loading />
      } @else {
        <mat-card appearance="outlined">
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="save()" novalidate>
              <div class="form-grid">
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Name</mat-label>
                  <input matInput formControlName="name" maxlength="120" required />
                  <mat-error>{{ error('name') ?? 'Name is required' }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Category</mat-label>
                  <mat-select formControlName="categoryId" required>
                    @for (c of categories(); track c.id) {
                      <mat-option [value]="c.id">{{ c.name }}</mat-option>
                    }
                  </mat-select>
                  <mat-error>Choose a category</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Asset tag</mat-label>
                  <input matInput formControlName="assetTag" maxlength="60" placeholder="LAPTOP-1" />
                  <mat-error>{{ error('assetTag') }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Serial number</mat-label>
                  <input matInput formControlName="serialNumber" maxlength="120" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Manufacturer</mat-label>
                  <input matInput formControlName="manufacturer" maxlength="120" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Model</mat-label>
                  <input matInput formControlName="model" maxlength="120" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Purchase date</mat-label>
                  <input matInput [matDatepicker]="pd" formControlName="purchaseDate" />
                  <mat-datepicker-toggle matIconSuffix [for]="pd" /><mat-datepicker #pd />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Warranty until</mat-label>
                  <input matInput [matDatepicker]="wd" formControlName="warrantyUntil" />
                  <mat-datepicker-toggle matIconSuffix [for]="wd" /><mat-datepicker #wd />
                  <mat-error>{{ error('warrantyUntil') }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Purchase price</mat-label>
                  <input matInput formControlName="purchasePrice" type="number" min="0" step="0.01" />
                  <mat-error>{{ error('purchasePrice') ?? 'Not negative, two decimals' }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Currency</mat-label>
                  <input matInput formControlName="currency" maxlength="3" placeholder="CHF" style="text-transform:uppercase" />
                  <mat-error>Three-letter ISO code</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Location</mat-label>
                  <input matInput formControlName="location" maxlength="200" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Description</mat-label>
                  <textarea matInput formControlName="description" rows="2" maxlength="2000"></textarea>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Notes</mat-label>
                  <textarea matInput formControlName="notes" rows="3" maxlength="4000"></textarea>
                </mat-form-field>
              </div>
              @if (formError()) {
                <p class="mat-error" role="alert">{{ formError() }}</p>
              }
              <div class="actions">
                <a mat-button [routerLink]="id() ? ['/assets', id()] : ['/assets']">Cancel</a>
                <button mat-flat-button type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
})
export class AssetForm {
  readonly id = input<string>();
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(AssetsApi);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly confirm = inject(Confirm);

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  private readonly fieldErrors = signal<Record<string, string>>({});
  private etag = '';
  private key = idempotencyKey();

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    categoryId: ['', Validators.required],
    assetTag: ['', Validators.maxLength(60)],
    serialNumber: ['', Validators.maxLength(120)],
    manufacturer: ['', Validators.maxLength(120)],
    model: ['', Validators.maxLength(120)],
    purchaseDate: this.fb.control<Date | null>(null),
    warrantyUntil: this.fb.control<Date | null>(null),
    purchasePrice: this.fb.control<number | null>(null, Validators.min(0)),
    currency: ['', Validators.pattern(/^[A-Za-z]{3}$/)],
    location: ['', Validators.maxLength(200)],
    description: ['', Validators.maxLength(2000)],
    notes: ['', Validators.maxLength(4000)],
  });

  constructor() {
    this.api.categories().subscribe({ next: (c) => this.categories.set(c.filter((x) => x.active)) });
    queueMicrotask(() => this.load());
  }

  error(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  private load(): void {
    const id = this.id();
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.api.get(id).subscribe({
      next: ({ body, etag }) => {
        this.etag = etag;
        this.form.patchValue({
          name: body.name,
          categoryId: body.category.id,
          assetTag: body.assetTag ?? '',
          serialNumber: body.serialNumber ?? '',
          manufacturer: body.manufacturer ?? '',
          model: body.model ?? '',
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
          warrantyUntil: body.warrantyUntil ? new Date(body.warrantyUntil) : null,
          purchasePrice: body.purchasePrice,
          currency: body.currency ?? '',
          location: body.location ?? '',
          description: body.description ?? '',
          notes: body.notes ?? '',
        });
        this.loading.set(false);
      },
      error: () => {
        this.formError.set('This asset could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    this.formError.set(null);
    this.fieldErrors.set({});
    const req = this.toRequest();
    const id = this.id();
    const call = id ? this.api.update(id, this.etag, req) : this.api.create(req, this.key);
    call.subscribe({
      next: ({ body }) => {
        this.snack.open(id ? 'Asset saved.' : 'Asset created.', undefined, { duration: 3000 });
        void this.router.navigate(['/assets', body.id]);
      },
      error: async (err: unknown) => {
        this.saving.set(false);
        const p = asProblem(err);
        const code = problemCode(p);
        if (code === 'stale-version' && id) {
          const reload = await this.confirm.ask({
            title: 'Someone else changed this asset',
            message: `${p?.changedBy ?? 'Another user'} saved a newer version${p?.changedAt ? ` at ${new Date(p.changedAt).toLocaleString()}` : ''}. Reload their version? Your unsaved changes will be discarded.`,
            confirmLabel: 'Reload',
          });
          if (reload) {
            this.loading.set(true);
            this.load();
          } else this.formError.set('Not saved: the record was changed by someone else. Reload to continue.');
        } else if (code === 'validation' && p?.errors) {
          const map: Record<string, string> = {};
          for (const e of p.errors) map[e.field] = e.message;
          this.fieldErrors.set(map);
          for (const field of Object.keys(map)) this.form.get(field)?.setErrors({ server: true });
          this.formError.set(p.detail ?? 'Please correct the highlighted fields.');
        } else {
          this.formError.set(p?.detail ?? 'The asset could not be saved.');
        }
      },
    });
  }

  private toRequest(): AssetRequest {
    const v = this.form.getRawValue();
    const nz = (s: string): string | null => (s.trim() === '' ? null : s.trim());
    const day = (d: Date | null): string | null =>
      d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;
    return {
      name: v.name.trim(),
      categoryId: v.categoryId,
      description: nz(v.description),
      assetTag: nz(v.assetTag),
      serialNumber: nz(v.serialNumber),
      manufacturer: nz(v.manufacturer),
      model: nz(v.model),
      purchaseDate: day(v.purchaseDate),
      warrantyUntil: day(v.warrantyUntil),
      purchasePrice: v.purchasePrice,
      currency: v.purchasePrice !== null ? (nz(v.currency)?.toUpperCase() ?? 'CHF') : null,
      location: nz(v.location),
      notes: nz(v.notes),
    };
  }
}

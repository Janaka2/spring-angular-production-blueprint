import { Component, effect, ElementRef, HostListener, inject, input, signal, viewChild } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { HasUnsavedChanges } from '../../core/ui/unsaved-changes.guard';
import { PreferencesService } from '../../core/ui/preferences';
import { storage } from '../../core/ui/storage';
import { AssetsApi } from '../../core/api/assets.api';
import { Asset, AssetRequest, Category } from '../../core/api/models';
import { asProblem, problemCode } from '../../core/api/problem';
import { Loading } from '../../shared/state';
import { Confirm } from '../../shared/confirm-dialog';
import { actorLabel, idempotencyKey } from '../../shared/format';
import { AuthService } from '../../core/auth/auth.service';

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
    MatIconModule,
    Loading,
  ],
  providers: [provideNativeDateAdapter()],
  styles: `
    .draft {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 10px 12px 10px 16px;
      margin-bottom: 16px;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--ac-accent) 30%, transparent);
      background: var(--ac-accent-soft);
      color: var(--ac-text);
    }
    .draft .mat-icon {
      color: var(--ac-accent);
    }
    .draft span {
      flex: 1;
    }
    form {
      display: grid;
      gap: 16px;
    }
    .section {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 24px;
      padding: 24px;
    }
    .sec-head h2 {
      margin: 10px 0 4px;
      font-size: 14px;
      font-weight: 600;
    }
    .sec-head p {
      margin: 0;
      font-size: 13px;
      color: var(--ac-text-2);
    }
    .savebar {
      position: sticky;
      bottom: 16px;
      z-index: 5;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px 10px 18px;
      border-radius: 14px;
      border: 1px solid var(--ac-border);
      background: color-mix(in srgb, var(--ac-surface) 88%, transparent);
      backdrop-filter: saturate(1.4) blur(12px);
      box-shadow: var(--ac-shadow);
    }
    .hint {
      margin-right: auto;
      font-size: 12.5px;
      color: var(--ac-text-3);
    }
    @media (max-width: 820px) {
      .section {
        grid-template-columns: 1fr;
        gap: 8px;
        padding: 18px;
      }
    }
  `,
  template: `
    <div class="page page-narrow">
      <a
        class="back"
        [routerLink]="id() ? ['/assets', id()] : ['/assets']"
        [attr.aria-label]="id() ? 'Back to the asset' : 'Back to all assets'"
        ><mat-icon>arrow_back</mat-icon> {{ id() ? 'Back to the asset' : 'All assets' }}</a
      >
      <header class="page-title">
        <div>
          <h1>{{ id() ? 'Edit asset' : 'New asset' }}</h1>
          <p class="subtitle">
            {{
              id()
                ? 'Your changes are saved as a new version. If someone else saved first, you are asked before anything is overwritten.'
                : 'Only a name and a category are required. Add the rest now or later.'
            }}
          </p>
        </div>
      </header>
      @if (loading()) {
        <div class="card"><app-loading [count]="6" label="Loading the form" /></div>
      } @else {
        @if (draftAvailable()) {
          <div class="draft" role="status">
            <mat-icon aria-hidden="true">history</mat-icon>
            <span>You have an unsaved draft from {{ draftAge() }}.</span>
            <button mat-button (click)="restoreDraft()">Restore</button>
            <button mat-button (click)="discardDraft()">Discard</button>
          </div>
        }
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <section class="card section">
            <div class="sec-head">
              <span class="tile-icon"><mat-icon aria-hidden="true">badge</mat-icon></span>
              <h2>Basics</h2>
              <p>What it is and how you recognise it.</p>
            </div>
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Name</mat-label>
                <input matInput #nameBox formControlName="name" maxlength="120" required cdkFocusInitial placeholder="MacBook Pro 14" />
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
                <mat-hint>Unique among your assets</mat-hint>
                <mat-error>{{ error('assetTag') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Manufacturer</mat-label>
                <input matInput formControlName="manufacturer" maxlength="120" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Model</mat-label>
                <input matInput formControlName="model" maxlength="120" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Serial number</mat-label>
                <input matInput formControlName="serialNumber" maxlength="120" />
              </mat-form-field>
            </div>
          </section>

          <section class="card section">
            <div class="sec-head">
              <span class="tile-icon"><mat-icon aria-hidden="true">receipt_long</mat-icon></span>
              <h2>Purchase &amp; warranty</h2>
              <p>AssetCare reminds you before the warranty ends.</p>
            </div>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Purchase date</mat-label>
                <input matInput [matDatepicker]="pd" formControlName="purchaseDate" />
                <mat-datepicker-toggle matIconSuffix [for]="pd" /><mat-datepicker #pd />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Warranty until</mat-label>
                <input matInput [matDatepicker]="wd" formControlName="warrantyUntil" />
                <mat-datepicker-toggle matIconSuffix [for]="wd" /><mat-datepicker #wd />
                <mat-error>{{ error('warrantyUntil') ?? 'Must be on or after the purchase date' }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Purchase price</mat-label>
                <input matInput formControlName="purchasePrice" type="number" min="0" step="0.01" />
                <mat-error>{{ error('purchasePrice') ?? 'Not negative, two decimals' }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Currency</mat-label>
                <input matInput formControlName="currency" maxlength="3" placeholder="CHF" style="text-transform: uppercase" />
                <mat-error>Three-letter ISO code</mat-error>
              </mat-form-field>
            </div>
          </section>

          <section class="card section">
            <div class="sec-head">
              <span class="tile-icon"><mat-icon aria-hidden="true">notes</mat-icon></span>
              <h2>Location &amp; notes</h2>
              <p>Where it is and anything worth remembering.</p>
            </div>
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Location</mat-label>
                <input matInput formControlName="location" maxlength="200" placeholder="Home office" />
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
          </section>

          @if (formError()) {
            <p class="form-error" role="alert"><mat-icon aria-hidden="true">error</mat-icon>{{ formError() }}</p>
          }
          <div class="savebar">
            <span class="hint hide-sm"
              ><kbd>{{ mac ? '⌘' : 'Ctrl' }}</kbd> <kbd>S</kbd> to save</span
            >
            <a mat-button [routerLink]="id() ? ['/assets', id()] : ['/assets']">Cancel</a>
            <button mat-flat-button type="submit" [disabled]="saving()">
              <mat-icon>{{ saving() ? 'hourglass_top' : 'check' }}</mat-icon
              >{{ saving() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class AssetForm implements HasUnsavedChanges {
  readonly id = input<string>();
  private readonly route = inject(ActivatedRoute);
  private readonly prefs = inject(PreferencesService);
  private readonly nameBox = viewChild<ElementRef<HTMLInputElement>>('nameBox');
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(AssetsApi);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly confirm = inject(Confirm);
  private readonly auth = inject(AuthService);

  readonly categories = signal<Category[]>([]);
  readonly mac = /Mac|iPhone|iPad/.test(navigator.platform);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  private readonly fieldErrors = signal<Record<string, string>>({});
  private etag = '';
  private key = idempotencyKey();
  private saved = false;
  private loadedValue = '';
  readonly draftAvailable = signal(false);
  readonly draftAge = signal('');
  private get draftKey(): string {
    return `assetcare.draft.${this.id() ?? 'new'}`;
  }

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
  private readonly changes = toSignal(this.form.valueChanges.pipe(debounceTime(500)), { initialValue: null });

  constructor() {
    this.form.addValidators(warrantyAfterPurchase);
    this.api.categories().subscribe({ next: (c) => this.categories.set(c.filter((x) => x.active)) });
    queueMicrotask(() => this.load());
    // draft autosave: a browser crash or an accidental tab close must not cost a half-filled form
    effect(() => {
      this.changes();
      if (this.loading() || this.saved) return;
      if (this.hasUnsavedChanges()) {
        storage.set(this.draftKey, JSON.stringify({ at: Date.now(), value: this.form.getRawValue() }));
      }
    });
    // price entered without a currency: use the preferred one
    effect(() => {
      this.changes();
      const price = this.form.controls.purchasePrice.value;
      if (price !== null && !this.form.controls.currency.value) this.form.controls.currency.setValue(this.prefs.value().defaultCurrency);
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(e: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) e.preventDefault();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      this.save();
    }
  }

  hasUnsavedChanges(): boolean {
    return !this.saved && !this.loading() && JSON.stringify(this.form.getRawValue()) !== this.loadedValue;
  }

  restoreDraft(): void {
    const d = readDraft(this.draftKey);
    if (d) this.form.patchValue(reviveDates(d.value));
    this.draftAvailable.set(false);
  }

  discardDraft(): void {
    storage.remove(this.draftKey);
    this.draftAvailable.set(false);
  }

  private markLoaded(): void {
    this.loadedValue = JSON.stringify(this.form.getRawValue());
    const d = readDraft(this.draftKey);
    if (d && JSON.stringify(d.value) !== this.loadedValue) {
      this.draftAvailable.set(true);
      this.draftAge.set(new Date(d.at).toLocaleString());
    }
    setTimeout(() => this.nameBox()?.nativeElement.focus(), 0);
  }

  error(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  private load(): void {
    const id = this.id();
    if (!id) {
      const from = this.route.snapshot.queryParamMap.get('from');
      if (from) {
        this.api.get(from).subscribe({
          next: ({ body }) => {
            this.patchFrom(body);
            this.form.patchValue({ name: `${body.name} (copy)`, assetTag: '', serialNumber: '' });
            this.loading.set(false);
            this.markLoaded();
          },
          error: () => {
            this.loading.set(false);
            this.markLoaded();
          },
        });
        return;
      }
      this.loading.set(false);
      this.markLoaded();
      return;
    }
    this.api.get(id).subscribe({
      next: ({ body, etag }) => {
        this.etag = etag;
        this.patchFrom(body);
        this.loading.set(false);
        this.markLoaded();
      },
      error: () => {
        this.formError.set('This asset could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  private patchFrom(body: Asset): void {
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
  }

  save(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.formError.set(
        this.form.errors?.['warrantyBeforePurchase']
          ? 'The warranty cannot end before the purchase date.'
          : 'Please correct the highlighted fields.',
      );
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.fieldErrors.set({});
    const req = this.toRequest();
    const id = this.id();
    const call = id ? this.api.update(id, this.etag, req) : this.api.create(req, this.key);
    call.subscribe({
      next: ({ body }) => {
        this.saved = true;
        storage.remove(this.draftKey);
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
            message: `${p?.changedBy ? actorLabel(p.changedBy, this.auth.user()?.subject).replace(/^you$/, 'You, in another tab or window,') : 'Another user'} saved a newer version${p?.changedAt ? ` at ${new Date(p.changedAt).toLocaleString()}` : ''}. Reload their version? Your unsaved changes will be discarded.`,
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

/** Cross-field rule: a warranty that ends before the purchase is a typo. */
function warrantyAfterPurchase(group: AbstractControl): ValidationErrors | null {
  const p = group.get('purchaseDate')?.value as Date | null;
  const w = group.get('warrantyUntil')?.value as Date | null;
  if (p && w && w.getTime() < p.getTime()) {
    group.get('warrantyUntil')?.setErrors({ warrantyBeforePurchase: true });
    return { warrantyBeforePurchase: true };
  }
  return null;
}

interface Draft {
  at: number;
  value: Record<string, unknown>;
}

function readDraft(key: string): Draft | null {
  try {
    const raw = storage.get(key);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return Date.now() - d.at < 7 * 86400000 ? d : null; // drafts older than a week are stale
  } catch {
    return null;
  }
}

function reviveDates(v: Record<string, unknown>): Record<string, unknown> {
  const out = { ...v };
  for (const k of ['purchaseDate', 'warrantyUntil']) {
    if (typeof out[k] === 'string') out[k] = new Date(out[k] as string);
  }
  return out;
}

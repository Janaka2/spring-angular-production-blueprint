import { Component, computed, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, KeyValuePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ImagePreviewDialog } from '../../shared/image-preview-dialog';
import { relativeTime } from '../../shared/format';
import { Notify } from '../../core/ui/notify';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AssetsApi } from '../../core/api/assets.api';
import {
  Asset,
  AssetStatus,
  Attachment,
  AuditEvent,
  MaintenanceItem,
  MaintenanceItemRequest,
  ServiceRecord,
  ServiceRecordRequest,
} from '../../core/api/models';
import { asProblem, problemCode } from '../../core/api/problem';
import { AuthService } from '../../core/auth/auth.service';
import { Confirm } from '../../shared/confirm-dialog';
import { Loading, Empty, ErrorState } from '../../shared/state';
import { bytes, statusClass, urgencyClass } from '../../shared/format';

/** Plan a maintenance item. */
@Component({
  selector: 'app-plan-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: ` <h2 mat-dialog-title>{{ data ? 'Edit maintenance' : 'Plan maintenance' }}</h2>
    <mat-dialog-content>
      <div class="form-grid">
        <mat-form-field appearance="outline"
          ><mat-label>Type</mat-label>
          <mat-select [(ngModel)]="m.type" required>
            @for (t of types; track t) {
              <mat-option [value]="t">{{ t }}</mat-option>
            }
          </mat-select></mat-form-field
        >
        <mat-form-field appearance="outline"
          ><mat-label>Due date</mat-label><input matInput type="date" [(ngModel)]="m.dueDate" required
        /></mat-form-field>
        <mat-form-field appearance="outline" class="full"
          ><mat-label>Description</mat-label><input matInput [(ngModel)]="m.description" maxlength="500" required
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Repeats</mat-label>
          <mat-select [(ngModel)]="m.recurrence">
            <mat-option [value]="null">Once</mat-option><mat-option value="P1M">Monthly</mat-option
            ><mat-option value="P3M">Quarterly</mat-option> <mat-option value="P6M">Twice a year</mat-option
            ><mat-option value="P1Y">Yearly</mat-option>
          </mat-select></mat-form-field
        >
        <mat-form-field appearance="outline"
          ><mat-label>Service provider</mat-label><input matInput [(ngModel)]="m.serviceProvider" maxlength="200"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Expected cost</mat-label><input matInput type="number" min="0" step="0.01" [(ngModel)]="m.cost"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Currency</mat-label><input matInput [(ngModel)]="m.currency" maxlength="3" placeholder="CHF"
        /></mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [disabled]="!m.description || !m.dueDate" (click)="ref.close(m)">{{ data ? 'Save' : 'Plan' }}</button>
    </mat-dialog-actions>`,
})
export class PlanDialog {
  readonly data = inject<MaintenanceItem | null>(MAT_DIALOG_DATA, { optional: true });
  readonly ref = inject(MatDialogRef<PlanDialog>);
  readonly types = ['SERVICE', 'INSPECTION', 'REPLACEMENT', 'CLEANING', 'OTHER'] as const;
  m: MaintenanceItemRequest = this.data
    ? {
        type: this.data.type,
        description: this.data.description,
        dueDate: this.data.dueDate,
        recurrence: this.data.recurrence,
        cost: this.data.cost,
        currency: this.data.currency ?? 'CHF',
        serviceProvider: this.data.serviceProvider,
        notes: this.data.notes,
      }
    : {
        type: 'SERVICE',
        description: '',
        dueDate: '',
        recurrence: null,
        cost: null,
        currency: 'CHF',
        serviceProvider: null,
        notes: null,
      };
}

/** Record what was done: completes a planned item, or logs an unplanned repair. */
@Component({
  selector: 'app-service-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: ` <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <div class="form-grid">
        <mat-form-field appearance="outline"
          ><mat-label>Performed on</mat-label><input matInput type="date" [(ngModel)]="r.performedOn" required
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Performed by</mat-label><input matInput [(ngModel)]="r.performedBy" maxlength="200"
        /></mat-form-field>
        <mat-form-field appearance="outline" class="full"
          ><mat-label>Summary</mat-label><input matInput [(ngModel)]="r.summary" maxlength="500" required
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Cost</mat-label><input matInput type="number" min="0" step="0.01" [(ngModel)]="r.cost"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Currency</mat-label><input matInput [(ngModel)]="r.currency" maxlength="3"
        /></mat-form-field>
        <mat-form-field appearance="outline" class="full"
          ><mat-label>Notes</mat-label><textarea matInput rows="2" [(ngModel)]="r.notes" maxlength="2000"></textarea>
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [disabled]="!r.summary || !r.performedOn" (click)="ref.close(r)">Save</button>
    </mat-dialog-actions>`,
})
export class ServiceDialog {
  readonly ref = inject(MatDialogRef<ServiceDialog>);
  readonly data = inject<{ title: string }>(MAT_DIALOG_DATA);
  r: ServiceRecordRequest = {
    performedOn: new Date().toISOString().slice(0, 10),
    performedBy: null,
    summary: '',
    cost: null,
    currency: 'CHF',
    notes: null,
  };
}

interface Loaded<T> {
  loading: boolean;
  error: boolean;
  data: T | null;
}

@Component({
  selector: 'app-asset-detail',
  imports: [
    MatTooltipModule,
    RouterLink,
    DatePipe,
    CurrencyPipe,
    KeyValuePipe,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatCardModule,
    MatListModule,
    MatDialogModule,
    Loading,
    Empty,
    ErrorState,
  ],
  template: `
    <div class="page">
      @let a = asset();
      @if (a.loading) {
        <app-loading />
      } @else if (a.error || !a.data) {
        <app-error-state message="This asset could not be loaded." />
      } @else {
        @let x = a.data;
        <div class="page-title">
          <div>
            <a routerLink="/assets" class="muted">← Assets</a>
            <h1>
              {{ x.name }} <span [class]="statusClass(x.status)">{{ x.status }}</span>
            </h1>
            <div class="muted">{{ x.category.name }} · {{ x.assetTag ?? 'no tag' }} · v{{ x.version }}</div>
          </div>
          @if (!auth.canWrite()) {
            <div class="actions" style="margin:0">
              <button mat-icon-button (click)="copyLink()" aria-label="Copy link" matTooltip="Copy link"><mat-icon>link</mat-icon></button>
              <button mat-icon-button (click)="print()" aria-label="Print" matTooltip="Print"><mat-icon>print</mat-icon></button>
            </div>
          }
          @if (auth.canWrite()) {
            <div class="actions" style="margin:0">
              @if (x.status !== 'ARCHIVED') {
                <a mat-stroked-button [routerLink]="['/assets', x.id, 'edit']"><mat-icon>edit</mat-icon> Edit</a>
              }
              <button mat-stroked-button [matMenuTriggerFor]="more" aria-label="More actions"><mat-icon>more_horiz</mat-icon> More</button>
              <mat-menu #more="matMenu">
                <button mat-menu-item (click)="copyLink()"><mat-icon>link</mat-icon>Copy link</button>
                <a mat-menu-item [routerLink]="['/assets/new']" [queryParams]="{ from: x.id }"
                  ><mat-icon>content_copy</mat-icon>Duplicate</a
                >
                <button mat-menu-item (click)="print()"><mat-icon>print</mat-icon>Print</button>
                @if (x.status === 'ACTIVE') {
                  <button mat-menu-item (click)="changeStatus('IN_REPAIR')">Mark as in repair</button
                  ><button mat-menu-item (click)="changeStatus('RETIRED')">Retire</button>
                }
                @if (x.status === 'IN_REPAIR') {
                  <button mat-menu-item (click)="changeStatus('ACTIVE')">Back in service</button
                  ><button mat-menu-item (click)="changeStatus('RETIRED')">Retire</button>
                }
                @if (x.status !== 'ARCHIVED') {
                  <button mat-menu-item (click)="archive()"><mat-icon>archive</mat-icon>Archive</button>
                }
                @if (x.status === 'ARCHIVED' && auth.isAdmin()) {
                  <button mat-menu-item (click)="restore()"><mat-icon>unarchive</mat-icon>Restore</button>
                  <button mat-menu-item (click)="deletePermanently()" class="danger">
                    <mat-icon>delete_forever</mat-icon>Delete permanently
                  </button>
                }
              </mat-menu>
            </div>
          }
        </div>

        <mat-tab-group dynamicHeight>
          <mat-tab label="Details">
            <mat-card appearance="outlined" style="margin-top:12px"
              ><mat-card-content>
                <dl class="kv">
                  <dt>Manufacturer / model</dt>
                  <dd>{{ x.manufacturer ?? '—' }} {{ x.model ?? '' }}</dd>
                  <dt>Serial number</dt>
                  <dd>{{ x.serialNumber ?? '—' }}</dd>
                  <dt>Purchased</dt>
                  <dd>
                    {{ x.purchaseDate ? (x.purchaseDate | date: 'mediumDate') : '—' }}
                    @if (x.purchasePrice !== null) {
                      · {{ x.purchasePrice | currency: x.currency ?? 'CHF' }}
                    }
                  </dd>
                  <dt>Warranty until</dt>
                  <dd>{{ x.warrantyUntil ? (x.warrantyUntil | date: 'mediumDate') : '—' }}</dd>
                  <dt>Location</dt>
                  <dd>{{ x.location ?? '—' }}</dd>
                  <dt>Description</dt>
                  <dd>{{ x.description ?? '—' }}</dd>
                  <dt>Notes</dt>
                  <dd style="white-space:pre-wrap">{{ x.notes ?? '—' }}</dd>
                  <dt>Created</dt>
                  <dd>{{ x.createdAt | date: 'medium' }} by {{ x.createdBy }}</dd>
                  <dt>Updated</dt>
                  <dd>{{ x.updatedAt | date: 'medium' }} by {{ x.updatedBy }}</dd>
                </dl>
              </mat-card-content></mat-card
            >
          </mat-tab>

          <mat-tab [label]="'Maintenance (' + (maintenance().data?.length ?? 0) + ')'">
            <div class="actions" style="margin:12px 0">
              @if (auth.canWrite() && x.status !== 'ARCHIVED') {
                <button mat-flat-button (click)="plan()"><mat-icon>event</mat-icon> Plan maintenance</button>
              }
            </div>
            @let m = maintenance();
            @if (m.loading) {
              <app-loading />
            } @else if (m.error) {
              <app-error-state />
            } @else if (!m.data?.length) {
              <app-empty icon="event_available" message="Nothing planned." />
            } @else {
              <mat-list>
                @for (i of m.data; track i.id) {
                  <mat-list-item>
                    <span matListItemTitle
                      >{{ i.description }} <span [class]="urgencyClass(i.urgency)">{{ i.urgency }}</span></span
                    >
                    <span matListItemLine
                      >{{ i.type }} · due {{ i.dueDate | date: 'mediumDate' }}
                      @if (i.recurrence) {
                        · repeats {{ i.recurrence }}
                      }
                      @if (i.serviceProvider) {
                        · {{ i.serviceProvider }}
                      }
                    </span>
                    @if (i.status === 'PLANNED' && auth.canWrite()) {
                      <span matListItemMeta>
                        <button mat-button (click)="complete(i)">Done</button>
                        <button mat-icon-button aria-label="Edit or reschedule" matTooltip="Edit or reschedule" (click)="reschedule(i)">
                          <mat-icon>edit_calendar</mat-icon>
                        </button>
                        <button mat-icon-button aria-label="Cancel item" matTooltip="Cancel" (click)="cancel(i)">
                          <mat-icon>close</mat-icon>
                        </button>
                      </span>
                    }
                  </mat-list-item>
                }
              </mat-list>
            }
          </mat-tab>

          <mat-tab [label]="'Service history (' + (records().data?.length ?? 0) + ')'">
            <div class="actions" style="margin:12px 0">
              @if (auth.canWrite() && x.status !== 'ARCHIVED') {
                <button mat-stroked-button (click)="recordService()"><mat-icon>build</mat-icon> Record a repair</button>
              }
            </div>
            @let r = records();
            @if (r.loading) {
              <app-loading />
            } @else if (r.error) {
              <app-error-state />
            } @else if (!r.data?.length) {
              <app-empty icon="build" message="No service recorded yet." />
            } @else {
              <mat-list>
                @for (s of r.data; track s.id) {
                  <mat-list-item>
                    <span matListItemTitle>{{ s.summary }}</span>
                    <span matListItemLine
                      >{{ s.performedOn | date: 'mediumDate' }}
                      @if (s.performedBy) {
                        · {{ s.performedBy }}
                      }
                      @if (s.cost !== null) {
                        · {{ s.cost | currency: s.currency ?? 'CHF' }}
                      }
                    </span>
                  </mat-list-item>
                }
              </mat-list>
            }
          </mat-tab>

          <mat-tab [label]="'Attachments (' + (attachments().data?.length ?? 0) + ')'">
            <div class="actions" style="margin:12px 0">
              @if (auth.canWrite() && x.status !== 'ARCHIVED') {
                <input #file type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.txt" (change)="upload(file)" />
                <button mat-stroked-button (click)="file.click()" [disabled]="uploading()">
                  <mat-icon>attach_file</mat-icon> {{ uploading() ? 'Uploading…' : 'Upload' }}
                </button>
              }
            </div>
            @let at = attachments();
            @if (at.loading) {
              <app-loading />
            } @else if (at.error) {
              <app-error-state />
            } @else if (!at.data?.length) {
              <app-empty icon="attach_file" message="No documents or photos yet. PDF, JPEG, PNG, WebP and text up to 10 MB." />
            } @else {
              <mat-list>
                @for (f of at.data; track f.id) {
                  <mat-list-item>
                    <span matListItemTitle>{{ f.fileName }}</span>
                    <span matListItemLine>{{ bytes(f.sizeBytes) }} · {{ f.uploadedAt | date: 'medium' }}</span>
                    <span matListItemMeta>
                      @if (f.contentType.startsWith('image/')) {
                        <button mat-icon-button aria-label="Preview" matTooltip="Preview" (click)="preview(f)">
                          <mat-icon>visibility</mat-icon>
                        </button>
                      }
                      <button mat-icon-button aria-label="Download" matTooltip="Download" (click)="download(f)">
                        <mat-icon>download</mat-icon>
                      </button>
                      @if (auth.canWrite()) {
                        <button mat-icon-button aria-label="Delete attachment" (click)="removeAttachment(f)">
                          <mat-icon>delete</mat-icon>
                        </button>
                      }
                    </span>
                  </mat-list-item>
                }
              </mat-list>
            }
          </mat-tab>

          <mat-tab label="History">
            @let h = history();
            @if (h.loading) {
              <app-loading />
            } @else if (h.error) {
              <app-error-state />
            } @else {
              <mat-list>
                @for (e of h.data; track e.id) {
                  <mat-list-item>
                    <span matListItemTitle
                      >{{ e.operation }} <span class="muted">by {{ e.actor }} · {{ relativeTime(e.occurredAt) }}</span></span
                    >
                    <span matListItemLine
                      >{{ e.occurredAt | date: 'medium' }}
                      @if (e.requestId) {
                        · request {{ e.requestId }}
                      }
                    </span>
                    @if (e.changedFields) {
                      <span matListItemLine>
                        @for (c of e.changedFields | keyvalue; track c.key) {
                          <span class="chip">{{ c.key }}: {{ c.value.from ?? '∅' }} → {{ c.value.to ?? '∅' }}</span>
                        }
                      </span>
                    }
                  </mat-list-item>
                }
              </mat-list>
            }
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: `
    mat-list-item .chip {
      margin-right: 6px;
    }
  `,
})
export class AssetDetail {
  readonly id = input.required<string>();
  readonly auth = inject(AuthService);
  private readonly api = inject(AssetsApi);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(Confirm);

  private readonly notify = inject(Notify);
  readonly statusClass = statusClass;
  readonly urgencyClass = urgencyClass;
  readonly bytes = bytes;
  readonly relativeTime = relativeTime;

  readonly asset = signal<Loaded<Asset>>({ loading: true, error: false, data: null });
  readonly maintenance = signal<Loaded<MaintenanceItem[]>>({ loading: true, error: false, data: null });
  readonly records = signal<Loaded<ServiceRecord[]>>({ loading: true, error: false, data: null });
  readonly attachments = signal<Loaded<Attachment[]>>({ loading: true, error: false, data: null });
  readonly history = signal<Loaded<AuditEvent[]>>({ loading: true, error: false, data: null });
  readonly uploading = signal(false);
  private etag = '';
  readonly title = computed(() => this.asset().data?.name ?? 'Asset');

  constructor() {
    queueMicrotask(() => this.loadAll());
  }

  private loadAll(): void {
    const id = this.id();
    this.api.get(id).subscribe({
      next: ({ body, etag }) => {
        this.etag = etag;
        this.asset.set({ loading: false, error: false, data: body });
      },
      error: () => this.asset.set({ loading: false, error: true, data: null }),
    });
    this.reloadTabs();
  }

  private reloadTabs(): void {
    const id = this.id();
    const into = <T>(sig: (v: Loaded<T>) => void) => ({
      next: (data: T) => sig({ loading: false, error: false, data }),
      error: () => sig({ loading: false, error: true, data: null }),
    });
    this.api.maintenance(id).subscribe(into<MaintenanceItem[]>((v) => this.maintenance.set(v)));
    this.api.serviceRecords(id).subscribe(into<ServiceRecord[]>((v) => this.records.set(v)));
    this.api.attachments(id).subscribe(into<Attachment[]>((v) => this.attachments.set(v)));
    this.api.history(id).subscribe(into<AuditEvent[]>((v) => this.history.set(v)));
  }

  changeStatus(status: AssetStatus): void {
    this.api.changeStatus(this.id(), this.etag, status).subscribe({
      next: ({ body, etag }) => {
        this.etag = etag;
        this.asset.set({ loading: false, error: false, data: body });
        this.reloadTabs();
      },
      error: (err: unknown) => this.fail(err, 'Status could not be changed.'),
    });
  }

  async archive(): Promise<void> {
    if (
      !(await this.confirm.ask({
        title: 'Archive this asset?',
        message: 'It leaves the list but keeps its history. An administrator can restore it.',
        confirmLabel: 'Archive',
        danger: true,
      }))
    )
      return;
    this.api.archive(this.id()).subscribe({
      next: () => {
        this.snack.open('Asset archived.', undefined, { duration: 3000 });
        void this.router.navigate(['/assets']);
      },
      error: (err: unknown) => this.fail(err, 'The asset could not be archived.'),
    });
  }

  copyLink(): void {
    void navigator.clipboard.writeText(window.location.href).then(
      () => this.notify.success('Link copied.'),
      () => this.notify.error('Could not copy the link.'),
    );
  }

  print(): void {
    window.print();
  }

  async deletePermanently(): Promise<void> {
    const name = this.asset().data?.name ?? '';
    const typed = window.prompt(
      `This removes the asset and its attachments for good; the audit history stays. Type the asset name to confirm:\n${name}`,
    );
    if (typed !== name) {
      if (typed !== null) this.notify.info('The name did not match. Nothing was deleted.');
      return;
    }
    this.api.hardDelete(this.id()).subscribe({
      next: () => {
        this.notify.success('Asset deleted permanently.');
        void this.router.navigate(['/assets']);
      },
      error: (err: unknown) => this.fail(err, 'The asset could not be deleted. Only archived assets without service history can be.'),
    });
  }

  reschedule(item: MaintenanceItem): void {
    this.dialog
      .open(PlanDialog, { width: '640px', data: item })
      .afterClosed()
      .subscribe((req?: MaintenanceItemRequest) => {
        if (!req) return;
        const body = { ...req, currency: req.cost !== null ? (req.currency ?? 'CHF').toUpperCase() : null };
        this.api.updateMaintenance(item.id, body).subscribe({
          next: () => {
            this.notify.success('Maintenance updated.');
            this.reloadTabs();
          },
          error: (err: unknown) => this.fail(err, 'Could not update the item.'),
        });
      });
  }

  preview(f: Attachment): void {
    this.api.download(f.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.dialog
          .open(ImagePreviewDialog, { data: { url, name: f.fileName }, maxWidth: '90vw' })
          .afterClosed()
          .subscribe(() => URL.revokeObjectURL(url));
      },
      error: (err: unknown) => this.fail(err, 'Preview failed.'),
    });
  }

  restore(): void {
    this.api
      .restore(this.id())
      .subscribe({ next: () => this.loadAll(), error: (err: unknown) => this.fail(err, 'The asset could not be restored.') });
  }

  plan(): void {
    this.dialog
      .open(PlanDialog, { width: '640px' })
      .afterClosed()
      .subscribe((req?: MaintenanceItemRequest) => {
        if (!req) return;
        const body = { ...req, currency: req.cost !== null ? (req.currency ?? 'CHF').toUpperCase() : null };
        this.api
          .planMaintenance(this.id(), body)
          .subscribe({ next: () => this.reloadTabs(), error: (err: unknown) => this.fail(err, 'Could not plan.') });
      });
  }

  complete(item: MaintenanceItem): void {
    this.dialog
      .open(ServiceDialog, { width: '640px', data: { title: `Done: ${item.description}` } })
      .afterClosed()
      .subscribe((req?: ServiceRecordRequest) => {
        if (!req) return;
        this.api
          .completeMaintenance(item.id, this.normalise(req))
          .subscribe({ next: () => this.reloadTabs(), error: (err: unknown) => this.fail(err, 'Could not complete.') });
      });
  }

  async cancel(item: MaintenanceItem): Promise<void> {
    if (!(await this.confirm.ask({ title: 'Cancel this item?', message: item.description, confirmLabel: 'Cancel item', danger: true })))
      return;
    this.api
      .cancelMaintenance(item.id)
      .subscribe({ next: () => this.reloadTabs(), error: (err: unknown) => this.fail(err, 'Could not cancel.') });
  }

  recordService(): void {
    this.dialog
      .open(ServiceDialog, { width: '640px', data: { title: 'Record a repair or service' } })
      .afterClosed()
      .subscribe((req?: ServiceRecordRequest) => {
        if (!req) return;
        this.api
          .recordService(this.id(), this.normalise(req))
          .subscribe({ next: () => this.reloadTabs(), error: (err: unknown) => this.fail(err, 'Could not record.') });
      });
  }

  upload(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading.set(true);
    this.api.upload(this.id(), file).subscribe({
      next: () => {
        this.uploading.set(false);
        this.reloadTabs();
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.fail(err, 'Upload failed.');
      },
    });
  }

  download(f: Attachment): void {
    this.api.download(f.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.fileName;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => this.fail(err, 'Download failed.'),
    });
  }

  async removeAttachment(f: Attachment): Promise<void> {
    if (!(await this.confirm.ask({ title: 'Delete attachment?', message: f.fileName, confirmLabel: 'Delete', danger: true }))) return;
    this.api
      .deleteAttachment(f.id)
      .subscribe({ next: () => this.reloadTabs(), error: (err: unknown) => this.fail(err, 'Could not delete.') });
  }

  private normalise(req: ServiceRecordRequest): ServiceRecordRequest {
    return {
      ...req,
      currency: req.cost !== null ? (req.currency ?? 'CHF').toUpperCase() : null,
      performedBy: req.performedBy?.trim() || null,
      notes: req.notes?.trim() || null,
    };
  }

  private fail(err: unknown, fallback: string): void {
    const p = asProblem(err);
    const msg = problemCode(p) === 'stale-version' ? 'Someone else changed this asset. Reloading.' : (p?.detail ?? fallback);
    this.snack.open(msg, 'Close', { duration: 6000 });
    if (problemCode(p) === 'stale-version') this.loadAll();
  }
}

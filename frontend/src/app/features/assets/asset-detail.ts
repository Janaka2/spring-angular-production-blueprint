import { Component, computed, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, KeyValuePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
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
import {
  actorLabel,
  bytes,
  categoryIcon,
  daysUntil,
  operationIcon,
  operationLabel,
  operationTone,
  statusClass,
  statusLabel,
  Tone,
  urgencyClass,
  urgencyLabel,
} from '../../shared/format';

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
    MatDialogModule,
    Loading,
    Empty,
    ErrorState,
  ],
  template: `
    <div class="page">
      @let a = asset();
      @if (a.loading) {
        <app-loading variant="detail" label="Loading the asset" />
      } @else if (a.error || !a.data) {
        <a routerLink="/assets" class="back" aria-label="Back to all assets"><mat-icon>arrow_back</mat-icon> All assets</a>
        <div class="card"><app-error-state message="This asset could not be loaded. It may have been removed." /></div>
      } @else {
        @let x = a.data;
        <a routerLink="/assets" class="back no-print" aria-label="Back to all assets"><mat-icon>arrow_back</mat-icon> All assets</a>
        <header class="hero">
          <span class="tile-icon lg"
            ><mat-icon aria-hidden="true">{{ categoryIcon(x.category.code) }}</mat-icon></span
          >
          <div class="hero-main">
            <div class="title-row">
              <h1 class="title">{{ x.name }}</h1>
              <span [class]="statusClass(x.status)">{{ statusLabel(x.status) }}</span>
            </div>
            <div class="meta">
              <span><mat-icon aria-hidden="true">folder</mat-icon>{{ x.category.name }}</span>
              @if (x.assetTag) {
                <span class="mono"><mat-icon aria-hidden="true">sell</mat-icon>{{ x.assetTag }}</span>
              }
              @if (x.manufacturer || x.model) {
                <span><mat-icon aria-hidden="true">factory</mat-icon>{{ x.manufacturer }} {{ x.model }}</span>
              }
              <span class="faint">Updated {{ relativeTime(x.updatedAt) }} by {{ who(x.updatedBy) }}</span>
            </div>
          </div>
          <div class="actions no-print">
            @if (!auth.canWrite()) {
              <button mat-icon-button (click)="copyLink()" aria-label="Copy link" matTooltip="Copy link"><mat-icon>link</mat-icon></button>
              <button mat-icon-button (click)="print()" aria-label="Print" matTooltip="Print"><mat-icon>print</mat-icon></button>
            } @else {
              @if (x.status !== 'ARCHIVED') {
                <a mat-stroked-button [routerLink]="['/assets', x.id, 'edit']"><mat-icon>edit</mat-icon> Edit</a>
              }
              <button mat-stroked-button [matMenuTriggerFor]="more" aria-label="More actions"><mat-icon>more_horiz</mat-icon> More</button>
              <mat-menu #more="matMenu" xPosition="before">
                @if (x.status === 'ACTIVE') {
                  <button mat-menu-item (click)="changeStatus('IN_REPAIR')"><mat-icon>build</mat-icon>Mark as in repair</button>
                  <button mat-menu-item (click)="changeStatus('RETIRED')"><mat-icon>do_not_disturb_on</mat-icon>Retire</button>
                }
                @if (x.status === 'IN_REPAIR') {
                  <button mat-menu-item (click)="changeStatus('ACTIVE')"><mat-icon>check_circle</mat-icon>Back in service</button>
                  <button mat-menu-item (click)="changeStatus('RETIRED')"><mat-icon>do_not_disturb_on</mat-icon>Retire</button>
                }
                <button mat-menu-item (click)="copyLink()"><mat-icon>link</mat-icon>Copy link</button>
                <a mat-menu-item [routerLink]="['/assets/new']" [queryParams]="{ from: x.id }"
                  ><mat-icon>content_copy</mat-icon>Duplicate</a
                >
                <button mat-menu-item (click)="print()"><mat-icon>print</mat-icon>Print</button>
                @if (x.status !== 'ARCHIVED') {
                  <button mat-menu-item (click)="archive()" class="danger"><mat-icon>archive</mat-icon>Archive</button>
                }
                @if (x.status === 'ARCHIVED' && auth.isAdmin()) {
                  <button mat-menu-item (click)="restore()"><mat-icon>unarchive</mat-icon>Restore</button>
                  <button mat-menu-item (click)="deletePermanently()" class="danger">
                    <mat-icon>delete_forever</mat-icon>Delete permanently
                  </button>
                }
              </mat-menu>
            }
          </div>
        </header>

        <mat-tab-group dynamicHeight animationDuration="150ms" mat-stretch-tabs="false" mat-align-tabs="start">
          <mat-tab label="Details">
            <div class="details">
              <section class="card">
                <div class="card-head"><h2>Overview</h2></div>
                <dl class="fields card-pad">
                  <div>
                    <dt>Manufacturer</dt>
                    <dd>{{ x.manufacturer ?? '—' }}</dd>
                  </div>
                  <div>
                    <dt>Model</dt>
                    <dd>{{ x.model ?? '—' }}</dd>
                  </div>
                  <div>
                    <dt>Serial number</dt>
                    <dd [class.mono]="!!x.serialNumber">{{ x.serialNumber ?? '—' }}</dd>
                  </div>
                  <div>
                    <dt>Asset tag</dt>
                    <dd [class.mono]="!!x.assetTag">{{ x.assetTag ?? '—' }}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{{ x.category.name }}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{{ x.location ?? '—' }}</dd>
                  </div>
                  <div class="wide">
                    <dt>Description</dt>
                    <dd>{{ x.description ?? '—' }}</dd>
                  </div>
                  <div class="wide">
                    <dt>Notes</dt>
                    <dd style="white-space: pre-wrap">{{ x.notes ?? '—' }}</dd>
                  </div>
                </dl>
              </section>
              <div class="side">
                <section class="card">
                  <div class="card-head"><h2>Purchase &amp; warranty</h2></div>
                  <div class="card-pad purchase">
                    <div class="price num">
                      {{ x.purchasePrice !== null ? (x.purchasePrice | currency: x.currency ?? 'CHF') : '—' }}
                    </div>
                    <div class="muted">
                      {{ x.purchaseDate ? 'Purchased ' + (x.purchaseDate | date: 'mediumDate') : 'Purchase date not recorded' }}
                    </div>
                    @let w = warranty();
                    <div class="warranty">
                      <div class="w-row">
                        <span>Warranty</span>
                        @if (w) {
                          <span [class]="'pill ' + w.tone">{{ w.label }}</span>
                        } @else {
                          <span class="faint">Not recorded</span>
                        }
                      </div>
                      @if (w && w.progress !== null) {
                        <div
                          class="track"
                          role="progressbar"
                          [attr.aria-valuenow]="w.progress"
                          aria-valuemin="0"
                          aria-valuemax="100"
                          aria-label="Warranty used"
                        >
                          <span [style.width.%]="w.progress" [class]="w.tone"></span>
                        </div>
                      }
                      @if (x.warrantyUntil) {
                        <div class="faint small">Until {{ x.warrantyUntil | date: 'mediumDate' }}</div>
                      }
                    </div>
                  </div>
                </section>
                <section class="card">
                  <div class="card-head"><h2>Record</h2></div>
                  <dl class="kv card-pad small">
                    <dt>Created</dt>
                    <dd>{{ x.createdAt | date: 'medium' }} · {{ who(x.createdBy) }}</dd>
                    <dt>Updated</dt>
                    <dd>{{ x.updatedAt | date: 'medium' }} · {{ who(x.updatedBy) }}</dd>
                    <dt>Version</dt>
                    <dd class="num">v{{ x.version }}</dd>
                  </dl>
                </section>
              </div>
            </div>
          </mat-tab>

          <mat-tab [label]="'Maintenance (' + (maintenance().data?.length ?? 0) + ')'">
            <div class="tab-bar">
              <p class="muted">Planned work and reminders. Recurring items schedule their next occurrence when you mark them done.</p>
              @if (auth.canWrite() && x.status !== 'ARCHIVED') {
                <button mat-flat-button (click)="plan()"><mat-icon>event</mat-icon> Plan maintenance</button>
              }
            </div>
            @let m = maintenance();
            <div class="card">
              @if (m.loading) {
                <app-loading />
              } @else if (m.error) {
                <app-error-state />
              } @else if (!m.data?.length) {
                <app-empty
                  icon="event_available"
                  heading="Nothing planned"
                  message="Plan inspections, services and replacements to get reminded in time."
                />
              } @else {
                <ul class="rows">
                  @for (i of m.data; track i.id) {
                    <li class="row" [class.done]="i.status !== 'PLANNED'">
                      <span class="date" [class.late]="i.urgency === 'OVERDUE'"
                        ><span class="mon">{{ i.dueDate | date: 'MMM' }}</span
                        ><span class="day">{{ i.dueDate | date: 'd' }}</span></span
                      >
                      <span class="main">
                        <span class="line1"
                          >{{ i.description }} <span [class]="urgencyClass(i.urgency)">{{ urgencyLabel(i.urgency) }}</span></span
                        >
                        <span class="line2"
                          >{{ typeLabel(i.type) }} · due {{ i.dueDate | date: 'mediumDate' }}
                          @if (i.recurrence) {
                            · repeats {{ recurrenceLabel(i.recurrence) }}
                          }
                          @if (i.serviceProvider) {
                            · {{ i.serviceProvider }}
                          }
                          @if (i.cost !== null) {
                            · {{ i.cost | currency: i.currency ?? 'CHF' }}
                          }
                        </span>
                      </span>
                      @if (i.status === 'PLANNED' && auth.canWrite()) {
                        <span class="row-actions">
                          <button mat-stroked-button (click)="complete(i)"><mat-icon>check</mat-icon>Done</button>
                          <button mat-icon-button aria-label="Edit or reschedule" matTooltip="Edit or reschedule" (click)="reschedule(i)">
                            <mat-icon>edit_calendar</mat-icon>
                          </button>
                          <button mat-icon-button aria-label="Cancel item" matTooltip="Cancel" (click)="cancel(i)">
                            <mat-icon>close</mat-icon>
                          </button>
                        </span>
                      }
                    </li>
                  }
                </ul>
              }
            </div>
          </mat-tab>

          <mat-tab [label]="'Service history (' + (records().data?.length ?? 0) + ')'">
            <div class="tab-bar">
              <p class="muted">Every repair and service, planned or not.</p>
              @if (auth.canWrite() && x.status !== 'ARCHIVED') {
                <button mat-stroked-button (click)="recordService()"><mat-icon>build</mat-icon> Record a repair</button>
              }
            </div>
            @let r = records();
            <div class="card">
              @if (r.loading) {
                <app-loading />
              } @else if (r.error) {
                <app-error-state />
              } @else if (!r.data?.length) {
                <app-empty icon="build" heading="No service yet" message="Completed maintenance and recorded repairs appear here." />
              } @else {
                <ol class="timeline">
                  @for (sr of r.data; track sr.id) {
                    <li>
                      <span class="node ok"><mat-icon aria-hidden="true">build</mat-icon></span>
                      <div class="tl-body">
                        <div class="line1">{{ sr.summary }}</div>
                        <div class="line2">
                          {{ sr.performedOn | date: 'mediumDate' }}
                          @if (sr.performedBy) {
                            · {{ sr.performedBy }}
                          }
                          @if (sr.cost !== null) {
                            · <span class="num">{{ sr.cost | currency: sr.currency ?? 'CHF' }}</span>
                          }
                        </div>
                        @if (sr.notes) {
                          <p class="note">{{ sr.notes }}</p>
                        }
                      </div>
                    </li>
                  }
                </ol>
              }
            </div>
          </mat-tab>

          <mat-tab [label]="'Attachments (' + (attachments().data?.length ?? 0) + ')'">
            @if (auth.canWrite() && x.status !== 'ARCHIVED') {
              <input #file type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.txt" (change)="upload(file)" />
              <button
                type="button"
                class="dropzone"
                [class.over]="dragOver()"
                [disabled]="uploading()"
                (click)="file.click()"
                (dragover)="$event.preventDefault(); dragOver.set(true)"
                (dragleave)="dragOver.set(false)"
                (drop)="onDrop($event)"
              >
                <span class="tile-icon"
                  ><mat-icon aria-hidden="true">{{ uploading() ? 'hourglass_top' : 'upload_file' }}</mat-icon></span
                >
                <span>
                  <strong>{{ uploading() ? 'Uploading…' : 'Upload a file' }}</strong>
                  <span class="muted"> or drop it here · PDF, JPEG, PNG, WebP or text, up to 10 MB</span>
                </span>
              </button>
            }
            @let at = attachments();
            @if (at.loading) {
              <app-loading variant="cards" [count]="3" />
            } @else if (at.error) {
              <div class="card"><app-error-state /></div>
            } @else if (!at.data?.length) {
              <div class="card">
                <app-empty
                  icon="attach_file"
                  heading="No files yet"
                  message="Keep receipts, manuals, warranty cards and photos with the asset."
                />
              </div>
            } @else {
              <div class="files">
                @for (f of at.data; track f.id) {
                  <div class="card file">
                    <span class="tile-icon" [class.neutral]="!f.contentType.startsWith('image/')"
                      ><mat-icon aria-hidden="true">{{ fileIcon(f.contentType) }}</mat-icon></span
                    >
                    <div class="file-main">
                      <div class="line1" [title]="f.fileName">{{ f.fileName }}</div>
                      <div class="line2">{{ bytes(f.sizeBytes) }} · {{ f.uploadedAt | date: 'mediumDate' }}</div>
                    </div>
                    <div class="file-actions">
                      @if (f.contentType.startsWith('image/')) {
                        <button mat-icon-button aria-label="Preview" matTooltip="Preview" (click)="preview(f)">
                          <mat-icon>visibility</mat-icon>
                        </button>
                      }
                      <button mat-icon-button aria-label="Download" matTooltip="Download" (click)="download(f)">
                        <mat-icon>download</mat-icon>
                      </button>
                      @if (auth.canWrite()) {
                        <button mat-icon-button aria-label="Delete attachment" matTooltip="Delete" (click)="removeAttachment(f)">
                          <mat-icon>delete</mat-icon>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </mat-tab>

          <mat-tab label="History">
            @let h = history();
            <div class="card">
              @if (h.loading) {
                <app-loading />
              } @else if (h.error) {
                <app-error-state />
              } @else {
                <ol class="timeline">
                  @for (e of h.data; track e.id) {
                    <li>
                      <span [class]="'node ' + operationTone(e.operation)"
                        ><mat-icon aria-hidden="true">{{ operationIcon(e.operation) }}</mat-icon></span
                      >
                      <div class="tl-body">
                        <div class="line1">
                          <strong>{{ operationLabel(e.operation) }}</strong> <span class="muted">by {{ who(e.actor) }}</span>
                          <span class="faint" [title]="e.occurredAt | date: 'medium'">· {{ relativeTime(e.occurredAt) }}</span>
                        </div>
                        <div class="line2 mono">
                          {{ e.occurredAt | date: 'medium' }}
                          @if (e.requestId) {
                            · request {{ e.requestId }}
                          }
                        </div>
                        @if (e.changedFields) {
                          <div class="changes">
                            @for (c of e.changedFields | keyvalue; track c.key) {
                              <span class="chip"
                                ><strong>{{ c.key }}</strong> {{ c.value.from ?? '∅' }}
                                <mat-icon aria-hidden="true">arrow_forward</mat-icon> {{ c.value.to ?? '∅' }}</span
                              >
                            }
                          </div>
                        }
                      </div>
                    </li>
                  }
                </ol>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: `
    .hero {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }
    .hero-main {
      flex: 1;
      min-width: 240px;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 18px;
      margin-top: 8px;
      font-size: 13px;
      color: var(--ac-text-2);
    }
    .meta span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .meta .mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--ac-text-3);
    }
    .details {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
      gap: 16px;
      align-items: start;
    }
    .side {
      display: grid;
      gap: 16px;
    }
    .purchase {
      display: grid;
      gap: 4px;
    }
    .price {
      font-size: 26px;
      font-weight: 650;
      letter-spacing: -0.02em;
    }
    .warranty {
      display: grid;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--ac-border);
    }
    .w-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 500;
    }
    .track {
      height: 6px;
      border-radius: 999px;
      background: var(--ac-surface-2);
      overflow: hidden;
    }
    .track span {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: var(--ac-success);
    }
    .track span.warn {
      background: var(--ac-warn);
    }
    .track span.bad {
      background: var(--ac-danger);
    }
    .small {
      font-size: 12.5px;
    }
    .tab-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .tab-bar p {
      margin: 0;
      font-size: 13px;
    }
    .date {
      display: grid;
      place-items: center;
      flex: none;
      width: 44px;
      height: 46px;
      border-radius: 10px;
      border: 1px solid var(--ac-border);
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
    li.row + li.row {
      border-top: 1px solid var(--ac-border);
      border-radius: 0;
    }
    li.row {
      padding: 14px;
      flex-wrap: wrap;
    }
    li.row.done {
      opacity: 0.7;
    }
    li.row .line1 {
      white-space: normal;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    li.row .line2 {
      white-space: normal;
      margin-top: 2px;
    }
    .row-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .timeline {
      list-style: none;
      margin: 0;
      padding: 20px 20px 8px;
    }
    .timeline li {
      position: relative;
      display: flex;
      gap: 14px;
      padding-bottom: 20px;
    }
    .timeline li:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 15px;
      top: 34px;
      bottom: 4px;
      width: 1px;
      background: var(--ac-border);
    }
    .node {
      display: grid;
      place-items: center;
      flex: none;
      width: 31px;
      height: 31px;
      border-radius: 50%;
      border: 1px solid var(--ac-border);
      background: var(--ac-surface-2);
      color: var(--ac-text-2);
    }
    .node .mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .node.ok {
      color: var(--ac-success);
      background: var(--ac-success-soft);
      border-color: transparent;
    }
    .node.warn {
      color: var(--ac-warn);
      background: var(--ac-warn-soft);
      border-color: transparent;
    }
    .node.bad {
      color: var(--ac-danger);
      background: var(--ac-danger-soft);
      border-color: transparent;
    }
    .node.info {
      color: var(--ac-info);
      background: var(--ac-info-soft);
      border-color: transparent;
    }
    .node.accent {
      color: var(--ac-accent);
      background: var(--ac-accent-soft);
      border-color: transparent;
    }
    .tl-body {
      flex: 1;
      min-width: 0;
      padding-top: 4px;
    }
    .tl-body .line1 {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0 6px;
      font-weight: 500;
    }
    .tl-body .line2 {
      margin-top: 2px;
      font-size: 12px;
      color: var(--ac-text-3);
      overflow-wrap: anywhere;
    }
    .note {
      margin: 8px 0 0;
      color: var(--ac-text-2);
      font-size: 13px;
    }
    .changes {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .changes .mat-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
    }
    .dropzone {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      margin-bottom: 16px;
      padding: 16px 18px;
      border: 1.5px dashed var(--ac-border-strong);
      border-radius: var(--ac-radius-lg);
      background: var(--ac-surface);
      color: var(--ac-text);
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition:
        border-color 0.15s,
        background-color 0.15s;
    }
    .dropzone:hover,
    .dropzone.over {
      border-color: var(--ac-accent);
      background: var(--ac-accent-soft);
    }
    .files {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }
    .file {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 8px 12px 14px;
    }
    .file-main {
      flex: 1;
      min-width: 0;
    }
    .file-main .line1 {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-main .line2 {
      font-size: 12px;
      color: var(--ac-text-3);
    }
    .file-actions {
      display: flex;
    }
    @media (max-width: 900px) {
      .details {
        grid-template-columns: 1fr;
      }
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
  readonly statusLabel = statusLabel;
  readonly urgencyClass = urgencyClass;
  readonly urgencyLabel = urgencyLabel;
  readonly categoryIcon = categoryIcon;
  readonly operationLabel = operationLabel;
  readonly operationIcon = operationIcon;
  readonly operationTone = operationTone;
  readonly dragOver = signal(false);
  readonly who = (actor: string | null | undefined): string => actorLabel(actor, this.auth.user()?.subject);
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

  /** Warranty state for the side card: a label, a tone and how much of the period has passed. */
  readonly warranty = computed<{ label: string; tone: Tone; progress: number | null } | null>(() => {
    const x = this.asset().data;
    if (!x?.warrantyUntil) return null;
    const left = daysUntil(x.warrantyUntil);
    const tone: Tone = left < 0 ? 'bad' : left <= 60 ? 'warn' : 'ok';
    const label = left < 0 ? 'Expired' : left === 0 ? 'Ends today' : left <= 60 ? `${left} days left` : 'Active';
    let progress: number | null = null;
    if (x.purchaseDate) {
      const total = daysUntil(x.warrantyUntil) - daysUntil(x.purchaseDate);
      progress = total > 0 ? Math.min(100, Math.max(0, Math.round(((total - Math.max(left, 0)) / total) * 100))) : 100;
    }
    return { label, tone, progress };
  });

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
    if (file) this.uploadFile(file);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && !this.uploading()) this.uploadFile(file);
  }

  typeLabel(t: string): string {
    return t.charAt(0) + t.slice(1).toLowerCase();
  }

  recurrenceLabel(r: string): string {
    return ({ P1M: 'monthly', P3M: 'quarterly', P6M: 'twice a year', P1Y: 'yearly' } as Record<string, string>)[r] ?? r;
  }

  fileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType === 'application/pdf') return 'picture_as_pdf';
    return 'description';
  }

  private uploadFile(file: File): void {
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

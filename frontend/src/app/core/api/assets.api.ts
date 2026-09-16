import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../config';
import {
  Asset,
  AssetListParams,
  AssetRequest,
  AssetStatus,
  Attachment,
  AuditEvent,
  Category,
  CategoryRequest,
  Dashboard,
  MaintenanceItem,
  MaintenanceItemRequest,
  Me,
  Page,
  ServiceRecord,
  ServiceRecordRequest,
} from './models';

/** A resource plus the ETag that must be sent back as If-Match on the next update. */
export interface Versioned<T> {
  body: T;
  etag: string;
}

/** The AssetCare API, one method per endpoint. Reads return observables that screens wrap in resources. */
@Injectable({ providedIn: 'root' })
export class AssetsApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return `${this.config.value.apiUrl}/api/v1`;
  }

  list(p: AssetListParams): Observable<Page<Asset>> {
    let params = new HttpParams().set('page', p.page).set('size', p.size).set('sort', p.sort);
    if (p.search) params = params.set('search', p.search);
    if (p.status) params = params.set('status', p.status);
    if (p.categoryId) params = params.set('categoryId', p.categoryId);
    if (p.includeArchived) params = params.set('includeArchived', 'true');
    return this.http.get<Page<Asset>>(`${this.base}/assets`, { params });
  }

  get(id: string): Observable<Versioned<Asset>> {
    return this.http
      .get<Asset>(`${this.base}/assets/${id}`, { observe: 'response' })
      .pipe(map((r) => ({ body: r.body as Asset, etag: r.headers.get('ETag') ?? `"${r.body?.version}"` })));
  }

  create(req: AssetRequest, idempotencyKey: string): Observable<Versioned<Asset>> {
    return this.http
      .post<Asset>(`${this.base}/assets`, req, { observe: 'response', headers: { 'Idempotency-Key': idempotencyKey } })
      .pipe(map((r) => ({ body: r.body as Asset, etag: r.headers.get('ETag') ?? '' })));
  }

  update(id: string, etag: string, req: AssetRequest): Observable<Versioned<Asset>> {
    return this.http
      .put<Asset>(`${this.base}/assets/${id}`, req, { observe: 'response', headers: { 'If-Match': etag } })
      .pipe(map((r) => ({ body: r.body as Asset, etag: r.headers.get('ETag') ?? '' })));
  }

  changeStatus(id: string, etag: string, status: AssetStatus): Observable<Versioned<Asset>> {
    return this.http
      .patch<Asset>(`${this.base}/assets/${id}/status`, { status }, { observe: 'response', headers: { 'If-Match': etag } })
      .pipe(map((r) => ({ body: r.body as Asset, etag: r.headers.get('ETag') ?? '' })));
  }

  archive(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/assets/${id}`);
  }

  restore(id: string): Observable<Asset> {
    return this.http.post<Asset>(`${this.base}/assets/${id}/restore`, {});
  }

  history(id: string): Observable<AuditEvent[]> {
    return this.http.get<AuditEvent[]>(`${this.base}/assets/${id}/history`);
  }

  maintenance(assetId: string): Observable<MaintenanceItem[]> {
    return this.http.get<MaintenanceItem[]>(`${this.base}/assets/${assetId}/maintenance`);
  }

  planMaintenance(assetId: string, req: MaintenanceItemRequest): Observable<MaintenanceItem> {
    return this.http.post<MaintenanceItem>(`${this.base}/assets/${assetId}/maintenance`, req);
  }

  completeMaintenance(itemId: string, req: ServiceRecordRequest): Observable<ServiceRecord> {
    return this.http.post<ServiceRecord>(`${this.base}/maintenance/${itemId}/complete`, req);
  }

  cancelMaintenance(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/maintenance/${itemId}`);
  }

  serviceRecords(assetId: string): Observable<ServiceRecord[]> {
    return this.http.get<ServiceRecord[]>(`${this.base}/assets/${assetId}/service-records`);
  }

  recordService(assetId: string, req: ServiceRecordRequest): Observable<ServiceRecord> {
    return this.http.post<ServiceRecord>(`${this.base}/assets/${assetId}/service-records`, req);
  }

  attachments(assetId: string): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(`${this.base}/assets/${assetId}/attachments`);
  }

  upload(assetId: string, file: File): Observable<Attachment> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<Attachment>(`${this.base}/assets/${assetId}/attachments`, form);
  }

  download(attachmentId: string): Observable<Blob> {
    return this.http.get(`${this.base}/attachments/${attachmentId}/content`, { responseType: 'blob' });
  }

  deleteAttachment(attachmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/attachments/${attachmentId}`);
  }

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`);
  }

  createCategory(req: CategoryRequest): Observable<Category> {
    return this.http.post<Category>(`${this.base}/categories`, req);
  }

  updateCategory(id: string, req: CategoryRequest): Observable<Category> {
    return this.http.put<Category>(`${this.base}/categories/${id}`, req);
  }

  updateMaintenance(itemId: string, req: MaintenanceItemRequest): Observable<MaintenanceItem> {
    return this.http.put<MaintenanceItem>(`${this.base}/maintenance/${itemId}`, req);
  }

  hardDelete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/assets/${id}/permanent`);
  }

  dashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.base}/dashboard`);
  }

  me(): Observable<Me> {
    return this.http.get<Me>(`${this.base}/me`);
  }
}

export type AssetStatus = 'ACTIVE' | 'IN_REPAIR' | 'RETIRED' | 'ARCHIVED';
export type MaintenanceType = 'SERVICE' | 'INSPECTION' | 'REPLACEMENT' | 'CLEANING' | 'OTHER';
export type MaintenanceStatus = 'PLANNED' | 'DONE' | 'CANCELLED';
export type Urgency = 'PLANNED' | 'DUE' | 'OVERDUE' | 'DONE' | 'CANCELLED';

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
}

export interface CategoryRequest {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export interface Asset {
  id: string;
  name: string;
  description: string | null;
  assetTag: string | null;
  serialNumber: string | null;
  category: Category;
  status: AssetStatus;
  manufacturer: string | null;
  model: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  currency: string | null;
  warrantyUntil: string | null;
  location: string | null;
  owner: string;
  notes: string | null;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  archivedAt: string | null;
}

export interface AssetRequest {
  name: string;
  description: string | null;
  assetTag: string | null;
  serialNumber: string | null;
  categoryId: string;
  manufacturer: string | null;
  model: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  currency: string | null;
  warrantyUntil: string | null;
  location: string | null;
  notes: string | null;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface MaintenanceItem {
  id: string;
  assetId: string;
  assetName: string;
  type: MaintenanceType;
  description: string;
  dueDate: string;
  recurrence: string | null;
  status: MaintenanceStatus;
  urgency: Urgency;
  completedDate: string | null;
  cost: number | null;
  currency: string | null;
  serviceProvider: string | null;
  notes: string | null;
  version: number;
}

export interface MaintenanceItemRequest {
  type: MaintenanceType;
  description: string;
  dueDate: string;
  recurrence: string | null;
  cost: number | null;
  currency: string | null;
  serviceProvider: string | null;
  notes: string | null;
}

export interface ServiceRecord {
  id: string;
  assetId: string;
  maintenanceItemId: string | null;
  performedOn: string;
  performedBy: string | null;
  summary: string;
  cost: number | null;
  currency: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: string;
}

export interface ServiceRecordRequest {
  performedOn: string;
  performedBy: string | null;
  summary: string;
  cost: number | null;
  currency: string | null;
  notes: string | null;
}

export interface Attachment {
  id: string;
  assetId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface AuditEvent {
  id: string;
  occurredAt: string;
  actor: string;
  operation: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'ARCHIVE' | 'RESTORE' | 'DELETE' | 'ATTACH' | 'DETACH';
  entityType: string;
  entityId: string;
  changedFields: Record<string, { from: string | null; to: string | null }> | null;
  requestId: string | null;
  traceId: string | null;
}

export interface Dashboard {
  assets: number;
  dueSoon: MaintenanceItem[];
  warrantyEndingSoon: Asset[];
  today: string;
}

export interface Me {
  subject: string;
  displayName: string;
  roles: ('USER' | 'ADMIN' | 'AUDITOR')[];
}

export interface AssetListParams {
  search?: string;
  status?: AssetStatus | '';
  categoryId?: string;
  includeArchived?: boolean;
  page: number;
  size: number;
  sort: string;
}

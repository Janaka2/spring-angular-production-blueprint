import { HttpErrorResponse } from '@angular/common/http';

/** RFC 9457 Problem Details as the API sends them, plus the extra members AssetCare adds. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  requestId?: string;
  traceId?: string;
  errors?: { field: string; message: string }[];
  currentVersion?: number;
  expectedVersion?: number;
  changedBy?: string;
  changedAt?: string;
}

export function asProblem(err: unknown): ProblemDetails | null {
  if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object' && 'status' in err.error) {
    return err.error as ProblemDetails;
  }
  return null;
}

export function problemCode(p: ProblemDetails | null): string {
  return p?.type?.split('/').pop() ?? 'unknown';
}

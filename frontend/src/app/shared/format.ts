import { Urgency } from '../core/api/models';

export function urgencyClass(u: Urgency): string {
  switch (u) {
    case 'OVERDUE':
      return 'chip bad';
    case 'DUE':
      return 'chip warn';
    case 'DONE':
      return 'chip ok';
    default:
      return 'chip';
  }
}

export function statusClass(s: string): string {
  switch (s) {
    case 'ACTIVE':
      return 'chip ok';
    case 'IN_REPAIR':
      return 'chip warn';
    case 'ARCHIVED':
      return 'chip bad';
    default:
      return 'chip';
  }
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** A fresh Idempotency-Key per create attempt; retries of the same attempt reuse it. */
export function idempotencyKey(): string {
  return crypto.randomUUID();
}

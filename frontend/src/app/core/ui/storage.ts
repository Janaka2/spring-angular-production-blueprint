/**
 * localStorage that never throws and never assumes it exists: private windows, disabled storage, embedded webviews
 * and test runners all behave differently. Preferences and drafts are conveniences, so silent no-ops are correct.
 */
export const storage = {
  get(key: string): string | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {
      // storage full or blocked: nothing to do
    }
  },
  remove(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

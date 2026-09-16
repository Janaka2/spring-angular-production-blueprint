import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Leaving a dirty form by link or back button asks first. Closing the tab is covered by the beforeunload listener in the form. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component.hasUnsavedChanges() || window.confirm('You have unsaved changes. Leave this page and discard them?');

import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/auth.guard';
import { unsavedChangesGuard } from './core/ui/unsaved-changes.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard), title: 'Dashboard' },
      { path: 'assets', loadComponent: () => import('./features/assets/asset-list').then((m) => m.AssetList), title: 'Assets' },
      {
        path: 'assets/new',
        loadComponent: () => import('./features/assets/asset-form').then((m) => m.AssetForm),
        canDeactivate: [unsavedChangesGuard],
        title: 'New asset',
      },
      { path: 'assets/:id', loadComponent: () => import('./features/assets/asset-detail').then((m) => m.AssetDetail), title: 'Asset' },
      {
        path: 'assets/:id/edit',
        loadComponent: () => import('./features/assets/asset-form').then((m) => m.AssetForm),
        canDeactivate: [unsavedChangesGuard],
        title: 'Edit asset',
      },
      {
        path: 'admin/categories',
        loadComponent: () => import('./features/admin/categories').then((m) => m.Categories),
        canActivate: [roleGuard('ADMIN')],
        title: 'Categories',
      },
      { path: 'settings', loadComponent: () => import('./features/settings/settings').then((m) => m.Settings), title: 'Settings' },
      { path: 'forbidden', loadComponent: () => import('./shared/forbidden').then((m) => m.Forbidden), title: 'Not allowed' },
      { path: '**', loadComponent: () => import('./shared/not-found').then((m) => m.NotFound), title: 'Page not found' },
    ],
  },
];

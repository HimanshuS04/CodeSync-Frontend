import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.routes')
        .then(m => m.authRoutes)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/dashboard/dashboard.routes')
        .then(m => m.dashboardRoutes)
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/project/project.routes')
        .then(m => m.projectRoutes)
  },
  {
    path: 'editor',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/editor/editor.routes')
        .then(m => m.editorRoutes)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/admin/admin.routes')
        .then(m => m.adminRoutes)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/profile/profile.routes')
        .then(m => m.profileRoutes)
  }
];
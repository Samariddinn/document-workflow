import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'users',
    canActivate: [authGuard, roleGuard('SUPER_ADMIN')],
    loadComponent: () => import('./features/users/users-page/users-page').then((m) => m.UsersPage),
  },
  {
    path: 'users/new',
    canActivate: [authGuard, roleGuard('SUPER_ADMIN')],
    loadComponent: () =>
      import('./features/users/user-create/user-create').then((m) => m.UserCreate),
  },
  {
    path: 'organizations',
    canActivate: [authGuard, roleGuard('SUPER_ADMIN')],
    loadComponent: () =>
      import('./features/organizations/organizations-page/organizations-page').then(
        (m) => m.OrganizationsPage,
      ),
  },
  { path: '**', redirectTo: '' },
];

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() || inject(Router).createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !auth.isLoggedIn() || inject(Router).createUrlTree(['/']);
};

/** Allows the route only for the given roles. Use after `authGuard`. */
export const roleGuard =
  (...roles: UserRole[]): CanActivateFn =>
  () => {
    const role = inject(AuthService).user()?.role;
    return (role !== undefined && roles.includes(role)) || inject(Router).createUrlTree(['/']);
  };

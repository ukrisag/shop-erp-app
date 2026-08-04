import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Employee guard - allows access to users with employee, admin, or super_admin roles
 */
export const employeeGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated && authService.isEmployee) {
    return true;
  }

  router.navigate(['/']);
  return false;
};

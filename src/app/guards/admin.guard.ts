import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { EmployeeAuthService } from '../services/employee-auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const employeeAuthService = inject(EmployeeAuthService);
  const router = inject(Router);

  if (employeeAuthService.isAuthenticated) {
    return true;
  }

  router.navigate(['/admin/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { EmployeeAuthService } from '../services/employee-auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const employeeAuthService = inject(EmployeeAuthService);
  const router = inject(Router);

  // Check if this is an admin/employee endpoint
  // Support both PascalCase and kebab-case URLs
  const urlLower = req.url.toLowerCase();

  // Check if request is coming from admin area by checking the current URL
  const isInAdminArea = router.url.startsWith('/admin');

  const isAdminEndpoint = urlLower.includes('/admin') ||      // Matches /api/admin, /api/gallery/admin, etc.
                          urlLower.includes('/employee-auth') ||
                          urlLower.includes('/employeeauth') ||
                          urlLower.includes('/erp') ||
                          urlLower.includes('/branches') ||
                          urlLower.includes('/employees') ||
                          urlLower.includes('/expenses') ||
                          urlLower.includes('/payroll') ||
                          urlLower.includes('/overtime') ||
                          urlLower.includes('/leave') ||
                          urlLower.includes('/deliveries') ||
                          urlLower.includes('/bank-accounts') ||
                          urlLower.includes('/bank-transactions') ||
                          urlLower.includes('/material-requisitions') ||
                          urlLower.includes('/sales-orders') ||
                          urlLower.includes('/sales-payments') ||
                          // Add categories, brands, products, coupons, reviews, orders, upload when accessed from admin
                          (isInAdminArea && (
                            urlLower.includes('/categories') ||
                            urlLower.includes('/brands') ||
                            urlLower.includes('/products') ||
                            urlLower.includes('/coupons') ||
                            urlLower.includes('/reviews') ||
                            urlLower.includes('/orders') ||
                            urlLower.includes('/gallery') ||
                            urlLower.includes('/users') ||
                            urlLower.includes('/upload')
                          ));

  // Use the appropriate auth service based on the endpoint
  const token = isAdminEndpoint ? employeeAuthService.getToken() : authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (isAdminEndpoint) {
          // Admin endpoint - try to refresh employee token
          const refreshToken = employeeAuthService.getRefreshToken();
          if (refreshToken && !req.url.includes('/refresh-token')) {
            return employeeAuthService.refreshToken().pipe(
              switchMap(() => {
                // Retry the request with new token
                const newToken = employeeAuthService.getToken();
                if (newToken) {
                  req = req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${newToken}`
                    }
                  });
                }
                return next(req);
              }),
              catchError(refreshError => {
                // Refresh failed, logout
                employeeAuthService.logout();
                router.navigate(['/admin/login']);
                return throwError(() => refreshError);
              })
            );
          } else {
            // No refresh token or refresh endpoint failed, logout
            employeeAuthService.logout();
            router.navigate(['/admin/login']);
          }
        } else {
          // Customer endpoint - try to refresh token
          const refreshToken = authService.getRefreshToken();
          if (refreshToken && !req.url.includes('/refresh-token')) {
            return authService.refreshToken().pipe(
              switchMap(() => {
                // Retry the request with new token
                const newToken = authService.getToken();
                if (newToken) {
                  req = req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${newToken}`
                    }
                  });
                }
                return next(req);
              }),
              catchError(refreshError => {
                // Refresh failed, logout
                authService.logout();
                router.navigate(['/login']);
                return throwError(() => refreshError);
              })
            );
          } else {
            // No refresh token or refresh endpoint failed, logout
            authService.logout();
            router.navigate(['/login']);
          }
        }
      }
      return throwError(() => error);
    })
  );
};

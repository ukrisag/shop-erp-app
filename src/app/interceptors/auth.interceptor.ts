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

  // Every admin/ERP page lives under /admin/*, and every request they fire needs
  // the employee token; every public storefront page needs the customer token.
  // (Previously this matched on a hardcoded list of URL keywords, which silently
  // dropped the Authorization header for any endpoint whose path wasn't on the
  // list - e.g. new ERP modules, or a singular/plural mismatch.)
  const isAdminEndpoint = router.url.startsWith('/admin');

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

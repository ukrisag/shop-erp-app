import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { EmployeeAuthDto, EmployeeAuthResponseDto, LoginDto, RefreshTokenRequestDto } from './openapi-client';
import { EmployeeAuthService as GeneratedEmployeeAuthService } from './openapi-client';

const EMPLOYEE_TOKEN_KEY = 'employee_auth_token';
const EMPLOYEE_USER_KEY = 'employee_auth_user';
const EMPLOYEE_REFRESH_TOKEN_KEY = 'employee_refresh_token';
const EMPLOYEE_TOKEN_EXPIRES_AT_KEY = 'employee_token_expires_at';

@Injectable({
  providedIn: 'root'
})
export class EmployeeAuthService {
  private generatedAuthService = inject(GeneratedEmployeeAuthService);
  private router = inject(Router);

  private currentEmployeeSubject = new BehaviorSubject<EmployeeAuthDto | null>(this.getEmployeeFromStorage());
  public currentEmployee$ = this.currentEmployeeSubject.asObservable();
  private refreshTokenTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    this.startTokenExpirationCheck();
  }

  get currentEmployeeValue(): EmployeeAuthDto | null {
    return this.currentEmployeeSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.getToken();
  }

  get isAdmin(): boolean {
    const employee = this.currentEmployeeValue;
    const role = employee?.role?.toLowerCase();
    return role === 'admin' || role === 'super_admin';
  }

  get isSuperAdmin(): boolean {
    const employee = this.currentEmployeeValue;
    const role = employee?.role?.toLowerCase();
    return role === 'super_admin';
  }

  get employeeRole(): string {
    return this.currentEmployeeValue?.role?.toLowerCase() || 'employee';
  }

  login(credentials: LoginDto): Observable<EmployeeAuthResponseDto> {
    return this.generatedAuthService.apiEmployeeAuthLoginPost(credentials).pipe(
      tap(response => {
        this.setSession(response);
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    console.log('EmployeeAuthService.logout() called');
    this.clearSession();
    console.log('Session cleared, navigating to /admin/login');
    this.router.navigate(['/admin/login']).then(success => {
      console.log('Navigation to /admin/login:', success);
    });
  }

  getToken(): string | null {
    return localStorage.getItem(EMPLOYEE_TOKEN_KEY);
  }

  private setSession(authResult: EmployeeAuthResponseDto): void {
    if (authResult.token && authResult.employee) {
      localStorage.setItem(EMPLOYEE_TOKEN_KEY, authResult.token);
      localStorage.setItem(EMPLOYEE_USER_KEY, JSON.stringify(authResult.employee));

      if (authResult.refreshToken) {
        localStorage.setItem(EMPLOYEE_REFRESH_TOKEN_KEY, authResult.refreshToken);
      }

      if (authResult.expiresAt) {
        localStorage.setItem(EMPLOYEE_TOKEN_EXPIRES_AT_KEY, authResult.expiresAt);
      }

      this.currentEmployeeSubject.next(authResult.employee);
      this.startRefreshTokenTimer();
    }
  }

  private clearSession(): void {
    localStorage.removeItem(EMPLOYEE_TOKEN_KEY);
    localStorage.removeItem(EMPLOYEE_USER_KEY);
    localStorage.removeItem(EMPLOYEE_REFRESH_TOKEN_KEY);
    localStorage.removeItem(EMPLOYEE_TOKEN_EXPIRES_AT_KEY);
    this.currentEmployeeSubject.next(null);
    this.stopRefreshTokenTimer();
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(EMPLOYEE_REFRESH_TOKEN_KEY);
  }

  refreshToken(): Observable<EmployeeAuthResponseDto> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const request: RefreshTokenRequestDto = { refreshToken };
    return this.generatedAuthService.apiEmployeeAuthRefreshTokenPost(request).pipe(
      tap(response => {
        this.setSession(response);
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  private startRefreshTokenTimer(): void {
    const expiresAt = localStorage.getItem(EMPLOYEE_TOKEN_EXPIRES_AT_KEY);
    if (!expiresAt) return;

    const expires = new Date(expiresAt);
    const timeout = expires.getTime() - Date.now() - (60 * 1000); // Refresh 1 minute before expiry

    if (timeout > 0) {
      this.refreshTokenTimeout = setTimeout(() => {
        this.refreshToken().subscribe({
          error: (error) => {
            console.error('Employee token refresh failed:', error);
          }
        });
      }, timeout);
    }
  }

  private stopRefreshTokenTimer(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }

  private startTokenExpirationCheck(): void {
    // Check every minute if token is expired
    setInterval(() => {
      const expiresAt = localStorage.getItem(EMPLOYEE_TOKEN_EXPIRES_AT_KEY);
      if (expiresAt) {
        const expires = new Date(expiresAt);
        if (Date.now() >= expires.getTime()) {
          console.log('Employee token expired, attempting to refresh...');
          const refreshToken = this.getRefreshToken();
          if (refreshToken) {
            this.refreshToken().subscribe({
              error: () => {
                console.log('Employee token refresh failed, logging out...');
                this.logout();
              }
            });
          } else {
            this.logout();
          }
        }
      }
    }, 60000); // Check every minute
  }

  private getEmployeeFromStorage(): EmployeeAuthDto | null {
    const employeeStr = localStorage.getItem(EMPLOYEE_USER_KEY);
    if (employeeStr) {
      try {
        return JSON.parse(employeeStr);
      } catch {
        return null;
      }
    }
    return null;
  }
}

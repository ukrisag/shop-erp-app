import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AdminUsersService } from '../../services/openapi-client/api/adminUsers.service';
import { UserDto } from '../../services/openapi-client/model/userDto';
import { UpdateUserStatusDto } from '../../services/openapi-client/model/updateUserStatusDto';

@Injectable({
  providedIn: 'root'
})
export class AdminUserService {

  constructor(private adminUsersService: AdminUsersService) {}

  /**
   * Get all users with pagination and search
   */
  getUsers(pageNumber: number = 1, pageSize: number = 20, search?: string): Observable<{
    users: UserDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.adminUsersService.adminUsersGetAllUsers(pageNumber, pageSize, search).pipe(
      map(response => {
        const data = response.data;
        return {
          users: data || [],
          total: data?.length || 0,
          page: pageNumber,
          pageSize: pageSize
        };
      })
    );
  }

  /**
   * Get all users (simple version)
   */
  getAllUsers(): Observable<{ success: boolean; data?: UserDto[] }> {
    return this.adminUsersService.adminUsersGetAllUsers(1, 1000).pipe(
      map(response => ({
        success: response.success || false,
        data: response.data ?? undefined
      }))
    );
  }

  /**
   * Get user by ID
   */
  getUserById(id: number): Observable<UserDto | undefined> {
    return this.adminUsersService.adminUsersGetUserById(id).pipe(
      map(response => response.data ?? undefined)
    );
  }

  /**
   * Update user status (ban/activate)
   */
  updateUserStatus(id: number, status: string): Observable<{ success: boolean; data?: UserDto }> {
    const statusDto: UpdateUserStatusDto = { status };
    return this.adminUsersService.adminUsersUpdateUserStatus(id, statusDto).pipe(
      map(response => ({
        success: response.success || false,
        data: response.data ?? undefined
      }))
    );
  }

  /**
   * Create employee or admin user
   */
  createEmployee(employeeDto: any): Observable<{ success: boolean; message?: string; data?: UserDto }> {
    // Note: This will need the OpenAPI client to be regenerated with the new endpoint
    // For now, we'll use a direct HTTP call or wait for API client update
    return this.adminUsersService.adminUsersCreateEmployee(employeeDto).pipe(
      map(response => ({
        success: response.success || false,
        message: response.message ?? undefined,
        data: response.data ?? undefined
      }))
    );
  }

  /**
   * Update user role
   */
  updateUserRole(id: number, role: string): Observable<{ success: boolean; data?: UserDto }> {
    const roleDto = { role };
    return this.adminUsersService.adminUsersUpdateUserRole(id, roleDto).pipe(
      map(response => ({
        success: response.success || false,
        data: response.data ?? undefined
      }))
    );
  }
}

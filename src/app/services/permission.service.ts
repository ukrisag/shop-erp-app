import { Injectable, inject } from '@angular/core';
import { EmployeeAuthService } from './employee-auth.service';

export enum Permission {
  // View permissions
  VIEW_DASHBOARD = 'view_dashboard',
  VIEW_PRODUCTS = 'view_products',
  VIEW_ORDERS = 'view_orders',
  VIEW_CUSTOMERS = 'view_customers',
  VIEW_EMPLOYEES = 'view_employees',
  VIEW_BRANCHES = 'view_branches',
  VIEW_REPORTS = 'view_reports',
  VIEW_SETTINGS = 'view_settings',
  VIEW_ERP = 'view_erp',
  VIEW_GALLERY = 'view_gallery',
  VIEW_REVIEWS = 'view_reviews',
  VIEW_COUPONS = 'view_coupons',
  VIEW_BRANDS = 'view_brands',
  VIEW_CATEGORIES = 'view_categories',

  // Edit permissions
  EDIT_PRODUCTS = 'edit_products',
  EDIT_ORDERS = 'edit_orders',
  EDIT_CUSTOMERS = 'edit_customers',
  EDIT_EMPLOYEES = 'edit_employees',
  EDIT_BRANCHES = 'edit_branches',
  EDIT_SETTINGS = 'edit_settings',
  EDIT_ERP = 'edit_erp',
  EDIT_GALLERY = 'edit_gallery',
  EDIT_REVIEWS = 'edit_reviews',
  EDIT_COUPONS = 'edit_coupons',
  EDIT_BRANDS = 'edit_brands',
  EDIT_CATEGORIES = 'edit_categories',

  // Delete permissions
  DELETE_PRODUCTS = 'delete_products',
  DELETE_ORDERS = 'delete_orders',
  DELETE_CUSTOMERS = 'delete_customers',
  DELETE_EMPLOYEES = 'delete_employees',
  DELETE_BRANCHES = 'delete_branches',
  DELETE_GALLERY = 'delete_gallery',
  DELETE_REVIEWS = 'delete_reviews',
  DELETE_COUPONS = 'delete_coupons',
  DELETE_BRANDS = 'delete_brands',
  DELETE_CATEGORIES = 'delete_categories',
}

export enum EmployeeRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  EMPLOYEE = 'employee'
}

// Define permissions for each role
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // Super Admin - full access to everything
  [EmployeeRole.SUPER_ADMIN]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_ORDERS,
    Permission.VIEW_CUSTOMERS,
    Permission.VIEW_EMPLOYEES,
    Permission.VIEW_BRANCHES,
    Permission.VIEW_REPORTS,
    Permission.VIEW_SETTINGS,
    Permission.VIEW_ERP,
    Permission.VIEW_GALLERY,
    Permission.VIEW_REVIEWS,
    Permission.VIEW_COUPONS,
    Permission.VIEW_BRANDS,
    Permission.VIEW_CATEGORIES,

    Permission.EDIT_PRODUCTS,
    Permission.EDIT_ORDERS,
    Permission.EDIT_CUSTOMERS,
    Permission.EDIT_EMPLOYEES,
    Permission.EDIT_BRANCHES,
    Permission.EDIT_SETTINGS,
    Permission.EDIT_ERP,
    Permission.EDIT_GALLERY,
    Permission.EDIT_REVIEWS,
    Permission.EDIT_COUPONS,
    Permission.EDIT_BRANDS,
    Permission.EDIT_CATEGORIES,

    Permission.DELETE_PRODUCTS,
    Permission.DELETE_ORDERS,
    Permission.DELETE_CUSTOMERS,
    Permission.DELETE_EMPLOYEES,
    Permission.DELETE_BRANCHES,
    Permission.DELETE_GALLERY,
    Permission.DELETE_REVIEWS,
    Permission.DELETE_COUPONS,
    Permission.DELETE_BRANDS,
    Permission.DELETE_CATEGORIES,
  ],

  // Admin - can do most things except manage other admins
  [EmployeeRole.ADMIN]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_ORDERS,
    Permission.VIEW_CUSTOMERS,
    Permission.VIEW_EMPLOYEES,
    Permission.VIEW_BRANCHES,
    Permission.VIEW_REPORTS,
    Permission.VIEW_SETTINGS,
    Permission.VIEW_ERP,
    Permission.VIEW_GALLERY,
    Permission.VIEW_REVIEWS,
    Permission.VIEW_COUPONS,
    Permission.VIEW_BRANDS,
    Permission.VIEW_CATEGORIES,

    Permission.EDIT_PRODUCTS,
    Permission.EDIT_ORDERS,
    Permission.EDIT_CUSTOMERS,
    Permission.EDIT_BRANCHES,
    Permission.EDIT_ERP,
    Permission.EDIT_GALLERY,
    Permission.EDIT_REVIEWS,
    Permission.EDIT_COUPONS,
    Permission.EDIT_BRANDS,
    Permission.EDIT_CATEGORIES,

    Permission.DELETE_PRODUCTS,
    Permission.DELETE_ORDERS,
    Permission.DELETE_GALLERY,
    Permission.DELETE_REVIEWS,
    Permission.DELETE_COUPONS,
  ],

  // Manager - can view everything, edit some things
  [EmployeeRole.MANAGER]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_ORDERS,
    Permission.VIEW_CUSTOMERS,
    Permission.VIEW_EMPLOYEES,
    Permission.VIEW_BRANCHES,
    Permission.VIEW_REPORTS,
    Permission.VIEW_ERP,
    Permission.VIEW_GALLERY,
    Permission.VIEW_REVIEWS,
    Permission.VIEW_COUPONS,
    Permission.VIEW_BRANDS,
    Permission.VIEW_CATEGORIES,

    Permission.EDIT_PRODUCTS,
    Permission.EDIT_ORDERS,
    Permission.EDIT_ERP,
    Permission.EDIT_GALLERY,
    Permission.EDIT_REVIEWS,
  ],

  // Staff - can view most things, limited editing
  [EmployeeRole.STAFF]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_ORDERS,
    Permission.VIEW_CUSTOMERS,
    Permission.VIEW_BRANCHES,
    Permission.VIEW_ERP,
    Permission.VIEW_GALLERY,
    Permission.VIEW_REVIEWS,
    Permission.VIEW_COUPONS,
    Permission.VIEW_BRANDS,
    Permission.VIEW_CATEGORIES,

    Permission.EDIT_ORDERS,
    Permission.EDIT_ERP,
  ],

  // Employee - can only view, no editing (read-only)
  [EmployeeRole.EMPLOYEE]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_ORDERS,
    Permission.VIEW_CUSTOMERS,
    Permission.VIEW_BRANCHES,
    Permission.VIEW_ERP,
    Permission.VIEW_GALLERY,
    Permission.VIEW_REVIEWS,
    Permission.VIEW_COUPONS,
    Permission.VIEW_BRANDS,
    Permission.VIEW_CATEGORIES,
  ],
};

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private employeeAuthService = inject(EmployeeAuthService);

  /**
   * Check if current user has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    const role = this.getCurrentRole();
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Check if current user has any of the specified permissions
   */
  hasAnyPermission(...permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if current user has all of the specified permissions
   */
  hasAllPermissions(...permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Get current employee role
   */
  getCurrentRole(): string {
    return this.employeeAuthService.employeeRole;
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(): string {
    const role = this.getCurrentRole();
    switch (role) {
      case EmployeeRole.SUPER_ADMIN:
        return 'Super Admin';
      case EmployeeRole.ADMIN:
        return 'Admin';
      case EmployeeRole.MANAGER:
        return 'Manager';
      case EmployeeRole.STAFF:
        return 'Staff';
      case EmployeeRole.EMPLOYEE:
        return 'Employee';
      default:
        return 'Employee';
    }
  }

  /**
   * Check if user is admin or super admin
   */
  isAdmin(): boolean {
    return this.employeeAuthService.isAdmin;
  }

  /**
   * Check if user is super admin
   */
  isSuperAdmin(): boolean {
    return this.employeeAuthService.isSuperAdmin;
  }

  /**
   * Get all permissions for current role
   */
  getAllPermissions(): Permission[] {
    const role = this.getCurrentRole();
    return ROLE_PERMISSIONS[role] || [];
  }
}

import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { permissionGuard } from '../guards/permission.guard';
import { Permission } from '../services/permission.service';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_DASHBOARD }
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/products/products-list-admin.component').then(m => m.ProductsListAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_PRODUCTS }
      },
      {
        path: 'products/create',
        loadComponent: () => import('./pages/products/product-form-admin.component').then(m => m.ProductFormAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.EDIT_PRODUCTS }
      },
      {
        path: 'products/edit/:id',
        loadComponent: () => import('./pages/products/product-form-admin.component').then(m => m.ProductFormAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.EDIT_PRODUCTS }
      },
      {
        path: 'brands',
        loadComponent: () => import('./pages/brands/brand-list-admin.component').then(m => m.BrandListAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_BRANDS }
      },
      // Gallery
      {
        path: 'gallery',
        loadComponent: () => import('./pages/gallery/gallery-admin.component').then(m => m.GalleryAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_GALLERY }
      },
      // E-commerce Orders (คำสั่งซื้อออนไลน์จากร้านเครื่องครัวแสงทอง/ใจกล้า)
      {
        path: 'orders',
        loadComponent: () => import('./pages/orders/order-list-admin.component').then(m => m.OrderListAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_ORDERS }
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./pages/orders/order-detail-admin.component').then(m => m.OrderDetailAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_ORDERS }
      },
      // E-commerce Customers (ลูกค้าออนไลน์ ร้านเครื่องครัวแสงทอง/ใจกล้า)
      {
        path: 'customers',
        loadComponent: () => import('./pages/users/user-list-admin.component').then(m => m.UserListAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_CUSTOMERS }
      },
      {
        path: 'customers/:id',
        loadComponent: () => import('./pages/users/user-detail-admin.component').then(m => m.UserDetailAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_CUSTOMERS }
      },
      // Legacy routes - redirect to new routes
      {
        path: 'users',
        redirectTo: 'customers',
        pathMatch: 'full'
      },
      {
        path: 'users/:id',
        redirectTo: 'customers/:id',
        pathMatch: 'full'
      },
      // Coupons
      {
        path: 'coupons',
        loadComponent: () => import('./pages/coupons/coupon-list-admin.component').then(m => m.CouponListAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_COUPONS }
      },
      {
        path: 'coupons/create',
        loadComponent: () => import('./pages/coupons/coupon-form-admin.component').then(m => m.CouponFormAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.EDIT_COUPONS }
      },
      {
        path: 'coupons/edit/:id',
        loadComponent: () => import('./pages/coupons/coupon-form-admin.component').then(m => m.CouponFormAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.EDIT_COUPONS }
      },
      // Categories
      {
        path: 'categories',
        loadComponent: () => import('./pages/categories/category-list-admin.component').then(m => m.CategoryListAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_CATEGORIES }
      },
      // Reviews
      {
        path: 'reviews',
        loadComponent: () => import('./pages/reviews/review-list-admin.component').then(m => m.ReviewListAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_REVIEWS }
      },
      // Employees (Admin & Employee Management)
      {
        path: 'employees',
        loadComponent: () => import('./pages/employees/employee-list-admin.component').then(m => m.EmployeeListAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_EMPLOYEES }
      },
      // ERP - Branches
      {
        path: 'erp/branches',
        loadComponent: () => import('./pages/erp/branches/branch-list-admin.component').then(m => m.BranchListAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_BRANCHES }
      },
      // ERP - Employees
      {
        path: 'erp/employees',
        loadComponent: () => import('./pages/erp/employees/employee-list-admin.component').then(m => m.EmployeeListAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_EMPLOYEES }
      },
      // ERP - Expenses
      {
        path: 'erp/expenses',
        loadComponent: () => import('./pages/erp/expenses/expense-list-admin.component').then(m => m.ExpenseListAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_ERP }
      },
      // ERP - Banking (Bank Accounts + Transactions)
      {
        path: 'erp/banking',
        loadComponent: () => import('./pages/erp/banking/banking-admin.component').then(m => m.BankingAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_ERP }
      },
      // ERP - Payroll
      {
        path: 'erp/payroll',
        loadComponent: () => import('./pages/erp/payroll/payroll-admin.component').then(m => m.PayrollAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_ERP }
      },
      // ERP - Overtime
      {
        path: 'erp/overtime',
        loadComponent: () => import('./pages/erp/overtime/overtime-admin.component').then(m => m.OvertimeAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_ERP }
      },
      // ERP - Leave
      {
        path: 'erp/leave',
        loadComponent: () => import('./pages/erp/leave/leave-admin.component').then(m => m.LeaveAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_ERP }
      },
      // ERP - Sales Orders (ใบเสนอราคา/ใบแจ้งหนี้ ERP สำหรับลูกค้าทั่วไป B2B ขายส่ง ไม่ใช่คำสั่งซื้อออนไลน์)
      {
        path: 'erp/sales',
        loadComponent: () => import('./pages/erp/sales/sales-order-admin.component').then(m => m.SalesOrderAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_ERP }
      },
      // ERP - Material Requisitions
      {
        path: 'erp/material-requisitions',
        loadComponent: () => import('./pages/erp/material-requisition/material-requisition-admin.component').then(m => m.MaterialRequisitionAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_ERP }
      },
      // ERP - Deliveries
      {
        path: 'erp/deliveries',
        loadComponent: () => import('./pages/erp/deliveries/delivery-list-admin.component').then(m => m.DeliveryListAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: Permission.VIEW_ERP }
      }
    ]
  }
];

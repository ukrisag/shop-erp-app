import { test, expect } from '@playwright/test';

/**
 * adminGuard (src/app/guards/admin.guard.ts) protects the whole '/admin' subtree
 * (src/app/admin/admin.routes.ts) and redirects to /admin/login with a returnUrl.
 */
test.describe('Admin-guarded ERP routes', () => {
  const adminRoutes = [
    '/admin',
    '/admin/dashboard',
    '/admin/products',
    '/admin/brands',
    '/admin/gallery',
    '/admin/orders',
    '/admin/customers',
    '/admin/coupons',
    '/admin/categories',
    '/admin/reviews',
    '/admin/employees',
    '/admin/erp/branches',
    '/admin/erp/employees',
    '/admin/erp/expenses',
    '/admin/erp/banking',
    '/admin/erp/payroll',
    '/admin/erp/overtime',
    '/admin/erp/leave',
    '/admin/erp/sales',
    '/admin/erp/material-requisitions',
    '/admin/erp/deliveries',
  ];

  for (const route of adminRoutes) {
    test(`visiting ${route} while logged out redirects to /admin/login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/admin\/login\?returnUrl=/);
    });
  }
});

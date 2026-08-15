import { test, expect } from '@playwright/test';

/**
 * Route: '/admin/login' -> AdminLoginComponent (src/app/components/admin-login)
 * Staff-facing login, separate from the customer auth flow.
 */
test.describe('Admin/employee login page (/admin/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('shows the staff login heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'ระบบจัดการร้านค้า' })).toBeVisible();
    await expect(page.getByText('เข้าสู่ระบบสำหรับพนักงาน')).toBeVisible();
  });

  test('submit is disabled until email and password are valid', async ({ page }) => {
    const submit = page.getByRole('button', { name: 'เข้าสู่ระบบ' });
    await expect(submit).toBeDisabled();

    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('123456');
    await expect(submit).toBeEnabled();
  });

  test('"กลับไปหน้าแรก" link routes back to the storefront home', async ({ page }) => {
    await page.getByRole('link', { name: /กลับไปหน้าแรก/ }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('visiting a protected admin route while logged out redirects here', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/login\?returnUrl=%2Fadmin%2Fdashboard/);
  });
});

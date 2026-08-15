import { test, expect } from '@playwright/test';

/**
 * Route: '/auth/login' -> LoginComponent (src/app/components/auth/login)
 * '/login' redirects here (app.routes.ts).
 */
test.describe('Customer login page (/auth/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('/login redirects to /auth/login', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('submit button is disabled until the form is valid', async ({ page }) => {
    const submit = page.getByRole('button', { name: 'เข้าสู่ระบบ' });
    await expect(submit).toBeDisabled();

    await page.locator('#email').fill('invalid-email');
    await page.locator('#password').fill('123456');
    await page.locator('#email').blur();
    await expect(page.getByText('รูปแบบอีเมลไม่ถูกต้อง')).toBeVisible();
    await expect(submit).toBeDisabled();

    await page.locator('#email').fill('user@example.com');
    await expect(submit).toBeEnabled();
  });

  test('shows a required error for an empty, touched email field', async ({ page }) => {
    await page.locator('#email').click();
    await page.locator('#password').click();
    await expect(page.getByText('กรุณากรอกอีเมล')).toBeVisible();
  });

  test('password visibility toggle switches the input type', async ({ page }) => {
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await page.locator('#password').locator('..').getByRole('button').click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('links to register and forgot-password', async ({ page }) => {
    await page.locator('main').getByRole('link', { name: 'สมัครสมาชิก' }).click();
    await expect(page).toHaveURL(/\/auth\/register$/);

    await page.goto('/auth/login');
    await page.getByRole('link', { name: 'ลืมรหัสผ่าน?' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });
});

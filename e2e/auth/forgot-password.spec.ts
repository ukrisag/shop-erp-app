import { test, expect } from '@playwright/test';

/**
 * Route: '/forgot-password' -> ForgotPasswordComponent (src/app/components/auth/forgot-password)
 */
test.describe('Forgot password page (/forgot-password)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('submit is disabled until a valid email is entered', async ({ page }) => {
    const submit = page.getByRole('button', { name: 'ส่งลิงก์รีเซ็ตรหัสผ่าน' });
    await expect(submit).toBeDisabled();

    await page.locator('#email').fill('not-an-email');
    await expect(submit).toBeDisabled();

    await page.locator('#email').fill('user@example.com');
    await expect(submit).toBeEnabled();
  });

  test('shows a required error once the empty field is touched', async ({ page }) => {
    await page.locator('#email').click();
    await page.locator('body').click();
    await expect(page.getByText('กรุณากรอกอีเมล')).toBeVisible();
  });

  test('links back to the login page', async ({ page }) => {
    await page.getByRole('link', { name: 'กลับไปหน้าเข้าสู่ระบบ' }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });
});

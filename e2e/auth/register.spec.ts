import { test, expect } from '@playwright/test';

/**
 * Route: '/auth/register' -> RegisterComponent (src/app/components/auth/register)
 * '/register' redirects here (app.routes.ts).
 */
test.describe('Customer register page (/auth/register)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
  });

  test('/register redirects to /auth/register', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/auth\/register$/);
  });

  test('submit stays disabled until required fields and terms are filled in', async ({ page }) => {
    const submit = page.getByRole('button', { name: 'สมัครสมาชิก' });
    await expect(submit).toBeDisabled();

    await page.locator('#firstName').fill('สมชาย');
    await page.locator('#lastName').fill('ใจดี');
    await page.locator('#email').fill('somchai@example.com');
    await page.locator('#phone').fill('0812345678');
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('password123');
    await expect(submit).toBeDisabled(); // terms checkbox not yet accepted

    await page.locator('#acceptTerms').check();
    await expect(submit).toBeEnabled();
  });

  test('flags mismatched passwords', async ({ page }) => {
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('different123');
    await page.locator('#confirmPassword').blur();

    await expect(page.getByText('รหัสผ่านไม่ตรงกัน')).toBeVisible();
  });

  test('validates the phone number pattern', async ({ page }) => {
    await page.locator('#phone').fill('abc');
    await page.locator('#phone').blur();
    await expect(page.getByText('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก')).toBeVisible();
  });

  test('links back to the login page', async ({ page }) => {
    await page.locator('main').getByRole('link', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });
});

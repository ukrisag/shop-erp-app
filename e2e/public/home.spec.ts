import { test, expect } from '@playwright/test';

/**
 * Route: '' -> HomeComponent (src/app/components/home)
 */
test.describe('Home page (/)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads with the correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/ร้านแสงทอง ร้านใจกล้า/);
  });

  test('shows the hero section with a CTA to products', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('เครื่องครัวคุณภาพพรีเมียม');
    await page.getByRole('link', { name: 'เลือกซื้อเลย' }).click();
    await expect(page).toHaveURL(/\/products$/);
  });

  test('renders header and footer on the storefront shell', async ({ page }) => {
    await expect(page.locator('app-header')).toBeVisible();
    await expect(page.locator('app-footer')).toBeVisible();
  });

  test('"ดูสินค้าทั้งหมด" link also routes to the product list', async ({ page }) => {
    await page.getByRole('link', { name: 'ดูสินค้าทั้งหมด' }).click();
    await expect(page).toHaveURL(/\/products$/);
  });

  test('bottom CTA "เกี่ยวกับเรา" routes to the about page', async ({ page }) => {
    await page.locator('section.bg-blue-600').getByRole('link', { name: 'เกี่ยวกับเรา' }).click();
    await expect(page).toHaveURL(/\/about$/);
  });
});

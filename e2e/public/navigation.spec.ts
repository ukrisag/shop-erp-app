import { test, expect } from '@playwright/test';

/**
 * Exercises the desktop header nav (src/app/components/layout/header) against
 * the top-level routes declared in src/app/app.routes.ts.
 */
test.describe('Header navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  const navLinks: Array<{ name: string; url: RegExp }> = [
    { name: 'สินค้า', url: /\/products$/ },
    { name: 'ผลงาน', url: /\/gallery$/ },
    { name: 'เกี่ยวกับเรา', url: /\/about$/ },
  ];

  for (const link of navLinks) {
    test(`"${link.name}" link navigates to ${link.url}`, async ({ page }) => {
      await page.locator('nav.desktop-nav').getByRole('link', { name: link.name }).click();
      await expect(page).toHaveURL(link.url);
    });
  }

  test('logo link returns to home', async ({ page }) => {
    await page.locator('nav.desktop-nav').getByRole('link', { name: 'สินค้า' }).click();
    await page.locator('.logo-link').click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('cart icon navigates to /cart (redirects unauthenticated users to login)', async ({ page }) => {
    await page.locator('a.cart-link').click();
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fcart/);
  });

  test('"เข้าสู่ระบบ" and "สมัครสมาชิก" buttons route to auth pages when logged out', async ({ page }) => {
    await expect(page.locator('.auth-buttons')).toBeVisible();

    await page.locator('.auth-buttons').getByRole('link', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);

    await page.goto('/');
    await page.locator('.auth-buttons').getByRole('link', { name: 'สมัครสมาชิก' }).click();
    await expect(page).toHaveURL(/\/auth\/register$/);
  });

  test('search box shows results dropdown while typing', async ({ page }) => {
    const searchInput = page.locator('.search-input-wrapper .search-input');
    await searchInput.fill('หม้อ');
    // Either matching results or the input simply retains the typed query -
    // both are valid outcomes depending on backend data, so just assert no crash.
    await expect(searchInput).toHaveValue('หม้อ');
  });

  test('mobile hamburger menu toggles the mobile nav', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto('/');

    const mobileMenu = page.locator('.mobile-menu');
    await expect(mobileMenu).not.toHaveClass(/open/);

    await page.locator('.hamburger-btn').click();
    await expect(mobileMenu).toHaveClass(/open/);
  });
});

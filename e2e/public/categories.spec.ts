import { test, expect } from '@playwright/test';

/**
 * Route: '/categories' -> CategoriesComponent (src/app/components/categories)
 */
test.describe('Categories page (/categories)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/categories');
  });

  test('shows the hero heading and breadcrumb', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'สำรวจหมวดหมู่สินค้า' })).toBeVisible();
    await expect(page.locator('.breadcrumb-container')).toContainText('หมวดหมู่สินค้า');
  });

  test('renders category cards or the empty state', async ({ page }) => {
    const cards = page.locator('.category-card');
    const empty = page.getByText('ไม่พบหมวดหมู่สินค้า');
    await expect(cards.first().or(empty)).toBeVisible({ timeout: 15000 });
  });

  test('clicking a category card navigates to the filtered product list', async ({ page }) => {
    const firstCard = page.locator('.category-card').first();
    if (await firstCard.count() === 0) {
      test.skip(true, 'No categories returned by the backend to click through');
    }
    await firstCard.click();
    await expect(page).toHaveURL(/\/products/);
  });
});

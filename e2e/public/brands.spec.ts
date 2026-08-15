import { test, expect } from '@playwright/test';

/**
 * Route: '/brands' -> BrandsComponent (src/app/components/brands)
 */
test.describe('Brands page (/brands)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/brands');
  });

  test('shows the hero heading and breadcrumb', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'แบรนด์คุณภาพ' })).toBeVisible();
    await expect(page.locator('.breadcrumb-container')).toContainText('แบรนด์');
  });

  test('renders brand cards or the empty state', async ({ page }) => {
    const cards = page.locator('.brand-card');
    const empty = page.getByText('ไม่พบแบรนด์');
    await expect(cards.first().or(empty)).toBeVisible({ timeout: 15000 });
  });

  test('clicking a brand card navigates to the filtered product list', async ({ page }) => {
    const firstCard = page.locator('.brand-card').first();
    if (await firstCard.count() === 0) {
      test.skip(true, 'No brands returned by the backend to click through');
    }
    await firstCard.click();
    await expect(page).toHaveURL(/\/products/);
  });
});

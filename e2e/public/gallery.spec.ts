import { test, expect } from '@playwright/test';

/**
 * Route: '/gallery' -> GalleryComponent (src/app/components/gallery)
 */
test.describe('Gallery page (/gallery)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gallery');
  });

  test('shows the hero heading and filter bar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'ผลงานของเรา' })).toBeVisible();
    await expect(page.locator('.filter-bar')).toBeVisible();
    await expect(page.locator('#category-filter')).toBeVisible();
  });

  test('renders the gallery grid, or the empty state, once loading finishes', async ({ page }) => {
    const cards = page.locator('.gallery-card');
    const empty = page.locator('.empty-state');
    await expect(cards.first().or(empty)).toBeVisible({ timeout: 15000 });
  });

  test('"แสดงเฉพาะผลงานแนะนำ" toggle can be checked', async ({ page }) => {
    const toggle = page.locator('.featured-toggle input[type="checkbox"]');
    await expect(toggle).not.toBeChecked();
    await toggle.check();
    await expect(toggle).toBeChecked();
  });

  test('clicking a gallery image opens the lightbox', async ({ page }) => {
    const firstCard = page.locator('.gallery-card').first();
    if (await firstCard.count() === 0) {
      test.skip(true, 'No gallery images returned by the backend to click through');
    }
    await firstCard.click();
    await expect(page.locator('.lightbox-backdrop')).toBeVisible();

    await page.locator('.lightbox-close').click();
    await expect(page.locator('.lightbox-backdrop')).not.toBeVisible();
  });
});

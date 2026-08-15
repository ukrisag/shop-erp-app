import { test, expect } from '@playwright/test';

/**
 * Route: '/about' -> AboutComponent (src/app/components/about)
 * storeInfo is seeded with static defaults, so this content renders without
 * depending on the backend being up.
 */
test.describe('About page (/about)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
  });

  test('shows company stats', async ({ page }) => {
    const stats = page.locator('.stats-grid');
    await expect(stats).toContainText('ปีประสบการณ์');
    await expect(stats).toContainText('ลูกค้าพึงพอใจ');
  });

  test('"ติดต่อเรา" hero button scrolls to the contact section', async ({ page }) => {
    await page.getByRole('button', { name: 'ติดต่อเรา' }).click();
    await expect(page.locator('.contact-info-card')).toBeInViewport();
  });

  test('"ทำไมต้องเลือกเรา" hero button scrolls to the features section', async ({ page }) => {
    await page.getByRole('button', { name: 'ทำไมต้องเลือกเรา' }).click();
    await expect(page.locator('.features-header')).toBeInViewport();
  });

  test('renders contact information and business hours', async ({ page }) => {
    await expect(page.getByText('ข้อมูลการติดต่อ')).toBeVisible();
    await expect(page.getByText('เวลาทำการ')).toBeVisible();
  });
});

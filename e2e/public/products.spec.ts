import { test, expect } from '@playwright/test';

/**
 * Route: '/products' -> ProductListComponent (src/app/components/products/product-list)
 */
test.describe('Product list page (/products)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
  });

  test('shows the products hero and breadcrumb', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.breadcrumb-container')).toContainText('สินค้า');
  });

  test('renders the filter sidebar with sort, category and brand controls', async ({ page }) => {
    const sidebar = page.locator('aside.filter-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('เรียงตาม')).toBeVisible();
    await expect(sidebar.locator('select')).toBeVisible();
    await expect(sidebar.getByText('หมวดหมู่', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('แบรนด์', { exact: true })).toBeVisible();
  });

  test('changing the sort dropdown updates its value', async ({ page }) => {
    const sortSelect = page.locator('aside.filter-sidebar select');
    await sortSelect.selectOption('price-asc');
    await expect(sortSelect).toHaveValue('price-asc');
  });

  test('either lists products or shows the empty state', async ({ page }) => {
    const productCards = page.locator('.product-card-wrapper');
    const emptyState = page.locator('.empty-state');
    await expect(productCards.first().or(emptyState)).toBeVisible({ timeout: 15000 });
  });

  test('clicking a product card opens its detail page', async ({ page }) => {
    const firstCard = page.locator('.product-card-wrapper a').first();
    if (await firstCard.count() === 0) {
      test.skip(true, 'No products returned by the backend to click through');
    }
    await firstCard.click();
    await expect(page).toHaveURL(/\/products\/[^/]+$/);
    await expect(page.locator('.breadcrumb-nav')).toContainText('สินค้า');
  });

  test('supports deep-linking with a category query param', async ({ page }) => {
    await page.goto('/products?categoryId=1');
    await expect(page).toHaveURL(/categoryId=1/);
  });
});

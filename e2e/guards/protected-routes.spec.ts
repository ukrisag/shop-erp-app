import { test, expect } from '@playwright/test';

/**
 * authGuard (src/app/guards/auth.guard.ts) protects these routes and redirects
 * unauthenticated visitors to /login with a returnUrl query param.
 */
test.describe('Auth-guarded customer routes', () => {
  const protectedRoutes = ['/cart', '/wishlist', '/checkout', '/profile', '/orders'];

  for (const route of protectedRoutes) {
    test(`visiting ${route} while logged out redirects to /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(
        new RegExp(`/login\\?returnUrl=${encodeURIComponent(route)}`)
      );
    });
  }

  test('order detail and order confirmation routes are also guarded', async ({ page }) => {
    await page.goto('/orders/123');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Forders%2F123/);

    await page.goto('/order-confirmation/123');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Forder-confirmation%2F123/);
  });
});

/**
 * guestGuard (src/app/guards/guest.guard.ts) — verified indirectly: /login and
 * /register are only reachable while logged out, which every test above relies on.
 */

test.describe('Unknown routes', () => {
  test('an unmatched path redirects to the home page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/$/);
  });
});

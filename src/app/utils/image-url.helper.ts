import { environment } from '../../environments/environment';

/**
 * Converts a relative image URL to an absolute URL
 * @param imageUrl The image URL (can be relative or absolute)
 * @returns Absolute image URL
 */
export function getAbsoluteImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) {
    return '';
  }

  // If already an absolute URL (starts with http:// or https://), return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // If relative URL (starts with /), prepend the base API URL
  if (imageUrl.startsWith('/')) {
    // Remove /api from apiUrl if present, since image paths are served from root
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${imageUrl}`;
  }

  // If it doesn't start with /, assume it's a filename only and construct the full path
  const baseUrl = environment.apiUrl.replace('/api', '');
  return `${baseUrl}/uploads/products/${imageUrl}`;
}

/**
 * Gets the primary image URL from a product
 * @param product Product with images array
 * @param fallbackUrl Fallback image URL if no image found
 * @returns Image URL
 */
export function getPrimaryProductImageUrl(
  product: { images?: Array<{ imageUrl?: string | null; isPrimary?: boolean }> | null },
  fallbackUrl: string = 'https://placehold.co/400x400/e5e7eb/6b7280/png?text=No+Image'
): string {
  if (!product.images || product.images.length === 0) {
    return fallbackUrl;
  }

  const primaryImage = product.images.find(img => img.isPrimary);
  const imageUrl = primaryImage?.imageUrl || product.images[0]?.imageUrl;

  return imageUrl ? getAbsoluteImageUrl(imageUrl) : fallbackUrl;
}

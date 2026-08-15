import { Injectable, inject } from '@angular/core';
import { GalleryService as ApiGalleryService } from './openapi-client';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private apiGalleryService = inject(ApiGalleryService);

  /**
   * Get paginated gallery images (public - active only)
   */
  getGalleryImages(page: number = 1, pageSize: number = 12, category?: string, isFeatured?: boolean) {
    return this.apiGalleryService.galleryGetGalleryImages(page, pageSize, category, isFeatured);
  }

  /**
   * Get gallery image by ID
   */
  getGalleryImageById(id: number) {
    return this.apiGalleryService.galleryGetGalleryImage(id);
  }

  /**
   * Get all distinct categories
   */
  getCategories() {
    return this.apiGalleryService.galleryGetCategories();
  }
}

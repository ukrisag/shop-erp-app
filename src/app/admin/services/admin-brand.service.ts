import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BrandsService } from '../../services/openapi-client/api/brands.service';
import { BrandDto } from '../../services/openapi-client/model/brandDto';
import { CreateBrandDto } from '../../services/openapi-client/model/createBrandDto';

@Injectable({
  providedIn: 'root'
})
export class AdminBrandService {

  constructor(
    private brandsService: BrandsService
  ) {}

  /**
   * Get all brands (including inactive)
   */
  getBrands(includeInactive: boolean = true): Observable<BrandDto[]> {
    return this.brandsService.brandsGetBrands(includeInactive).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Get brand by ID
   */
  getBrandById(id: number): Observable<BrandDto | undefined> {
    return this.brandsService.brandsGetBrand(id).pipe(
      map(response => response.data ?? undefined)
    );
  }

  /**
   * Create new brand
   */
  createBrand(brandDto: CreateBrandDto): Observable<BrandDto | undefined> {
    return this.brandsService.brandsCreateBrand(brandDto).pipe(
      map(response => response.data ?? undefined)
    );
  }

  /**
   * Update brand
   */
  updateBrand(id: number, brandDto: CreateBrandDto): Observable<BrandDto | undefined> {
    return this.brandsService.brandsUpdateBrand(id, brandDto).pipe(
      map(response => response.data ?? undefined)
    );
  }

  /**
   * Delete brand
   */
  deleteBrand(id: number): Observable<any> {
    return this.brandsService.brandsDeleteBrand(id).pipe(
      map(response => response.data ?? undefined)
    );
  }

  /**
   * Toggle brand active status
   */
  toggleBrandStatus(id: number, brand: BrandDto, newStatus: boolean): Observable<BrandDto | undefined> {
    const updateDto: CreateBrandDto = {
      name: brand.name || '',
      slug: brand.slug || '',
      logoUrl: brand.logoUrl,
      description: brand.description,
      websiteUrl: brand.websiteUrl,
      isActive: newStatus,
      displayOrder: brand.displayOrder
    };
    return this.updateBrand(id, updateDto);
  }

  /**
   * Generate slug from name
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

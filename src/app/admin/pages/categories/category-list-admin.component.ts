import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminCategoryService } from '../../services/admin-category.service';
import { NotificationService } from '../../../services/notification.service';
import { ReportService } from '../../../services/report.service';
import { CategoryDto } from '../../../services/openapi-client/model/categoryDto';
import { CreateCategoryDto } from '../../../services/openapi-client/model/createCategoryDto';
import { FormHelpers } from '../../../utils/form-helpers';

interface CategoryWithLevel extends CategoryDto {
  level: number;
}

@Component({
  selector: 'app-category-list-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './category-list-admin.component.html',
  styleUrls: ['./category-list-admin.component.css']
})
export class CategoryListAdminComponent implements OnInit {
  categories = signal<CategoryWithLevel[]>([]);
  allCategories = signal<CategoryDto[]>([]);
  parentCategories = signal<CategoryDto[]>([]);

  loading = signal(true);
  error = signal('');

  // Modal state
  showModal = signal(false);
  isEditMode = signal(false);
  editingCategoryId = signal<number | undefined>(undefined);

  // Reactive form
  categoryForm!: FormGroup;

  // Delete confirmation
  categoryToDelete = signal<CategoryDto | undefined>(undefined);
  showDeleteConfirm = signal(false);

  // Filter
  showInactive = signal(true);

  constructor(
    private adminCategoryService: AdminCategoryService,
    private notificationService: NotificationService,
    private reportService: ReportService,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  private initForm(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      slug: ['', [Validators.required, Validators.maxLength(200)]],
      parentId: [null],
      description: ['', Validators.maxLength(500)],
      displayOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    return FormHelpers.isFieldInvalid(this.categoryForm, fieldName);
  }

  getFieldError(fieldName: string): string {
    return FormHelpers.getFieldError(this.categoryForm, fieldName);
  }

  loadCategories(): void {
    this.loading.set(true);
    this.error.set('');

    this.adminCategoryService.getCategories(this.showInactive()).subscribe({
      next: (categories) => {
        this.allCategories.set(categories);

        // Filter active/inactive based on toggle
        const filteredCategories = this.showInactive()
          ? categories
          : categories.filter(c => c.isActive);

        // Build tree and flatten for display
        const tree = this.adminCategoryService.buildCategoryTree(filteredCategories);
        this.categories.set(this.adminCategoryService.flattenCategoryTree(tree));

        // Get parent categories (root level only) for dropdown
        this.parentCategories.set(categories.filter(c =>
          (c.parentId === null || c.parentId === undefined) && c.isActive
        ));

        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('ไม่สามารถโหลดข้อมูลหมวดหมู่ได้');
        this.notificationService.error('ไม่สามารถโหลดข้อมูลหมวดหมู่ได้');
        this.loading.set(false);
        console.error('Error loading categories:', err);
      }
    });
  }

  onFilterChange(): void {
    this.loadCategories();
  }

  onAddNew(): void {
    this.isEditMode.set(false);
    this.editingCategoryId.set(undefined);
    this.categoryForm.reset({
      name: '',
      slug: '',
      parentId: null,
      description: '',
      displayOrder: 0,
      isActive: true
    });
    this.showModal.set(true);
  }

  onEdit(category: CategoryDto): void {
    if (!category.id) return;

    this.isEditMode.set(true);
    this.editingCategoryId.set(category.id);
    this.categoryForm.patchValue({
      name: category.name || '',
      slug: category.slug || '',
      parentId: category.parentId || null,
      description: category.description || '',
      displayOrder: category.displayOrder || 0,
      isActive: category.isActive ?? true
    });
    this.showModal.set(true);
  }

  onDeleteClick(category: CategoryDto): void {
    this.categoryToDelete.set(category);
    this.showDeleteConfirm.set(true);
  }

  onConfirmDelete(): void {
    if (!this.categoryToDelete()?.id) return;

    this.adminCategoryService.deleteCategory(this.categoryToDelete()!.id!).subscribe({
      next: () => {
        this.notificationService.success('ลบหมวดหมู่เรียบร้อยแล้ว');
        this.showDeleteConfirm.set(false);
        this.categoryToDelete.set(undefined);
        this.loadCategories();
      },
      error: (err) => {
        this.notificationService.error('ไม่สามารถลบหมวดหมู่ได้ อาจมีสินค้าอยู่ในหมวดหมู่นี้');
        console.error('Error deleting category:', err);
      }
    });
  }

  onCancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.categoryToDelete.set(undefined);
  }

  onToggleStatus(category: CategoryDto): void {
    if (!category.id) return;

    this.adminCategoryService.toggleCategoryStatus(category.id, category).subscribe({
      next: () => {
        const newStatus = !category.isActive;
        this.notificationService.success(
          newStatus ? 'เปิดใช้งานหมวดหมู่แล้ว' : 'ปิดใช้งานหมวดหมู่แล้ว'
        );
        this.loadCategories();
      },
      error: (err) => {
        this.notificationService.error('ไม่สามารถเปลี่ยนสถานะหมวดหมู่ได้');
        console.error('Error toggling category status:', err);
      }
    });
  }

  onNameChange(): void {
    const currentName = this.categoryForm.get('name')?.value || '';
    const currentSlug = this.categoryForm.get('slug')?.value || '';

    if (!this.isEditMode() || !currentSlug) {
      this.categoryForm.patchValue({
        slug: this.adminCategoryService.generateSlug(currentName)
      });
    }
  }

  onSaveCategory(): void {
    // Mark all fields as touched to show validation errors
    FormHelpers.markFormGroupTouched(this.categoryForm);

    // Validate
    if (this.categoryForm.invalid) {
      return;
    }

    const formValue = this.categoryForm.value;
    const categoryDto: CreateCategoryDto = {
      name: formValue.name.trim(),
      slug: formValue.slug.trim(),
      parentId: formValue.parentId,
      description: formValue.description?.trim() || null,
      displayOrder: formValue.displayOrder,
      isActive: formValue.isActive
    };

    if (this.isEditMode() && this.editingCategoryId()) {
      // Update
      this.adminCategoryService.updateCategory(this.editingCategoryId()!, categoryDto).subscribe({
        next: () => {
          this.notificationService.success('แก้ไขหมวดหมู่เรียบร้อยแล้ว');
          this.showModal.set(false);
          this.loadCategories();
        },
        error: (err) => {
          this.notificationService.error('ไม่สามารถแก้ไขหมวดหมู่ได้');
          console.error('Error updating category:', err);
        }
      });
    } else {
      // Create
      this.adminCategoryService.createCategory(categoryDto).subscribe({
        next: () => {
          this.notificationService.success('เพิ่มหมวดหมู่เรียบร้อยแล้ว');
          this.showModal.set(false);
          this.loadCategories();
        },
        error: (err) => {
          this.notificationService.error('ไม่สามารถเพิ่มหมวดหมู่ได้');
          console.error('Error creating category:', err);
        }
      });
    }
  }

  onCancelModal(): void {
    this.showModal.set(false);
    this.categoryForm.reset({
      name: '',
      slug: '',
      parentId: null,
      description: '',
      displayOrder: 0,
      isActive: true
    });
  }

  getIndentation(level: number): string {
    return '—'.repeat(level) + (level > 0 ? ' ' : '');
  }

  getParentName(parentId: number | null | undefined): string {
    if (!parentId) return '-';
    const parent = this.allCategories().find(c => c.id === parentId);
    return parent?.name || '-';
  }

  canDelete(category: CategoryDto): boolean {
    // Can't delete if it has products or subcategories
    return (category.productCount || 0) === 0 &&
           (!category.subCategories || category.subCategories.length === 0);
  }

  getAvailableParentCategories(): CategoryDto[] {
    if (!this.isEditMode()) {
      return this.parentCategories();
    }

    // When editing, exclude the category itself and its descendants
    return this.parentCategories().filter(c => c.id !== this.editingCategoryId());
  }

  // Report downloads
  downloadExcel(): void {
    this.reportService.downloadCategoriesExcel();
    this.notificationService.success('กำลังดาวน์โหลดรายงาน Excel...');
  }

  downloadPdf(): void {
    this.reportService.downloadCategoriesPdf();
    this.notificationService.success('กำลังดาวน์โหลดรายงาน PDF...');
  }
}

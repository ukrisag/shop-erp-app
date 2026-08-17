import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BranchesService } from '../../../../services/openapi-client/api/branches.service';
import { NotificationService } from '../../../../services/notification.service';
import { CreateBranchDto } from '../../../../services/openapi-client/model/createBranchDto';
import { UpdateBranchDto } from '../../../../services/openapi-client/model/updateBranchDto';
import { FormValidators } from '../../../../utils/form-validators';
import { FormHelpers } from '../../../../utils/form-helpers';
import { ValidationConfigs } from '../../../../utils/validation-configs';

// The generated BranchesController actions return untyped IActionResult on the backend,
// so openapi-generator does not emit a typed BranchDto / ApiResponseDto<BranchDto> model.
// Define the shape locally to keep this component type-safe.
interface BranchDto {
  id?: number;
  name?: string | null;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isMain?: boolean | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

@Component({
  selector: 'app-branch-list-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './branch-list-admin.component.html',
  styleUrls: ['./branch-list-admin.component.css']
})
export class BranchListAdminComponent implements OnInit {
  branches = signal<BranchDto[]>([]);
  filteredBranches = signal<BranchDto[]>([]);

  loading = signal(false);
  error = signal('');

  // Filters
  searchQuery = signal('');
  selectedStatus = signal<boolean | undefined>(undefined);
  sortBy = signal<'name-asc' | 'name-desc' | 'code-asc' | 'code-desc'>('name-asc');

  // Pagination
  currentPage = signal(1);
  pageSize = signal(20);
  totalItems = signal(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  // Delete confirmation
  branchToDelete = signal<BranchDto | undefined>(undefined);
  showDeleteConfirm = signal(false);

  // Add/Edit modal
  showModal = signal(false);
  isEditMode = signal(false);
  currentBranch = signal<BranchDto | undefined>(undefined);
  branchForm!: FormGroup;

  constructor(
    private branchesService: BranchesService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadBranches();
  }

  private initForm(): void {
    this.branchForm = this.fb.group({
      code: ['', ValidationConfigs.branch.code],
      name: ['', ValidationConfigs.branch.name],
      address: ['', ValidationConfigs.branch.address],
      phone: ['', ValidationConfigs.branch.phone],
      email: ['', ValidationConfigs.branch.email],
      isActive: [true]
    });
  }

  loadBranches(): void {
    this.loading.set(true);
    this.error.set('');

    this.branchesService.branchesGetAll().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.branches.set(response.data);
          this.applyFilters();
        } else {
          this.error.set(response.message || 'ไม่สามารถโหลดข้อมูลสาขาได้');
        }
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set('ไม่สามารถโหลดข้อมูลสาขาได้');
        this.notificationService.error('ไม่สามารถโหลดข้อมูลสาขาได้');
        this.loading.set(false);
        console.error('Error loading branches:', err);
      }
    });
  }

  applyFilters(): void {
    let result = [...this.branches()];

    // Search filter
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      result = result.filter(b =>
        (b.name || '').toLowerCase().includes(query) ||
        (b.code || '').toLowerCase().includes(query) ||
        (b.address || '').toLowerCase().includes(query)
      );
    }

    // Status filter
    if (this.selectedStatus() !== undefined) {
      result = result.filter(b => b.isActive === this.selectedStatus());
    }

    // Sort
    result = this.sortBranches(result);

    // Pagination
    this.totalItems.set(result.length);
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    this.filteredBranches.set(result.slice(startIndex, endIndex));
  }

  sortBranches(branches: BranchDto[]): BranchDto[] {
    return [...branches].sort((a, b) => {
      switch (this.sortBy()) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '', 'th');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '', 'th');
        case 'code-asc':
          return (a.code || '').localeCompare(b.code || '');
        case 'code-desc':
          return (b.code || '').localeCompare(a.code || '');
        default:
          return 0;
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.applyFilters();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.applyFilters();
  }

  onAddNew(): void {
    this.isEditMode.set(false);
    this.currentBranch.set(undefined);
    this.branchForm.reset({
      code: '',
      name: '',
      address: '',
      phone: '',
      email: '',
      isActive: true
    });
    this.showModal.set(true);
  }

  onEdit(branch: BranchDto): void {
    this.isEditMode.set(true);
    this.currentBranch.set(branch);
    this.branchForm.patchValue({
      code: branch.code || '',
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      isActive: branch.isActive ?? true
    });
    this.showModal.set(true);
  }

  onDeleteClick(branch: BranchDto): void {
    if (branch.isMain) {
      this.notificationService.error('ไม่สามารถลบสาขาหลักได้');
      return;
    }
    this.branchToDelete.set(branch);
    this.showDeleteConfirm.set(true);
  }

  onConfirmDelete(): void {
    if (!this.branchToDelete()?.id) return;

    this.branchesService.branchesDelete(this.branchToDelete()!.id!).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.notificationService.success('ลบสาขาเรียบร้อยแล้ว');
          this.showDeleteConfirm.set(false);
          this.branchToDelete.set(undefined);
          this.loadBranches();
        } else {
          this.notificationService.error(response.message || 'ไม่สามารถลบสาขาได้');
        }
      },
      error: (err: any) => {
        this.notificationService.error('ไม่สามารถลบสาขาได้');
        console.error('Error deleting branch:', err);
      }
    });
  }

  onCancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.branchToDelete.set(undefined);
  }

  onToggleStatus(branch: BranchDto): void {
    if (!branch.id) return;
    if (branch.isMain) {
      this.notificationService.error('ไม่สามารถปิดใช้งานสาขาหลักได้');
      return;
    }

    const updateDto: UpdateBranchDto = {
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      isActive: !branch.isActive
    };

    this.branchesService.branchesUpdate(branch.id, updateDto).subscribe({
      next: (response: any) => {
        if (response.success) {
          branch.isActive = !branch.isActive;
          this.notificationService.success(
            branch.isActive ? 'เปิดใช้งานสาขาแล้ว' : 'ปิดใช้งานสาขาแล้ว'
          );
        } else {
          this.notificationService.error(response.message || 'ไม่สามารถเปลี่ยนสถานะสาขาได้');
        }
      },
      error: (err: any) => {
        this.notificationService.error('ไม่สามารถเปลี่ยนสถานะสาขาได้');
        console.error('Error toggling branch status:', err);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    return FormHelpers.isFieldInvalid(this.branchForm, fieldName);
  }

  getFieldError(fieldName: string): string {
    return FormHelpers.getFieldError(this.branchForm, fieldName);
  }

  onSaveForm(): void {
    // Mark all fields as touched to trigger validation display
    FormHelpers.markFormGroupTouched(this.branchForm);

    // Validate form
    if (!this.branchForm.valid) {
      this.notificationService.error('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
      return;
    }

    const formValue = this.branchForm.value;

    if (this.isEditMode() && this.currentBranch()?.id) {
      // Update existing branch
      const updateDto: UpdateBranchDto = {
        name: formValue.name!,
        address: formValue.address || '',
        phone: formValue.phone || '',
        email: formValue.email || '',
        isActive: formValue.isActive ?? true
      };

      this.branchesService.branchesUpdate(this.currentBranch()!.id!, updateDto).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.notificationService.success('อัปเดตสาขาเรียบร้อยแล้ว');
            this.showModal.set(false);
            this.loadBranches();
          } else {
            this.notificationService.error(response.message || 'ไม่สามารถอัปเดตสาขาได้');
          }
        },
        error: (err: any) => {
          this.notificationService.error('ไม่สามารถอัปเดตสาขาได้');
          console.error('Error updating branch:', err);
        }
      });
    } else {
      // Create new branch
      const createDto: CreateBranchDto = {
        name: formValue.name!,
        code: formValue.code!,
        address: formValue.address || '',
        phone: formValue.phone || '',
        email: formValue.email || '',
        isActive: formValue.isActive ?? true
      };

      this.branchesService.branchesCreate(createDto).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.notificationService.success('เพิ่มสาขาเรียบร้อยแล้ว');
            this.showModal.set(false);
            this.loadBranches();
          } else {
            this.notificationService.error(response.message || 'ไม่สามารถเพิ่มสาขาได้');
          }
        },
        error: (err: any) => {
          this.notificationService.error('ไม่สามารถเพิ่มสาขาได้');
          console.error('Error creating branch:', err);
        }
      });
    }
  }

  onCancelForm(): void {
    this.showModal.set(false);
    this.currentBranch.set(undefined);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    let startPage = Math.max(1, this.currentPage() - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages(), startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedStatus.set(undefined);
    this.sortBy.set('name-asc');
    this.currentPage.set(1);
    this.applyFilters();
  }

  // Helper for template
  get Math() {
    return Math;
  }
}

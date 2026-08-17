import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialRequisitionsService, BranchesService, EmployeesService, ProductsService } from '../../../../services/openapi-client';
import {
  CreateMaterialRequisitionDto,
  CreateMaterialRequisitionItemDto,
  UpdateMaterialRequisitionDto,
  EmployeeListDto,
  ProductDto
} from '../../../../services/openapi-client/model/models';
import { NotificationService } from '../../../../services/notification.service';
import { formatThaiDate } from '../../../../utils/thai-date.helper';
import { FormHelpers } from '../../../../utils/form-helpers';
import { FormValidators } from '../../../../utils/form-validators';

// Editable row shape for the items UI - keeps productName/productSku around
// purely for display (selected-product preview), separate from the
// productId/quantity pair actually sent to the backend.
interface RequisitionItemFormRow {
  productId: number | null;
  productName?: string;
  productSku?: string;
  quantity: number | null;
}

// The generated MaterialRequisitionsController/BranchesController actions return untyped
// IActionResult on the backend, so openapi-generator does not emit typed
// MaterialRequisitionDto / BranchDto models. Define the shapes locally.
interface MaterialRequisitionItemDto {
  id?: number;
  materialRequisitionId?: number;
  productId?: number;
  productName?: string | null;
  productSku?: string | null;
  quantity?: number;
  unit?: string | null;
  issuedQuantity?: number | null;
}

interface MaterialRequisitionDto {
  id?: number;
  requisitionNumber?: string | null;
  branchId?: number;
  branchName?: string | null;
  requestedBy?: number;
  requestedByName?: string | null;
  requisitionDate?: string | null;
  purpose?: string | null;
  salesOrderId?: number | null;
  salesOrderNumber?: string | null;
  status?: string | null;
  approvedBy?: number | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  items?: MaterialRequisitionItemDto[];
}

interface BranchDto {
  id?: number;
  name?: string | null;
  code?: string | null;
}

@Component({
  selector: 'app-material-requisition-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './material-requisition-admin.component.html',
  styleUrls: ['./material-requisition-admin.component.css']
})
export class MaterialRequisitionAdminComponent implements OnInit {
  requisitions = signal<MaterialRequisitionDto[]>([]);
  filteredRequisitions = signal<MaterialRequisitionDto[]>([]);
  branches = signal<BranchDto[]>([]);
  employees = signal<EmployeeListDto[]>([]);
  products = signal<ProductDto[]>([]);
  loading = signal(false);
  loadingProducts = signal(false);

  searchTerm = signal('');
  selectedBranch = signal<string>('');
  selectedStatus = signal<string>('');

  showModal = signal(false);
  showDeleteModal = signal(false);
  isEditMode = signal(false);
  selectedRequisition = signal<MaterialRequisitionDto | null>(null);

  // Reactive form
  requisitionForm!: FormGroup;
  requisitionItems: RequisitionItemFormRow[] = [];

  currentPage = signal(1);
  itemsPerPage = signal(10);

  statuses = [
    { value: 'pending', label: 'รอดำเนินการ' },
    { value: 'approved', label: 'อนุมัติ' },
    { value: 'delivered', label: 'จัดส่งแล้ว' },
    { value: 'cancelled', label: 'ยกเลิก' }
  ];

  Math = Math;

  constructor(
    private requisitionsService: MaterialRequisitionsService,
    private branchesService: BranchesService,
    private employeesService: EmployeesService,
    private productsService: ProductsService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  private initForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.requisitionForm = this.fb.group({
      branchId: [null, Validators.required],
      requestedBy: [null, Validators.required],
      requisitionDate: [today, Validators.required],
      purpose: ['', Validators.maxLength(500)],
      salesOrderId: [null],
      status: ['pending', Validators.required],
      notes: ['', Validators.maxLength(1000)]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    return FormHelpers.isFieldInvalid(this.requisitionForm, fieldName);
  }

  getFieldError(fieldName: string): string {
    return FormHelpers.getFieldError(this.requisitionForm, fieldName);
  }

  ngOnInit(): void {
    this.loadRequisitions();
    this.loadBranches();
    this.loadEmployees();
    this.loadProducts();
  }

  loadProducts(): void {
    this.loadingProducts.set(true);
    this.productsService.productsGetProducts(1, 1000).subscribe({
      next: (response: any) => {
        if (response.success && response.data?.items) {
          this.products.set(response.data.items.filter((p: ProductDto) => p.isActive));
        }
        this.loadingProducts.set(false);
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
        this.loadingProducts.set(false);
      }
    });
  }

  loadRequisitions(): void {
    this.loading.set(true);
    this.requisitionsService.materialRequisitionsGetAll().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.requisitions.set(response.data);
          this.applyFilters();
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading requisitions:', error);
        this.loading.set(false);
      }
    });
  }

  loadBranches(): void {
    this.branchesService.branchesGetAll().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.branches.set(response.data);
        }
      },
      error: (error: any) => console.error('Error:', error)
    });
  }

  loadEmployees(): void {
    // employeesGetAllEmployees() resolves directly to EmployeeListDto[],
    // not an ApiResponse envelope - unwrapping response.data here always
    // left this.employees empty, so the "ผู้เบิก" dropdown had no options.
    this.employeesService.employeesGetAllEmployees().subscribe({
      next: (employees: EmployeeListDto[]) => {
        this.employees.set(employees);
      },
      error: (error: any) => console.error('Error:', error)
    });
  }

  applyFilters(): void {
    let filtered = [...this.requisitions()];

    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(r =>
        r.requisitionNumber?.toLowerCase().includes(search) ||
        r.purpose?.toLowerCase().includes(search)
      );
    }

    if (this.selectedBranch()) {
      filtered = filtered.filter(r => r.branchId?.toString() === this.selectedBranch());
    }

    if (this.selectedStatus()) {
      filtered = filtered.filter(r => r.status === this.selectedStatus());
    }

    this.filteredRequisitions.set(filtered);
    this.currentPage.set(1);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.applyFilters();
  }

  onBranchFilterChange(value: string): void {
    this.selectedBranch.set(value);
    this.applyFilters();
  }

  onStatusFilterChange(value: string): void {
    this.selectedStatus.set(value);
    this.applyFilters();
  }

  openAddModal(): void {
    this.isEditMode.set(false);
    this.selectedRequisition.set(null);
    const today = new Date().toISOString().split('T')[0];
    this.requisitionForm.reset({
      branchId: null,
      requestedBy: null,
      requisitionDate: today,
      purpose: '',
      salesOrderId: null,
      status: 'pending',
      notes: ''
    });
    this.requisitionItems = [];
    this.showModal.set(true);
  }

  openEditModal(requisition: MaterialRequisitionDto): void {
    this.isEditMode.set(true);
    this.selectedRequisition.set(requisition);
    this.requisitionForm.patchValue({
      branchId: requisition.branchId,
      requestedBy: requisition.requestedBy,
      requisitionDate: requisition.requisitionDate?.split('T')[0],
      purpose: requisition.purpose || '',
      salesOrderId: requisition.salesOrderId,
      status: requisition.status || 'pending',
      notes: requisition.notes || ''
    });
    // GetAllAsync() (which populates this list) already includes items with
    // their product, so this doesn't need a separate detail fetch.
    this.requisitionItems = (requisition.items || []).map(i => ({
      productId: i.productId ?? null,
      productName: i.productName ?? undefined,
      productSku: i.productSku ?? undefined,
      quantity: i.quantity ?? null
    }));
    this.showModal.set(true);
  }

  addItem(): void {
    this.requisitionItems.push({ productId: null, quantity: 1 });
  }

  removeItem(index: number): void {
    this.requisitionItems.splice(index, 1);
  }

  onProductSelect(index: number, productId: number | string | null): void {
    const id = productId != null ? Number(productId) : null;
    this.requisitionItems[index].productId = id;
    const product = this.products().find(p => p.id === id);
    this.requisitionItems[index].productName = product?.name || '';
    this.requisitionItems[index].productSku = product?.sku || '';
  }

  openDeleteModal(requisition: MaterialRequisitionDto): void {
    this.selectedRequisition.set(requisition);
    this.showDeleteModal.set(true);
  }

  save(): void {
    // Mark all fields as touched to show validation errors
    FormHelpers.markFormGroupTouched(this.requisitionForm);

    // Validate form
    if (this.requisitionForm.invalid) {
      return;
    }

    // Validate items
    const items = this.buildItemsPayload();
    if (!items) {
      return;
    }

    if (this.isEditMode()) {
      this.update();
    } else {
      this.create();
    }
  }

  /** Both create and update reject the request with 400 ("ต้องมีรายการเบิก
   *  อย่างน้อย 1 รายการ") unless `items` is non-empty - this form used to have
   *  no items UI at all, so a material requisition could never actually be
   *  created from here. Validate + build the items payload client-side. */
  private buildItemsPayload(): CreateMaterialRequisitionItemDto[] | null {
    const items = this.requisitionItems as RequisitionItemFormRow[];
    if (!items || items.length === 0) {
      this.notificationService.error('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ');
      return null;
    }
    if (items.some(i => !i.productId || !i.quantity || i.quantity <= 0)) {
      this.notificationService.error('กรุณาเลือกสินค้าและระบุจำนวนให้ครบทุกรายการ');
      return null;
    }
    return items.map(i => ({ productId: i.productId!, quantity: i.quantity! }));
  }

  create(): void {
    const items = this.buildItemsPayload();
    if (!items) return;

    const formValue = this.requisitionForm.value;
    const dto: CreateMaterialRequisitionDto = {
      branchId: formValue.branchId,
      requestedBy: formValue.requestedBy,
      requisitionDate: formValue.requisitionDate,
      purpose: formValue.purpose?.trim() || undefined,
      salesOrderId: formValue.salesOrderId || undefined,
      notes: formValue.notes?.trim() || undefined,
      items
    };
    this.requisitionsService.materialRequisitionsCreate(dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadRequisitions();
          this.closeModals();
          this.notificationService.success('สร้างใบเบิกสำเร็จ');
        }
      },
      error: (error: any) => {
        console.error('Error:', error);
        this.notificationService.error(error.error?.message || error.error?.errors?.Items?.[0] || 'เกิดข้อผิดพลาด');
      }
    });
  }

  update(): void {
    const req = this.selectedRequisition();
    if (!req) return;

    const items = this.buildItemsPayload();
    if (!items) return;

    const formValue = this.requisitionForm.value;
    const dto: UpdateMaterialRequisitionDto = {
      requisitionDate: formValue.requisitionDate,
      purpose: formValue.purpose?.trim() || undefined,
      salesOrderId: formValue.salesOrderId || undefined,
      notes: formValue.notes?.trim() || undefined,
      items
    };
    this.requisitionsService.materialRequisitionsUpdate(req.id!, dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadRequisitions();
          this.closeModals();
          this.notificationService.success('บันทึกสำเร็จ');
        }
      },
      error: (error: any) => {
        console.error('Error:', error);
        this.notificationService.error(error.error?.message || error.error?.errors?.Items?.[0] || 'เกิดข้อผิดพลาด');
      }
    });
  }

  delete(): void {
    const req = this.selectedRequisition();
    if (!req) return;

    this.requisitionsService.materialRequisitionsDelete(req.id!).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadRequisitions();
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาด');
      }
    });
  }

  closeModals(): void {
    this.showModal.set(false);
    this.showDeleteModal.set(false);
  }

  getPaginated(): MaterialRequisitionDto[] {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredRequisitions().slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredRequisitions().length / this.itemsPerPage());
  }

  nextPage(): void {
    if (this.currentPage() < this.getTotalPages()) {
      this.currentPage.update(page => page + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
    }
  }

  getStatusLabel(status: string | null | undefined): string {
    const found = this.statuses.find(s => s.value === status);
    return found ? found.label : status || '-';
  }

  formatDate(date: string | null | undefined): string {
    return formatThaiDate(date);
  }
}

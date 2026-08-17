import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DeliveriesService, BranchesService, EmployeesService } from '../../../../services/openapi-client';
import {
  CreateDeliveryDto,
  UpdateDeliveryDto
} from '../../../../services/openapi-client/model/models';
import { NotificationService } from '../../../../services/notification.service';
import { formatThaiDate } from '../../../../utils/thai-date.helper';
import { FormHelpers } from '../../../../utils/form-helpers';
import { FormValidators } from '../../../../utils/form-validators';

// The generated DeliveriesController/BranchesController/EmployeesController actions return
// untyped IActionResult on the backend, so openapi-generator does not emit typed
// DeliveryDto / BranchDto / EmployeeListDto models. Define the shapes locally.
interface DeliveryDto {
  id?: number;
  deliveryNumber?: string | null;
  branchId?: number;
  branchName?: string | null;
  ecommerceOrderId?: number | null;
  ecommerceOrderNumber?: string | null;
  erpSalesOrderId?: number | null;
  erpSalesOrderNumber?: string | null;
  scheduledDate?: string | null;
  actualDeliveryDate?: string | null;
  driverId?: number | null;
  driverName?: string | null;
  vehicleNumber?: string | null;
  deliveryAddress?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  status?: string | null;
  signatureUrl?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  createdBy?: number | null;
  createdByName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface BranchDto {
  id?: number;
  name?: string | null;
  code?: string | null;
}

interface EmployeeListDto {
  id?: number;
  employeeCode?: string | null;
  email?: string | null;
  fullNameTh?: string | null;
  fullNameEn?: string | null;
  phone?: string | null;
  position?: string | null;
  photoUrl?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  status?: string | null;
}

@Component({
  selector: 'app-delivery-list-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './delivery-list-admin.component.html',
  styleUrls: ['./delivery-list-admin.component.css']
})
export class DeliveryListAdminComponent implements OnInit {
  deliveries = signal<DeliveryDto[]>([]);
  filteredDeliveries = signal<DeliveryDto[]>([]);
  branches = signal<BranchDto[]>([]);
  drivers = signal<EmployeeListDto[]>([]);
  loading = signal(false);

  searchTerm = signal('');
  selectedBranch = signal<string>('');
  selectedStatus = signal<string>('');

  showModal = signal(false);
  showDeleteModal = signal(false);
  isEditMode = signal(false);
  selectedDelivery = signal<DeliveryDto | null>(null);

  // Reactive form
  deliveryForm!: FormGroup;

  currentPage = signal(1);
  itemsPerPage = signal(10);

  statuses = [
    { value: 'scheduled', label: 'กำหนดการ' },
    { value: 'in_transit', label: 'กำลังจัดส่ง' },
    { value: 'delivered', label: 'จัดส่งสำเร็จ' },
    { value: 'failed', label: 'จัดส่งไม่สำเร็จ' },
    { value: 'cancelled', label: 'ยกเลิก' }
  ];

  Math = Math;

  constructor(
    private deliveriesService: DeliveriesService,
    private branchesService: BranchesService,
    private employeesService: EmployeesService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadDeliveries();
    this.loadBranches();
    this.loadDrivers();
  }

  private initForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.deliveryForm = this.fb.group({
      branchId: [null, Validators.required],
      ecommerceOrderId: [null],
      erpSalesOrderId: [null],
      scheduledDate: [today, Validators.required],
      actualDeliveryDate: [null],
      driverId: [null],
      vehicleNumber: ['', Validators.maxLength(20)],
      deliveryAddress: ['', [Validators.required, Validators.maxLength(500)]],
      contactPerson: ['', Validators.maxLength(100)],
      contactPhone: ['', Validators.maxLength(20)],
      status: ['scheduled', Validators.required],
      signatureUrl: ['', Validators.maxLength(500)],
      photoUrl: ['', Validators.maxLength(500)],
      notes: ['', Validators.maxLength(500)],
      createdBy: [null]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    return FormHelpers.isFieldInvalid(this.deliveryForm, fieldName);
  }

  getFieldError(fieldName: string): string {
    return FormHelpers.getFieldError(this.deliveryForm, fieldName);
  }

  loadDeliveries(): void {
    this.loading.set(true);
    this.deliveriesService.deliveriesGetAll().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.deliveries.set(response.data);
          this.applyFilters();
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading deliveries:', error);
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

  loadDrivers(): void {
    // employeesGetAllEmployees() resolves directly to EmployeeListDto[],
    // not an ApiResponse envelope - unwrapping response.data here always
    // left this.drivers empty, so the "พนักงานขับรถ" dropdown had no options.
    this.employeesService.employeesGetAllEmployees().subscribe({
      next: (employees: EmployeeListDto[]) => {
        this.drivers.set(employees);
      },
      error: (error: any) => console.error('Error:', error)
    });
  }

  applyFilters(): void {
    let filtered = [...this.deliveries()];

    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(d =>
        d.deliveryNumber?.toLowerCase().includes(search) ||
        d.contactPerson?.toLowerCase().includes(search) ||
        d.deliveryAddress?.toLowerCase().includes(search)
      );
    }

    if (this.selectedBranch()) {
      filtered = filtered.filter(d => d.branchId?.toString() === this.selectedBranch());
    }

    if (this.selectedStatus()) {
      filtered = filtered.filter(d => d.status === this.selectedStatus());
    }

    this.filteredDeliveries.set(filtered);
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
    this.selectedDelivery.set(null);
    const today = new Date().toISOString().split('T')[0];
    this.deliveryForm.reset({
      branchId: null,
      ecommerceOrderId: null,
      erpSalesOrderId: null,
      scheduledDate: today,
      actualDeliveryDate: null,
      driverId: null,
      vehicleNumber: '',
      deliveryAddress: '',
      contactPerson: '',
      contactPhone: '',
      status: 'scheduled',
      signatureUrl: '',
      photoUrl: '',
      notes: '',
      createdBy: null
    });
    this.showModal.set(true);
  }

  openEditModal(delivery: DeliveryDto): void {
    this.isEditMode.set(true);
    this.selectedDelivery.set(delivery);
    this.deliveryForm.patchValue({
      scheduledDate: delivery.scheduledDate?.split('T')[0],
      actualDeliveryDate: delivery.actualDeliveryDate?.split('T')[0] || null,
      driverId: delivery.driverId,
      vehicleNumber: delivery.vehicleNumber,
      deliveryAddress: delivery.deliveryAddress,
      contactPerson: delivery.contactPerson,
      contactPhone: delivery.contactPhone,
      status: delivery.status,
      signatureUrl: delivery.signatureUrl,
      photoUrl: delivery.photoUrl,
      notes: delivery.notes
    });
    this.showModal.set(true);
  }

  openDeleteModal(delivery: DeliveryDto): void {
    this.selectedDelivery.set(delivery);
    this.showDeleteModal.set(true);
  }

  save(): void {
    if (this.deliveryForm.invalid) {
      FormHelpers.markFormGroupTouched(this.deliveryForm);
      this.notificationService.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (this.isEditMode()) {
      this.update();
    } else {
      this.create();
    }
  }

  create(): void {
    const formValue = this.deliveryForm.value;
    const dto: CreateDeliveryDto = {
      branchId: formValue.branchId,
      ecommerceOrderId: formValue.ecommerceOrderId || null,
      erpSalesOrderId: formValue.erpSalesOrderId || null,
      scheduledDate: formValue.scheduledDate,
      driverId: formValue.driverId || null,
      vehicleNumber: formValue.vehicleNumber || null,
      deliveryAddress: formValue.deliveryAddress,
      contactPerson: formValue.contactPerson || null,
      contactPhone: formValue.contactPhone || null,
      notes: formValue.notes || null,
      createdBy: formValue.createdBy || null
    };

    this.deliveriesService.deliveriesCreate(dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadDeliveries();
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาด');
      }
    });
  }

  update(): void {
    const delivery = this.selectedDelivery();
    if (!delivery) return;

    const formValue = this.deliveryForm.value;
    const dto: UpdateDeliveryDto = {
      scheduledDate: formValue.scheduledDate,
      actualDeliveryDate: formValue.actualDeliveryDate || null,
      driverId: formValue.driverId || null,
      vehicleNumber: formValue.vehicleNumber || null,
      deliveryAddress: formValue.deliveryAddress,
      contactPerson: formValue.contactPerson || null,
      contactPhone: formValue.contactPhone || null,
      status: formValue.status || null,
      signatureUrl: formValue.signatureUrl || null,
      photoUrl: formValue.photoUrl || null,
      notes: formValue.notes || null
    };

    this.deliveriesService.deliveriesUpdate(delivery.id!, dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadDeliveries();
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาด');
      }
    });
  }

  delete(): void {
    const delivery = this.selectedDelivery();
    if (!delivery) return;

    this.deliveriesService.deliveriesDelete(delivery.id!).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadDeliveries();
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

  getPaginated(): DeliveryDto[] {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredDeliveries().slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredDeliveries().length / this.itemsPerPage());
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

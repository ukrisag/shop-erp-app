import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialRequisitionsService, BranchesService, EmployeesService } from '../../../../services/openapi-client';
import {
  MaterialRequisitionDto,
  CreateMaterialRequisitionDto,
  UpdateMaterialRequisitionDto,
  BranchDto,
  EmployeeListDto
} from '../../../../services/openapi-client/model/models';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-material-requisition-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './material-requisition-admin.component.html',
  styleUrls: ['./material-requisition-admin.component.css']
})
export class MaterialRequisitionAdminComponent implements OnInit {
  requisitions = signal<MaterialRequisitionDto[]>([]);
  filteredRequisitions = signal<MaterialRequisitionDto[]>([]);
  branches = signal<BranchDto[]>([]);
  employees = signal<EmployeeListDto[]>([]);
  loading = signal(false);

  searchTerm = signal('');
  selectedBranch = signal<string>('');
  selectedStatus = signal<string>('');

  showModal = signal(false);
  showDeleteModal = signal(false);
  isEditMode = signal(false);
  selectedRequisition = signal<MaterialRequisitionDto | null>(null);

  requisitionForm: any = {
    branchId: null,
    requestedBy: null,
    requisitionDate: '',
    purpose: '',
    salesOrderId: null,
    status: 'pending',
    notes: ''
  };

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
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadRequisitions();
    this.loadBranches();
    this.loadEmployees();
  }

  loadRequisitions(): void {
    this.loading.set(true);
    this.requisitionsService.apiErpMaterialRequisitionsGet().subscribe({
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
    this.branchesService.apiErpBranchesGet().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.branches.set(response.data);
        }
      },
      error: (error: any) => console.error('Error:', error)
    });
  }

  loadEmployees(): void {
    this.employeesService.apiEmployeesGet().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.employees.set(response.data);
        }
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
    this.requisitionForm = {
      branchId: null,
      requestedBy: null,
      requisitionDate: today,
      purpose: '',
      salesOrderId: null,
      status: 'pending',
      notes: ''
    };
    this.showModal.set(true);
  }

  openEditModal(requisition: MaterialRequisitionDto): void {
    this.isEditMode.set(true);
    this.selectedRequisition.set(requisition);
    this.requisitionForm = {
      branchId: requisition.branchId,
      requestedBy: requisition.requestedBy,
      requisitionDate: requisition.requisitionDate?.split('T')[0],
      purpose: requisition.purpose,
      salesOrderId: requisition.salesOrderId,
      status: requisition.status,
      notes: requisition.notes
    };
    this.showModal.set(true);
  }

  openDeleteModal(requisition: MaterialRequisitionDto): void {
    this.selectedRequisition.set(requisition);
    this.showDeleteModal.set(true);
  }

  save(): void {
    if (this.isEditMode()) {
      this.update();
    } else {
      this.create();
    }
  }

  create(): void {
    const dto: CreateMaterialRequisitionDto = this.requisitionForm;
    this.requisitionsService.apiErpMaterialRequisitionsPost(dto).subscribe({
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

  update(): void {
    const req = this.selectedRequisition();
    if (!req) return;

    const dto: UpdateMaterialRequisitionDto = this.requisitionForm;
    this.requisitionsService.apiErpMaterialRequisitionsIdPut(req.id!, dto).subscribe({
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

  delete(): void {
    const req = this.selectedRequisition();
    if (!req) return;

    this.requisitionsService.apiErpMaterialRequisitionsIdDelete(req.id!).subscribe({
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
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH');
  }
}

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingSkeletonComponent } from '../../../../components/shared/loading-skeleton/loading-skeleton.component';
import { AdvanceService } from '../../../../services/openapi-client/api/advance.service';
import { EmployeesService } from '../../../../services/openapi-client/api/employees.service';
import { BranchesService } from '../../../../services/openapi-client/api/branches.service';
import { NotificationService } from '../../../../services/notification.service';
import { formatThaiDate } from '../../../../utils/thai-date.helper';
import {
  AdvancePaymentDto,
  AdvancePaymentCreateDto,
  AdvancePaymentUpdateDto,
  AdvanceApprovalDto,
  EmployeeListDto
} from '../../../../services/openapi-client/model/models';

interface BranchDto {
  id: number;
  name: string;
  code?: string;
}

@Component({
  selector: 'app-advance-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSkeletonComponent],
  templateUrl: './advance-admin.component.html',
  styleUrls: ['./advance-admin.component.css']
})
export class AdvanceAdminComponent implements OnInit {
  // State signals
  activeTab = signal<'records' | 'pending'>('records');
  advanceRecords = signal<AdvancePaymentDto[]>([]);
  pendingRecords = signal<AdvancePaymentDto[]>([]);
  employees = signal<EmployeeListDto[]>([]);
  branches = signal<BranchDto[]>([]);
  loading = signal(false);

  // Filter state
  filterForm = {
    employeeId: null as number | null,
    branchId: null as number | null,
    status: 'all' as 'all' | 'pending' | 'approved' | 'rejected' | 'completed'
  };

  // Modal state
  showFormModal = signal(false);
  showApprovalModal = signal(false);
  selectedRecord = signal<AdvancePaymentDto | null>(null);
  isEditMode = signal(false);

  // Form data
  advanceForm: any = {
    userId: null,
    branchId: null,
    advanceDate: '',
    amount: null,
    monthlyDeduction: null,
    reason: ''
  };

  // Approval form
  approvalForm = {
    reason: ''
  };

  // Computed values
  filteredRecords = computed(() => {
    let records = this.advanceRecords();

    // Filter by status
    if (this.filterForm.status !== 'all') {
      records = records.filter(r => r.status === this.filterForm.status);
    }

    // Filter by employee
    if (this.filterForm.employeeId) {
      records = records.filter(r => r.userId === this.filterForm.employeeId);
    }

    // Filter by branch
    if (this.filterForm.branchId) {
      records = records.filter(r => r.branchId === this.filterForm.branchId);
    }

    return records;
  });

  totalAmount = computed(() => {
    return this.filteredRecords().reduce((sum, record) => sum + (record.amount || 0), 0);
  });

  totalRemaining = computed(() => {
    return this.filteredRecords().reduce((sum, record) => sum + (record.remainingBalance || 0), 0);
  });

  totalDeductions = computed(() => {
    return this.filteredRecords().reduce((sum, record) => sum + (record.monthlyDeduction || 0), 0);
  });

  // Computed for estimated installments
  estimatedInstallments = computed(() => {
    if (this.advanceForm.amount && this.advanceForm.monthlyDeduction && this.advanceForm.monthlyDeduction > 0) {
      return Math.ceil(this.advanceForm.amount / this.advanceForm.monthlyDeduction);
    }
    return 0;
  });

  // Expose Math for template
  Math = Math;

  constructor(
    private advanceService: AdvanceService,
    private employeesService: EmployeesService,
    private branchesService: BranchesService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
    this.loadBranches();
    this.loadAdvanceRecords();
  }

  loadEmployees(): void {
    this.employeesService.employeesGetAllEmployees().subscribe({
      next: (employees: any[]) => {
        this.employees.set(employees);
      },
      error: (error: any) => {
        console.error('Error loading employees:', error);
        this.notificationService.error(error.error?.message || 'Failed to load employees');
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
      error: (error: any) => {
        console.error('Error loading branches:', error);
        this.notificationService.error(error.error?.message || 'Failed to load branches');
      }
    });
  }

  loadAdvanceRecords(): void {
    this.loading.set(true);
    this.advanceService.advanceGetAllAdvances().subscribe({
      next: (records: AdvancePaymentDto[]) => {
        this.advanceRecords.set(records);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading advance records:', error);
        this.notificationService.error(error.error?.message || 'Failed to load advance records');
        this.loading.set(false);
      }
    });
  }

  loadPendingRecords(): void {
    this.loading.set(true);
    this.advanceService.advanceGetPendingAdvances().subscribe({
      next: (records: AdvancePaymentDto[]) => {
        this.pendingRecords.set(records);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading pending records:', error);
        this.notificationService.error(error.error?.message || 'Failed to load pending records');
        this.loading.set(false);
      }
    });
  }

  switchTab(tab: 'records' | 'pending'): void {
    this.activeTab.set(tab);
    if (tab === 'pending') {
      this.loadPendingRecords();
    }
  }

  applyFilters(): void {
    // Filters are computed, so just trigger a refresh
    this.loadAdvanceRecords();
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.resetForm();
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  openEditModal(record: AdvancePaymentDto): void {
    if (record.status !== 'pending') {
      this.notificationService.error('Can only edit pending records');
      return;
    }

    this.isEditMode.set(true);
    this.selectedRecord.set(record);
    this.advanceForm = {
      userId: record.userId,
      branchId: record.branchId,
      advanceDate: record.advanceDate ? record.advanceDate.split('T')[0] : '',
      amount: record.amount,
      monthlyDeduction: record.monthlyDeduction,
      reason: record.reason || ''
    };
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  resetForm(): void {
    this.advanceForm = {
      userId: null,
      branchId: null,
      advanceDate: '',
      amount: null,
      monthlyDeduction: null,
      reason: ''
    };
  }

  onEmployeeChange(): void {
    // Auto-fill branch from employee
    if (this.advanceForm.userId) {
      const employee = this.employees().find(e => e.id === this.advanceForm.userId);
      if (employee && employee.branchId) {
        this.advanceForm.branchId = employee.branchId;
      }
    }
  }

  saveAdvanceRecord(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading.set(true);

    if (this.isEditMode()) {
      const updateDto: AdvancePaymentUpdateDto = {
        advanceDate: this.advanceForm.advanceDate,
        amount: this.advanceForm.amount,
        monthlyDeduction: this.advanceForm.monthlyDeduction,
        reason: this.advanceForm.reason
      };

      this.advanceService.advanceUpdateAdvance(this.selectedRecord()!.id!, updateDto).subscribe({
        next: (response: any) => {
          this.notificationService.success(response?.message || 'Successfully updated advance payment request');
          this.closeModal();
          this.loadAdvanceRecords();
          if (this.activeTab() === 'pending') {
            this.loadPendingRecords();
          }
        },
        error: (error: any) => {
          console.error('Error updating advance:', error);
          this.notificationService.error(error.error?.message || 'Failed to update advance payment request');
          this.loading.set(false);
        }
      });
    } else {
      const createDto: AdvancePaymentCreateDto = {
        userId: this.advanceForm.userId,
        branchId: this.advanceForm.branchId,
        advanceDate: this.advanceForm.advanceDate,
        amount: this.advanceForm.amount,
        monthlyDeduction: this.advanceForm.monthlyDeduction,
        reason: this.advanceForm.reason
      };

      this.advanceService.advanceCreateAdvance(createDto).subscribe({
        next: (response: any) => {
          this.notificationService.success(response?.message || 'Successfully created advance payment request');
          this.closeModal();
          this.loadAdvanceRecords();
          if (this.activeTab() === 'pending') {
            this.loadPendingRecords();
          }
        },
        error: (error: any) => {
          console.error('Error creating advance:', error);
          this.notificationService.error(error.error?.message || 'Failed to create advance payment request');
          this.loading.set(false);
        }
      });
    }
  }

  validateForm(): boolean {
    if (!this.advanceForm.userId && !this.isEditMode()) {
      this.notificationService.error('Please select an employee');
      return false;
    }
    if (!this.advanceForm.branchId && !this.isEditMode()) {
      this.notificationService.error('Please select a branch');
      return false;
    }
    if (!this.advanceForm.advanceDate) {
      this.notificationService.error('Please specify advance date');
      return false;
    }
    if (!this.advanceForm.amount || this.advanceForm.amount <= 0) {
      this.notificationService.error('Please specify a valid amount');
      return false;
    }
    if (!this.advanceForm.monthlyDeduction || this.advanceForm.monthlyDeduction <= 0) {
      this.notificationService.error('Please specify a valid monthly deduction');
      return false;
    }
    if (this.advanceForm.monthlyDeduction > this.advanceForm.amount) {
      this.notificationService.error('Monthly deduction cannot exceed the advance amount');
      return false;
    }
    return true;
  }

  openApprovalModal(record: AdvancePaymentDto): void {
    this.selectedRecord.set(record);
    this.approvalForm.reason = '';
    this.showApprovalModal.set(true);
  }

  approveRecord(record: AdvancePaymentDto): void {
    this.notificationService.confirm(
      'Do you want to approve this advance payment request?',
      () => {
        this.loading.set(true);
        this.advanceService.advanceApproveAdvance(record.id!).subscribe({
          next: (response: any) => {
            this.notificationService.success(response?.message || 'Successfully approved advance payment request');
            this.loadAdvanceRecords();
            if (this.activeTab() === 'pending') {
              this.loadPendingRecords();
            }
          },
          error: (error: any) => {
            console.error('Error approving advance:', error);
            this.notificationService.error(error.error?.message || 'Failed to approve advance payment request');
            this.loading.set(false);
          }
        });
      },
      undefined,
      'Approve',
      'Cancel',
      'info'
    );
  }

  rejectRecord(): void {
    if (!this.approvalForm.reason) {
      this.notificationService.error('Please specify reason for rejection');
      return;
    }

    const rejectDto: AdvanceApprovalDto = {
      notes: this.approvalForm.reason
    };

    this.loading.set(true);
    this.advanceService.advanceRejectAdvance(this.selectedRecord()!.id!, rejectDto).subscribe({
      next: (response: any) => {
        this.notificationService.success(response?.message || 'Successfully rejected advance payment request');
        this.closeModal();
        this.loadAdvanceRecords();
        if (this.activeTab() === 'pending') {
          this.loadPendingRecords();
        }
      },
      error: (error: any) => {
        console.error('Error rejecting advance:', error);
        this.notificationService.error(error.error?.message || 'Failed to reject advance payment request');
        this.loading.set(false);
      }
    });
  }

  deleteRecord(record: AdvancePaymentDto): void {
    if (record.status === 'approved' && (record.deductionCount || 0) > 0) {
      this.notificationService.error('Cannot delete advance requests that have started deduction');
      return;
    }

    this.notificationService.confirm(
      'Do you want to delete this advance payment request?',
      () => {
        this.loading.set(true);
        this.advanceService.advanceDeleteAdvance(record.id!).subscribe({
          next: (response: any) => {
            this.notificationService.success(response?.message || 'Successfully deleted advance payment request');
            this.loadAdvanceRecords();
            if (this.activeTab() === 'pending') {
              this.loadPendingRecords();
            }
          },
          error: (error: any) => {
            console.error('Error deleting advance:', error);
            this.notificationService.error(error.error?.message || 'Failed to delete advance payment request');
            this.loading.set(false);
          }
        });
      },
      undefined,
      'Delete',
      'Cancel',
      'danger'
    );
  }

  closeModal(): void {
    this.showFormModal.set(false);
    this.showApprovalModal.set(false);
    this.selectedRecord.set(null);
    this.resetForm();
    this.loading.set(false);
  }

  getStatusText(status: string): string {
    const statusMap: any = {
      'pending': 'รออนุมัติ',
      'approved': 'อนุมัติแล้ว',
      'rejected': 'ปฏิเสธ',
      'completed': 'เสร็จสิ้น'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: any = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-blue-100 text-blue-800',
      'rejected': 'bg-red-100 text-red-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return classMap[status] || '';
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    return formatThaiDate(dateString);
  }

  formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '0.00';
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  calculateProgress(record: AdvancePaymentDto): number {
    const amount = record.amount || 0;
    const remainingBalance = record.remainingBalance || 0;
    if (amount <= 0) return 0;
    const paid = amount - remainingBalance;
    return Math.round((paid / amount) * 100);
  }

  getProgressColor(progress: number): string {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  }
}

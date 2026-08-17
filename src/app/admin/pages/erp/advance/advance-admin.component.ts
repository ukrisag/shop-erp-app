import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { FormValidators } from '../../../../utils/form-validators';
import { FormHelpers } from '../../../../utils/form-helpers';
import { ValidationConfigs } from '../../../../utils/validation-configs';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface BranchDto {
  id: number;
  name: string;
  code?: string;
}

@Component({
  selector: 'app-advance-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoadingSkeletonComponent],
  templateUrl: './advance-admin.component.html',
  styleUrls: ['./advance-admin.component.css']
})
export class AdvanceAdminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
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
  advanceForm!: FormGroup;

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
    const amount = this.advanceForm?.get('amount')?.value;
    const monthlyDeduction = this.advanceForm?.get('monthlyDeduction')?.value;
    if (amount && monthlyDeduction && monthlyDeduction > 0) {
      return Math.ceil(amount / monthlyDeduction);
    }
    return 0;
  });

  // Expose Math for template
  Math = Math;

  constructor(
    private advanceService: AdvanceService,
    private employeesService: EmployeesService,
    private branchesService: BranchesService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupFormListeners();
    this.loadEmployees();
    this.loadBranches();
    this.loadAdvanceRecords();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.advanceForm = this.fb.group({
      employeeId: [null, ValidationConfigs.advance.employeeId],
      amount: [null, [
        ...ValidationConfigs.advance.amount,
        FormValidators.positiveNumber()
      ]],
      requestDate: ['', ValidationConfigs.advance.requestDate],
      reason: ['', ValidationConfigs.advance.reason],
      monthlyDeduction: [null, [
        ...ValidationConfigs.advance.monthlyDeduction,
        FormValidators.monthlyDeductionVsAmount('amount')
      ]],
      status: ['pending']
    });
  }

  private setupFormListeners(): void {
    // Validate monthlyDeduction when amount changes
    this.advanceForm.get('amount')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.advanceForm.get('monthlyDeduction')?.updateValueAndValidity();
      });
  }

  isFieldInvalid(fieldName: string): boolean {
    return FormHelpers.isFieldInvalid(this.advanceForm, fieldName);
  }

  getFieldError(fieldName: string): string {
    return FormHelpers.getFieldError(this.advanceForm, fieldName);
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
    this.advanceForm.patchValue({
      employeeId: record.userId,
      amount: record.amount,
      requestDate: record.advanceDate ? record.advanceDate.split('T')[0] : '',
      reason: record.reason || '',
      monthlyDeduction: record.monthlyDeduction,
      status: record.status
    });
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  resetForm(): void {
    this.advanceForm.reset({
      employeeId: null,
      amount: null,
      requestDate: '',
      reason: '',
      monthlyDeduction: null,
      status: 'pending'
    });
  }

  saveAdvanceRecord(): void {
    // Mark all fields as touched to trigger validation display
    FormHelpers.markFormGroupTouched(this.advanceForm);

    // Validate form
    if (!this.advanceForm.valid) {
      this.notificationService.error('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
      return;
    }

    this.loading.set(true);
    const formValue = this.advanceForm.value;

    if (this.isEditMode()) {
      const updateDto: AdvancePaymentUpdateDto = {
        advanceDate: formValue.requestDate,
        amount: formValue.amount,
        monthlyDeduction: formValue.monthlyDeduction,
        reason: formValue.reason
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
      // Get employee to find branchId
      const employee = this.employees().find(e => e.id === formValue.employeeId);
      const createDto: AdvancePaymentCreateDto = {
        userId: formValue.employeeId,
        branchId: employee?.branchId || undefined,
        advanceDate: formValue.requestDate,
        amount: formValue.amount,
        monthlyDeduction: formValue.monthlyDeduction,
        reason: formValue.reason
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

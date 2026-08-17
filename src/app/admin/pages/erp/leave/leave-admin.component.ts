import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeaveService } from '../../../../services/openapi-client/api/leave.service';
import { EmployeesService } from '../../../../services/openapi-client/api/employees.service';
import { NotificationService } from '../../../../services/notification.service';
import { formatThaiDate } from '../../../../utils/thai-date.helper';
import {
  LeaveRecordCreateDto,
  LeaveRecordUpdateDto,
  LeaveApprovalDto,
  LeaveBalanceDto,
  EmployeeListDto
} from '../../../../services/openapi-client/model/models';
import { FormValidators } from '../../../../utils/form-validators';
import { FormHelpers } from '../../../../utils/form-helpers';
import { ValidationConfigs } from '../../../../utils/validation-configs';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface LeaveRecordDto {
  id: number;
  employeeId: number;
  employeeCode?: string;
  employeeNameTh?: string;
  employeeNameEn?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isPaid: boolean;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-leave-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './leave-admin.component.html',
  styleUrls: ['./leave-admin.component.css']
})
export class LeaveAdminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  // State signals
  activeTab = signal<'records' | 'pending' | 'balance'>('records');
  leaveRecords = signal<LeaveRecordDto[]>([]);
  pendingRecords = signal<LeaveRecordDto[]>([]);
  leaveBalances = signal<LeaveBalanceDto[]>([]);
  employees = signal<EmployeeListDto[]>([]);
  loading = signal(false);

  // Leave types
  leaveTypes = [
    { value: 'annual', label: 'ลาพักร้อน', isPaid: true },
    { value: 'sick', label: 'ลาป่วย', isPaid: true },
    { value: 'personal', label: 'ลากิจ', isPaid: false },
    { value: 'maternity', label: 'ลาคลอด', isPaid: true },
    { value: 'ordination', label: 'ลาอุปสมบท', isPaid: true },
    { value: 'military', label: 'ลาเกณฑ์ทหาร', isPaid: true },
    { value: 'unpaid', label: 'ลาโดยไม่รับค่าจ้าง', isPaid: false },
    { value: 'other', label: 'อื่นๆ', isPaid: false }
  ];

  // Filter state
  filterForm = {
    startDate: '',
    endDate: '',
    employeeId: null as number | null,
    leaveType: 'all' as string,
    status: 'all' as 'all' | 'pending' | 'approved' | 'rejected'
  };

  // Modal state
  showFormModal = signal(false);
  showApprovalModal = signal(false);
  showBalanceModal = signal(false);
  selectedRecord = signal<LeaveRecordDto | null>(null);
  selectedBalance = signal<LeaveBalanceDto | null>(null);
  isEditMode = signal(false);

  // Form data
  leaveForm!: FormGroup;

  // Approval form
  approvalForm = {
    reason: ''
  };

  // Balance filter
  balanceYear = new Date().getFullYear();
  // Generated once from today's date (current year - 2 through current year + 1)
  // instead of a hardcoded list, so the dropdown never needs a code change to
  // stay current - it was previously a literal [2024, 2025, 2026, 2027].
  balanceYears: number[] = (() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y++) years.push(y);
    return years;
  })();

  // Computed values
  filteredRecords = computed(() => {
    let records = this.leaveRecords();

    // Filter by status
    if (this.filterForm.status !== 'all') {
      records = records.filter(r => r.status === this.filterForm.status);
    }

    // Filter by leave type
    if (this.filterForm.leaveType !== 'all') {
      records = records.filter(r => r.leaveType === this.filterForm.leaveType);
    }

    // Filter by employee
    if (this.filterForm.employeeId) {
      records = records.filter(r => r.employeeId === this.filterForm.employeeId);
    }

    // Filter by date range
    if (this.filterForm.startDate && this.filterForm.endDate) {
      records = records.filter(r => {
        const recordStart = new Date(r.startDate);
        const recordEnd = new Date(r.endDate);
        const filterStart = new Date(this.filterForm.startDate);
        const filterEnd = new Date(this.filterForm.endDate);
        return (recordStart >= filterStart && recordStart <= filterEnd) ||
               (recordEnd >= filterStart && recordEnd <= filterEnd);
      });
    }

    return records;
  });

  totalDays = computed(() => {
    return this.filteredRecords().reduce((sum, record) => sum + (record.totalDays || 0), 0);
  });

  constructor(
    private leaveService: LeaveService,
    private employeesService: EmployeesService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupFormListeners();
    this.loadEmployees();
    // setDefaultDates() must run BEFORE loadLeaveRecords(): that call reads
    // filterForm.startDate/endDate and silently no-ops when they're unset, so
    // calling it first left the records table permanently empty on page load
    // until the user manually touched a filter.
    this.setDefaultDates();
    this.loadLeaveRecords();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.leaveForm = this.fb.group({
      employeeId: [null, ValidationConfigs.leave.employeeId],
      leaveType: ['annual', ValidationConfigs.leave.leaveType],
      startDate: ['', ValidationConfigs.leave.startDate],
      endDate: ['', ValidationConfigs.leave.endDate],
      totalDays: [0, ValidationConfigs.leave.totalDays],
      reason: ['', ValidationConfigs.leave.reason]
    }, {
      validators: [FormValidators.dateRange('startDate', 'endDate')]
    });
  }

  private setupFormListeners(): void {
    // Auto-calculate total days when dates change
    this.leaveForm.get('startDate')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateTotalDays());

    this.leaveForm.get('endDate')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateTotalDays());

    // Update isPaid based on leave type
    this.leaveForm.get('leaveType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((leaveType) => {
        const selectedType = this.leaveTypes.find(t => t.value === leaveType);
        if (selectedType) {
          // Store isPaid for reference, but don't add it to form since backend expects it
        }
      });
  }

  private updateTotalDays(): void {
    const totalDays = this.calculateTotalDaysFromForm();
    this.leaveForm.patchValue({ totalDays }, { emitEvent: false });
  }

  setDefaultDates(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.filterForm.startDate = firstDay.toISOString().split('T')[0];
    this.filterForm.endDate = lastDay.toISOString().split('T')[0];
  }

  loadEmployees(): void {
    this.employeesService.employeesGetAllEmployees().subscribe({
      next: (employees: any[]) => {
        this.employees.set(employees);
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.notificationService.error(error.error?.message || 'Failed to load employees');
      }
    });
  }

  /** The backend nests employee identity under `record.employee.{employeeCode,
   *  firstNameTh, lastNameTh}` instead of the flat `employeeCode`/`employeeNameTh`
   *  fields this component (and its template) were written to expect - so every
   *  row silently rendered a blank employee column. Flatten it here so the rest
   *  of the component doesn't need to change. */
  private mapEmployeeFields(records: any[]): LeaveRecordDto[] {
    return records.map(r => ({
      ...r,
      employeeCode: r.employeeCode ?? r.employee?.employeeCode,
      employeeNameTh: r.employeeNameTh ?? [r.employee?.firstNameTh, r.employee?.lastNameTh].filter(Boolean).join(' '),
      employeeNameEn: r.employeeNameEn ?? ([r.employee?.firstNameEn, r.employee?.lastNameEn].filter(Boolean).join(' ') || undefined)
    }));
  }

  loadLeaveRecords(): void {
    this.loading.set(true);

    if (this.filterForm.startDate && this.filterForm.endDate) {
      this.leaveService.leaveGetLeaveRecordsByPeriod(
        this.filterForm.startDate,
        this.filterForm.endDate
      ).subscribe({
        next: (records: any[]) => {
          this.leaveRecords.set(this.mapEmployeeFields(records));
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading leave records:', error);
          this.notificationService.error(error.error?.message || 'Failed to load leave records');
          this.loading.set(false);
        }
      });
    }
  }

  loadPendingRecords(): void {
    this.loading.set(true);
    this.leaveService.leaveGetPendingLeaveRecords().subscribe({
      next: (records: any[]) => {
        this.pendingRecords.set(this.mapEmployeeFields(records));
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading pending records:', error);
        this.notificationService.error(error.error?.message || 'Failed to load pending records');
        this.loading.set(false);
      }
    });
  }

  loadLeaveBalances(): void {
    this.loading.set(true);

    // Load balances for all employees
    const balancePromises = this.employees().map(emp =>
      this.leaveService.leaveGetLeaveBalance(emp.id!, this.balanceYear).toPromise()
    );

    Promise.all(balancePromises).then(
      (balances) => {
        this.leaveBalances.set(balances.filter(b => b !== undefined) as LeaveBalanceDto[]);
        this.loading.set(false);
      },
      (error) => {
        console.error('Error loading balances:', error);
        this.notificationService.error(error.error?.message || 'Failed to load leave balances');
        this.loading.set(false);
      }
    );
  }

  switchTab(tab: 'records' | 'pending' | 'balance'): void {
    this.activeTab.set(tab);
    if (tab === 'pending') {
      this.loadPendingRecords();
    } else if (tab === 'balance') {
      this.loadLeaveBalances();
    }
  }

  applyFilters(): void {
    this.loadLeaveRecords();
  }

  calculateTotalDaysFromForm(): number {
    const startDate = this.leaveForm.get('startDate')?.value;
    const endDate = this.leaveForm.get('endDate')?.value;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end >= start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
      }
    }
    return 0;
  }

  isFieldInvalid(fieldName: string): boolean {
    return FormHelpers.isFieldInvalid(this.leaveForm, fieldName);
  }

  getFieldError(fieldName: string): string {
    return FormHelpers.getFieldError(this.leaveForm, fieldName);
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.resetForm();
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  openEditModal(record: LeaveRecordDto): void {
    if (record.status !== 'pending') {
      this.notificationService.error('Can only edit pending records');
      return;
    }

    this.isEditMode.set(true);
    this.selectedRecord.set(record);
    this.leaveForm.patchValue({
      employeeId: record.employeeId,
      leaveType: record.leaveType,
      startDate: record.startDate.split('T')[0],
      endDate: record.endDate.split('T')[0],
      totalDays: record.totalDays,
      reason: record.reason || ''
    });
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  resetForm(): void {
    this.leaveForm.reset({
      employeeId: null,
      leaveType: 'annual',
      startDate: '',
      endDate: '',
      totalDays: 0,
      reason: ''
    });
  }

  saveLeaveRecord(): void {
    // Mark all fields as touched to trigger validation display
    FormHelpers.markFormGroupTouched(this.leaveForm);

    // Validate form
    if (!this.leaveForm.valid) {
      this.notificationService.error('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
      return;
    }

    this.loading.set(true);
    const formValue = this.leaveForm.value;

    // Get isPaid from leave type
    const selectedType = this.leaveTypes.find(t => t.value === formValue.leaveType);
    const isPaid = selectedType ? selectedType.isPaid : false;

    if (this.isEditMode()) {
      const updateDto: LeaveRecordUpdateDto = {
        leaveType: formValue.leaveType,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        isPaid: isPaid,
        reason: formValue.reason
      };

      this.leaveService.leaveUpdateLeaveRecord(this.selectedRecord()!.id, updateDto).subscribe({
        next: (response: any) => {
          this.notificationService.success(response?.message || 'Successfully updated leave record');
          this.closeModal();
          this.loadLeaveRecords();
        },
        error: (error) => {
          console.error('Error updating leave:', error);
          this.notificationService.error(error.error?.message || 'Failed to update leave record');
          this.loading.set(false);
        }
      });
    } else {
      const createDto: LeaveRecordCreateDto = {
        employeeId: formValue.employeeId,
        leaveType: formValue.leaveType,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        isPaid: isPaid,
        reason: formValue.reason
      };

      this.leaveService.leaveCreateLeaveRecord(createDto).subscribe({
        next: (response: any) => {
          this.notificationService.success(response?.message || 'Successfully created leave record');
          this.closeModal();
          this.loadLeaveRecords();
        },
        error: (error) => {
          console.error('Error creating leave:', error);
          this.notificationService.error(error.error?.message || 'Failed to create leave record');
          this.loading.set(false);
        }
      });
    }
  }

  openApprovalModal(record: LeaveRecordDto): void {
    this.selectedRecord.set(record);
    this.approvalForm.reason = '';
    this.showApprovalModal.set(true);
  }

  approveRecord(record: LeaveRecordDto): void {
    this.notificationService.confirm(
      'Do you want to approve this leave record?',
      () => {
        this.loading.set(true);
        this.leaveService.leaveApproveLeaveRecord(record.id).subscribe({
          next: (response: any) => {
            this.notificationService.success(response?.message || 'Successfully approved leave record');
            this.loadLeaveRecords();
            if (this.activeTab() === 'pending') {
              this.loadPendingRecords();
            }
          },
          error: (error) => {
            console.error('Error approving leave:', error);
            this.notificationService.error(error.error?.message || 'Failed to approve leave record');
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

    const rejectDto: LeaveApprovalDto = {
      leaveId: this.selectedRecord()!.id,
      isApproved: false,
      notes: this.approvalForm.reason
    };

    this.loading.set(true);
    this.leaveService.leaveRejectLeaveRecord(this.selectedRecord()!.id, rejectDto).subscribe({
      next: (response: any) => {
        this.notificationService.success(response?.message || 'Successfully rejected leave record');
        this.closeModal();
        this.loadLeaveRecords();
        if (this.activeTab() === 'pending') {
          this.loadPendingRecords();
        }
      },
      error: (error) => {
        console.error('Error rejecting leave:', error);
        this.notificationService.error(error.error?.message || 'Failed to reject leave record');
        this.loading.set(false);
      }
    });
  }

  deleteRecord(record: LeaveRecordDto): void {
    if (record.status === 'approved') {
      this.notificationService.error('Cannot delete approved records');
      return;
    }

    this.notificationService.confirm(
      'Do you want to delete this leave record?',
      () => {
        this.loading.set(true);
        this.leaveService.leaveDeleteLeaveRecord(record.id).subscribe({
          next: (response: any) => {
            this.notificationService.success(response?.message || 'Successfully deleted leave record');
            this.loadLeaveRecords();
            if (this.activeTab() === 'pending') {
              this.loadPendingRecords();
            }
          },
          error: (error) => {
            console.error('Error deleting leave:', error);
            this.notificationService.error(error.error?.message || 'Failed to delete leave record');
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

  viewBalance(balance: LeaveBalanceDto): void {
    this.selectedBalance.set(balance);
    this.showBalanceModal.set(true);
  }

  closeModal(): void {
    this.showFormModal.set(false);
    this.showApprovalModal.set(false);
    this.showBalanceModal.set(false);
    this.selectedRecord.set(null);
    this.selectedBalance.set(null);
    this.resetForm();
    this.loading.set(false);
  }

  getLeaveTypeLabel(value: string): string {
    const type = this.leaveTypes.find(t => t.value === value);
    return type ? type.label : value;
  }

  getStatusText(status: string): string {
    const statusMap: any = {
      'pending': 'รออนุมัติ',
      'approved': 'อนุมัติแล้ว',
      'rejected': 'ปฏิเสธ'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: any = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return classMap[status] || '';
  }

  formatDate(dateString: string): string {
    return formatThaiDate(dateString);
  }
}

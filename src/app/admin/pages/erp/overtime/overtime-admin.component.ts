import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingSkeletonComponent } from '../../../../components/shared/loading-skeleton/loading-skeleton.component';
import { OvertimeService } from '../../../../services/openapi-client/api/overtime.service';
import { EmployeesService } from '../../../../services/openapi-client/api/employees.service';
import { NotificationService } from '../../../../services/notification.service';
import { formatThaiDate } from '../../../../utils/thai-date.helper';
import {
  OvertimeRecordCreateDto,
  OvertimeRecordUpdateDto,
  OvertimeApprovalDto,
  EmployeeListDto
} from '../../../../services/openapi-client/model/models';

interface OvertimeRecordDto {
  id: number;
  employeeId: number;
  employeeCode?: string;
  employeeNameTh?: string;
  employeeNameEn?: string;
  overtimeDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  rateMultiplier: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  notes?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-overtime-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSkeletonComponent],
  templateUrl: './overtime-admin.component.html',
  styleUrls: ['./overtime-admin.component.css']
})
export class OvertimeAdminComponent implements OnInit {
  // State signals
  activeTab = signal<'records' | 'pending'>('records');
  overtimeRecords = signal<OvertimeRecordDto[]>([]);
  pendingRecords = signal<OvertimeRecordDto[]>([]);
  employees = signal<EmployeeListDto[]>([]);
  loading = signal(false);

  // Filter state
  filterForm = {
    startDate: '',
    endDate: '',
    employeeId: null as number | null,
    status: 'all' as 'all' | 'pending' | 'approved' | 'rejected'
  };

  // Modal state
  showFormModal = signal(false);
  showApprovalModal = signal(false);
  selectedRecord = signal<OvertimeRecordDto | null>(null);
  isEditMode = signal(false);

  // Form data
  overtimeForm: any = {
    employeeId: null,
    overtimeDate: '',
    startTime: '',
    endTime: '',
    hours: null,
    rateMultiplier: 1.5,
    notes: ''
  };

  // Approval form
  approvalForm = {
    reason: ''
  };

  // Computed values
  filteredRecords = computed(() => {
    let records = this.overtimeRecords();

    // Filter by status
    if (this.filterForm.status !== 'all') {
      records = records.filter(r => r.status === this.filterForm.status);
    }

    // Filter by employee
    if (this.filterForm.employeeId) {
      records = records.filter(r => r.employeeId === this.filterForm.employeeId);
    }

    // Filter by date range
    if (this.filterForm.startDate && this.filterForm.endDate) {
      records = records.filter(r => {
        const recordDate = new Date(r.overtimeDate);
        const start = new Date(this.filterForm.startDate);
        const end = new Date(this.filterForm.endDate);
        return recordDate >= start && recordDate <= end;
      });
    }

    return records;
  });

  totalAmount = computed(() => {
    return this.filteredRecords().reduce((sum, record) => sum + (record.amount || 0), 0);
  });

  totalHours = computed(() => {
    return this.filteredRecords().reduce((sum, record) => sum + (record.hours || 0), 0);
  });

  constructor(
    private overtimeService: OvertimeService,
    private employeesService: EmployeesService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
    // setDefaultDates() must run BEFORE loadOvertimeRecords(): that call reads
    // filterForm.startDate/endDate and silently no-ops when they're unset, so
    // calling it first left the records table permanently empty on page load
    // until the user manually touched a filter.
    this.setDefaultDates();
    this.loadOvertimeRecords();
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
  private mapEmployeeFields(records: any[]): OvertimeRecordDto[] {
    return records.map(r => ({
      ...r,
      employeeCode: r.employeeCode ?? r.employee?.employeeCode,
      employeeNameTh: r.employeeNameTh ?? [r.employee?.firstNameTh, r.employee?.lastNameTh].filter(Boolean).join(' '),
      employeeNameEn: r.employeeNameEn ?? ([r.employee?.firstNameEn, r.employee?.lastNameEn].filter(Boolean).join(' ') || undefined)
    }));
  }

  loadOvertimeRecords(): void {
    this.loading.set(true);

    if (this.filterForm.startDate && this.filterForm.endDate) {
      this.overtimeService.overtimeGetOvertimeRecordsByPeriod(
        this.filterForm.startDate,
        this.filterForm.endDate
      ).subscribe({
        next: (records: any[]) => {
          this.overtimeRecords.set(this.mapEmployeeFields(records));
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading overtime records:', error);
          this.notificationService.error(error.error?.message || 'Failed to load overtime records');
          this.loading.set(false);
        }
      });
    }
  }

  loadPendingRecords(): void {
    this.loading.set(true);
    this.overtimeService.overtimeGetPendingOvertimeRecords().subscribe({
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

  switchTab(tab: 'records' | 'pending'): void {
    this.activeTab.set(tab);
    if (tab === 'pending') {
      this.loadPendingRecords();
    }
  }

  applyFilters(): void {
    this.loadOvertimeRecords();
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.resetForm();
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  openEditModal(record: OvertimeRecordDto): void {
    if (record.status !== 'pending') {
      this.notificationService.error('Can only edit pending records');
      return;
    }

    this.isEditMode.set(true);
    this.selectedRecord.set(record);
    this.overtimeForm = {
      employeeId: record.employeeId,
      overtimeDate: record.overtimeDate.split('T')[0],
      startTime: record.startTime,
      endTime: record.endTime,
      hours: record.hours,
      rateMultiplier: record.rateMultiplier,
      notes: record.notes || ''
    };
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  resetForm(): void {
    this.overtimeForm = {
      employeeId: null,
      overtimeDate: '',
      startTime: '',
      endTime: '',
      hours: null,
      rateMultiplier: 1.5,
      notes: ''
    };
  }

  calculateHours(): void {
    if (this.overtimeForm.startTime && this.overtimeForm.endTime) {
      const start = new Date(`2000-01-01T${this.overtimeForm.startTime}`);
      const end = new Date(`2000-01-01T${this.overtimeForm.endTime}`);
      const diffMs = end.getTime() - start.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      this.overtimeForm.hours = Math.round(hours * 100) / 100;
    }
  }

  saveOvertimeRecord(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading.set(true);

    if (this.isEditMode()) {
      const updateDto: OvertimeRecordUpdateDto = {
        overtimeDate: this.overtimeForm.overtimeDate,
        startTime: this.overtimeForm.startTime,
        endTime: this.overtimeForm.endTime,
        hours: this.overtimeForm.hours,
        rateMultiplier: this.overtimeForm.rateMultiplier,
        notes: this.overtimeForm.notes
      };

      this.overtimeService.overtimeUpdateOvertimeRecord(this.selectedRecord()!.id, updateDto).subscribe({
        next: (response: any) => {
          this.notificationService.success(response?.message || 'Successfully updated overtime record');
          this.closeModal();
          this.loadOvertimeRecords();
        },
        error: (error) => {
          console.error('Error updating overtime:', error);
          this.notificationService.error(error.error?.message || 'Failed to update overtime record');
          this.loading.set(false);
        }
      });
    } else {
      const createDto: OvertimeRecordCreateDto = {
        employeeId: this.overtimeForm.employeeId,
        overtimeDate: this.overtimeForm.overtimeDate,
        startTime: this.overtimeForm.startTime,
        endTime: this.overtimeForm.endTime,
        hours: this.overtimeForm.hours,
        rateMultiplier: this.overtimeForm.rateMultiplier,
        notes: this.overtimeForm.notes
      };

      this.overtimeService.overtimeCreateOvertimeRecord(createDto).subscribe({
        next: (response: any) => {
          this.notificationService.success(response?.message || 'Successfully created overtime record');
          this.closeModal();
          this.loadOvertimeRecords();
        },
        error: (error) => {
          console.error('Error creating overtime:', error);
          this.notificationService.error(error.error?.message || 'Failed to create overtime record');
          this.loading.set(false);
        }
      });
    }
  }

  validateForm(): boolean {
    if (!this.overtimeForm.employeeId && !this.isEditMode()) {
      this.notificationService.error('Please select an employee');
      return false;
    }
    if (!this.overtimeForm.overtimeDate) {
      this.notificationService.error('Please specify overtime date');
      return false;
    }
    if (!this.overtimeForm.startTime) {
      this.notificationService.error('Please specify start time');
      return false;
    }
    if (!this.overtimeForm.endTime) {
      this.notificationService.error('Please specify end time');
      return false;
    }
    if (!this.overtimeForm.hours) {
      this.notificationService.error('Please calculate hours');
      return false;
    }
    if (this.overtimeForm.hours <= 0) {
      this.notificationService.error('Hours must be greater than 0');
      return false;
    }
    if (this.overtimeForm.hours > 24) {
      this.notificationService.error('Hours cannot exceed 24 hours');
      return false;
    }
    if (!this.overtimeForm.rateMultiplier || this.overtimeForm.rateMultiplier < 1) {
      this.notificationService.error('Rate multiplier must be greater than or equal to 1.0');
      return false;
    }
    if (this.overtimeForm.rateMultiplier > 3) {
      this.notificationService.error('Rate multiplier should not exceed 3.0');
      return false;
    }
    return true;
  }

  openApprovalModal(record: OvertimeRecordDto): void {
    this.selectedRecord.set(record);
    this.approvalForm.reason = '';
    this.showApprovalModal.set(true);
  }

  approveRecord(record: OvertimeRecordDto): void {
    this.notificationService.confirm(
      'Do you want to approve this overtime record?',
      () => {
        this.loading.set(true);
        this.overtimeService.overtimeApproveOvertimeRecord(record.id).subscribe({
          next: (response: any) => {
            this.notificationService.success(response?.message || 'Successfully approved overtime record');
            this.loadOvertimeRecords();
            if (this.activeTab() === 'pending') {
              this.loadPendingRecords();
            }
          },
          error: (error) => {
            console.error('Error approving overtime:', error);
            this.notificationService.error(error.error?.message || 'Failed to approve overtime record');
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

    const rejectDto: OvertimeApprovalDto = {
      overtimeId: this.selectedRecord()!.id,
      isApproved: false,
      notes: this.approvalForm.reason
    };

    this.loading.set(true);
    this.overtimeService.overtimeRejectOvertimeRecord(this.selectedRecord()!.id, rejectDto).subscribe({
      next: (response: any) => {
        this.notificationService.success(response?.message || 'Successfully rejected overtime record');
        this.closeModal();
        this.loadOvertimeRecords();
        if (this.activeTab() === 'pending') {
          this.loadPendingRecords();
        }
      },
      error: (error) => {
        console.error('Error rejecting overtime:', error);
        this.notificationService.error(error.error?.message || 'Failed to reject overtime record');
        this.loading.set(false);
      }
    });
  }

  deleteRecord(record: OvertimeRecordDto): void {
    if (record.status === 'approved') {
      this.notificationService.error('Cannot delete approved records');
      return;
    }

    this.notificationService.confirm(
      'Do you want to delete this overtime record?',
      () => {
        this.loading.set(true);
        this.overtimeService.overtimeDeleteOvertimeRecord(record.id).subscribe({
          next: (response: any) => {
            this.notificationService.success(response?.message || 'Successfully deleted overtime record');
            this.loadOvertimeRecords();
            if (this.activeTab() === 'pending') {
              this.loadPendingRecords();
            }
          },
          error: (error) => {
            console.error('Error deleting overtime:', error);
            this.notificationService.error(error.error?.message || 'Failed to delete overtime record');
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

  formatTime(timeString: string): string {
    if (!timeString) return '-';
    return timeString.substring(0, 5);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
}

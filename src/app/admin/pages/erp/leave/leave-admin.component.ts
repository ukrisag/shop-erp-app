import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../../../services/openapi-client/api/leave.service';
import { EmployeesService } from '../../../../services/openapi-client/api/employees.service';
import { NotificationService } from '../../../../services/notification.service';
import {
  LeaveRecordCreateDto,
  LeaveRecordUpdateDto,
  LeaveApprovalDto,
  LeaveBalanceDto,
  EmployeeListDto
} from '../../../../services/openapi-client/model/models';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-admin.component.html',
  styleUrls: ['./leave-admin.component.css']
})
export class LeaveAdminComponent implements OnInit {
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
  leaveForm: any = {
    employeeId: null,
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    isPaid: true,
    reason: ''
  };

  // Approval form
  approvalForm = {
    reason: ''
  };

  // Balance filter
  balanceYear = new Date().getFullYear();

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
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
    this.loadLeaveRecords();
    this.setDefaultDates();
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
        this.notificationService.error('เกิดข้อผิดพลาดในการโหลดข้อมูลพนักงาน');
      }
    });
  }

  loadLeaveRecords(): void {
    this.loading.set(true);

    if (this.filterForm.startDate && this.filterForm.endDate) {
      this.leaveService.leaveGetLeaveRecordsByPeriod(
        this.filterForm.startDate,
        this.filterForm.endDate
      ).subscribe({
        next: (records: any[]) => {
          this.leaveRecords.set(records);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading leave records:', error);
          this.notificationService.error('เกิดข้อผิดพลาดในการโหลดข้อมูลการลา');
          this.loading.set(false);
        }
      });
    }
  }

  loadPendingRecords(): void {
    this.loading.set(true);
    this.leaveService.leaveGetPendingLeaveRecords().subscribe({
      next: (records: any[]) => {
        this.pendingRecords.set(records);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading pending records:', error);
        this.notificationService.error('เกิดข้อผิดพลาดในการโหลดรายการรออนุมัติ');
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
        this.notificationService.error('เกิดข้อผิดพลาดในการโหลดยอดวันลา');
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

  onLeaveTypeChange(): void {
    const selectedType = this.leaveTypes.find(t => t.value === this.leaveForm.leaveType);
    if (selectedType) {
      this.leaveForm.isPaid = selectedType.isPaid;
    }
  }

  calculateTotalDays(): number {
    if (this.leaveForm.startDate && this.leaveForm.endDate) {
      const start = new Date(this.leaveForm.startDate);
      const end = new Date(this.leaveForm.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.resetForm();
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  openEditModal(record: LeaveRecordDto): void {
    if (record.status !== 'pending') {
      this.notificationService.error('สามารถแก้ไขได้เฉพาะรายการที่รออนุมัติเท่านั้น');
      return;
    }

    this.isEditMode.set(true);
    this.selectedRecord.set(record);
    this.leaveForm = {
      employeeId: record.employeeId,
      leaveType: record.leaveType,
      startDate: record.startDate.split('T')[0],
      endDate: record.endDate.split('T')[0],
      isPaid: record.isPaid,
      reason: record.reason || ''
    };
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  resetForm(): void {
    this.leaveForm = {
      employeeId: null,
      leaveType: 'annual',
      startDate: '',
      endDate: '',
      isPaid: true,
      reason: ''
    };
  }

  saveLeaveRecord(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading.set(true);

    if (this.isEditMode()) {
      const updateDto: LeaveRecordUpdateDto = {
        leaveType: this.leaveForm.leaveType,
        startDate: this.leaveForm.startDate,
        endDate: this.leaveForm.endDate,
        isPaid: this.leaveForm.isPaid,
        reason: this.leaveForm.reason
      };

      this.leaveService.leaveUpdateLeaveRecord(this.selectedRecord()!.id, updateDto).subscribe({
        next: () => {
          this.notificationService.success('แก้ไขข้อมูลการลาสำเร็จ');
          this.loadLeaveRecords();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error updating leave:', error);
          this.notificationService.error('เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
          this.loading.set(false);
        }
      });
    } else {
      const createDto: LeaveRecordCreateDto = {
        employeeId: this.leaveForm.employeeId,
        leaveType: this.leaveForm.leaveType,
        startDate: this.leaveForm.startDate,
        endDate: this.leaveForm.endDate,
        isPaid: this.leaveForm.isPaid,
        reason: this.leaveForm.reason
      };

      this.leaveService.leaveCreateLeaveRecord(createDto).subscribe({
        next: () => {
          this.notificationService.success('บันทึกข้อมูลการลาสำเร็จ');
          this.loadLeaveRecords();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error creating leave:', error);
          this.notificationService.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
          this.loading.set(false);
        }
      });
    }
  }

  validateForm(): boolean {
    if (!this.leaveForm.employeeId && !this.isEditMode()) {
      this.notificationService.error('กรุณาเลือกพนักงาน');
      return false;
    }
    if (!this.leaveForm.leaveType) {
      this.notificationService.error('กรุณาเลือกประเภทการลา');
      return false;
    }
    if (!this.leaveForm.startDate || !this.leaveForm.endDate) {
      this.notificationService.error('กรุณาระบุวันที่เริ่มต้นและสิ้นสุด');
      return false;
    }
    if (new Date(this.leaveForm.endDate) < new Date(this.leaveForm.startDate)) {
      this.notificationService.error('วันที่สิ้นสุดต้องมากกว่าหรือเท่ากับวันที่เริ่มต้น');
      return false;
    }
    return true;
  }

  openApprovalModal(record: LeaveRecordDto): void {
    this.selectedRecord.set(record);
    this.approvalForm.reason = '';
    this.showApprovalModal.set(true);
  }

  approveRecord(record: LeaveRecordDto): void {
    this.notificationService.confirm(
      'ต้องการอนุมัติการลานี้ใช่หรือไม่?',
      () => {
        this.loading.set(true);
        this.leaveService.leaveApproveLeaveRecord(record.id).subscribe({
          next: () => {
            this.notificationService.success('อนุมัติการลาสำเร็จ');
            this.loadLeaveRecords();
            if (this.activeTab() === 'pending') {
              this.loadPendingRecords();
            }
          },
          error: (error) => {
            console.error('Error approving leave:', error);
            this.notificationService.error('เกิดข้อผิดพลาดในการอนุมัติ');
            this.loading.set(false);
          }
        });
      },
      undefined,
      'อนุมัติ',
      'ยกเลิก',
      'info'
    );
  }

  rejectRecord(): void {
    if (!this.approvalForm.reason) {
      this.notificationService.error('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }

    const rejectDto: LeaveApprovalDto = {
      leaveId: this.selectedRecord()!.id,
      isApproved: false,
      notes: this.approvalForm.reason
    };

    this.loading.set(true);
    this.leaveService.leaveRejectLeaveRecord(this.selectedRecord()!.id, rejectDto).subscribe({
      next: () => {
        this.notificationService.success('ปฏิเสธการลาสำเร็จ');
        this.closeModal();
        this.loadLeaveRecords();
        if (this.activeTab() === 'pending') {
          this.loadPendingRecords();
        }
      },
      error: (error) => {
        console.error('Error rejecting leave:', error);
        this.notificationService.error('เกิดข้อผิดพลาดในการปฏิเสธ');
        this.loading.set(false);
      }
    });
  }

  deleteRecord(record: LeaveRecordDto): void {
    if (record.status === 'approved') {
      this.notificationService.error('ไม่สามารถลบรายการที่อนุมัติแล้ว');
      return;
    }

    this.notificationService.confirm(
      'ต้องการลบรายการลานี้ใช่หรือไม่?',
      () => {
        this.loading.set(true);
        this.leaveService.leaveDeleteLeaveRecord(record.id).subscribe({
          next: () => {
            this.notificationService.success('ลบรายการลาสำเร็จ');
            this.loadLeaveRecords();
            if (this.activeTab() === 'pending') {
              this.loadPendingRecords();
            }
          },
          error: (error) => {
            console.error('Error deleting leave:', error);
            this.notificationService.error('เกิดข้อผิดพลาดในการลบรายการ');
            this.loading.set(false);
          }
        });
      },
      undefined,
      'ลบ',
      'ยกเลิก',
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
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

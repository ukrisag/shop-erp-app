import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingSkeletonComponent } from '../../../../components/shared/loading-skeleton/loading-skeleton.component';
import { PhoneAllowanceService } from '../../../../services/openapi-client/api/phoneAllowance.service';
import { EmployeesService } from '../../../../services/openapi-client/api/employees.service';
import { NotificationService } from '../../../../services/notification.service';
import { formatThaiDate } from '../../../../utils/thai-date.helper';
import {
  PhoneAllowanceDto,
  PhoneAllowanceCreateDto,
  PhoneAllowanceUpdateDto,
  PhoneAllowanceApprovalDto,
  EmployeeListDto
} from '../../../../services/openapi-client/model/models';

@Component({
  selector: 'app-phone-allowance-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSkeletonComponent],
  templateUrl: './phone-allowance-admin.component.html',
  styleUrls: ['./phone-allowance-admin.component.css']
})
export class PhoneAllowanceAdminComponent implements OnInit {
  // State signals
  activeTab = signal<'records' | 'pending'>('records');
  phoneAllowanceRecords = signal<PhoneAllowanceDto[]>([]);
  pendingRecords = signal<PhoneAllowanceDto[]>([]);
  employees = signal<EmployeeListDto[]>([]);
  loading = signal(false);

  // Filter state
  filterForm = {
    employeeId: null as number | null,
    year: null as number | null,
    month: null as number | null,
    status: 'all' as 'all' | 'pending' | 'approved' | 'rejected' | 'paid'
  };

  // Modal state
  showFormModal = signal(false);
  showApprovalModal = signal(false);
  selectedRecord = signal<PhoneAllowanceDto | null>(null);
  isEditMode = signal(false);

  // Form data
  phoneAllowanceForm: any = {
    employeeId: null,
    periodYear: new Date().getFullYear(),
    periodMonth: new Date().getMonth() + 1,
    amount: null,
    actualUsage: null,
    maxAllowance: null,
    billAttachment: '',
    notes: ''
  };

  // Approval form
  approvalForm = {
    reason: ''
  };

  // Computed values
  filteredRecords = computed(() => {
    let records = this.phoneAllowanceRecords();

    // Filter by status
    if (this.filterForm.status !== 'all') {
      records = records.filter(r => r.status === this.filterForm.status);
    }

    // Filter by employee
    if (this.filterForm.employeeId) {
      records = records.filter(r => r.employeeId === this.filterForm.employeeId);
    }

    // Filter by year
    if (this.filterForm.year) {
      records = records.filter(r => r.periodYear === this.filterForm.year);
    }

    // Filter by month
    if (this.filterForm.month) {
      records = records.filter(r => r.periodMonth === this.filterForm.month);
    }

    return records;
  });

  totalAmount = computed(() => {
    return this.filteredRecords().reduce((sum, record) => sum + (record.amount || 0), 0);
  });

  totalActualUsage = computed(() => {
    return this.filteredRecords().reduce((sum, record) => sum + (record.actualUsage || 0), 0);
  });

  // Year options (2020-2100)
  yearOptions: number[] = [];

  // Month names in Thai
  monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Expose Math for template
  Math = Math;

  constructor(
    private phoneAllowanceService: PhoneAllowanceService,
    private employeesService: EmployeesService,
    private notificationService: NotificationService
  ) {
    // Generate year options
    const currentYear = new Date().getFullYear();
    for (let year = 2020; year <= 2100; year++) {
      this.yearOptions.push(year);
    }
  }

  ngOnInit(): void {
    this.loadEmployees();
    this.loadPhoneAllowanceRecords();
  }

  loadEmployees(): void {
    this.employeesService.employeesGetAllEmployees().subscribe({
      next: (employees: any[]) => {
        this.employees.set(employees);
      },
      error: (error: any) => {
        console.error('Error loading employees:', error);
        this.notificationService.error(error.error?.message || 'ไม่สามารถโหลดข้อมูลพนักงานได้');
      }
    });
  }

  loadPhoneAllowanceRecords(): void {
    this.loading.set(true);
    this.phoneAllowanceService.phoneAllowanceGetAllPhoneAllowances().subscribe({
      next: (records: PhoneAllowanceDto[]) => {
        this.phoneAllowanceRecords.set(records);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading phone allowance records:', error);
        this.notificationService.error(error.error?.message || 'ไม่สามารถโหลดข้อมูลค่าโทรศัพท์ได้');
        this.loading.set(false);
      }
    });
  }

  loadPendingRecords(): void {
    this.loading.set(true);
    this.phoneAllowanceService.phoneAllowanceGetPendingPhoneAllowances().subscribe({
      next: (records: PhoneAllowanceDto[]) => {
        this.pendingRecords.set(records);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading pending records:', error);
        this.notificationService.error(error.error?.message || 'ไม่สามารถโหลดรายการรออนุมัติได้');
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
    this.loadPhoneAllowanceRecords();
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.resetForm();
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  openEditModal(record: PhoneAllowanceDto): void {
    if (record.status !== 'pending') {
      this.notificationService.error('สามารถแก้ไขได้เฉพาะรายการที่รออนุมัติเท่านั้น');
      return;
    }

    this.isEditMode.set(true);
    this.selectedRecord.set(record);
    this.phoneAllowanceForm = {
      employeeId: record.employeeId,
      periodYear: record.periodYear,
      periodMonth: record.periodMonth,
      amount: record.amount,
      actualUsage: record.actualUsage,
      maxAllowance: record.maxAllowance,
      billAttachment: record.billAttachment || '',
      notes: record.notes || ''
    };
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  resetForm(): void {
    const currentDate = new Date();
    this.phoneAllowanceForm = {
      employeeId: null,
      periodYear: currentDate.getFullYear(),
      periodMonth: currentDate.getMonth() + 1,
      amount: null,
      actualUsage: null,
      maxAllowance: null,
      billAttachment: '',
      notes: ''
    };
  }

  savePhoneAllowanceRecord(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading.set(true);

    if (this.isEditMode()) {
      const updateDto: PhoneAllowanceUpdateDto = {
        amount: this.phoneAllowanceForm.amount,
        actualUsage: this.phoneAllowanceForm.actualUsage,
        maxAllowance: this.phoneAllowanceForm.maxAllowance,
        billAttachment: this.phoneAllowanceForm.billAttachment,
        notes: this.phoneAllowanceForm.notes
      };

      this.phoneAllowanceService.phoneAllowanceUpdatePhoneAllowance(this.selectedRecord()!.id!, updateDto).subscribe({
        next: (response: any) => {
          this.notificationService.success(response?.message || 'แก้ไขข้อมูลค่าโทรศัพท์สำเร็จ');
          this.closeModal();
          this.loadPhoneAllowanceRecords();
          if (this.activeTab() === 'pending') {
            this.loadPendingRecords();
          }
        },
        error: (error: any) => {
          console.error('Error updating phone allowance:', error);
          this.notificationService.error(error.error?.message || 'ไม่สามารถแก้ไขข้อมูลค่าโทรศัพท์ได้');
          this.loading.set(false);
        }
      });
    } else {
      const createDto: PhoneAllowanceCreateDto = {
        employeeId: this.phoneAllowanceForm.employeeId,
        periodYear: this.phoneAllowanceForm.periodYear,
        periodMonth: this.phoneAllowanceForm.periodMonth,
        amount: this.phoneAllowanceForm.amount,
        actualUsage: this.phoneAllowanceForm.actualUsage,
        maxAllowance: this.phoneAllowanceForm.maxAllowance,
        billAttachment: this.phoneAllowanceForm.billAttachment,
        notes: this.phoneAllowanceForm.notes
      };

      this.phoneAllowanceService.phoneAllowanceCreatePhoneAllowance(createDto).subscribe({
        next: (response: any) => {
          this.notificationService.success(response?.message || 'เพิ่มข้อมูลค่าโทรศัพท์สำเร็จ');
          this.closeModal();
          this.loadPhoneAllowanceRecords();
          if (this.activeTab() === 'pending') {
            this.loadPendingRecords();
          }
        },
        error: (error: any) => {
          console.error('Error creating phone allowance:', error);
          this.notificationService.error(error.error?.message || 'ไม่สามารถเพิ่มข้อมูลค่าโทรศัพท์ได้');
          this.loading.set(false);
        }
      });
    }
  }

  validateForm(): boolean {
    if (!this.phoneAllowanceForm.employeeId && !this.isEditMode()) {
      this.notificationService.error('กรุณาเลือกพนักงาน');
      return false;
    }
    if (!this.phoneAllowanceForm.periodYear) {
      this.notificationService.error('กรุณาระบุปี');
      return false;
    }
    if (!this.phoneAllowanceForm.periodMonth || this.phoneAllowanceForm.periodMonth < 1 || this.phoneAllowanceForm.periodMonth > 12) {
      this.notificationService.error('กรุณาระบุเดือน 1-12');
      return false;
    }
    if (!this.phoneAllowanceForm.amount || this.phoneAllowanceForm.amount < 0) {
      this.notificationService.error('กรุณาระบุจำนวนเงินที่ถูกต้อง');
      return false;
    }
    if (this.phoneAllowanceForm.actualUsage !== null && this.phoneAllowanceForm.actualUsage < 0) {
      this.notificationService.error('กรุณาระบุค่าใช้จ่ายจริงที่ถูกต้อง');
      return false;
    }
    if (this.phoneAllowanceForm.maxAllowance !== null && this.phoneAllowanceForm.maxAllowance < 0) {
      this.notificationService.error('กรุณาระบุวงเงินสูงสุดที่ถูกต้อง');
      return false;
    }
    if (this.phoneAllowanceForm.maxAllowance && this.phoneAllowanceForm.amount > this.phoneAllowanceForm.maxAllowance) {
      this.notificationService.error('จำนวนเงินเกินวงเงินสูงสุดที่กำหนด');
      return false;
    }
    return true;
  }

  openApprovalModal(record: PhoneAllowanceDto): void {
    this.selectedRecord.set(record);
    this.approvalForm.reason = '';
    this.showApprovalModal.set(true);
  }

  approveRecord(record: PhoneAllowanceDto): void {
    // Check if amount exceeds maxAllowance
    if (record.maxAllowance && (record.amount || 0) > record.maxAllowance) {
      this.notificationService.confirm(
        `จำนวนเงิน ${this.formatCurrency(record.amount)} ฿ เกินวงเงินสูงสุด ${this.formatCurrency(record.maxAllowance)} ฿ ต้องการอนุมัติหรือไม่?`,
        () => {
          this.executeApproval(record);
        },
        undefined,
        'อนุมัติ',
        'ยกเลิก',
        'warning'
      );
    } else {
      this.notificationService.confirm(
        'ต้องการอนุมัติรายการค่าโทรศัพท์นี้หรือไม่?',
        () => {
          this.executeApproval(record);
        },
        undefined,
        'อนุมัติ',
        'ยกเลิก',
        'info'
      );
    }
  }

  executeApproval(record: PhoneAllowanceDto): void {
    this.loading.set(true);
    this.phoneAllowanceService.phoneAllowanceApprovePhoneAllowance(record.id!).subscribe({
      next: (response: any) => {
        this.notificationService.success(response?.message || 'อนุมัติรายการค่าโทรศัพท์สำเร็จ');
        this.loadPhoneAllowanceRecords();
        if (this.activeTab() === 'pending') {
          this.loadPendingRecords();
        }
      },
      error: (error: any) => {
        console.error('Error approving phone allowance:', error);
        this.notificationService.error(error.error?.message || 'ไม่สามารถอนุมัติรายการค่าโทรศัพท์ได้');
        this.loading.set(false);
      }
    });
  }

  rejectRecord(): void {
    if (!this.approvalForm.reason) {
      this.notificationService.error('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }

    const rejectDto: PhoneAllowanceApprovalDto = {
      notes: this.approvalForm.reason
    };

    this.loading.set(true);
    this.phoneAllowanceService.phoneAllowanceRejectPhoneAllowance(this.selectedRecord()!.id!, rejectDto).subscribe({
      next: (response: any) => {
        this.notificationService.success(response?.message || 'ปฏิเสธรายการค่าโทรศัพท์สำเร็จ');
        this.closeModal();
        this.loadPhoneAllowanceRecords();
        if (this.activeTab() === 'pending') {
          this.loadPendingRecords();
        }
      },
      error: (error: any) => {
        console.error('Error rejecting phone allowance:', error);
        this.notificationService.error(error.error?.message || 'ไม่สามารถปฏิเสธรายการค่าโทรศัพท์ได้');
        this.loading.set(false);
      }
    });
  }

  deleteRecord(record: PhoneAllowanceDto): void {
    if (record.status === 'paid') {
      this.notificationService.error('ไม่สามารถลบรายการที่จ่ายแล้ว');
      return;
    }

    this.notificationService.confirm(
      'ต้องการลบรายการค่าโทรศัพท์นี้หรือไม่?',
      () => {
        this.loading.set(true);
        this.phoneAllowanceService.phoneAllowanceDeletePhoneAllowance(record.id!).subscribe({
          next: (response: any) => {
            this.notificationService.success(response?.message || 'ลบรายการค่าโทรศัพท์สำเร็จ');
            this.loadPhoneAllowanceRecords();
            if (this.activeTab() === 'pending') {
              this.loadPendingRecords();
            }
          },
          error: (error: any) => {
            console.error('Error deleting phone allowance:', error);
            this.notificationService.error(error.error?.message || 'ไม่สามารถลบรายการค่าโทรศัพท์ได้');
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
      'paid': 'จ่ายแล้ว'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: any = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-blue-100 text-blue-800',
      'rejected': 'bg-red-100 text-red-800',
      'paid': 'bg-green-100 text-green-800'
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

  getMonthName(monthNumber: number): string {
    if (monthNumber < 1 || monthNumber > 12) return '-';
    return this.monthNames[monthNumber - 1];
  }

  calculateUsagePercentage(record: PhoneAllowanceDto): number {
    if (!record.maxAllowance || record.maxAllowance <= 0) return 0;
    const actualUsage = record.actualUsage || 0;
    return Math.round((actualUsage / record.maxAllowance) * 100);
  }

  getUsageColor(percentage: number): string {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 90) return 'bg-orange-500';
    if (percentage >= 75) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  }

  isAmountExceedingLimit(record: PhoneAllowanceDto): boolean {
    if (!record.maxAllowance) return false;
    return (record.amount || 0) > record.maxAllowance;
  }
}

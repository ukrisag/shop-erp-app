import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingSkeletonComponent } from '../../../../components/shared/loading-skeleton/loading-skeleton.component';
import { PassportFeeService } from '../../../../services/openapi-client/api/passportFee.service';
import { EmployeesService } from '../../../../services/openapi-client/api/employees.service';
import { BranchesService } from '../../../../services/openapi-client/api/branches.service';
import { NotificationService } from '../../../../services/notification.service';
import { formatThaiDate } from '../../../../utils/thai-date.helper';
import {
  PassportFeeDto,
  PassportFeeCreateDto,
  PassportFeeUpdateDto,
  EmployeeListDto
} from '../../../../services/openapi-client/model/models';

interface BranchDto {
  id: number;
  name: string;
  code?: string;
}

@Component({
  selector: 'app-passport-fee-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSkeletonComponent],
  templateUrl: './passport-fee-admin.component.html',
  styleUrls: ['./passport-fee-admin.component.css']
})
export class PassportFeeAdminComponent implements OnInit {
  // State signals
  activeTab = signal<'all' | 'active'>('all');
  passportFees = signal<PassportFeeDto[]>([]);
  activeRecords = signal<PassportFeeDto[]>([]);
  employees = signal<EmployeeListDto[]>([]);
  branches = signal<BranchDto[]>([]);
  loading = signal(false);

  // Filter state
  filterForm = {
    employeeId: null as number | null,
    branchId: null as number | null,
    year: null as number | null,
    status: 'all' as 'all' | 'active' | 'completed' | 'cancelled'
  };

  // Modal state
  showFormModal = signal(false);
  selectedRecord = signal<PassportFeeDto | null>(null);
  isEditMode = signal(false);

  // Form data
  passportFeeForm: any = {
    employeeId: null,
    branchId: null,
    year: new Date().getFullYear(),
    totalAmount: null,
    totalInstallments: 12,
    startMonth: 1,
    notes: ''
  };

  // Computed values
  filteredRecords = computed(() => {
    let records = this.activeTab() === 'all' ? this.passportFees() : this.activeRecords();

    // Filter by status
    if (this.filterForm.status !== 'all') {
      records = records.filter(r => r.status === this.filterForm.status);
    }

    // Filter by employee
    if (this.filterForm.employeeId) {
      records = records.filter(r => r.employeeId === this.filterForm.employeeId);
    }

    // Filter by branch
    if (this.filterForm.branchId) {
      records = records.filter(r => r.branchId === this.filterForm.branchId);
    }

    // Filter by year
    if (this.filterForm.year) {
      records = records.filter(r => r.year === this.filterForm.year);
    }

    return records;
  });

  totalActiveAmount = computed(() => {
    const activeRecords = this.filteredRecords().filter(r => r.status === 'active');
    return activeRecords.reduce((sum, record) => sum + (record.totalAmount || 0), 0);
  });

  totalRemainingBalance = computed(() => {
    const activeRecords = this.filteredRecords().filter(r => r.status === 'active');
    return activeRecords.reduce((sum, record) => sum + (record.remainingBalance || 0), 0);
  });

  totalMonthlyDeductions = computed(() => {
    const activeRecords = this.filteredRecords().filter(r => r.status === 'active');
    return activeRecords.reduce((sum, record) => sum + (record.monthlyDeduction || 0), 0);
  });

  // Computed for estimated monthly deduction
  estimatedMonthlyDeduction = computed(() => {
    if (this.passportFeeForm.totalAmount && this.passportFeeForm.totalInstallments && this.passportFeeForm.totalInstallments > 0) {
      return Math.round((this.passportFeeForm.totalAmount / this.passportFeeForm.totalInstallments) * 100) / 100;
    }
    return 0;
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
    private passportFeeService: PassportFeeService,
    private employeesService: EmployeesService,
    private branchesService: BranchesService,
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
    this.loadBranches();
    this.loadPassportFees();
  }

  loadEmployees(): void {
    this.employeesService.employeesGetAllEmployees().subscribe({
      next: (employees: any[]) => {
        // Filter เฉพาะพนักงานต่างด้าว (ไม่ใช่สัญชาติไทย)
        const foreignEmployees = employees.filter(emp => {
          const nationality = (emp.nationality || '').toLowerCase();
          return nationality !== 'thai' && nationality !== 'ไทย' && nationality !== '';
        });
        this.employees.set(foreignEmployees);
      },
      error: (error: any) => {
        console.error('Error loading employees:', error);
        this.notificationService.error(error.error?.message || 'ไม่สามารถโหลดข้อมูลพนักงานได้');
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
        this.notificationService.error(error.error?.message || 'ไม่สามารถโหลดข้อมูลสาขาได้');
      }
    });
  }

  loadPassportFees(): void {
    this.loading.set(true);
    this.passportFeeService.passportFeeGetAllPassportFees().subscribe({
      next: (records: PassportFeeDto[]) => {
        this.passportFees.set(records);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading passport fee records:', error);
        this.notificationService.error(error.error?.message || 'ไม่สามารถโหลดข้อมูล Passport Fee ได้');
        this.loading.set(false);
      }
    });
  }

  loadActiveRecords(): void {
    this.loading.set(true);
    this.passportFeeService.passportFeeGetActivePassportFees().subscribe({
      next: (records: PassportFeeDto[]) => {
        this.activeRecords.set(records);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading active records:', error);
        this.notificationService.error(error.error?.message || 'ไม่สามารถโหลดข้อมูล Passport Fee ที่ใช้งานได้');
        this.loading.set(false);
      }
    });
  }

  switchTab(tab: 'all' | 'active'): void {
    this.activeTab.set(tab);
    if (tab === 'active') {
      this.loadActiveRecords();
    } else {
      this.loadPassportFees();
    }
  }

  applyFilters(): void {
    // Filters are computed, so just trigger a refresh
    if (this.activeTab() === 'all') {
      this.loadPassportFees();
    } else {
      this.loadActiveRecords();
    }
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.resetForm();
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  openEditModal(record: PassportFeeDto): void {
    if (record.status !== 'active') {
      this.notificationService.error('สามารถแก้ไขได้เฉพาะรายการที่มีสถานะ "ใช้งาน" เท่านั้น');
      return;
    }

    if ((record.installmentCount || 0) > 0) {
      this.notificationService.error('ไม่สามารถแก้ไขรายการที่เริ่มหักแล้ว');
      return;
    }

    this.isEditMode.set(true);
    this.selectedRecord.set(record);
    this.passportFeeForm = {
      employeeId: record.employeeId,
      branchId: record.branchId,
      year: record.year,
      totalAmount: record.totalAmount,
      totalInstallments: record.totalInstallments,
      startMonth: record.startMonth,
      notes: record.notes || ''
    };
    this.loading.set(false);
    this.showFormModal.set(true);
  }

  resetForm(): void {
    this.passportFeeForm = {
      employeeId: null,
      branchId: null,
      year: new Date().getFullYear(),
      totalAmount: null,
      totalInstallments: 12,
      startMonth: 1,
      notes: ''
    };
  }

  onEmployeeChange(): void {
    // Auto-fill branch from employee
    if (this.passportFeeForm.employeeId) {
      const employee = this.employees().find(e => e.id === this.passportFeeForm.employeeId);
      if (employee && employee.branchId) {
        this.passportFeeForm.branchId = employee.branchId;
      }
    }
  }

  savePassportFee(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading.set(true);

    if (this.isEditMode()) {
      const updateDto: PassportFeeUpdateDto = {
        totalAmount: this.passportFeeForm.totalAmount,
        totalInstallments: this.passportFeeForm.totalInstallments,
        notes: this.passportFeeForm.notes
      };

      this.passportFeeService.passportFeeUpdatePassportFee(this.selectedRecord()!.id!, updateDto).subscribe({
        next: (response: any) => {
          this.notificationService.success('แก้ไขข้อมูล Passport Fee สำเร็จ');
          this.closeModal();
          this.loadPassportFees();
          if (this.activeTab() === 'active') {
            this.loadActiveRecords();
          }
        },
        error: (error: any) => {
          console.error('Error updating passport fee:', error);
          this.notificationService.error(error.error?.message || 'ไม่สามารถแก้ไขข้อมูล Passport Fee ได้');
          this.loading.set(false);
        }
      });
    } else {
      const createDto: PassportFeeCreateDto = {
        employeeId: this.passportFeeForm.employeeId,
        branchId: this.passportFeeForm.branchId,
        year: this.passportFeeForm.year,
        totalAmount: this.passportFeeForm.totalAmount,
        totalInstallments: this.passportFeeForm.totalInstallments,
        startMonth: this.passportFeeForm.startMonth,
        notes: this.passportFeeForm.notes
      };

      this.passportFeeService.passportFeeCreatePassportFee(createDto).subscribe({
        next: (response: any) => {
          this.notificationService.success('เพิ่มข้อมูล Passport Fee สำเร็จ');
          this.closeModal();
          this.loadPassportFees();
          if (this.activeTab() === 'active') {
            this.loadActiveRecords();
          }
        },
        error: (error: any) => {
          console.error('Error creating passport fee:', error);
          this.notificationService.error(error.error?.message || 'ไม่สามารถเพิ่มข้อมูล Passport Fee ได้');
          this.loading.set(false);
        }
      });
    }
  }

  validateForm(): boolean {
    if (!this.passportFeeForm.employeeId && !this.isEditMode()) {
      this.notificationService.error('กรุณาเลือกพนักงาน');
      return false;
    }
    if (!this.passportFeeForm.branchId && !this.isEditMode()) {
      this.notificationService.error('กรุณาเลือกสาขา');
      return false;
    }
    if (!this.passportFeeForm.year) {
      this.notificationService.error('กรุณาระบุปี');
      return false;
    }
    if (this.passportFeeForm.year < 2020 || this.passportFeeForm.year > 2100) {
      this.notificationService.error('กรุณาระบุปีระหว่าง 2020-2100');
      return false;
    }
    if (!this.passportFeeForm.totalAmount || this.passportFeeForm.totalAmount <= 0) {
      this.notificationService.error('กรุณาระบุยอดรวมที่ถูกต้อง');
      return false;
    }
    if (!this.passportFeeForm.totalInstallments || this.passportFeeForm.totalInstallments < 1 || this.passportFeeForm.totalInstallments > 24) {
      this.notificationService.error('กรุณาระบุจำนวนงวด 1-24 งวด');
      return false;
    }
    if (!this.passportFeeForm.startMonth || this.passportFeeForm.startMonth < 1 || this.passportFeeForm.startMonth > 12) {
      this.notificationService.error('กรุณาระบุเดือนที่เริ่มหัก 1-12');
      return false;
    }
    return true;
  }

  cancelPassportFee(record: PassportFeeDto): void {
    if (record.status !== 'active') {
      this.notificationService.error('สามารถยกเลิกได้เฉพาะรายการที่มีสถานะ "ใช้งาน" เท่านั้น');
      return;
    }

    this.notificationService.confirm(
      'ต้องการยกเลิกรายการ Passport Fee นี้หรือไม่?',
      () => {
        this.loading.set(true);
        this.passportFeeService.passportFeeCancelPassportFee(record.id!).subscribe({
          next: (response: any) => {
            this.notificationService.success('ยกเลิกรายการ Passport Fee สำเร็จ');
            this.loadPassportFees();
            if (this.activeTab() === 'active') {
              this.loadActiveRecords();
            }
          },
          error: (error: any) => {
            console.error('Error cancelling passport fee:', error);
            this.notificationService.error(error.error?.message || 'ไม่สามารถยกเลิกรายการ Passport Fee ได้');
            this.loading.set(false);
          }
        });
      },
      undefined,
      'ยกเลิกรายการ',
      'ปิด',
      'warning'
    );
  }

  deletePassportFee(record: PassportFeeDto): void {
    if (record.status === 'active' && (record.installmentCount || 0) > 0) {
      this.notificationService.error('ไม่สามารถลบรายการที่เริ่มหักแล้ว');
      return;
    }

    this.notificationService.confirm(
      'ต้องการลบรายการ Passport Fee นี้หรือไม่?',
      () => {
        this.loading.set(true);
        this.passportFeeService.passportFeeDeletePassportFee(record.id!).subscribe({
          next: (response: any) => {
            this.notificationService.success('ลบรายการ Passport Fee สำเร็จ');
            this.loadPassportFees();
            if (this.activeTab() === 'active') {
              this.loadActiveRecords();
            }
          },
          error: (error: any) => {
            console.error('Error deleting passport fee:', error);
            this.notificationService.error(error.error?.message || 'ไม่สามารถลบรายการ Passport Fee ได้');
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
    this.selectedRecord.set(null);
    this.resetForm();
    this.loading.set(false);
  }

  getStatusText(status: string): string {
    const statusMap: any = {
      'active': 'ใช้งาน',
      'completed': 'เสร็จสิ้น',
      'cancelled': 'ยกเลิก'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: any = {
      'active': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
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

  calculateProgress(record: PassportFeeDto): number {
    const totalInstallments = record.totalInstallments ?? 0;
    const installmentCount = record.installmentCount ?? 0;
    if (totalInstallments <= 0) return 0;
    return Math.round((installmentCount / totalInstallments) * 100);
  }

  getProgressColor(progress: number): string {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  }

  getMonthName(monthNumber: number): string {
    if (monthNumber < 1 || monthNumber > 12) return '-';
    return this.monthNames[monthNumber - 1];
  }
}

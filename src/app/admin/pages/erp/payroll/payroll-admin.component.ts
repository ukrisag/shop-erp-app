import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollPeriodsService, PayrollRecordsService, BranchesService, EmployeesService } from '../../../../services/openapi-client';
import {
  PayrollPeriodDto,
  CreatePayrollPeriodDto,
  UpdatePayrollPeriodDto,
  PayrollRecordDto,
  CreatePayrollRecordDto,
  UpdatePayrollRecordDto,
  BranchDto,
  EmployeeDto
} from '../../../../services/openapi-client/model/models';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-payroll-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payroll-admin.component.html',
  styleUrls: ['./payroll-admin.component.css']
})
export class PayrollAdminComponent implements OnInit {
  // Data
  periods = signal<PayrollPeriodDto[]>([]);
  filteredPeriods = signal<PayrollPeriodDto[]>([]);
  records = signal<PayrollRecordDto[]>([]);
  filteredRecords = signal<PayrollRecordDto[]>([]);
  branches = signal<BranchDto[]>([]);
  employees = signal<EmployeeDto[]>([]);
  loading = signal(true);

  // Active tab
  activeTab = signal<'periods' | 'records'>('periods');

  // Selected period
  selectedPeriod = signal<PayrollPeriodDto | null>(null);

  // Filters - Periods
  periodSearchTerm = signal('');
  selectedPeriodBranch = signal<string>('');
  selectedPeriodStatus = signal<string>('');

  // Filters - Records
  recordSearchTerm = signal('');

  // Modals
  showPeriodModal = signal(false);
  showRecordModal = signal(false);
  showDeletePeriodModal = signal(false);
  showDeleteRecordModal = signal(false);
  isEditMode = signal(false);
  selectedPeriodForEdit = signal<PayrollPeriodDto | null>(null);
  selectedRecord = signal<PayrollRecordDto | null>(null);

  // Forms
  periodForm: any = {
    branchId: null,
    periodName: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    status: 'draft'
  };

  recordForm: any = {
    payrollPeriodId: null,
    userId: null,
    baseSalary: 0,
    commission: 0,
    overtimeHours: 0,
    overtimeAmount: 0,
    bonus: 0,
    advancePayment: 0,
    previousDebt: 0,
    socialSecurity: 0,
    monthlyDebt: 0,
    phoneBill: 0,
    otherDeductions: 0,
    paymentDate: '',
    paymentMethod: 'transfer',
    notes: ''
  };

  // Pagination
  currentPeriodPage = signal(1);
  currentRecordPage = signal(1);
  itemsPerPage = signal(10);

  periodStatuses = [
    { value: 'draft', label: 'ฉบับร่าง' },
    { value: 'approved', label: 'อนุมัติแล้ว' },
    { value: 'paid', label: 'จ่ายแล้ว' }
  ];

  paymentMethods = [
    { value: 'cash', label: 'เงินสด' },
    { value: 'transfer', label: 'โอนเงิน' },
    { value: 'check', label: 'เช็ค' }
  ];

  Math = Math;

  constructor(
    private periodsService: PayrollPeriodsService,
    private recordsService: PayrollRecordsService,
    private branchesService: BranchesService,
    private employeesService: EmployeesService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadPeriods();
    this.loadBranches();
    this.loadEmployees();
  }

  loadPeriods(): void {
    this.loading.set(true);
    this.periodsService.apiErpPayrollPeriodsGet().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.periods.set(response.data);
          this.applyPeriodFilters();
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading periods:', error);
        this.loading.set(false);
      }
    });
  }

  loadRecords(periodId: number): void {
    this.recordsService.apiErpPayrollRecordsGet().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const allRecords = response.data as PayrollRecordDto[];
          const filtered = allRecords.filter(r => r.payrollPeriodId === periodId);
          this.records.set(filtered);
          this.applyRecordFilters();
        }
      },
      error: (error: any) => {
        console.error('Error loading records:', error);
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
      error: (error: any) => {
        console.error('Error loading branches:', error);
      }
    });
  }

  loadEmployees(): void {
    this.employeesService.apiErpEmployeesGet().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.employees.set(response.data);
        }
      },
      error: (error: any) => {
        console.error('Error loading employees:', error);
      }
    });
  }

  // Period Filters
  applyPeriodFilters(): void {
    let filtered = [...this.periods()];

    const search = this.periodSearchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(p =>
        p.periodName?.toLowerCase().includes(search)
      );
    }

    if (this.selectedPeriodBranch()) {
      filtered = filtered.filter(p => p.branchId?.toString() === this.selectedPeriodBranch());
    }

    if (this.selectedPeriodStatus()) {
      filtered = filtered.filter(p => p.status === this.selectedPeriodStatus());
    }

    this.filteredPeriods.set(filtered);
    this.currentPeriodPage.set(1);
  }

  onPeriodSearchChange(value: string): void {
    this.periodSearchTerm.set(value);
    this.applyPeriodFilters();
  }

  onPeriodBranchFilterChange(value: string): void {
    this.selectedPeriodBranch.set(value);
    this.applyPeriodFilters();
  }

  onPeriodStatusFilterChange(value: string): void {
    this.selectedPeriodStatus.set(value);
    this.applyPeriodFilters();
  }

  // Record Filters
  applyRecordFilters(): void {
    let filtered = [...this.records()];

    const search = this.recordSearchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(r =>
        r.employeeName?.toLowerCase().includes(search) ||
        r.employeeCode?.toLowerCase().includes(search) ||
        r.position?.toLowerCase().includes(search)
      );
    }

    this.filteredRecords.set(filtered);
    this.currentRecordPage.set(1);
  }

  onRecordSearchChange(value: string): void {
    this.recordSearchTerm.set(value);
    this.applyRecordFilters();
  }

  switchTab(tab: 'periods' | 'records'): void {
    this.activeTab.set(tab);
  }

  selectPeriod(period: PayrollPeriodDto): void {
    this.selectedPeriod.set(period);
    this.loadRecords(period.id!);
    this.switchTab('records');
  }

  // Period CRUD
  openAddPeriodModal(): void {
    this.isEditMode.set(false);
    this.selectedPeriodForEdit.set(null);
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.periodForm = {
      branchId: null,
      periodName: `เงินเดือนประจำเดือน ${this.getThaiMonth(now.getMonth() + 1)} ${now.getFullYear() + 543}`,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
      status: 'draft'
    };
    this.showPeriodModal.set(true);
  }

  openEditPeriodModal(period: PayrollPeriodDto): void {
    this.isEditMode.set(true);
    this.selectedPeriodForEdit.set(period);
    this.periodForm = {
      branchId: period.branchId,
      periodName: period.periodName,
      month: period.month,
      year: period.year,
      startDate: period.startDate?.split('T')[0],
      endDate: period.endDate?.split('T')[0],
      status: period.status
    };
    this.showPeriodModal.set(true);
  }

  openDeletePeriodModal(period: PayrollPeriodDto): void {
    this.selectedPeriodForEdit.set(period);
    this.showDeletePeriodModal.set(true);
  }

  savePeriod(): void {
    if (this.isEditMode()) {
      this.updatePeriod();
    } else {
      this.createPeriod();
    }
  }

  createPeriod(): void {
    const dto: CreatePayrollPeriodDto = this.periodForm;

    this.periodsService.apiErpPayrollPeriodsPost(dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadPeriods();
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error creating period:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการสร้างงวดเงินเดือน');
      }
    });
  }

  updatePeriod(): void {
    const period = this.selectedPeriodForEdit();
    if (!period) return;

    const dto: UpdatePayrollPeriodDto = this.periodForm;

    this.periodsService.apiErpPayrollPeriodsIdPut(period.id!, dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadPeriods();
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error updating period:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการอัปเดตงวดเงินเดือน');
      }
    });
  }

  deletePeriod(): void {
    const period = this.selectedPeriodForEdit();
    if (!period) return;

    this.periodsService.apiErpPayrollPeriodsIdDelete(period.id!).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadPeriods();
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error deleting period:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการลบงวดเงินเดือน');
      }
    });
  }

  // Record CRUD
  openAddRecordModal(): void {
    const period = this.selectedPeriod();
    if (!period) return;

    this.isEditMode.set(false);
    this.selectedRecord.set(null);
    this.recordForm = {
      payrollPeriodId: period.id,
      userId: null,
      baseSalary: 0,
      commission: 0,
      overtimeHours: 0,
      overtimeAmount: 0,
      bonus: 0,
      advancePayment: 0,
      previousDebt: 0,
      socialSecurity: 0,
      monthlyDebt: 0,
      phoneBill: 0,
      otherDeductions: 0,
      paymentDate: '',
      paymentMethod: 'transfer',
      notes: ''
    };
    this.showRecordModal.set(true);
  }

  openEditRecordModal(record: PayrollRecordDto): void {
    this.isEditMode.set(true);
    this.selectedRecord.set(record);
    this.recordForm = {
      payrollPeriodId: record.payrollPeriodId,
      userId: record.userId,
      baseSalary: record.baseSalary,
      commission: record.commission,
      overtimeHours: record.overtimeHours,
      overtimeAmount: record.overtimeAmount,
      bonus: record.bonus,
      advancePayment: record.advancePayment,
      previousDebt: record.previousDebt,
      socialSecurity: record.socialSecurity,
      monthlyDebt: record.monthlyDebt,
      phoneBill: record.phoneBill,
      otherDeductions: record.otherDeductions,
      paymentDate: record.paymentDate?.split('T')[0] || '',
      paymentMethod: record.paymentMethod || 'transfer',
      notes: record.notes || ''
    };
    this.showRecordModal.set(true);
  }

  openDeleteRecordModal(record: PayrollRecordDto): void {
    this.selectedRecord.set(record);
    this.showDeleteRecordModal.set(true);
  }

  saveRecord(): void {
    if (this.isEditMode()) {
      this.updateRecord();
    } else {
      this.createRecord();
    }
  }

  createRecord(): void {
    const dto: CreatePayrollRecordDto = this.recordForm;

    this.recordsService.apiErpPayrollRecordsPost(dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          const period = this.selectedPeriod();
          if (period) {
            this.loadRecords(period.id!);
            this.loadPeriods(); // Reload to update totals
          }
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error creating record:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการสร้างรายการเงินเดือน');
      }
    });
  }

  updateRecord(): void {
    const record = this.selectedRecord();
    if (!record) return;

    const dto: UpdatePayrollRecordDto = this.recordForm;

    this.recordsService.apiErpPayrollRecordsIdPut(record.id!, dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          const period = this.selectedPeriod();
          if (period) {
            this.loadRecords(period.id!);
            this.loadPeriods(); // Reload to update totals
          }
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error updating record:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการอัปเดตรายการเงินเดือน');
      }
    });
  }

  deleteRecord(): void {
    const record = this.selectedRecord();
    if (!record) return;

    this.recordsService.apiErpPayrollRecordsIdDelete(record.id!).subscribe({
      next: (response: any) => {
        if (response.success) {
          const period = this.selectedPeriod();
          if (period) {
            this.loadRecords(period.id!);
            this.loadPeriods(); // Reload to update totals
          }
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error deleting record:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการลบรายการเงินเดือน');
      }
    });
  }

  closeModals(): void {
    this.showPeriodModal.set(false);
    this.showRecordModal.set(false);
    this.showDeletePeriodModal.set(false);
    this.showDeleteRecordModal.set(false);
  }

  // Helpers - Periods
  getPaginatedPeriods(): PayrollPeriodDto[] {
    const start = (this.currentPeriodPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredPeriods().slice(start, end);
  }

  getTotalPeriodPages(): number {
    return Math.ceil(this.filteredPeriods().length / this.itemsPerPage());
  }

  nextPeriodPage(): void {
    if (this.currentPeriodPage() < this.getTotalPeriodPages()) {
      this.currentPeriodPage.update(page => page + 1);
    }
  }

  previousPeriodPage(): void {
    if (this.currentPeriodPage() > 1) {
      this.currentPeriodPage.update(page => page - 1);
    }
  }

  // Helpers - Records
  getPaginatedRecords(): PayrollRecordDto[] {
    const start = (this.currentRecordPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredRecords().slice(start, end);
  }

  getTotalRecordPages(): number {
    return Math.ceil(this.filteredRecords().length / this.itemsPerPage());
  }

  nextRecordPage(): void {
    if (this.currentRecordPage() < this.getTotalRecordPages()) {
      this.currentRecordPage.update(page => page + 1);
    }
  }

  previousRecordPage(): void {
    if (this.currentRecordPage() > 1) {
      this.currentRecordPage.update(page => page - 1);
    }
  }

  getTotalRecordsNetSalary(): number {
    return this.filteredRecords().reduce((sum, r) => sum + (r.netSalary || 0), 0);
  }

  calculateTotalEarnings(): number {
    const form = this.recordForm;
    return (form.baseSalary || 0) + (form.commission || 0) + (form.overtimeAmount || 0) + (form.bonus || 0);
  }

  calculateTotalDeductions(): number {
    const form = this.recordForm;
    return (form.advancePayment || 0) + (form.previousDebt || 0) + (form.socialSecurity || 0) +
           (form.monthlyDebt || 0) + (form.phoneBill || 0) + (form.otherDeductions || 0);
  }

  calculateNetSalary(): number {
    return this.calculateTotalEarnings() - this.calculateTotalDeductions();
  }

  onEmployeeSelect(userId: string): void {
    const employee = this.employees().find(e => e.id?.toString() === userId);
    if (employee) {
      this.recordForm.baseSalary = employee.salary || 0;
    }
  }

  getStatusLabel(status: string | null | undefined): string {
    const found = this.periodStatuses.find(s => s.value === status);
    return found ? found.label : status || '-';
  }

  getPaymentMethodLabel(method: string | null | undefined): string {
    const found = this.paymentMethods.find(m => m.value === method);
    return found ? found.label : method || '-';
  }

  getThaiMonth(month: number): string {
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                   'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return months[month - 1] || '';
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH');
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PayrollService,
  EmployeesService,
  BranchesService,
  OvertimeService,
  LeaveService,
  ReportsService
} from '../../../../services/openapi-client';
import {
  PayrollCalculationRequestDto,
  PayrollCalculationResponseDto,
  SalaryRecordDto,
  SalaryRecordCreateDto,
  EmployeeListDto
} from '../../../../services/openapi-client/model/models';
import { NotificationService } from '../../../../services/notification.service';

// The generated BranchesController actions return untyped IActionResult on the backend,
// so openapi-generator does not emit a typed BranchDto model. Define the shape locally.
interface BranchDto {
  id?: number;
  name?: string | null;
  code?: string | null;
}

@Component({
  selector: 'app-payroll-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payroll-admin.component.html',
  styleUrls: ['./payroll-admin.component.css']
})
export class PayrollAdminComponent implements OnInit {
  // Data
  salaryRecords = signal<SalaryRecordDto[]>([]);
  filteredRecords = signal<SalaryRecordDto[]>([]);
  employees = signal<EmployeeListDto[]>([]);
  branches = signal<BranchDto[]>([]);
  loading = signal(false);

  // Active tab
  activeTab = signal<'records' | 'calculate'>('records');

  // Filters
  searchTerm = signal('');
  selectedBranch = signal<string>('');
  selectedStatus = signal<string>('');
  selectedYear = signal<number>(new Date().getFullYear());
  selectedMonth = signal<number>(new Date().getMonth() + 1);

  // Modals
  showRecordModal = signal(false);
  showDeleteModal = signal(false);
  showCalculationResultModal = signal(false);
  isEditMode = signal(false);
  selectedRecord = signal<SalaryRecordDto | null>(null);
  calculationResult = signal<PayrollCalculationResponseDto | null>(null);

  // Forms
  recordForm: any = {
    employeeId: null,
    branchId: null,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    baseSalary: 0,
    daysWorked: 0,
    overtimeHours: 0,
    overtimeAmount: 0,
    totalAllowances: 0,
    phoneAllowance: 0,
    socialSecurityDeduction: 0,
    advancePaymentCurrent: 0,
    advancePaymentPrevious: 0,
    passportFeeDeduction: 0,
    taxDeduction: 0,
    otherDeductions: 0,
    leaveDays: 0,
    leaveDeduction: 0,
    notes: ''
  };

  calculationForm = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    branchId: null as number | null,
    employeeIds: [] as number[]
  };

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(10);

  // Dropdowns
  statuses = [
    { value: 'draft', label: 'ฉบับร่าง' },
    { value: 'approved', label: 'อนุมัติแล้ว' },
    { value: 'paid', label: 'จ่ายแล้ว' }
  ];

  months = [
    { value: 1, label: 'มกราคม' },
    { value: 2, label: 'กุมภาพันธ์' },
    { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' },
    { value: 5, label: 'พฤษภาคม' },
    { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' },
    { value: 8, label: 'สิงหาคม' },
    { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' },
    { value: 11, label: 'พฤศจิกายน' },
    { value: 12, label: 'ธันวาคม' }
  ];

  years: number[] = [];

  Math = Math;

  constructor(
    private payrollService: PayrollService,
    private employeesService: EmployeesService,
    private branchesService: BranchesService,
    private overtimeService: OvertimeService,
    private leaveService: LeaveService,
    private reportsService: ReportsService,
    private notificationService: NotificationService
  ) {
    // Generate years (current year - 2 to current year + 1)
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      this.years.push(i);
    }
  }

  ngOnInit(): void {
    this.loadSalaryRecords();
    this.loadEmployees();
    this.loadBranches();
  }

  loadSalaryRecords(): void {
    this.loading.set(true);
    this.payrollService.payrollGetAllSalaryRecords().subscribe({
      next: (records: SalaryRecordDto[]) => {
        this.salaryRecords.set(records);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading salary records:', error);
        this.notificationService.error('ไม่สามารถโหลดข้อมูลเงินเดือนได้');
        this.loading.set(false);
      }
    });
  }

  loadSalaryRecordsByPeriod(year: number, month: number): void {
    this.loading.set(true);
    this.payrollService.payrollGetSalaryRecordsByPeriod(year, month).subscribe({
      next: (records: SalaryRecordDto[]) => {
        this.salaryRecords.set(records);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading salary records:', error);
        this.notificationService.error('ไม่สามารถโหลดข้อมูลเงินเดือนได้');
        this.loading.set(false);
      }
    });
  }

  loadEmployees(): void {
    this.employeesService.employeesGetAllEmployees().subscribe({
      next: (employees: EmployeeListDto[]) => {
        this.employees.set(employees.filter(e => e.status === 'active'));
      },
      error: (error: any) => {
        console.error('Error loading employees:', error);
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
      }
    });
  }

  // Filters
  applyFilters(): void {
    let filtered = [...this.salaryRecords()];

    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(r =>
        r.employeeNameTh?.toLowerCase().includes(search) ||
        r.employeeCode?.toLowerCase().includes(search)
      );
    }

    if (this.selectedBranch()) {
      filtered = filtered.filter(r => r.branchId?.toString() === this.selectedBranch());
    }

    if (this.selectedStatus()) {
      filtered = filtered.filter(r => r.status === this.selectedStatus());
    }

    if (this.selectedYear()) {
      filtered = filtered.filter(r => r.year === this.selectedYear());
    }

    if (this.selectedMonth()) {
      filtered = filtered.filter(r => r.month === this.selectedMonth());
    }

    this.filteredRecords.set(filtered);
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

  onYearFilterChange(value: number): void {
    this.selectedYear.set(value);
    this.loadSalaryRecordsByPeriod(value, this.selectedMonth());
  }

  onMonthFilterChange(value: number): void {
    this.selectedMonth.set(value);
    this.loadSalaryRecordsByPeriod(this.selectedYear(), value);
  }

  switchTab(tab: 'records' | 'calculate'): void {
    this.activeTab.set(tab);
  }

  // Calculate Payroll
  async calculatePayroll(): Promise<void> {
    const request: PayrollCalculationRequestDto = {
      year: this.calculationForm.year,
      month: this.calculationForm.month,
      branchId: this.calculationForm.branchId || undefined,
      employeeIds: this.calculationForm.employeeIds.length > 0
        ? this.calculationForm.employeeIds
        : undefined
    };

    console.log('Calculating payroll with request:', request);
    this.loading.set(true);
    this.payrollService.payrollCalculatePayroll(request).subscribe({
      next: (result: PayrollCalculationResponseDto) => {
        console.log('Payroll calculation result:', result);

        if (!result.salaryRecords || result.salaryRecords.length === 0) {
          this.notificationService.error('ไม่พบพนักงานที่สามารถคำนวณเงินเดือนได้ กรุณาตรวจสอบว่ามีพนักงานสถานะ "Active" ในระบบ');
          this.loading.set(false);
          return;
        }

        if (result.errors && result.errors.length > 0) {
          console.warn('Calculation errors:', result.errors);
          result.errors.forEach(error => {
            this.notificationService.error(error);
          });
        }

        this.calculationResult.set(result);
        this.showCalculationResultModal.set(true);
        this.notificationService.success(`คำนวณเงินเดือนสำเร็จ ${result.salaryRecords?.length || 0} รายการ`);
        this.loading.set(false);
        // Reload salary records to show new calculations
        this.loadSalaryRecordsByPeriod(this.calculationForm.year, this.calculationForm.month);
      },
      error: (error: any) => {
        console.error('Error calculating payroll:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการคำนวณเงินเดือน');
        this.loading.set(false);
      }
    });
  }

  // Record CRUD
  openAddRecordModal(): void {
    this.isEditMode.set(false);
    this.selectedRecord.set(null);
    this.recordForm = {
      employeeId: null,
      branchId: null,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      baseSalary: 0,
      daysWorked: 0,
      overtimeHours: 0,
      overtimeAmount: 0,
      totalAllowances: 0,
      phoneAllowance: 0,
      socialSecurityDeduction: 0,
      advancePaymentCurrent: 0,
      advancePaymentPrevious: 0,
      passportFeeDeduction: 0,
      taxDeduction: 0,
      otherDeductions: 0,
      leaveDays: 0,
      leaveDeduction: 0,
      notes: ''
    };
    this.showRecordModal.set(true);
  }

  openEditRecordModal(record: SalaryRecordDto): void {
    this.isEditMode.set(true);
    this.selectedRecord.set(record);
    this.recordForm = {
      employeeId: record.employeeId,
      branchId: record.branchId,
      month: record.month,
      year: record.year,
      baseSalary: record.baseSalary || 0,
      daysWorked: record.daysWorked || 0,
      overtimeHours: record.overtimeHours || 0,
      overtimeAmount: record.overtimeAmount || 0,
      totalAllowances: record.totalAllowances || 0,
      phoneAllowance: record.phoneAllowance || 0,
      socialSecurityDeduction: record.socialSecurityDeduction || 0,
      advancePaymentCurrent: record.advancePaymentCurrent || 0,
      advancePaymentPrevious: record.advancePaymentPrevious || 0,
      passportFeeDeduction: record.passportFeeDeduction || 0,
      taxDeduction: record.taxDeduction || 0,
      otherDeductions: record.otherDeductions || 0,
      leaveDays: record.leaveDays || 0,
      leaveDeduction: record.leaveDeduction || 0,
      notes: record.notes || ''
    };
    this.showRecordModal.set(true);
  }

  openDeleteModal(record: SalaryRecordDto): void {
    this.selectedRecord.set(record);
    this.showDeleteModal.set(true);
  }

  saveRecord(): void {
    if (this.isEditMode()) {
      // Cannot edit salary records - they are calculated
      this.notificationService.error('ไม่สามารถแก้ไขรายการเงินเดือนที่คำนวณแล้วได้ กรุณาลบและคำนวณใหม่');
    } else {
      this.createRecord();
    }
  }

  createRecord(): void {
    const dto: SalaryRecordCreateDto = {
      employeeId: this.recordForm.employeeId!,
      branchId: this.recordForm.branchId || undefined,
      month: this.recordForm.month,
      year: this.recordForm.year,
      baseSalary: this.recordForm.baseSalary,
      daysWorked: this.recordForm.daysWorked,
      overtimeHours: this.recordForm.overtimeHours,
      overtimeAmount: this.recordForm.overtimeAmount,
      totalAllowances: this.recordForm.totalAllowances,
      phoneAllowance: this.recordForm.phoneAllowance,
      socialSecurityDeduction: this.recordForm.socialSecurityDeduction,
      advancePaymentCurrent: this.recordForm.advancePaymentCurrent,
      advancePaymentPrevious: this.recordForm.advancePaymentPrevious,
      passportFeeDeduction: this.recordForm.passportFeeDeduction,
      taxDeduction: this.recordForm.taxDeduction,
      otherDeductions: this.recordForm.otherDeductions,
      leaveDays: this.recordForm.leaveDays,
      leaveDeduction: this.recordForm.leaveDeduction,
      notes: this.recordForm.notes
    };

    this.payrollService.payrollCreateSalaryRecord(dto).subscribe({
      next: (created: SalaryRecordDto) => {
        this.notificationService.success('สร้างรายการเงินเดือนสำเร็จ');
        this.loadSalaryRecordsByPeriod(this.selectedYear(), this.selectedMonth());
        this.closeModals();
      },
      error: (error: any) => {
        console.error('Error creating salary record:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการสร้างรายการเงินเดือน');
      }
    });
  }

  deleteRecord(): void {
    const record = this.selectedRecord();
    if (!record) return;

    this.payrollService.payrollDeleteSalaryRecord(record.id!).subscribe({
      next: () => {
        this.notificationService.success('ลบรายการเงินเดือนสำเร็จ');
        this.loadSalaryRecordsByPeriod(this.selectedYear(), this.selectedMonth());
        this.closeModals();
      },
      error: (error: any) => {
        console.error('Error deleting salary record:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการลบรายการเงินเดือน');
      }
    });
  }

  approveRecord(record: SalaryRecordDto): void {
    this.payrollService.payrollApproveSalaryRecord(record.id!).subscribe({
      next: (updated: SalaryRecordDto) => {
        this.notificationService.success('อนุมัติรายการเงินเดือนสำเร็จ');
        this.loadSalaryRecordsByPeriod(this.selectedYear(), this.selectedMonth());
      },
      error: (error: any) => {
        console.error('Error approving salary record:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการอนุมัติรายการเงินเดือน');
      }
    });
  }

  markAsPaid(record: SalaryRecordDto): void {
    this.payrollService.payrollMarkSalaryRecordAsPaid(record.id!).subscribe({
      next: (updated: SalaryRecordDto) => {
        this.notificationService.success('ทำเครื่องหมายจ่ายเงินแล้วสำเร็จ');
        this.loadSalaryRecordsByPeriod(this.selectedYear(), this.selectedMonth());
      },
      error: (error: any) => {
        console.error('Error marking salary record as paid:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการทำเครื่องหมายจ่ายเงิน');
      }
    });
  }

  closeModals(): void {
    this.showRecordModal.set(false);
    this.showDeleteModal.set(false);
    this.showCalculationResultModal.set(false);
  }

  // Employee selection for calculation
  onEmployeeSelect(employeeId: number): void {
    const employee = this.employees().find(e => e.id === employeeId);
    if (employee) {
      this.recordForm.employeeId = employeeId;
      this.recordForm.branchId = employee.branchId || null;

      // Set base salary based on employment type
      if (employee.employmentType === 'monthly') {
        this.recordForm.baseSalary = employee.salary || 0;
        this.recordForm.daysWorked = 0; // Not applicable for monthly
      } else if (employee.employmentType === 'daily') {
        this.recordForm.baseSalary = employee.dailyRate || 0;
        this.recordForm.daysWorked = 0; // User should input
      }
    }
  }

  toggleEmployeeForCalculation(employeeId: number): void {
    const index = this.calculationForm.employeeIds.indexOf(employeeId);
    if (index > -1) {
      this.calculationForm.employeeIds.splice(index, 1);
    } else {
      this.calculationForm.employeeIds.push(employeeId);
    }
  }

  selectAllEmployees(): void {
    this.calculationForm.employeeIds = this.employees().map(e => e.id!);
  }

  deselectAllEmployees(): void {
    this.calculationForm.employeeIds = [];
  }

  isEmployeeSelected(employeeId: number): boolean {
    return this.calculationForm.employeeIds.includes(employeeId);
  }

  // Helpers
  getPaginatedRecords(): SalaryRecordDto[] {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredRecords().slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredRecords().length / this.itemsPerPage());
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

  getTotalNetSalary(): number {
    return this.filteredRecords().reduce((sum, r) => sum + (r.netSalary || 0), 0);
  }

  getTotalEarnings(): number {
    return this.filteredRecords().reduce((sum, r) => sum + (r.totalEarnings || 0), 0);
  }

  getTotalDeductions(): number {
    return this.filteredRecords().reduce((sum, r) => sum + (r.totalDeductions || 0), 0);
  }

  calculateTotalEarnings(): number {
    const form = this.recordForm;
    return (form.baseSalary || 0) +
           (form.overtimeAmount || 0) +
           (form.totalAllowances || 0) +
           (form.phoneAllowance || 0);
  }

  calculateTotalDeductions(): number {
    const form = this.recordForm;
    return (form.socialSecurityDeduction || 0) +
           (form.advancePaymentCurrent || 0) +
           (form.advancePaymentPrevious || 0) +
           (form.passportFeeDeduction || 0) +
           (form.taxDeduction || 0) +
           (form.otherDeductions || 0) +
           (form.leaveDeduction || 0);
  }

  calculateNetSalary(): number {
    return this.calculateTotalEarnings() - this.calculateTotalDeductions();
  }

  getStatusLabel(status: string | null | undefined): string {
    const found = this.statuses.find(s => s.value === status);
    return found ? found.label : status || '-';
  }

  getMonthLabel(month: number | null | undefined): string {
    const found = this.months.find(m => m.value === month);
    return found ? found.label : month?.toString() || '-';
  }

  getBranchName(branchId: number | undefined): string {
    if (!branchId) return '-';
    const branch = this.branches().find(b => b.id === branchId);
    return branch?.name || '-';
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH');
  }

  formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '0.00';
    return amount.toFixed(2);
  }

  downloadPaySlip(record: SalaryRecordDto): void {
    if (!record.id) {
      this.notificationService.error('ไม่พบรหัสรายการเงินเดือน');
      return;
    }

    const recordId = record.id; // Store in variable for type safety

    // Call backend API using OpenAPI-generated service.
    // The generated method is typed as returning FileContentResult (openapi-generator picks
    // the JSON-shaped "produces" type for its overload signature), but since we explicitly
    // request the 'application/pdf' Accept header the HttpClient call is made with
    // responseType: 'blob' under the hood, so the value delivered at runtime is a real Blob.
    this.reportsService.reportsDownloadPaySlip(recordId, 'body', false, { httpHeaderAccept: 'application/pdf' }).subscribe({
      next: (result) => {
        const blob = result as unknown as Blob;
        // Create download link
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `PaySlip-${recordId.toString().padStart(6, '0')}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        this.notificationService.success('ดาวน์โหลด Pay Slip สำเร็จ');
      },
      error: (error: any) => {
        console.error('Error downloading pay slip:', error);
        this.notificationService.error('เกิดข้อผิดพลาดในการดาวน์โหลด Pay Slip');
      }
    });
  }
}

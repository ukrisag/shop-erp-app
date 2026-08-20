import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { FormValidators } from '../../../../utils/form-validators';
import { FormHelpers } from '../../../../utils/form-helpers';
import { ValidationConfigs } from '../../../../utils/validation-configs';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoadingSkeletonComponent } from '../../../../components/shared/loading-skeleton/loading-skeleton.component';
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
import { formatThaiDate } from '../../../../utils/thai-date.helper';

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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoadingSkeletonComponent],
  templateUrl: './payroll-admin.component.html',
  styleUrls: ['./payroll-admin.component.css']
})
export class PayrollAdminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  // Data
  salaryRecords = signal<SalaryRecordDto[]>([]);
  filteredRecords = signal<SalaryRecordDto[]>([]);
  employees = signal<EmployeeListDto[]>([]);
  branches = signal<BranchDto[]>([]);
  loading = signal(false);
  // Employee IDs that already have a salary record for calculationForm's
  // current year/month - used to hide them from the "เลือกพนักงาน" calculate
  // list, since selecting one just fails calculation with a confusing error
  // for anyone whose existing record isn't in "draft" status.
  existingRecordEmployeeIds = signal<Set<number>>(new Set());

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
  recordForm!: FormGroup;
  calculationForm!: FormGroup;

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
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    // Generate years (current year - 2 to current year + 1)
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      this.years.push(i);
    }
  }

  ngOnInit(): void {
    this.initForms();
    this.loadSalaryRecords();
    this.loadEmployees();
    this.loadBranches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    // Record form (matching SalaryRecordCreateDto)
    this.recordForm = this.fb.group({
      employeeId: [null, ValidationConfigs.payrollRecord.employeeId],
      branchId: [null, ValidationConfigs.payrollRecord.branchId],
      month: [new Date().getMonth() + 1, ValidationConfigs.payrollRecord.month],
      year: [new Date().getFullYear(), ValidationConfigs.payrollRecord.year],
      baseSalary: [0, ValidationConfigs.payrollRecord.baseSalary],
      daysWorked: [0, ValidationConfigs.payrollRecord.daysWorked],
      overtimeHours: [0, ValidationConfigs.payrollRecord.overtimeHours],
      overtimeAmount: [0, ValidationConfigs.payrollRecord.overtimeAmount],
      totalAllowances: [0, ValidationConfigs.payrollRecord.totalAllowances],
      phoneAllowance: [0, ValidationConfigs.payrollRecord.phoneAllowance],
      socialSecurityDeduction: [0, ValidationConfigs.payrollRecord.socialSecurityDeduction],
      advancePaymentCurrent: [0, ValidationConfigs.payrollRecord.advancePaymentCurrent],
      advancePaymentPrevious: [0, ValidationConfigs.payrollRecord.advancePaymentPrevious],
      passportFeeDeduction: [0, ValidationConfigs.payrollRecord.passportFeeDeduction],
      taxDeduction: [0, ValidationConfigs.payrollRecord.taxDeduction],
      otherDeductions: [0, ValidationConfigs.payrollRecord.otherDeductions],
      leaveDays: [0, ValidationConfigs.payrollRecord.leaveDays],
      leaveDeduction: [0, ValidationConfigs.payrollRecord.leaveDeduction],
      notes: ['', ValidationConfigs.payrollRecord.notes]
    });

    // Calculation form (4 fields)
    this.calculationForm = this.fb.group({
      month: [new Date().getMonth() + 1, ValidationConfigs.payrollCalculation.month],
      year: [new Date().getFullYear(), ValidationConfigs.payrollCalculation.year],
      branchId: [null],
      employeeIds: [[]]
    });
  }

  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    return FormHelpers.isFieldInvalid(formGroup, fieldName);
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    return FormHelpers.getFieldError(formGroup, fieldName);
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
        this.notificationService.error(error.error?.message || 'Failed to load salary records');
        this.loading.set(false);
      }
    });
  }

  /** `preserveCurrentPage`: applyFilters() normally resets to page 1 on every
   *  call, which is correct when the user actually changes a filter but wrong
   *  when this is just a data refresh after approving/marking a single record
   *  paid (used to bounce the admin back to page 1 every time, even from
   *  page 3+). Pass true from those "just refresh, same view" call sites. */
  loadSalaryRecordsByPeriod(year: number, month: number, preserveCurrentPage = false): void {
    this.loading.set(true);
    const pageToRestore = this.currentPage();
    this.payrollService.payrollGetSalaryRecordsByPeriod(year, month).subscribe({
      next: (records: SalaryRecordDto[]) => {
        this.salaryRecords.set(records);
        this.applyFilters();
        if (preserveCurrentPage) {
          this.currentPage.set(Math.min(pageToRestore, this.getTotalPages() || 1));
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading salary records:', error);
        this.notificationService.error(error.error?.message || 'Failed to load salary records');
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
    if (tab === 'calculate') {
      this.onCalculationPeriodChange();
    }
  }

  /** Refetches which employees already have a salary record for
   *  calculationForm.year/month, so getEmployeesForCalculation() can hide
   *  them. Called on tab switch and whenever the year/month select changes. */
  onCalculationPeriodChange(): void {
    const year = this.calculationForm.get('year')?.value;
    const month = this.calculationForm.get('month')?.value;
    this.payrollService.payrollGetSalaryRecordsByPeriod(year, month).subscribe({
      next: (records: SalaryRecordDto[]) => {
        this.existingRecordEmployeeIds.set(new Set(records.map(r => r.employeeId!).filter(id => id != null)));
      },
      error: (error: any) => {
        console.error('Error checking existing salary records for period:', error);
      }
    });
  }

  /**
   * ตรวจสอบว่ามี OT หรือวันลาที่ยังรออนุมัติในเดือนที่ต้องการประมวลผล
   * @returns true ถ้ามี pending records, false ถ้าไม่มี
   */
  async checkPendingRecords(): Promise<boolean> {
    const year = this.calculationForm.get('year')?.value;
    const month = this.calculationForm.get('month')?.value;
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    let hasPending = false;

    // ตรวจสอบ OT ที่รออนุมัติ
    try {
      const overtimeRecords = await this.overtimeService.overtimeGetOvertimeRecordsByPeriod(startDate, endDate).toPromise();
      const pendingOT = overtimeRecords?.filter((r: any) => r.status === 'pending') || [];

      if (pendingOT.length > 0) {
        this.notificationService.warning(
          `Warning: Found ${pendingOT.length} pending overtime records for ${month}/${year}. Please approve or reject all overtime records before processing payroll`
        );
        hasPending = true;
      }
    } catch (error) {
      console.error('Error checking pending OT:', error);
    }

    // ตรวจสอบวันลาที่รออนุมัติ
    try {
      const leaveRecords = await this.leaveService.leaveGetLeaveRecordsByPeriod(startDate, endDate).toPromise();
      const pendingLeaves = leaveRecords?.filter((r: any) => r.status === 'pending') || [];

      if (pendingLeaves.length > 0) {
        this.notificationService.warning(
          `Warning: Found ${pendingLeaves.length} pending leave records for ${month}/${year}. Please approve or reject all leave records before processing payroll`
        );
        hasPending = true;
      }
    } catch (error) {
      console.error('Error checking pending leaves:', error);
    }

    return hasPending;
  }

  // Calculate Payroll
  async calculatePayroll(): Promise<void> {
    // ตรวจสอบ pending records ก่อน
    const hasPending = await this.checkPendingRecords();
    if (hasPending) {
      return; // หยุดการคำนวณถ้ามี pending
    }

    const request: PayrollCalculationRequestDto = {
      year: this.calculationForm.get('year')?.value,
      month: this.calculationForm.get('month')?.value,
      branchId: this.calculationForm.get('branchId')?.value || undefined,
      employeeIds: (this.calculationForm.get('employeeIds')?.value || []).length > 0
        ? this.calculationForm.get('employeeIds')?.value
        : undefined
    };

    console.log('Calculating payroll with request:', request);
    this.loading.set(true);
    this.payrollService.payrollCalculatePayroll(request).subscribe({
      next: (result: PayrollCalculationResponseDto) => {
        console.log('Payroll calculation result:', result);

        if (!result.salaryRecords || result.salaryRecords.length === 0) {
          this.notificationService.error('No employees found for payroll calculation. Please verify that active employees exist in the system');
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
        this.notificationService.success(`Successfully calculated payroll for ${result.salaryRecords?.length || 0} records`);
        this.loading.set(false);
        // Reload salary records to show new calculations
        const year = this.calculationForm.get('year')?.value;
        const month = this.calculationForm.get('month')?.value;
        this.loadSalaryRecordsByPeriod(year, month);
        // Clear the checkbox selection and refresh the exclusion list so the
        // employees just calculated no longer show up as selectable - both of
        // these used to linger indefinitely (selection never got cleared, and
        // nothing ever re-checked which employees already had a record) so
        // reopening this tab kept offering the same already-processed people.
        this.calculationForm.patchValue({ employeeIds: [] });
        this.onCalculationPeriodChange();
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
    this.recordForm.reset({
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
    });
    this.showRecordModal.set(true);
  }

  openEditRecordModal(record: SalaryRecordDto): void {
    this.isEditMode.set(true);
    this.selectedRecord.set(record);
    this.recordForm.patchValue({
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
    });
    this.showRecordModal.set(true);
  }

  openDeleteModal(record: SalaryRecordDto): void {
    this.selectedRecord.set(record);
    this.showDeleteModal.set(true);
  }

  saveRecord(): void {
    if (this.isEditMode()) {
      // Cannot edit salary records - they are calculated
      this.notificationService.error('Cannot edit calculated salary records. Please delete and recalculate');
    } else {
      this.createRecord();
    }
  }

  createRecord(): void {
    const formValue = this.recordForm.value;
    const dto: SalaryRecordCreateDto = {
      employeeId: formValue.employeeId!,
      branchId: formValue.branchId || undefined,
      month: formValue.month,
      year: formValue.year,
      baseSalary: formValue.baseSalary,
      daysWorked: formValue.daysWorked,
      overtimeHours: formValue.overtimeHours,
      overtimeAmount: formValue.overtimeAmount,
      totalAllowances: formValue.totalAllowances,
      phoneAllowance: formValue.phoneAllowance,
      socialSecurityDeduction: formValue.socialSecurityDeduction,
      advancePaymentCurrent: formValue.advancePaymentCurrent,
      advancePaymentPrevious: formValue.advancePaymentPrevious,
      passportFeeDeduction: formValue.passportFeeDeduction,
      taxDeduction: formValue.taxDeduction,
      otherDeductions: formValue.otherDeductions,
      leaveDays: formValue.leaveDays,
      leaveDeduction: formValue.leaveDeduction,
      notes: formValue.notes
    };

    this.payrollService.payrollCreateSalaryRecord(dto).subscribe({
      next: (response: any) => {
        this.notificationService.success(response?.message || 'Successfully created salary record');
        this.loadSalaryRecordsByPeriod(this.selectedYear(), this.selectedMonth());
        this.closeModals();
      },
      error: (error: any) => {
        console.error('Error creating salary record:', error);
        this.notificationService.error(error.error?.message || 'Failed to create salary record');
      }
    });
  }

  deleteRecord(): void {
    const record = this.selectedRecord();
    if (!record) return;

    this.payrollService.payrollDeleteSalaryRecord(record.id!).subscribe({
      next: (response: any) => {
        this.notificationService.success(response?.message || 'Successfully deleted salary record');
        this.loadSalaryRecordsByPeriod(this.selectedYear(), this.selectedMonth(), true);
        this.closeModals();
      },
      error: (error: any) => {
        console.error('Error deleting salary record:', error);
        this.notificationService.error(error.error?.message || 'Failed to delete salary record');
      }
    });
  }

  approveRecord(record: SalaryRecordDto): void {
    this.payrollService.payrollApproveSalaryRecord(record.id!).subscribe({
      next: (response: any) => {
        this.notificationService.success(response?.message || 'Successfully approved salary record');
        this.loadSalaryRecordsByPeriod(this.selectedYear(), this.selectedMonth(), true);
      },
      error: (error: any) => {
        console.error('Error approving salary record:', error);
        this.notificationService.error(error.error?.message || 'Failed to approve salary record');
      }
    });
  }

  markAsPaid(record: SalaryRecordDto): void {
    this.payrollService.payrollMarkSalaryRecordAsPaid(record.id!).subscribe({
      next: (response: any) => {
        this.notificationService.success(response?.message || 'Successfully marked as paid');
        this.loadSalaryRecordsByPeriod(this.selectedYear(), this.selectedMonth(), true);
      },
      error: (error: any) => {
        console.error('Error marking salary record as paid:', error);
        this.notificationService.error(error.error?.message || 'Failed to mark as paid');
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
      // Set base salary based on employment type
      if (employee.employmentType === 'monthly') {
        this.recordForm.patchValue({
          employeeId: employeeId,
          branchId: employee.branchId || null,
          baseSalary: employee.salary || 0,
          daysWorked: 0 // Not applicable for monthly
        });
      } else if (employee.employmentType === 'daily') {
        this.recordForm.patchValue({
          employeeId: employeeId,
          branchId: employee.branchId || null,
          baseSalary: employee.dailyRate || 0,
          daysWorked: 0 // User should input
        });
      } else {
        this.recordForm.patchValue({
          employeeId: employeeId,
          branchId: employee.branchId || null
        });
      }
    }
  }

  toggleEmployeeForCalculation(employeeId: number): void {
    const employeeIds = this.calculationForm.get('employeeIds')?.value || [];
    const index = employeeIds.indexOf(employeeId);
    if (index > -1) {
      employeeIds.splice(index, 1);
    } else {
      employeeIds.push(employeeId);
    }
    this.calculationForm.patchValue({ employeeIds });
  }

  /** The "สาขา (ถ้าต้องการกรอง)" select only fed calculationForm.branchId into
   *  the eventual API payload - the employee checkbox list below it rendered
   *  `employees()` directly and never actually filtered by it, so picking a
   *  branch never narrowed down who showed up. A plain method (not a computed
   *  signal, since calculationForm.branchId is a mutated plain property, not
   *  a signal) so it re-evaluates on every change detection pass, i.e. right
   *  after the branch <select>'s ngModel updates. */
  getEmployeesForCalculation(): EmployeeListDto[] {
    const existing = this.existingRecordEmployeeIds();
    let list = this.employees().filter(e => !existing.has(e.id!));
    const branchId = this.calculationForm.get('branchId')?.value;
    if (branchId) {
      list = list.filter(e => e.branchId === branchId);
    }
    return list;
  }

  selectAllEmployees(): void {
    this.calculationForm.patchValue({
      employeeIds: this.getEmployeesForCalculation().map(e => e.id!)
    });
  }

  deselectAllEmployees(): void {
    this.calculationForm.patchValue({ employeeIds: [] });
  }

  isAllEmployeesSelected(): boolean {
    const employees = this.getEmployeesForCalculation();
    if (employees.length === 0) return false;
    const selectedIds = this.calculationForm.get('employeeIds')?.value || [];
    return employees.every(e => selectedIds.includes(e.id!));
  }

  toggleAllEmployees(event: any): void {
    if (event.target?.checked) {
      this.selectAllEmployees();
    } else {
      this.deselectAllEmployees();
    }
  }

  isEmployeeSelected(employeeId: number): boolean {
    const employeeIds = this.calculationForm.get('employeeIds')?.value || [];
    return employeeIds.includes(employeeId);
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
    return (this.recordForm.get('baseSalary')?.value || 0) +
           (this.recordForm.get('overtimeAmount')?.value || 0) +
           (this.recordForm.get('totalAllowances')?.value || 0) +
           (this.recordForm.get('phoneAllowance')?.value || 0);
  }

  calculateTotalDeductions(): number {
    return (this.recordForm.get('socialSecurityDeduction')?.value || 0) +
           (this.recordForm.get('advancePaymentCurrent')?.value || 0) +
           (this.recordForm.get('advancePaymentPrevious')?.value || 0) +
           (this.recordForm.get('passportFeeDeduction')?.value || 0) +
           (this.recordForm.get('taxDeduction')?.value || 0) +
           (this.recordForm.get('otherDeductions')?.value || 0) +
           (this.recordForm.get('leaveDeduction')?.value || 0);
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
    return formatThaiDate(date);
  }

  formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '0.00';
    return amount.toFixed(2);
  }

  downloadPaySlip(record: SalaryRecordDto): void {
    if (!record.id) {
      this.notificationService.error('Salary record ID not found');
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

        this.notificationService.success('Successfully downloaded pay slip');
      },
      error: (error: any) => {
        console.error('Error downloading pay slip:', error);
        this.notificationService.error(error.error?.message || 'Failed to download pay slip');
      }
    });
  }
}

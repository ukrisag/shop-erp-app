import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmployeesService, BranchesService } from '../../../../services/openapi-client';
import {
  EmployeeListDto,
  EmployeeDetailDto,
  EmployeeCreateDto,
  EmployeeUpdateDto
} from '../../../../services/openapi-client/model/models';
import { NotificationService } from '../../../../services/notification.service';
import { environment } from '../../../../../environments/environment';
import { formatThaiDate } from '../../../../utils/thai-date.helper';
import { FormValidators } from '../../../../utils/form-validators';
import { FormHelpers } from '../../../../utils/form-helpers';
import { ValidationConfigs } from '../../../../utils/validation-configs';
import { AsyncValidators } from '../../../../utils/async-validators';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// The generated BranchesController actions return untyped IActionResult on the backend,
// so openapi-generator does not emit a typed BranchDto / ApiResponseDto<IEnumerable<BranchDto>> model.
// Define the shape locally to keep this component type-safe.
interface BranchDto {
  id?: number;
  name?: string | null;
  code?: string | null;
}

@Component({
  selector: 'app-employee-list-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './employee-list-admin.component.html',
  styleUrls: ['./employee-list-admin.component.css']
})
export class EmployeeListAdminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  employees = signal<EmployeeListDto[]>([]);
  filteredEmployees = signal<EmployeeListDto[]>([]);
  branches = signal<BranchDto[]>([]);
  loading = signal(false);

  // Filters
  searchTerm = signal('');
  selectedBranch = signal<string>('');
  selectedEmploymentType = signal<string>('');
  selectedNationality = signal<string>('');

  // Modal
  showModal = signal(false);
  showDeleteModal = signal(false);
  isEditMode = signal(false);
  selectedEmployee = signal<EmployeeDetailDto | null>(null);
  selectedPhotoFile: File | null = null;
  photoPreviewUrl = signal<string | null>(null);

  // Form
  employeeForm!: FormGroup;

  // Dropdown options
  employmentTypes = [
    { value: 'monthly', label: 'รายเดือน' },
    { value: 'daily', label: 'รายวัน' }
  ];

  nationalities = [
    { value: 'thai', label: 'ไทย' },
    { value: 'myanmar', label: 'เมียนมา' },
    { value: 'lao', label: 'ลาว' },
    { value: 'cambodian', label: 'กัมพูชา' },
    { value: 'vietnamese', label: 'เวียดนาม' },
    { value: 'other', label: 'อื่นๆ' }
  ];

  statuses = [
    { value: 'active', label: 'ทำงานอยู่' },
    { value: 'on leave', label: 'ลาพัก' },
    { value: 'resigned', label: 'ลาออก' },
    { value: 'terminated', label: 'เลิกจ้าง' }
  ];

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(10);

  // Roles ตรงกับระบบ Permission
  roles = [
    { value: 'super_admin', label: 'Super Admin (เจ้าของระบบ)' },
    { value: 'admin', label: 'Admin (ผู้จัดการ)' },
    { value: 'manager', label: 'Manager (หัวหน้าแผนก)' },
    { value: 'staff', label: 'Staff (พนักงาน)' },
    { value: 'employee', label: 'Employee (พาร์ทไทม์/ทั่วไป)' }
  ];

  // Expose Math for template
  Math = Math;

  constructor(
    private employeesService: EmployeesService,
    private branchesService: BranchesService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupDynamicValidation();
    this.loadEmployees();
    this.loadBranches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    const baseConfig = this.isEditMode()
      ? ValidationConfigs.getEmployeeEditConfig()
      : ValidationConfigs.getEmployeeCreateConfig();

    this.employeeForm = this.fb.group({
      employeeCode: ['', baseConfig['employeeCode']],
      firstNameTh: ['', baseConfig['firstName']],
      lastNameTh: ['', baseConfig['lastName']],
      firstNameEn: [''],
      lastNameEn: [''],
      dateOfBirth: ['', baseConfig['dateOfBirth']],
      nationality: ['thai', baseConfig['nationality']],
      phone: ['', baseConfig['phone']],
      email: ['', baseConfig['email']],
      address: ['', baseConfig['address']],
      idCardNumber: [''],
      passportNumber: [''],
      branchId: [null, baseConfig['branchId']],
      position: ['', baseConfig['position']],
      employmentType: ['monthly', baseConfig['employmentType']],
      hireDate: ['', baseConfig['startDate']],
      salary: [null],
      dailyRate: [null],
      bankName: [''],
      bankAccountNumber: [''],
      workPermitStartDate: [''],
      workPermitEndDate: [''],
      hasSocialSecurity: [true],
      employeeStatus: ['active'],
      notes: ['']
    });

    // Add password fields for both create and edit mode
    // Password is completely optional with no validation in both modes
    this.employeeForm.addControl('password', this.fb.control('', baseConfig['password'] || []));
    this.employeeForm.addControl('confirmPassword', this.fb.control('', baseConfig['confirmPassword'] || []));

    if (!this.isEditMode()) {
      // Add async validators for create mode (reduced debounce time to 300ms for better UX)
      // Note: employeeCode uniqueness check removed per user request
      this.employeeForm.get('idCardNumber')?.setAsyncValidators([
        AsyncValidators.uniqueIdCard(this.employeesService, undefined, 300)
      ]);
    }
    // Note: No async validators in edit mode
  }

  private setupDynamicValidation(): void {
    // Dynamic validation based on nationality
    this.employeeForm.get('nationality')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((nationality) => {
        if (nationality === 'thai') {
          // Thai: ID card required, passport optional
          FormHelpers.updateConditionalValidation(
            this.employeeForm,
            'idCardNumber',
            [Validators.required, FormValidators.idCard()]
          );
          FormHelpers.updateConditionalValidation(this.employeeForm, 'passportNumber', []);
          FormHelpers.updateConditionalValidation(this.employeeForm, 'workPermitNumber', []);
          FormHelpers.updateConditionalValidation(this.employeeForm, 'workPermitStartDate', []);
          FormHelpers.updateConditionalValidation(this.employeeForm, 'workPermitEndDate', []);
        } else {
          // Foreign: Passport and work permit required
          FormHelpers.updateConditionalValidation(this.employeeForm, 'idCardNumber', []);
          FormHelpers.updateConditionalValidation(
            this.employeeForm,
            'passportNumber',
            [Validators.required, FormValidators.passport()]
          );
          FormHelpers.updateConditionalValidation(
            this.employeeForm,
            'workPermitNumber',
            [Validators.required, Validators.maxLength(50)]
          );
          FormHelpers.updateConditionalValidation(
            this.employeeForm,
            'workPermitStartDate',
            [Validators.required]
          );
          FormHelpers.updateConditionalValidation(
            this.employeeForm,
            'workPermitEndDate',
            [Validators.required]
          );
        }
      });

    // Dynamic validation based on employment type
    this.employeeForm.get('employmentType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((type) => {
        if (type === 'monthly') {
          FormHelpers.updateConditionalValidation(
            this.employeeForm,
            'salary',
            [Validators.required, FormValidators.positiveNumber()]
          );
          FormHelpers.updateConditionalValidation(this.employeeForm, 'dailyRate', []);
        } else {
          FormHelpers.updateConditionalValidation(this.employeeForm, 'salary', []);
          FormHelpers.updateConditionalValidation(
            this.employeeForm,
            'dailyRate',
            [Validators.required, FormValidators.positiveNumber()]
          );
        }
      });
  }

  isFieldInvalid(fieldName: string): boolean {
    return FormHelpers.isFieldInvalid(this.employeeForm, fieldName);
  }

  getFieldError(fieldName: string): string {
    return FormHelpers.getFieldError(this.employeeForm, fieldName);
  }

  getFieldLabels(): { [key: string]: string } {
    return {
      employeeCode: 'รหัสพนักงาน',
      branchId: 'สาขา',
      firstNameTh: 'ชื่อ (ไทย)',
      lastNameTh: 'นามสกุล (ไทย)',
      firstNameEn: 'ชื่อ (อังกฤษ)',
      lastNameEn: 'นามสกุล (อังกฤษ)',
      email: 'อีเมล',
      phone: 'เบอร์โทร',
      dateOfBirth: 'วันเกิด',
      nationality: 'สัญชาติ',
      idCardNumber: 'เลขบัตรประชาชน',
      passportNumber: 'เลขพาสปอร์ต',
      address: 'ที่อยู่',
      position: 'ตำแหน่ง',
      employmentType: 'ประเภทการจ้าง',
      salary: 'เงินเดือน',
      dailyRate: 'ค่าแรงรายวัน',
      bankAccountNumber: 'เลขที่บัญชี',
      hireDate: 'วันที่เริ่มงาน',
      workPermitStartDate: 'วันที่เริ่มใบอนุญาต',
      workPermitEndDate: 'วันที่หมดอายุใบอนุญาต',
      hasSocialSecurity: 'มีประกันสังคม',
      employeeStatus: 'สถานะ',
      password: 'รหัสผ่าน',
      confirmPassword: 'ยืนยันรหัสผ่าน'
    };
  }

  loadEmployees(): void {
    this.loading.set(true);
    this.employeesService.employeesGetAllEmployees().subscribe({
      next: (employees: EmployeeListDto[]) => {
        this.employees.set(employees);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading employees:', error);
        this.notificationService.error('ไม่สามารถโหลดข้อมูลพนักงานได้');
        this.loading.set(false);
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

  applyFilters(): void {
    let filtered = [...this.employees()];

    // Search filter
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(emp =>
        emp.email?.toLowerCase().includes(search) ||
        emp.employeeCode?.toLowerCase().includes(search) ||
        emp.fullNameTh?.toLowerCase().includes(search) ||
        emp.fullNameEn?.toLowerCase().includes(search) ||
        emp.position?.toLowerCase().includes(search)
      );
    }

    // Branch filter
    if (this.selectedBranch()) {
      filtered = filtered.filter(emp => emp.branchId?.toString() === this.selectedBranch());
    }

    // Employment type filter
    if (this.selectedEmploymentType()) {
      filtered = filtered.filter(emp => emp.employmentType?.toLowerCase() === this.selectedEmploymentType());
    }

    // Nationality filter
    if (this.selectedNationality()) {
      filtered = filtered.filter(emp => emp.nationality?.toLowerCase() === this.selectedNationality());
    }

    this.filteredEmployees.set(filtered);
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

  onEmploymentTypeFilterChange(value: string): void {
    this.selectedEmploymentType.set(value);
    this.applyFilters();
  }

  onNationalityFilterChange(value: string): void {
    this.selectedNationality.set(value);
    this.applyFilters();
  }

  openAddModal(): void {
    this.isEditMode.set(false);
    this.selectedEmployee.set(null);
    this.selectedPhotoFile = null;
    this.photoPreviewUrl.set(null);
    this.initForm(); // Reinitialize the form for create mode
    const today = new Date().toISOString().split('T')[0];
    this.employeeForm.reset({
      employeeCode: '',
      branchId: null,
      firstNameTh: '',
      lastNameTh: '',
      firstNameEn: '',
      lastNameEn: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      nationality: 'thai',
      idCardNumber: '',
      passportNumber: '',
      address: '',
      position: '',
      employmentType: 'monthly',
      salary: null,
      dailyRate: null,
      bankAccountNumber: '',
      hireDate: today,
      workPermitStartDate: '',
      workPermitEndDate: '',
      hasSocialSecurity: true,
      employeeStatus: 'active'
    });
    this.showModal.set(true);
  }

  openEditModal(employeeListItem: EmployeeListDto): void {
    // Load full employee details
    this.employeesService.employeesGetEmployeeById(employeeListItem.id!).subscribe({
      next: (employee: EmployeeDetailDto) => {
        this.isEditMode.set(true);
        this.selectedEmployee.set(employee);
        this.selectedPhotoFile = null;
        this.photoPreviewUrl.set(this.getPhotoUrl(employee.photoUrl));
        this.employeeForm.patchValue({
          employeeCode: employee.employeeCode,
          branchId: employee.branchId,
          firstNameTh: employee.firstNameTh || '',
          lastNameTh: employee.lastNameTh || '',
          firstNameEn: employee.firstNameEn || '',
          lastNameEn: employee.lastNameEn || '',
          email: employee.email || '',
          phone: employee.phone || '',
          dateOfBirth: employee.dateOfBirth || '',
          // .toLowerCase(): some older records were saved with mismatched
          // casing (e.g. "Thai"/"Monthly") before the backend started
          // normalizing these fields, which made the <select> below fail to
          // pre-select the current value (options are lowercase only).
          nationality: employee.nationality?.toLowerCase() || 'thai',
          idCardNumber: employee.idCardNumber || '',
          passportNumber: employee.passportNumber || '',
          address: employee.address || '',
          position: employee.position || '',
          employmentType: employee.employmentType?.toLowerCase() || 'monthly',
          salary: employee.salary,
          dailyRate: employee.dailyRate,
          bankAccountNumber: employee.bankAccountNumber || '',
          hireDate: employee.hireDate || '',
          workPermitStartDate: employee.workPermitStartDate || '',
          workPermitEndDate: employee.workPermitEndDate || '',
          hasSocialSecurity: employee.hasSocialSecurity ?? true,
          employeeStatus: employee.status?.toLowerCase() || 'active'
        });
        this.showModal.set(true);
      },
      error: (error: any) => {
        console.error('Error loading employee details:', error);
        this.notificationService.error('ไม่สามารถโหลดข้อมูลพนักงานได้');
      }
    });
  }

  openDeleteModal(employee: EmployeeListDto): void {
    this.employeesService.employeesGetEmployeeById(employee.id!).subscribe({
      next: (details: EmployeeDetailDto) => {
        this.selectedEmployee.set(details);
        this.showDeleteModal.set(true);
      },
      error: (error: any) => {
        console.error('Error loading employee details:', error);
        this.notificationService.error('ไม่สามารถโหลดข้อมูลพนักงานได้');
      }
    });
  }


  closeModal(): void {
    this.showModal.set(false);
    this.showDeleteModal.set(false);
  }

  saveEmployee(): void {
    if (this.isEditMode()) {
      this.updateEmployee();
    } else {
      this.createEmployee();
    }
  }

  createEmployee(): void {
    // Mark all fields as touched to show validation errors
    FormHelpers.markFormGroupTouched(this.employeeForm);

    // Check if form is valid
    if (this.employeeForm.invalid || this.employeeForm.pending) {
      if (this.employeeForm.pending) {
        this.notificationService.error('กำลังตรวจสอบข้อมูล กรุณารอสักครู่...');
      } else {
        const errorSummary = FormHelpers.getValidationSummary(this.employeeForm, this.getFieldLabels());
        this.notificationService.error(errorSummary);
      }
      return;
    }

    const formValue = this.employeeForm.value;

    const dto: EmployeeCreateDto = {
      employeeCode: formValue.employeeCode,
      branchId: formValue.branchId,
      firstNameTh: formValue.firstNameTh,
      lastNameTh: formValue.lastNameTh,
      firstNameEn: formValue.firstNameEn,
      lastNameEn: formValue.lastNameEn,
      email: formValue.email || undefined,
      phone: formValue.phone || undefined,
      password: formValue.password || undefined,
      dateOfBirth: formValue.dateOfBirth || undefined,
      nationality: formValue.nationality || undefined,
      idCardNumber: formValue.idCardNumber || undefined,
      passportNumber: formValue.passportNumber || undefined,
      address: formValue.address || undefined,
      position: formValue.position || undefined,
      employmentType: formValue.employmentType || undefined,
      salary: formValue.salary || undefined,
      dailyRate: formValue.dailyRate || undefined,
      bankAccountNumber: formValue.bankAccountNumber || undefined,
      hireDate: formValue.hireDate || undefined,
      workPermitStartDate: formValue.workPermitStartDate || undefined,
      workPermitEndDate: formValue.workPermitEndDate || undefined,
      hasSocialSecurity: formValue.hasSocialSecurity,
      status: formValue.employeeStatus || undefined
    };

    this.employeesService.employeesCreateEmployee(dto).subscribe({
      next: (created: EmployeeDetailDto) => {
        // Upload photo if selected
        if (this.selectedPhotoFile && created.id) {
          this.employeesService.employeesUploadPhoto(created.id, this.selectedPhotoFile).subscribe({
            next: () => {
              this.notificationService.success('สร้างพนักงานและอัปโหลดรูปภาพสำเร็จ');
              this.loadEmployees();
              this.closeModal();
            },
            error: (error: any) => {
              console.error('Error uploading photo:', error);
              this.notificationService.success('สร้างพนักงานสำเร็จ แต่อัปโหลดรูปภาพล้มเหลว');
              this.loadEmployees();
              this.closeModal();
            }
          });
        } else {
          this.notificationService.success('สร้างพนักงานสำเร็จ');
          this.loadEmployees();
          this.closeModal();
        }
      },
      error: (error: any) => {
        console.error('Error creating employee:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการสร้างพนักงาน');
      }
    });
  }

  updateEmployee(): void {
    const employee = this.selectedEmployee();
    if (!employee) return;

    // Mark all fields as touched to show validation errors
    FormHelpers.markFormGroupTouched(this.employeeForm);

    // Check if form is valid
    if (this.employeeForm.invalid || this.employeeForm.pending) {
      if (this.employeeForm.pending) {
        this.notificationService.error('กำลังตรวจสอบข้อมูล กรุณารอสักครู่...');
      } else {
        const errorSummary = FormHelpers.getValidationSummary(this.employeeForm, this.getFieldLabels());
        this.notificationService.error(errorSummary);
      }
      return;
    }

    const formValue = this.employeeForm.value;

    // Note: employeeCode is NOT sent during update (readonly field, cannot be changed)
    const dto: EmployeeUpdateDto = {
      branchId: formValue.branchId,
      firstNameTh: formValue.firstNameTh || undefined,
      lastNameTh: formValue.lastNameTh || undefined,
      firstNameEn: formValue.firstNameEn || undefined,
      lastNameEn: formValue.lastNameEn || undefined,
      email: formValue.email || undefined,
      password: formValue.password || undefined, // Optional - only sent if user wants to change password
      phone: formValue.phone || undefined,
      dateOfBirth: formValue.dateOfBirth || undefined,
      nationality: formValue.nationality || undefined,
      idCardNumber: formValue.idCardNumber || undefined,
      passportNumber: formValue.passportNumber || undefined,
      address: formValue.address || undefined,
      position: formValue.position || undefined,
      employmentType: formValue.employmentType || undefined,
      salary: formValue.salary || undefined,
      dailyRate: formValue.dailyRate || undefined,
      bankAccountNumber: formValue.bankAccountNumber || undefined,
      hireDate: formValue.hireDate || undefined,
      workPermitStartDate: formValue.workPermitStartDate || undefined,
      workPermitEndDate: formValue.workPermitEndDate || undefined,
      hasSocialSecurity: formValue.hasSocialSecurity,
      status: formValue.employeeStatus || undefined
    };

    this.employeesService.employeesUpdateEmployee(employee.id!, dto).subscribe({
      next: (updated: EmployeeDetailDto) => {
        // Upload photo if selected
        if (this.selectedPhotoFile && employee.id) {
          this.employeesService.employeesUploadPhoto(employee.id, this.selectedPhotoFile).subscribe({
            next: () => {
              this.notificationService.success('อัปเดตข้อมูลพนักงานและรูปภาพสำเร็จ');
              this.loadEmployees();
              this.closeModal();
            },
            error: (error: any) => {
              console.error('Error uploading photo:', error);
              this.notificationService.success('อัปเดตข้อมูลพนักงานสำเร็จ แต่อัปโหลดรูปภาพล้มเหลว');
              this.loadEmployees();
              this.closeModal();
            }
          });
        } else {
          this.notificationService.success('อัปเดตข้อมูลพนักงานสำเร็จ');
          this.loadEmployees();
          this.closeModal();
        }
      },
      error: (error: any) => {
        console.error('Error updating employee:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการอัปเดตพนักงาน');
      }
    });
  }

  deleteEmployee(): void {
    const employee = this.selectedEmployee();
    if (!employee) return;

    this.employeesService.employeesDeleteEmployee(employee.id!).subscribe({
      next: () => {
        this.notificationService.success('ลบพนักงานสำเร็จ');
        this.loadEmployees();
        this.closeModal();
      },
      error: (error: any) => {
        console.error('Error deleting employee:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการลบพนักงาน');
      }
    });
  }

  // Photo upload methods
  onFormPhotoFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedPhotoFile = file;
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreviewUrl.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  removeFormPhoto(): void {
    this.selectedPhotoFile = null;
    this.photoPreviewUrl.set(
      this.isEditMode() && this.selectedEmployee()?.photoUrl
        ? this.getPhotoUrl(this.selectedEmployee()!.photoUrl!)
        : null
    );
  }

  getPaginatedEmployees(): EmployeeListDto[] {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredEmployees().slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredEmployees().length / this.itemsPerPage());
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

  getEmploymentTypeLabel(type: string | null | undefined): string {
    const found = this.employmentTypes.find(t => t.value === type?.toLowerCase());
    return found ? found.label : type || '-';
  }

  getNationalityLabel(nationality: string | null | undefined): string {
    const found = this.nationalities.find(n => n.value === nationality?.toLowerCase());
    return found ? found.label : nationality || '-';
  }

  getStatusLabel(status: string | null | undefined): string {
    const found = this.statuses.find(s => s.value === status?.toLowerCase());
    return found ? found.label : status || '-';
  }

  getBranchName(branchId: number | undefined): string {
    if (!branchId) return '-';
    const branch = this.branches().find(b => b.id === branchId);
    return branch?.name || '-';
  }

  formatDate(date: string | null | undefined): string {
    return formatThaiDate(date);
  }

  calculateAge(dateOfBirth: string | null | undefined): number | null {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  onEmploymentTypeChange(value: string): void {
    // Reset salary fields when changing employment type
    if (value === 'monthly') {
      this.employeeForm.get('dailyRate')?.setValue(null);
    } else if (value === 'daily') {
      this.employeeForm.get('salary')?.setValue(null);
    }
  }

  getPhotoUrl(photoUrl: string | null | undefined): string | null {
    if (!photoUrl) return null;
    // If photoUrl is already an absolute URL, return as is
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }
    // Otherwise, prepend the API base URL
    const baseUrl = environment.apiUrl.replace('/api', ''); // Remove /api suffix if exists
    return `${baseUrl}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
  }
}

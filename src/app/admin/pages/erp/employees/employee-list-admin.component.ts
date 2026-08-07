import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeesService, BranchesService } from '../../../../services/openapi-client';
import {
  EmployeeListDto,
  EmployeeDetailDto,
  EmployeeCreateDto,
  EmployeeUpdateDto,
  BranchDto,
  ApiResponseDtoOfIEnumerableOfBranchDto
} from '../../../../services/openapi-client/model/models';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-employee-list-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-list-admin.component.html',
  styleUrls: ['./employee-list-admin.component.css']
})
export class EmployeeListAdminComponent implements OnInit {
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
  employeeForm: any = {
    employeeCode: '',
    branchId: null,
    firstNameTh: '',
    lastNameTh: '',
    firstNameEn: '',
    lastNameEn: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationality: 'Thai',
    idCardNumber: '',
    passportNumber: '',
    address: '',
    position: '',
    employmentType: 'Monthly',
    salary: null,
    dailyRate: null,
    bankAccountNumber: '',
    hireDate: '',
    workPermitStartDate: '',
    workPermitEndDate: '',
    hasSocialSecurity: true,
    status: 'Active'
  };

  // Dropdown options
  employmentTypes = [
    { value: 'Monthly', label: 'รายเดือน' },
    { value: 'Daily', label: 'รายวัน' }
  ];

  nationalities = [
    { value: 'Thai', label: 'ไทย' },
    { value: 'Myanmar', label: 'เมียนมา' },
    { value: 'Lao', label: 'ลาว' },
    { value: 'Cambodian', label: 'กัมพูชา' },
    { value: 'Vietnamese', label: 'เวียดนาม' },
    { value: 'Other', label: 'อื่นๆ' }
  ];

  statuses = [
    { value: 'Active', label: 'ทำงานอยู่' },
    { value: 'On Leave', label: 'ลาพัก' },
    { value: 'Resigned', label: 'ลาออก' },
    { value: 'Terminated', label: 'เลิกจ้าง' }
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
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
    this.loadBranches();
  }

  loadEmployees(): void {
    this.loading.set(true);
    this.employeesService.apiEmployeesGet().subscribe({
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
    this.branchesService.apiErpBranchesGet().subscribe({
      next: (response: ApiResponseDtoOfIEnumerableOfBranchDto) => {
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
      filtered = filtered.filter(emp => emp.employmentType === this.selectedEmploymentType());
    }

    // Nationality filter
    if (this.selectedNationality()) {
      filtered = filtered.filter(emp => emp.nationality === this.selectedNationality());
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
    const today = new Date().toISOString().split('T')[0];
    this.employeeForm = {
      employeeCode: '',
      branchId: null,
      firstNameTh: '',
      lastNameTh: '',
      firstNameEn: '',
      lastNameEn: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      nationality: 'Thai',
      idCardNumber: '',
      passportNumber: '',
      address: '',
      position: '',
      employmentType: 'Monthly',
      salary: null,
      dailyRate: null,
      bankAccountNumber: '',
      hireDate: today,
      workPermitStartDate: '',
      workPermitEndDate: '',
      hasSocialSecurity: true,
      status: 'Active'
    };
    this.showModal.set(true);
  }

  openEditModal(employeeListItem: EmployeeListDto): void {
    // Load full employee details
    this.employeesService.apiEmployeesIdGet(employeeListItem.id!).subscribe({
      next: (employee: EmployeeDetailDto) => {
        this.isEditMode.set(true);
        this.selectedEmployee.set(employee);
        this.selectedPhotoFile = null;
        this.photoPreviewUrl.set(employee.photoUrl || null);
        this.employeeForm = {
          employeeCode: employee.employeeCode,
          branchId: employee.branchId,
          firstNameTh: employee.firstNameTh || '',
          lastNameTh: employee.lastNameTh || '',
          firstNameEn: employee.firstNameEn || '',
          lastNameEn: employee.lastNameEn || '',
          email: employee.email || '',
          phone: employee.phone || '',
          dateOfBirth: employee.dateOfBirth || '',
          nationality: employee.nationality || 'Thai',
          idCardNumber: employee.idCardNumber || '',
          passportNumber: employee.passportNumber || '',
          address: employee.address || '',
          position: employee.position || '',
          employmentType: employee.employmentType || 'Monthly',
          salary: employee.salary,
          dailyRate: employee.dailyRate,
          bankAccountNumber: employee.bankAccountNumber || '',
          hireDate: employee.hireDate || '',
          workPermitStartDate: employee.workPermitStartDate || '',
          workPermitEndDate: employee.workPermitEndDate || '',
          hasSocialSecurity: employee.hasSocialSecurity ?? true,
          status: employee.status || 'Active'
        };
        this.showModal.set(true);
      },
      error: (error: any) => {
        console.error('Error loading employee details:', error);
        this.notificationService.error('ไม่สามารถโหลดข้อมูลพนักงานได้');
      }
    });
  }

  openDeleteModal(employee: EmployeeListDto): void {
    this.employeesService.apiEmployeesIdGet(employee.id!).subscribe({
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
    const dto: EmployeeCreateDto = {
      employeeCode: this.employeeForm.employeeCode,
      branchId: this.employeeForm.branchId,
      firstNameTh: this.employeeForm.firstNameTh,
      lastNameTh: this.employeeForm.lastNameTh,
      firstNameEn: this.employeeForm.firstNameEn,
      lastNameEn: this.employeeForm.lastNameEn,
      email: this.employeeForm.email || undefined,
      phone: this.employeeForm.phone || undefined,
      dateOfBirth: this.employeeForm.dateOfBirth || undefined,
      nationality: this.employeeForm.nationality || undefined,
      idCardNumber: this.employeeForm.idCardNumber || undefined,
      passportNumber: this.employeeForm.passportNumber || undefined,
      address: this.employeeForm.address || undefined,
      position: this.employeeForm.position || undefined,
      employmentType: this.employeeForm.employmentType || undefined,
      salary: this.employeeForm.salary || undefined,
      dailyRate: this.employeeForm.dailyRate || undefined,
      bankAccountNumber: this.employeeForm.bankAccountNumber || undefined,
      hireDate: this.employeeForm.hireDate || undefined,
      workPermitStartDate: this.employeeForm.workPermitStartDate || undefined,
      workPermitEndDate: this.employeeForm.workPermitEndDate || undefined,
      hasSocialSecurity: this.employeeForm.hasSocialSecurity,
      status: this.employeeForm.status || undefined
    };

    this.employeesService.apiEmployeesPost(dto).subscribe({
      next: (created: EmployeeDetailDto) => {
        // Upload photo if selected
        if (this.selectedPhotoFile && created.id) {
          this.employeesService.apiEmployeesIdPhotoPost(created.id, this.selectedPhotoFile).subscribe({
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

    const dto: EmployeeUpdateDto = {
      employeeCode: this.employeeForm.employeeCode,
      branchId: this.employeeForm.branchId,
      firstNameTh: this.employeeForm.firstNameTh || undefined,
      lastNameTh: this.employeeForm.lastNameTh || undefined,
      firstNameEn: this.employeeForm.firstNameEn || undefined,
      lastNameEn: this.employeeForm.lastNameEn || undefined,
      email: this.employeeForm.email || undefined,
      phone: this.employeeForm.phone || undefined,
      dateOfBirth: this.employeeForm.dateOfBirth || undefined,
      nationality: this.employeeForm.nationality || undefined,
      idCardNumber: this.employeeForm.idCardNumber || undefined,
      passportNumber: this.employeeForm.passportNumber || undefined,
      address: this.employeeForm.address || undefined,
      position: this.employeeForm.position || undefined,
      employmentType: this.employeeForm.employmentType || undefined,
      salary: this.employeeForm.salary || undefined,
      dailyRate: this.employeeForm.dailyRate || undefined,
      bankAccountNumber: this.employeeForm.bankAccountNumber || undefined,
      hireDate: this.employeeForm.hireDate || undefined,
      workPermitStartDate: this.employeeForm.workPermitStartDate || undefined,
      workPermitEndDate: this.employeeForm.workPermitEndDate || undefined,
      hasSocialSecurity: this.employeeForm.hasSocialSecurity,
      status: this.employeeForm.status || undefined
    };

    this.employeesService.apiEmployeesIdPut(employee.id!, dto).subscribe({
      next: (updated: EmployeeDetailDto) => {
        // Upload photo if selected
        if (this.selectedPhotoFile && employee.id) {
          this.employeesService.apiEmployeesIdPhotoPost(employee.id, this.selectedPhotoFile).subscribe({
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

    this.employeesService.apiEmployeesIdDelete(employee.id!).subscribe({
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
        ? this.selectedEmployee()!.photoUrl!
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
    const found = this.employmentTypes.find(t => t.value === type);
    return found ? found.label : type || '-';
  }

  getNationalityLabel(nationality: string | null | undefined): string {
    const found = this.nationalities.find(n => n.value === nationality);
    return found ? found.label : nationality || '-';
  }

  getStatusLabel(status: string | null | undefined): string {
    const found = this.statuses.find(s => s.value === status);
    return found ? found.label : status || '-';
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
    if (value === 'Monthly') {
      this.employeeForm.dailyRate = null;
    } else if (value === 'Daily') {
      this.employeeForm.salary = null;
    }
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeesService, BranchesService } from '../../../../services/openapi-client';
import {
  EmployeeDto,
  ApiResponseDtoOfIEnumerableOfEmployeeDto,
  CreateEmployeeDto,
  UpdateEmployeeDto,
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
  employees = signal<EmployeeDto[]>([]);
  filteredEmployees = signal<EmployeeDto[]>([]);
  branches = signal<BranchDto[]>([]);
  loading = signal(true);

  // Filters
  searchTerm = signal('');
  selectedBranch = signal<string>('');
  selectedRole = signal<string>('');

  // Modal
  showModal = signal(false);
  showDeleteModal = signal(false);
  isEditMode = signal(false);
  selectedEmployee = signal<EmployeeDto | null>(null);

  // Form
  employeeForm: any = {
    email: '',
    password: '',
    role: 'staff', // Default role = Staff
    employeeCode: '',
    firstName: '',
    lastName: '',
    phone: '',
    position: '',
    salary: 0,
    commissionRate: 0,
    branchId: null
  };

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
    this.employeesService.apiErpEmployeesGet().subscribe({
      next: (response: ApiResponseDtoOfIEnumerableOfEmployeeDto) => {
        if (response.success && response.data) {
          let employees = response.data;

          // IMPORTANT: Only show actual employees
          // Filter to show only those with employee_code
          employees = employees.filter((e: EmployeeDto) => e.employeeCode);

          this.employees.set(employees);
          this.applyFilters();
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading employees:', error);
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
        emp.position?.toLowerCase().includes(search)
      );
    }

    // Branch filter
    if (this.selectedBranch()) {
      filtered = filtered.filter(emp => emp.branchId?.toString() === this.selectedBranch());
    }

    // Role filter
    if (this.selectedRole()) {
      filtered = filtered.filter(emp => emp.role === this.selectedRole());
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

  onRoleFilterChange(value: string): void {
    this.selectedRole.set(value);
    this.applyFilters();
  }

  openAddModal(): void {
    this.isEditMode.set(false);
    this.selectedEmployee.set(null);
    this.employeeForm = {
      email: '',
      password: '',
      role: 'sales',
      employeeCode: '',
      firstName: '',
      lastName: '',
      phone: '',
      position: '',
      salary: 0,
      commissionRate: 0,
      branchId: null
    };
    this.showModal.set(true);
  }

  openEditModal(employee: EmployeeDto): void {
    this.isEditMode.set(true);
    this.selectedEmployee.set(employee);
    this.employeeForm = {
      email: employee.email,
      role: employee.role,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone,
      position: employee.position,
      salary: employee.salary || 0,
      commissionRate: employee.commissionRate || 0,
      branchId: employee.branchId
    };
    this.showModal.set(true);
  }

  openDeleteModal(employee: EmployeeDto): void {
    this.selectedEmployee.set(employee);
    this.showDeleteModal.set(true);
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
    const dto: CreateEmployeeDto = {
      email: this.employeeForm.email,
      password: this.employeeForm.password,
      role: this.employeeForm.role,
      employeeCode: this.employeeForm.employeeCode,
      firstName: this.employeeForm.firstName,
      lastName: this.employeeForm.lastName,
      phone: this.employeeForm.phone,
      position: this.employeeForm.position,
      salary: this.employeeForm.salary,
      commissionRate: this.employeeForm.commissionRate,
      branchId: this.employeeForm.branchId
    };

    this.employeesService.apiErpEmployeesPost(dto).subscribe({
      next: (response: any) => {
        if (response.success) {
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

    const dto: UpdateEmployeeDto = {
      email: this.employeeForm.email,
      role: this.employeeForm.role,
      firstName: this.employeeForm.firstName,
      lastName: this.employeeForm.lastName,
      phone: this.employeeForm.phone,
      position: this.employeeForm.position,
      salary: this.employeeForm.salary,
      commissionRate: this.employeeForm.commissionRate,
      branchId: this.employeeForm.branchId
    };

    this.employeesService.apiErpEmployeesIdPut(employee.id!, dto).subscribe({
      next: (response: any) => {
        if (response.success) {
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

    this.employeesService.apiErpEmployeesIdDelete(employee.id!).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadEmployees();
          this.closeModal();
        }
      },
      error: (error: any) => {
        console.error('Error deleting employee:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการลบพนักงาน');
      }
    });
  }

  getPaginatedEmployees(): EmployeeDto[] {
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

  getRoleLabel(role: string | null | undefined): string {
    const found = this.roles.find(r => r.value === role);
    return found ? found.label : role || '-';
  }

  getBranchName(branchId: number | undefined): string {
    if (!branchId) return '-';
    const branch = this.branches().find(b => b.id === branchId);
    return branch?.name || '-';
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminUserService } from '../../services/admin-user.service';
import { UserDto } from '../../../services/openapi-client/model/models';
import { NotificationService } from '../../../services/notification.service';

interface CreateEmployeeForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  employeeCode: string;
  position: string;
  branchId?: number;
  salary?: number;
  commissionRate?: number;
  hireDate?: string;
}

@Component({
  selector: 'app-employee-list-admin',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">จัดการพนักงาน</h1>
          <p class="page-description">สร้างและจัดการบัญชีพนักงานและผู้ดูแลระบบ</p>
        </div>
        <button
          (click)="showCreateModal = true"
          class="btn-primary">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          เพิ่มพนักงานใหม่
        </button>
      </div>

      <!-- Filter Tabs -->
      <div class="filter-tabs">
        <button
          (click)="filterRole = 'all'"
          [class.active]="filterRole === 'all'"
          class="filter-tab">
          ทั้งหมด
        </button>
        <button
          (click)="filterRole = 'employee'"
          [class.active]="filterRole === 'employee'"
          class="filter-tab">
          พนักงาน
        </button>
        <button
          (click)="filterRole = 'admin'"
          [class.active]="filterRole === 'admin'"
          class="filter-tab">
          ผู้ดูแลระบบ
        </button>
        <button
          (click)="filterRole = 'super_admin'"
          [class.active]="filterRole === 'super_admin'"
          class="filter-tab">
          Super Admin
        </button>
      </div>

      <!-- Employees List -->
      <div class="card">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>รหัสพนักงาน</th>
                <th>ชื่อ-นามสกุล</th>
                <th>อีเมล</th>
                <th>ตำแหน่ง</th>
                <th>Role</th>
                <th>สถานะ</th>
                <th>วันที่เริ่มงาน</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              @for (user of filteredUsers; track user.id) {
                <tr>
                  <td>{{ user.id }}</td>
                  <td>
                    <div class="font-medium">{{ user.fullName }}</div>
                    <div class="text-sm text-gray-500">{{ user.phone || '-' }}</div>
                  </td>
                  <td>{{ user.email }}</td>
                  <td>-</td>
                  <td>
                    <span [class]="getRoleBadgeClass(user.role)">
                      {{ getRoleLabel(user.role) }}
                    </span>
                  </td>
                  <td>
                    <span [class]="getStatusBadgeClass(user.status)">
                      {{ getStatusLabel(user.status) }}
                    </span>
                  </td>
                  <td>{{ user.createdAt || '-' }}</td>
                  <td>
                    <div class="flex gap-2">
                      <button
                        (click)="editEmployee(user)"
                        class="btn-sm btn-secondary"
                        title="แก้ไข">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      <button
                        (click)="toggleUserStatus(user)"
                        [class]="user.status === 'active' ? 'btn-sm btn-danger' : 'btn-sm btn-success'"
                        [title]="user.status === 'active' ? 'ระงับ' : 'เปิดใช้งาน'">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="text-center py-8 text-gray-500">
                    ไม่พบข้อมูลพนักงาน
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create Employee Modal -->
      @if (showCreateModal) {
        <div class="modal-overlay" (click)="showCreateModal = false">
          <div class="modal-content max-w-2xl" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">เพิ่มพนักงานใหม่</h2>
              <button (click)="showCreateModal = false" class="modal-close">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form (ngSubmit)="createEmployee()" class="modal-body space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="form-group">
                  <label class="form-label">อีเมล *</label>
                  <input
                    type="email"
                    [(ngModel)]="newEmployee.email"
                    name="email"
                    required
                    class="form-input"
                    placeholder="employee@example.com" />
                </div>

                <div class="form-group">
                  <label class="form-label">รหัสผ่าน *</label>
                  <input
                    type="password"
                    [(ngModel)]="newEmployee.password"
                    name="password"
                    required
                    minlength="6"
                    class="form-input"
                    placeholder="อย่างน้อย 6 ตัวอักษร" />
                </div>

                <div class="form-group">
                  <label class="form-label">ชื่อ *</label>
                  <input
                    type="text"
                    [(ngModel)]="newEmployee.firstName"
                    name="firstName"
                    required
                    class="form-input" />
                </div>

                <div class="form-group">
                  <label class="form-label">นามสกุล *</label>
                  <input
                    type="text"
                    [(ngModel)]="newEmployee.lastName"
                    name="lastName"
                    required
                    class="form-input" />
                </div>

                <div class="form-group">
                  <label class="form-label">เบอร์โทร</label>
                  <input
                    type="tel"
                    [(ngModel)]="newEmployee.phone"
                    name="phone"
                    class="form-input" />
                </div>

                <div class="form-group">
                  <label class="form-label">Role *</label>
                  <select
                    [(ngModel)]="newEmployee.role"
                    name="role"
                    required
                    class="form-input">
                    <option value="employee">พนักงาน (Employee)</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">รหัสพนักงาน</label>
                  <input
                    type="text"
                    [(ngModel)]="newEmployee.employeeCode"
                    name="employeeCode"
                    class="form-input"
                    placeholder="EMP001" />
                </div>

                <div class="form-group">
                  <label class="form-label">ตำแหน่ง</label>
                  <input
                    type="text"
                    [(ngModel)]="newEmployee.position"
                    name="position"
                    class="form-input"
                    placeholder="เช่น ผู้จัดการ, พนักงานขาย" />
                </div>

                <div class="form-group">
                  <label class="form-label">เงินเดือน</label>
                  <input
                    type="number"
                    [(ngModel)]="newEmployee.salary"
                    name="salary"
                    class="form-input"
                    placeholder="15000" />
                </div>

                <div class="form-group">
                  <label class="form-label">% คอมมิชชั่น</label>
                  <input
                    type="number"
                    [(ngModel)]="newEmployee.commissionRate"
                    name="commissionRate"
                    min="0"
                    max="100"
                    step="0.1"
                    class="form-input"
                    placeholder="0-100" />
                </div>

                <div class="form-group col-span-2">
                  <label class="form-label">วันที่เริ่มงาน</label>
                  <input
                    type="date"
                    [(ngModel)]="newEmployee.hireDate"
                    name="hireDate"
                    class="form-input" />
                </div>
              </div>

              <div class="modal-footer">
                <button
                  type="button"
                  (click)="showCreateModal = false"
                  class="btn-secondary">
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  [disabled]="isLoading"
                  class="btn-primary">
                  @if (isLoading) {
                    <span class="loader"></span>
                  } @else {
                    <span>บันทึก</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Add your component styles here */
  `]
})
export class EmployeeListAdminComponent implements OnInit {
  users: UserDto[] = [];
  filteredUsers: UserDto[] = [];
  filterRole: string = 'all';
  showCreateModal = false;
  isLoading = false;

  newEmployee: CreateEmployeeForm = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'employee',
    employeeCode: '',
    position: ''
  };

  constructor(
    private adminUserService: AdminUserService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.adminUserService.getAllUsers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.users = response.data.filter(u =>
            u.role !== 'customer'
          );
          this.applyFilter();
        }
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  applyFilter() {
    if (this.filterRole === 'all') {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter(u => u.role === this.filterRole);
    }
  }

  createEmployee() {
    this.isLoading = true;
    this.adminUserService.createEmployee(this.newEmployee as any).subscribe({
      next: (response) => {
        if (response.success) {
          this.showCreateModal = false;
          this.resetForm();
          this.loadUsers();
          this.notificationService.success('สร้างบัญชีพนักงานสำเร็จ');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error creating employee:', error);
        this.notificationService.error('เกิดข้อผิดพลาดในการสร้างบัญชีพนักงาน');
        this.isLoading = false;
      }
    });
  }

  editEmployee(user: UserDto) {
    // Implement edit functionality
    this.router.navigate(['/admin/employees', user.id]);
  }

  toggleUserStatus(user: UserDto) {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const actionText = user.status === 'active' ? 'ระงับ' : 'เปิดใช้งาน';
    const fullName = user.fullName || `${user.firstName} ${user.lastName}`;

    this.notificationService.confirm(
      `คุณต้องการ${actionText}บัญชีของ ${fullName} ใช่หรือไม่?`,
      () => {
        // On confirm
        this.adminUserService.updateUserStatus(user.id!, newStatus).subscribe({
          next: (response) => {
            if (response.success) {
              this.loadUsers();
              this.notificationService.success(`${actionText}บัญชีสำเร็จ`);
            }
          },
          error: (error) => {
            console.error('Error updating user status:', error);
            this.notificationService.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
          }
        });
      },
      undefined, // On cancel (optional)
      'ยืนยัน',
      'ยกเลิก',
      user.status === 'active' ? 'danger' : 'info'
    );
  }

  getRoleBadgeClass(role?: string | null): string {
    switch (role) {
      case 'super_admin':
        return 'badge badge-purple';
      case 'admin':
        return 'badge badge-blue';
      case 'employee':
        return 'badge badge-green';
      default:
        return 'badge badge-gray';
    }
  }

  getRoleLabel(role?: string | null): string {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'ผู้ดูแลระบบ';
      case 'employee':
        return 'พนักงาน';
      default:
        return role || '-';
    }
  }

  getStatusBadgeClass(status?: string | null): string {
    return status === 'active' ? 'badge badge-success' : 'badge badge-danger';
  }

  getStatusLabel(status?: string | null): string {
    return status === 'active' ? 'ใช้งาน' : 'ระงับ';
  }

  resetForm() {
    this.newEmployee = {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: 'employee',
      employeeCode: '',
      position: ''
    };
  }
}

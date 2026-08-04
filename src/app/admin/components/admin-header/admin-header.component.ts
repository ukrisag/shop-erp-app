import { Component, EventEmitter, Output, inject, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { EmployeeAuthService } from '../../../services/employee-auth.service';
import { PermissionService } from '../../../services/permission.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminHeaderComponent implements OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  authService = inject(AuthService);
  employeeAuthService = inject(EmployeeAuthService);
  permissionService = inject(PermissionService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  isUserMenuOpen = signal(false);
  searchQuery = '';
  notificationCount = 3; // Mock notification count
  private clickListener?: (event: Event) => void;

  constructor() {
    this.setupClickOutside();
  }

  ngOnDestroy(): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
    }
  }

  private setupClickOutside(): void {
    this.clickListener = (event: Event) => {
      const target = event.target as HTMLElement;
      const userMenu = document.querySelector('.user-menu');
      if (this.isUserMenuOpen() && userMenu && !userMenu.contains(target)) {
        this.isUserMenuOpen.set(false);
      }
    };
    document.addEventListener('click', this.clickListener);
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleNotifications(): void {
    console.log('Toggle notifications');
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update(value => !value);
  }

  onSearchFocus(): void {
    // Search focused
  }

  onSearchBlur(): void {
    // Search blurred
  }

  get userName(): string {
    const employee = this.employeeAuthService.currentEmployeeValue;
    if (employee) {
      return employee.fullName || employee.email || 'Admin';
    }
    return 'Admin';
  }

  get userRole(): string {
    return this.permissionService.getRoleDisplayName();
  }

  logout(): void {
    this.notificationService.confirm(
      'คุณต้องการออกจากระบบหรือไม่?',
      () => {
        this.employeeAuthService.logout();
      },
      undefined,
      'ออกจากระบบ',
      'ยกเลิก',
      'warning'
    );
  }
}

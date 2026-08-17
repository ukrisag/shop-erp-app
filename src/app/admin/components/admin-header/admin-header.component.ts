import { Component, EventEmitter, Output, inject, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { EmployeeAuthService } from '../../../services/employee-auth.service';
import { PermissionService } from '../../../services/permission.service';
import { NotificationService } from '../../../services/notification.service';
import { ThemeService } from '../../../services/theme.service';
import { EmployeeAuthDto } from '../../../models/employee.model';

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
  themeService = inject(ThemeService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  isProfileMenuOpen = false;
  searchQuery = '';
  notificationCount = 3;
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
      const userMenu = document.querySelector('[#profileMenuRef]');
      if (this.isProfileMenuOpen && userMenu && !userMenu.contains(target)) {
        this.isProfileMenuOpen = false;
      }
    };
    document.addEventListener('click', this.clickListener);
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
  }

  onSearchFocus(): void {
    // Search focused
  }

  onSearchBlur(): void {
    // Search blurred
  }

  get currentEmployee(): EmployeeAuthDto | null {
    return this.employeeAuthService.currentEmployeeValue;
  }

  getUserInitials(): string {
    const name = this.currentEmployee?.fullName || this.currentEmployee?.email || 'A';
    return name.charAt(0).toUpperCase();
  }

  get userRole(): string {
    return this.permissionService.getRoleDisplayName();
  }

  logout(): void {
    this.isProfileMenuOpen = false;
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

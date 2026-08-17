import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PermissionService, Permission } from '../../../services/permission.service';

interface MenuItem {
  label: string;
  icon?: string;
  iconType?: 'svg' | 'emoji';
  route?: string;
  queryParams?: { [key: string]: any };
  badge?: number;
  active?: boolean;
  children?: MenuItem[];
  isOpen?: boolean;
  permission?: Permission; // Permission required to view this menu item
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminSidebarComponent {
  @Input() isOpen: boolean = true;
  @Output() close = new EventEmitter<void>();

  private permissionService = inject(PermissionService);
  isSettingsOpen = false;

  menuItems: MenuItem[] = [
    {
      label: 'แดชบอร์ด',
      route: '/admin/dashboard',
      permission: Permission.VIEW_DASHBOARD
    },
    {
      label: 'E-Commerce',
      isOpen: false,
      children: [
        {
          label: 'สินค้า',
          route: '/admin/products',
          permission: Permission.VIEW_PRODUCTS
        },
        {
          label: 'คำสั่งซื้อออนไลน์',
          route: '/admin/orders',
          permission: Permission.VIEW_ORDERS
        },
        {
          label: 'ลูกค้าออนไลน์',
          route: '/admin/customers',
          permission: Permission.VIEW_CUSTOMERS
        },
        {
          label: 'รีวิว',
          route: '/admin/reviews',
          permission: Permission.VIEW_REVIEWS
        },
        {
          label: 'คูปอง',
          route: '/admin/coupons',
          permission: Permission.VIEW_COUPONS
        },
        {
          label: 'หมวดหมู่',
          route: '/admin/categories',
          permission: Permission.VIEW_CATEGORIES
        },
        {
          label: 'แบรนด์',
          route: '/admin/brands',
          permission: Permission.VIEW_BRANDS
        },
        {
          label: 'คลังภาพ',
          route: '/admin/gallery',
          permission: Permission.VIEW_GALLERY
        }
      ]
    },
    {
      label: 'ข้อมูลหลัก',
      isOpen: false,
      children: [
        {
          label: 'สาขา',
          route: '/admin/erp/branches',
          permission: Permission.VIEW_BRANCHES
        },
        {
          label: 'พนักงาน',
          route: '/admin/erp/employees',
          permission: Permission.VIEW_EMPLOYEES
        }
      ]
    },
    {
      label: 'ขายและจัดส่ง',
      isOpen: false,
      children: [
        {
          label: 'ขายและชำระเงิน',
          route: '/admin/erp/sales',
          permission: Permission.VIEW_ERP
        },
        {
          label: 'ใบเบิกสินค้า',
          route: '/admin/erp/material-requisitions',
          permission: Permission.VIEW_ERP
        },
        {
          label: 'จัดส่งสินค้า',
          route: '/admin/erp/deliveries',
          permission: Permission.VIEW_ERP
        }
      ]
    },
    {
      label: 'บริหารบุคคลและเงินเดือน',
      isOpen: false,
      children: [
        {
          label: 'เงินเดือน',
          route: '/admin/erp/payroll',
          permission: Permission.VIEW_ERP
        },
        {
          label: 'โอที (OT)',
          route: '/admin/erp/overtime',
          permission: Permission.VIEW_ERP
        },
        {
          label: 'การลา',
          route: '/admin/erp/leave',
          permission: Permission.VIEW_ERP
        },
        {
          label: 'เบิกเงินล่วงหน้า',
          route: '/admin/erp/advance',
          permission: Permission.VIEW_ERP
        },
        {
          label: 'ค่า Passport Fee',
          route: '/admin/erp/passport-fee',
          permission: Permission.VIEW_ERP
        }
      ]
    },
    {
      label: 'การเงิน',
      isOpen: false,
      children: [
        {
          label: 'รายจ่าย',
          route: '/admin/erp/expenses',
          permission: Permission.VIEW_ERP
        },
        {
          label: 'บัญชีธนาคาร',
          route: '/admin/erp/banking',
          queryParams: { tab: 'accounts' },
          permission: Permission.VIEW_ERP
        },
        {
          label: 'ธุรกรรมธนาคาร',
          route: '/admin/erp/banking',
          queryParams: { tab: 'transactions' },
          permission: Permission.VIEW_ERP
        }
      ]
    },
    // {
    //   label: 'จัดการระบบ',
    //   isOpen: false,
    //   permission: Permission.VIEW_SETTINGS,
    //   children: [
    //     {
    //       label: 'พนักงาน & Admin',
    //       route: '/admin/employees',
    //       permission: Permission.VIEW_EMPLOYEES
    //     }
    //   ]
    // }
  ];

  onMenuItemClick(event: Event): void {
    // Close sidebar on mobile
    this.onClose();
  }

  onMenuItemHover(event: Event): void {
    // Menu item hover effect
  }

  toggleSettings(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
    console.log('Toggle settings menu');
  }

  toggleSubmenu(item: MenuItem): void {
    if (item.children) {
      item.isOpen = !item.isOpen;
    }
  }

  getIconPath(route?: string, label?: string): string {
    // Return SVG path based on route or label
    if (route) {
      switch (route) {
        case '/admin/dashboard':
          return 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6';
        case '/admin/products':
          return 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4';
        case '/admin/orders':
          return 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z';
        case '/admin/customers':
          return 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z';
        case '/admin/erp/employees':
          return 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z';
        case '/admin/reviews':
          return 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z';
        case '/admin/coupons':
          return 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z';
        case '/admin/categories':
          return 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z';
        case '/admin/brands':
          return 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z';
        case '/admin/gallery':
          return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
        case '/admin/erp/branches':
          return 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4';
        case '/admin/erp/customers':
          return 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
        case '/admin/erp/sales':
          return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
        case '/admin/erp/material-requisitions':
          return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4';
        case '/admin/erp/deliveries':
          return 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0';
        case '/admin/erp/expenses':
          return 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z';
        case '/admin/erp/payroll':
          return 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
        case '/admin/erp/overtime':
          return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
        case '/admin/erp/leave':
          return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
        case '/admin/erp/advance':
          return 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z';
        case '/admin/erp/passport-fee':
          return 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2';
        case '/admin/erp/banking':
          return 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z';
        case '/admin/employees':
          return 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z';
        default:
          return 'M4 6h16M4 12h16M4 18h16';
      }
    }

    // For parent menu items without route
    if (label) {
      switch (label) {
        case 'E-Commerce':
          return 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z';
        case 'ข้อมูลหลัก':
          return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
        case 'ขายและจัดส่ง':
          return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';
        case 'บริหารบุคคลและเงินเดือน':
          return 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z';
        case 'การเงิน':
          return 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
        case 'จัดการระบบ':
          return 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z';
        default:
          return 'M4 6h16M4 12h16M4 18h16';
      }
    }

    return 'M4 6h16M4 12h16M4 18h16'; // Default icon
  }

  onClose(): void {
    this.close.emit();
  }

  /**
   * Check if user has permission to view menu item
   */
  hasPermission(item: MenuItem): boolean {
    // If no permission specified, show to everyone
    if (!item.permission) {
      return true;
    }
    return this.permissionService.hasPermission(item.permission);
  }

  /**
   * Get filtered children based on permissions
   */
  getVisibleChildren(children?: MenuItem[]): MenuItem[] {
    if (!children) {
      return [];
    }
    return children.filter(child => this.hasPermission(child));
  }

  /**
   * Check if parent menu item should be shown (has visible children)
   */
  shouldShowParent(item: MenuItem): boolean {
    // If item has a route, check its own permission
    if (item.route) {
      return this.hasPermission(item);
    }
    // If item has children, check if any children are visible
    if (item.children) {
      const visibleChildren = this.getVisibleChildren(item.children);
      return visibleChildren.length > 0;
    }
    // Check parent's own permission
    return this.hasPermission(item);
  }
}

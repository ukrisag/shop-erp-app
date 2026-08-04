import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { PermissionService, Permission } from '../services/permission.service';
import { NotificationService } from '../services/notification.service';

/**
 * Route guard to check if user has required permission to access a route
 *
 * Usage in routes:
 * {
 *   path: 'products',
 *   component: ProductsComponent,
 *   canActivate: [permissionGuard],
 *   data: { permission: Permission.VIEW_PRODUCTS }
 * }
 */
export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  // Get required permission from route data
  const requiredPermission = route.data['permission'] as Permission;

  // If no permission specified, allow access (backward compatibility)
  if (!requiredPermission) {
    console.warn(`Route ${route.url} has no permission requirement`);
    return true;
  }

  // Check if user has the required permission
  const hasPermission = permissionService.hasPermission(requiredPermission);

  if (!hasPermission) {
    // Show error message
    notificationService.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบ');

    // Redirect to dashboard
    router.navigate(['/admin/dashboard']);
    return false;
  }

  return true;
};

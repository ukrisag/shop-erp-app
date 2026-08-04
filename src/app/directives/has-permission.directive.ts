import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { PermissionService, Permission } from '../services/permission.service';
import { EmployeeAuthService } from '../services/employee-auth.service';

@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private permissions: Permission[] = [];
  private subscription?: Subscription;

  @Input()
  set hasPermission(permissions: Permission | Permission[]) {
    this.permissions = Array.isArray(permissions) ? permissions : [permissions];
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService,
    private employeeAuthService: EmployeeAuthService
  ) {}

  ngOnInit() {
    // Subscribe to employee changes to update view when user logs in/out
    this.subscription = this.employeeAuthService.currentEmployee$.subscribe(() => {
      this.updateView();
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  private updateView() {
    const hasPermission = this.permissions.length === 0 ||
                          this.permissionService.hasAnyPermission(...this.permissions);

    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}

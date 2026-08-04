import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { EmployeeAuthService } from '../../services/employee-auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLoginComponent {
  private fb = inject(FormBuilder);
  private employeeAuthService = inject(EmployeeAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  loginForm: FormGroup;
  loading = signal(false);
  errorMessage = signal<string>('');
  returnUrl: string = '/admin';
  showPassword = false;
  rememberMe = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    const credentials = this.loginForm.value;

    this.employeeAuthService.login(credentials).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.notificationService.success('เข้าสู่ระบบสำเร็จ');
        this.router.navigate([this.returnUrl]);
      },
      error: (error) => {
        this.loading.set(false);
        const errorMsg = error?.error?.message || error?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
        this.errorMessage.set(errorMsg);
        this.notificationService.error(errorMsg);
      }
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}

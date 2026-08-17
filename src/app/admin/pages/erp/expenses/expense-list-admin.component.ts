import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExpensesService, ExpenseCategoriesService, BranchesService } from '../../../../services/openapi-client';
import {
  CreateExpenseDto,
  UpdateExpenseDto
} from '../../../../services/openapi-client/model/models';
import { NotificationService } from '../../../../services/notification.service';
import { formatThaiDate } from '../../../../utils/thai-date.helper';
import { FormHelpers } from '../../../../utils/form-helpers';
import { FormValidators } from '../../../../utils/form-validators';

// The generated ExpensesController/ExpenseCategoriesController/BranchesController actions
// return untyped IActionResult on the backend, so openapi-generator does not emit typed
// ExpenseDto / ExpenseCategoryDto / BranchDto models. Define the shapes locally.
interface ExpenseDto {
  id?: number;
  branchId?: number;
  branchName?: string | null;
  categoryId?: number;
  categoryName?: string | null;
  categoryCode?: string | null;
  amount?: number;
  expenseDate?: string | null;
  description?: string | null;
  reference?: string | null;
  paymentMethod?: string | null;
  userId?: number | null;
  userName?: string | null;
  receiptUrl?: string | null;
  createdAt?: string | null;
}

interface ExpenseCategoryDto {
  id?: number;
  name?: string | null;
  code?: string | null;
}

interface BranchDto {
  id?: number;
  name?: string | null;
  code?: string | null;
}

@Component({
  selector: 'app-expense-list-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './expense-list-admin.component.html',
  styleUrls: ['./expense-list-admin.component.css']
})
export class ExpenseListAdminComponent implements OnInit {
  expenses = signal<ExpenseDto[]>([]);
  filteredExpenses = signal<ExpenseDto[]>([]);
  categories = signal<ExpenseCategoryDto[]>([]);
  branches = signal<BranchDto[]>([]);
  loading = signal(false);

  // Active tab
  activeTab = signal<'expenses' | 'categories'>('expenses');

  // Filters
  searchTerm = signal('');
  selectedBranch = signal<string>('');
  selectedCategory = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  selectedPaymentMethod = signal<string>('');

  // Modals
  showExpenseModal = signal(false);
  showDeleteModal = signal(false);
  isEditMode = signal(false);
  selectedExpense = signal<ExpenseDto | null>(null);

  // Reactive form
  expenseForm!: FormGroup;

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(10);

  paymentMethods = [
    { value: 'cash', label: 'เงินสด' },
    { value: 'transfer', label: 'โอนเงิน' },
    { value: 'credit_card', label: 'บัตรเครดิต' },
    { value: 'check', label: 'เช็ค' }
  ];

  Math = Math;

  constructor(
    private expensesService: ExpensesService,
    private categoriesService: ExpenseCategoriesService,
    private branchesService: BranchesService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadExpenses();
    this.loadCategories();
    this.loadBranches();
  }

  private initForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.expenseForm = this.fb.group({
      branchId: [null, Validators.required],
      categoryId: [null, Validators.required],
      amount: [0, [Validators.required, FormValidators.positiveNumber()]],
      expenseDate: [today, Validators.required],
      description: ['', Validators.maxLength(500)],
      reference: ['', Validators.maxLength(100)],
      paymentMethod: ['cash', Validators.required]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    return FormHelpers.isFieldInvalid(this.expenseForm, fieldName);
  }

  getFieldError(fieldName: string): string {
    return FormHelpers.getFieldError(this.expenseForm, fieldName);
  }

  loadExpenses(): void {
    this.loading.set(true);
    this.expensesService.expensesGetAll().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.expenses.set(response.data);
          this.applyFilters();
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading expenses:', error);
        this.loading.set(false);
      }
    });
  }

  loadCategories(): void {
    this.categoriesService.expenseCategoriesGetAll().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.categories.set(response.data);
        }
      },
      error: (error: any) => {
        console.error('Error loading categories:', error);
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
    let filtered = [...this.expenses()];

    // Search filter
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(exp =>
        exp.description?.toLowerCase().includes(search) ||
        exp.reference?.toLowerCase().includes(search) ||
        exp.categoryName?.toLowerCase().includes(search)
      );
    }

    // Branch filter
    if (this.selectedBranch()) {
      filtered = filtered.filter(exp => exp.branchId?.toString() === this.selectedBranch());
    }

    // Category filter
    if (this.selectedCategory()) {
      filtered = filtered.filter(exp => exp.categoryId?.toString() === this.selectedCategory());
    }

    // Date range filter
    if (this.startDate()) {
      filtered = filtered.filter(exp => {
        if (!exp.expenseDate) return false;
        const expDate = exp.expenseDate.split('T')[0];
        return expDate >= this.startDate();
      });
    }

    if (this.endDate()) {
      filtered = filtered.filter(exp => {
        if (!exp.expenseDate) return false;
        const expDate = exp.expenseDate.split('T')[0];
        return expDate <= this.endDate();
      });
    }

    // Payment method filter
    if (this.selectedPaymentMethod()) {
      filtered = filtered.filter(exp => exp.paymentMethod === this.selectedPaymentMethod());
    }

    this.filteredExpenses.set(filtered);
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

  onCategoryFilterChange(value: string): void {
    this.selectedCategory.set(value);
    this.applyFilters();
  }

  onStartDateChange(value: string): void {
    this.startDate.set(value);
    this.applyFilters();
  }

  onEndDateChange(value: string): void {
    this.endDate.set(value);
    this.applyFilters();
  }

  clearDateFilters(): void {
    this.startDate.set('');
    this.endDate.set('');
    this.applyFilters();
  }

  onPaymentMethodFilterChange(value: string): void {
    this.selectedPaymentMethod.set(value);
    this.applyFilters();
  }

  switchTab(tab: 'expenses' | 'categories'): void {
    this.activeTab.set(tab);
  }

  // Expense CRUD
  openAddExpenseModal(): void {
    this.isEditMode.set(false);
    this.selectedExpense.set(null);
    const today = new Date().toISOString().split('T')[0];
    this.expenseForm.reset({
      branchId: null,
      categoryId: null,
      amount: 0,
      expenseDate: today,
      description: '',
      reference: '',
      paymentMethod: 'cash'
    });
    this.showExpenseModal.set(true);
  }

  openEditExpenseModal(expense: ExpenseDto): void {
    this.isEditMode.set(true);
    this.selectedExpense.set(expense);
    this.expenseForm.patchValue({
      branchId: expense.branchId,
      categoryId: expense.categoryId,
      amount: expense.amount,
      expenseDate: expense.expenseDate?.split('T')[0],
      description: expense.description || '',
      reference: expense.reference || '',
      paymentMethod: expense.paymentMethod || 'cash'
    });
    this.showExpenseModal.set(true);
  }

  openDeleteExpenseModal(expense: ExpenseDto): void {
    this.selectedExpense.set(expense);
    this.showDeleteModal.set(true);
  }

  closeModals(): void {
    this.showExpenseModal.set(false);
    this.showDeleteModal.set(false);
  }

  saveExpense(): void {
    // Mark all fields as touched to show validation errors
    FormHelpers.markFormGroupTouched(this.expenseForm);

    // Validate
    if (this.expenseForm.invalid) {
      return;
    }

    if (this.isEditMode()) {
      this.updateExpense();
    } else {
      this.createExpense();
    }
  }

  createExpense(): void {
    const formValue = this.expenseForm.value;
    const dto: CreateExpenseDto = {
      branchId: formValue.branchId,
      categoryId: formValue.categoryId,
      amount: formValue.amount,
      expenseDate: formValue.expenseDate,
      description: formValue.description?.trim() || null,
      reference: formValue.reference?.trim() || null,
      paymentMethod: formValue.paymentMethod,
      userId: null,
      receiptUrl: null
    };

    this.expensesService.expensesCreate(dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadExpenses();
          this.closeModals();
          this.notificationService.success('สร้างรายจ่ายสำเร็จ');
        }
      },
      error: (error: any) => {
        console.error('Error creating expense:', error);
        const errorMessage = error.error?.errors?.ReceiptUrl?.[0] || error.error?.message || 'เกิดข้อผิดพลาดในการสร้างรายจ่าย';
        this.notificationService.error(errorMessage);
      }
    });
  }

  updateExpense(): void {
    const expense = this.selectedExpense();
    if (!expense) return;

    const formValue = this.expenseForm.value;
    const dto: UpdateExpenseDto = {
      categoryId: formValue.categoryId,
      amount: formValue.amount,
      expenseDate: formValue.expenseDate,
      description: formValue.description?.trim() || null,
      reference: formValue.reference?.trim() || null,
      paymentMethod: formValue.paymentMethod,
      receiptUrl: null
    };

    this.expensesService.expensesUpdate(expense.id!, dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadExpenses();
          this.closeModals();
          this.notificationService.success('อัปเดตรายจ่ายสำเร็จ');
        }
      },
      error: (error: any) => {
        console.error('Error updating expense:', error);
        const errorMessage = error.error?.errors?.ReceiptUrl?.[0] || error.error?.message || 'เกิดข้อผิดพลาดในการอัปเดตรายจ่าย';
        this.notificationService.error(errorMessage);
      }
    });
  }

  deleteExpense(): void {
    const expense = this.selectedExpense();
    if (!expense) return;

    this.expensesService.expensesDelete(expense.id!).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadExpenses();
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error deleting expense:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการลบรายจ่าย');
      }
    });
  }

  // Helpers
  getPaginatedExpenses(): ExpenseDto[] {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredExpenses().slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredExpenses().length / this.itemsPerPage());
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

  getTotalAmount(): number {
    return this.filteredExpenses().reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }

  getPaymentMethodLabel(method: string | null | undefined): string {
    const found = this.paymentMethods.find(pm => pm.value === method);
    return found ? found.label : method || '-';
  }

  formatDate(date: string | null | undefined): string {
    return formatThaiDate(date);
  }
}

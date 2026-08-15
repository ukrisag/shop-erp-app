import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BankAccountsService, BankTransactionsService, BranchesService } from '../../../../services/openapi-client';
import {
  BankAccountDto,
  CreateBankAccountDto,
  BankTransactionDto,
  CreateBankTransactionDto
} from '../../../../services/openapi-client/model/models';
import { NotificationService } from '../../../../services/notification.service';

// The generated BranchesController actions return untyped IActionResult on the backend,
// so openapi-generator does not emit a typed BranchDto model. Define the shape locally.
interface BranchDto {
  id?: number;
  name?: string | null;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isMain?: boolean | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

@Component({
  selector: 'app-banking-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './banking-admin.component.html',
  styleUrls: ['./banking-admin.component.css']
})
export class BankingAdminComponent implements OnInit {
  // Data
  accounts = signal<BankAccountDto[]>([]);
  filteredAccounts = signal<BankAccountDto[]>([]);
  transactions = signal<BankTransactionDto[]>([]);
  filteredTransactions = signal<BankTransactionDto[]>([]);
  branches = signal<BranchDto[]>([]);
  loading = signal(false);

  // Active tab
  activeTab = signal<'accounts' | 'transactions'>('accounts');

  // Filters - Accounts
  accountSearchTerm = signal('');
  selectedAccountBranch = signal<string>('');

  // Filters - Transactions
  transactionSearchTerm = signal('');
  selectedTransactionAccount = signal<string>('');
  selectedTransactionType = signal<string>('');
  selectedTransactionMonth = signal<string>('');

  // Modals
  showAccountModal = signal(false);
  showTransactionModal = signal(false);
  showDeleteAccountModal = signal(false);
  showDeleteTransactionModal = signal(false);
  isEditMode = signal(false);
  selectedAccount = signal<BankAccountDto | null>(null);
  selectedTransaction = signal<BankTransactionDto | null>(null);

  // Forms
  accountForm: any = {
    branchId: null,
    bankName: '',
    accountNumber: '',
    accountName: '',
    accountType: 'savings',
    initialBalance: 0
  };

  transactionForm: any = {
    bankAccountId: null,
    transactionDate: '',
    transactionType: 'deposit',
    amount: 0,
    description: '',
    erpSalesPaymentId: null,
    ecommercePaymentId: null,
    expenseId: null
  };

  // Pagination
  currentAccountPage = signal(1);
  currentTransactionPage = signal(1);
  itemsPerPage = signal(10);

  accountTypes = [
    { value: 'savings', label: 'บัญชีออมทรัพย์' },
    { value: 'current', label: 'บัญชีกระแสรายวัน' },
    { value: 'fixed', label: 'บัญชีฝากประจำ' }
  ];

  transactionTypes = [
    { value: 'deposit', label: 'เงินฝาก / รับเงิน' },
    { value: 'withdrawal', label: 'ถอนเงิน / จ่ายเงิน' },
    { value: 'transfer_in', label: 'โอนเข้า' },
    { value: 'transfer_out', label: 'โอนออก' },
    { value: 'fee', label: 'ค่าธรรมเนียม' },
    { value: 'interest', label: 'ดอกเบี้ย' }
  ];

  Math = Math;

  constructor(
    private accountsService: BankAccountsService,
    private transactionsService: BankTransactionsService,
    private branchesService: BranchesService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check query parameter for active tab
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'transactions') {
        this.activeTab.set('transactions');
      } else {
        this.activeTab.set('accounts');
      }
    });

    this.loadAccounts();
    this.loadTransactions();
    this.loadBranches();
    this.setCurrentMonth();
  }

  setCurrentMonth(): void {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    this.selectedTransactionMonth.set(`${year}-${month}`);
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.accountsService.bankAccountsGetAllAccounts().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.accounts.set(response.data);
          this.applyAccountFilters();
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading accounts:', error);
        this.loading.set(false);
      }
    });
  }

  loadTransactions(): void {
    this.transactionsService.bankTransactionsGetAllTransactions().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.transactions.set(response.data);
          this.applyTransactionFilters();
        }
      },
      error: (error: any) => {
        console.error('Error loading transactions:', error);
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

  // Account Filters
  applyAccountFilters(): void {
    let filtered = [...this.accounts()];

    const search = this.accountSearchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(acc =>
        acc.bankName?.toLowerCase().includes(search) ||
        acc.accountNumber?.toLowerCase().includes(search) ||
        acc.accountName?.toLowerCase().includes(search)
      );
    }

    if (this.selectedAccountBranch()) {
      filtered = filtered.filter(acc => acc.branchId?.toString() === this.selectedAccountBranch());
    }

    this.filteredAccounts.set(filtered);
    this.currentAccountPage.set(1);
  }

  onAccountSearchChange(value: string): void {
    this.accountSearchTerm.set(value);
    this.applyAccountFilters();
  }

  onAccountBranchFilterChange(value: string): void {
    this.selectedAccountBranch.set(value);
    this.applyAccountFilters();
  }

  // Transaction Filters
  applyTransactionFilters(): void {
    let filtered = [...this.transactions()];

    const search = this.transactionSearchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(tx =>
        tx.description?.toLowerCase().includes(search) ||
        tx.bankName?.toLowerCase().includes(search)
      );
    }

    if (this.selectedTransactionAccount()) {
      filtered = filtered.filter(tx => tx.bankAccountId?.toString() === this.selectedTransactionAccount());
    }

    if (this.selectedTransactionType()) {
      filtered = filtered.filter(tx => tx.transactionType === this.selectedTransactionType());
    }

    if (this.selectedTransactionMonth()) {
      const [year, month] = this.selectedTransactionMonth().split('-');
      filtered = filtered.filter(tx => {
        if (!tx.transactionDate) return false;
        const txDate = new Date(tx.transactionDate);
        return txDate.getFullYear().toString() === year &&
               (txDate.getMonth() + 1).toString().padStart(2, '0') === month;
      });
    }

    this.filteredTransactions.set(filtered);
    this.currentTransactionPage.set(1);
  }

  onTransactionSearchChange(value: string): void {
    this.transactionSearchTerm.set(value);
    this.applyTransactionFilters();
  }

  onTransactionAccountFilterChange(value: string): void {
    this.selectedTransactionAccount.set(value);
    this.applyTransactionFilters();
  }

  onTransactionTypeFilterChange(value: string): void {
    this.selectedTransactionType.set(value);
    this.applyTransactionFilters();
  }

  onTransactionMonthFilterChange(value: string): void {
    this.selectedTransactionMonth.set(value);
    this.applyTransactionFilters();
  }

  switchTab(tab: 'accounts' | 'transactions'): void {
    this.activeTab.set(tab);
    // Update URL query parameter
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  // Account CRUD
  openAddAccountModal(): void {
    this.isEditMode.set(false);
    this.selectedAccount.set(null);
    this.accountForm = {
      branchId: null,
      bankName: '',
      accountNumber: '',
      accountName: '',
      accountType: 'savings',
      initialBalance: 0
    };
    this.showAccountModal.set(true);
  }

  openEditAccountModal(account: BankAccountDto): void {
    this.isEditMode.set(true);
    this.selectedAccount.set(account);
    // When editing, we only allow changing account details, not the balance
    // Balance can only be changed through transactions
    this.accountForm = {
      branchId: account.branchId,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      accountType: account.accountType,
      isActive: account.isActive
    };
    this.showAccountModal.set(true);
  }

  openDeleteAccountModal(account: BankAccountDto): void {
    this.selectedAccount.set(account);
    this.showDeleteAccountModal.set(true);
  }

  saveAccount(): void {
    if (this.isEditMode()) {
      this.updateAccount();
    } else {
      this.createAccount();
    }
  }

  createAccount(): void {
    const dto: CreateBankAccountDto = this.accountForm;

    this.accountsService.bankAccountsCreateAccount(dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadAccounts();
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error creating account:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการสร้างบัญชี');
      }
    });
  }

  updateAccount(): void {
    const account = this.selectedAccount();
    if (!account) return;

    // When updating, we don't change the balance - only account details
    // Balance should only change through transactions
    const dto: CreateBankAccountDto = {
      branchId: this.accountForm.branchId,
      bankName: this.accountForm.bankName,
      accountNumber: this.accountForm.accountNumber,
      accountName: this.accountForm.accountName,
      accountType: this.accountForm.accountType,
      initialBalance: account.balance  // Keep existing balance, don't allow editing
    };

    this.accountsService.bankAccountsUpdateAccount(account.id!, dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadAccounts();
          this.closeModals();
          this.notificationService.success('อัปเดตข้อมูลบัญชีสำเร็จ');
        }
      },
      error: (error: any) => {
        console.error('Error updating account:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการอัปเดตบัญชี');
      }
    });
  }

  deleteAccount(): void {
    const account = this.selectedAccount();
    if (!account) return;

    this.accountsService.bankAccountsDeleteAccount(account.id!).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadAccounts();
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error deleting account:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการลบบัญชี');
      }
    });
  }

  // Transaction CRUD
  openAddTransactionModal(): void {
    this.isEditMode.set(false);
    this.selectedTransaction.set(null);
    const today = new Date().toISOString().split('T')[0];
    this.transactionForm = {
      bankAccountId: null,
      transactionDate: today,
      transactionType: 'deposit',
      amount: 0,
      description: '',
      erpSalesPaymentId: null,
      ecommercePaymentId: null,
      expenseId: null
    };
    this.showTransactionModal.set(true);
  }

  openDeleteTransactionModal(transaction: BankTransactionDto): void {
    this.selectedTransaction.set(transaction);
    this.showDeleteTransactionModal.set(true);
  }

  createTransaction(): void {
    const dto: CreateBankTransactionDto = this.transactionForm;

    this.transactionsService.bankTransactionsCreateTransaction(dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadTransactions();
          this.loadAccounts(); // Reload accounts to update balances
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error creating transaction:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการสร้างธุรกรรม');
      }
    });
  }

  deleteTransaction(): void {
    const transaction = this.selectedTransaction();
    if (!transaction) return;

    this.transactionsService.bankTransactionsDeleteTransaction(transaction.id!).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadTransactions();
          this.loadAccounts(); // Reload accounts to update balances
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error deleting transaction:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการลบธุรกรรม');
      }
    });
  }

  closeModals(): void {
    this.showAccountModal.set(false);
    this.showTransactionModal.set(false);
    this.showDeleteAccountModal.set(false);
    this.showDeleteTransactionModal.set(false);
  }

  // Helpers - Accounts
  getPaginatedAccounts(): BankAccountDto[] {
    const start = (this.currentAccountPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredAccounts().slice(start, end);
  }

  getTotalAccountPages(): number {
    return Math.ceil(this.filteredAccounts().length / this.itemsPerPage());
  }

  nextAccountPage(): void {
    if (this.currentAccountPage() < this.getTotalAccountPages()) {
      this.currentAccountPage.update(page => page + 1);
    }
  }

  previousAccountPage(): void {
    if (this.currentAccountPage() > 1) {
      this.currentAccountPage.update(page => page - 1);
    }
  }

  // Helpers - Transactions
  getPaginatedTransactions(): BankTransactionDto[] {
    const start = (this.currentTransactionPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredTransactions().slice(start, end);
  }

  getTotalTransactionPages(): number {
    return Math.ceil(this.filteredTransactions().length / this.itemsPerPage());
  }

  nextTransactionPage(): void {
    if (this.currentTransactionPage() < this.getTotalTransactionPages()) {
      this.currentTransactionPage.update(page => page + 1);
    }
  }

  previousTransactionPage(): void {
    if (this.currentTransactionPage() > 1) {
      this.currentTransactionPage.update(page => page - 1);
    }
  }

  getTotalBalance(): number {
    return this.accounts().reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }

  getTotalDeposits(): number {
    return this.filteredTransactions()
      .filter(tx => tx.transactionType === 'deposit' || tx.transactionType === 'transfer_in' || tx.transactionType === 'interest')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }

  getTotalWithdrawals(): number {
    return this.filteredTransactions()
      .filter(tx => tx.transactionType === 'withdrawal' || tx.transactionType === 'transfer_out' || tx.transactionType === 'fee')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }

  getAccountTypeLabel(type: string | null | undefined): string {
    const found = this.accountTypes.find(t => t.value === type);
    return found ? found.label : type || '-';
  }

  getTransactionTypeLabel(type: string | null | undefined): string {
    const found = this.transactionTypes.find(t => t.value === type);
    return found ? found.label : type || '-';
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH');
  }

  isDebit(type: string | null | undefined): boolean {
    return type === 'deposit' || type === 'transfer_in' || type === 'interest';
  }
}

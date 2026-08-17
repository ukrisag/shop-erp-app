import { Validators, ValidatorFn } from '@angular/forms';
import { FormValidators } from './form-validators';

/**
 * Centralized validation configurations for all ERP forms
 * This ensures consistency across the application
 */
export class ValidationConfigs {
  /**
   * Employee form validation configuration (24 fields)
   */
  static readonly employee = {
    // Basic Information
    employeeCode: [Validators.required, FormValidators.employeeCode()],
    firstName: [Validators.required, Validators.maxLength(100)],
    lastName: [Validators.required, Validators.maxLength(100)],
    nickname: [Validators.maxLength(50)],
    dateOfBirth: [Validators.required],
    gender: [Validators.required],
    nationality: [Validators.required],

    // Contact Information
    phone: [Validators.required, FormValidators.phone()],
    email: [Validators.email], // Optional but must be valid email format if provided
    address: [Validators.required, Validators.maxLength(500)],

    // Identification (conditional - based on nationality)
    idCardNumber: [] as ValidatorFn[], // Dynamic: required for Thai nationals
    passportNumber: [] as ValidatorFn[], // Dynamic: required for foreigners

    // Employment Information
    branchId: [Validators.required],
    department: [Validators.required, Validators.maxLength(100)],
    position: [Validators.required, Validators.maxLength(100)],
    employmentType: [Validators.required], // 'daily' or 'monthly'
    startDate: [Validators.required],

    // Compensation (conditional - based on employment type)
    salary: [] as ValidatorFn[], // Dynamic: required for monthly employees
    dailyRate: [] as ValidatorFn[], // Dynamic: required for daily employees

    // Work Permit (conditional - for foreign employees)
    workPermitNumber: [Validators.maxLength(50)],
    workPermitStartDate: [] as ValidatorFn[], // Dynamic: required for foreigners
    workPermitEndDate: [] as ValidatorFn[], // Dynamic: required for foreigners

    // Status
    isActive: [],

    // Password (only for create mode)
    password: [] as ValidatorFn[], // Dynamic: required for create mode
    confirmPassword: [] as ValidatorFn[], // Dynamic: required for create mode
  };

  /**
   * Leave request form validation configuration (6 fields)
   */
  static readonly leave = {
    employeeId: [Validators.required],
    leaveType: [Validators.required],
    startDate: [Validators.required],
    endDate: [Validators.required],
    totalDays: [Validators.required, FormValidators.positiveNumber()],
    reason: [Validators.required, Validators.maxLength(500)],
  };

  /**
   * Overtime request form validation configuration (7 fields)
   */
  static readonly overtime = {
    employeeId: [Validators.required],
    date: [Validators.required],
    startTime: [Validators.required],
    endTime: [Validators.required],
    totalHours: [Validators.required, FormValidators.positiveNumber()],
    reason: [Validators.required, Validators.maxLength(500)],
    status: [],
  };

  /**
   * Advance payment form validation configuration (6 fields)
   */
  static readonly advance = {
    employeeId: [Validators.required],
    amount: [Validators.required, FormValidators.positiveNumber()],
    requestDate: [Validators.required],
    reason: [Validators.required, Validators.maxLength(500)],
    monthlyDeduction: [
      Validators.required,
      FormValidators.positiveNumber(),
    ],
    status: [],
  };

  /**
   * Phone allowance form validation configuration (8 fields)
   */
  static readonly phoneAllowance = {
    employeeId: [Validators.required],
    month: [Validators.required, FormValidators.month()],
    year: [Validators.required, FormValidators.year(2020, 2100)],
    maxAllowance: [Validators.required, FormValidators.positiveNumber()],
    actualUsage: [
      Validators.required,
      FormValidators.nonNegativeNumber(),
    ],
    claimAmount: [Validators.required, FormValidators.nonNegativeNumber()],
    receiptNumber: [Validators.maxLength(100)],
    status: [],
  };

  /**
   * Passport fee form validation configuration (10 fields)
   */
  static readonly passportFee = {
    employeeId: [Validators.required],
    branchId: [Validators.required],
    year: [Validators.required, FormValidators.year(2020, 2100)],
    totalAmount: [Validators.required, FormValidators.positiveNumber()],
    totalInstallments: [
      Validators.required,
      FormValidators.numberRange(1, 24),
    ],
    startMonth: [Validators.required, FormValidators.month()],
    monthlyDeduction: [Validators.required, FormValidators.positiveNumber()],
    remainingBalance: [Validators.required, FormValidators.nonNegativeNumber()],
    notes: [] as ValidatorFn[],
    status: [],
  };

  /**
   * Branch form validation configuration (6 fields)
   */
  static readonly branch = {
    code: [Validators.required, Validators.maxLength(20)],
    name: [Validators.required, Validators.maxLength(200)],
    address: [Validators.required, Validators.maxLength(500)],
    phone: [Validators.required, FormValidators.phone()],
    email: [Validators.email],
    isActive: [],
  };

  /**
   * Payroll record form validation configuration (matching SalaryRecordCreateDto)
   */
  static readonly payrollRecord = {
    employeeId: [Validators.required],
    branchId: [] as ValidatorFn[],
    month: [Validators.required, FormValidators.month()],
    year: [Validators.required, FormValidators.year(2020, 2100)],
    baseSalary: [Validators.required, FormValidators.nonNegativeNumber()],
    daysWorked: [FormValidators.numberRange(0, 31)],
    overtimeHours: [FormValidators.numberRange(0, 744)],
    overtimeAmount: [FormValidators.nonNegativeNumber()],
    totalAllowances: [FormValidators.nonNegativeNumber()],
    phoneAllowance: [FormValidators.nonNegativeNumber()],
    socialSecurityDeduction: [FormValidators.nonNegativeNumber()],
    advancePaymentCurrent: [FormValidators.nonNegativeNumber()],
    advancePaymentPrevious: [FormValidators.nonNegativeNumber()],
    passportFeeDeduction: [FormValidators.nonNegativeNumber()],
    taxDeduction: [FormValidators.nonNegativeNumber()],
    otherDeductions: [FormValidators.nonNegativeNumber()],
    leaveDays: [FormValidators.numberRange(0, 31)],
    leaveDeduction: [FormValidators.nonNegativeNumber()],
    notes: [] as ValidatorFn[],
  };

  /**
   * Payroll calculation form validation configuration (4 fields)
   */
  static readonly payrollCalculation = {
    month: [Validators.required, FormValidators.month()],
    year: [Validators.required, FormValidators.year(2020, 2100)],
    branchId: [],
    employeeId: [],
  };

  /**
   * Get employee validation config for create mode
   */
  static getEmployeeCreateConfig(): { [key: string]: ValidatorFn[] } {
    return {
      ...this.employee,
      password: [Validators.required, Validators.minLength(6)],
      confirmPassword: [Validators.required],
    };
  }

  /**
   * Get employee validation config for edit mode
   */
  static getEmployeeEditConfig(): { [key: string]: ValidatorFn[] } {
    const config = { ...this.employee };
    // Password is optional in edit mode
    delete (config as any).password;
    delete (config as any).confirmPassword;
    // EmployeeCode is readonly in edit mode - no validation needed
    (config as any).employeeCode = [];
    return config;
  }

  /**
   * Get validation config for Thai employee
   */
  static getThaiEmployeeValidation(): Partial<typeof ValidationConfigs.employee> {
    return {
      idCardNumber: [Validators.required, FormValidators.idCard()],
      passportNumber: [],
      workPermitNumber: [],
      workPermitStartDate: [],
      workPermitEndDate: [],
    };
  }

  /**
   * Get validation config for foreign employee
   */
  static getForeignEmployeeValidation(): Partial<typeof ValidationConfigs.employee> {
    return {
      idCardNumber: [],
      passportNumber: [Validators.required, FormValidators.passport()],
      workPermitNumber: [Validators.required, Validators.maxLength(50)],
      workPermitStartDate: [Validators.required],
      workPermitEndDate: [Validators.required],
    };
  }

  /**
   * Get validation config for monthly employee
   */
  static getMonthlyEmployeeValidation(): Partial<typeof ValidationConfigs.employee> {
    return {
      salary: [Validators.required, FormValidators.positiveNumber()],
      dailyRate: [],
    };
  }

  /**
   * Get validation config for daily employee
   */
  static getDailyEmployeeValidation(): Partial<typeof ValidationConfigs.employee> {
    return {
      salary: [],
      dailyRate: [Validators.required, FormValidators.positiveNumber()],
    };
  }
}

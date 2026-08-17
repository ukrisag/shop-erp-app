import { AbstractControl, ValidationErrors, ValidatorFn, FormGroup } from '@angular/forms';

/**
 * Custom validators for Thai-specific validation and common form validations
 */
export class FormValidators {
  /**
   * Validates Thai phone number (10 digits)
   */
  static phone(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const value = control.value.toString().trim();
      const valid = /^[0-9]{10}$/.test(value);
      return valid ? null : { invalidPhone: true };
    };
  }

  /**
   * Validates Thai ID card number (13 digits)
   */
  static idCard(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const value = control.value.toString().trim();
      const valid = /^[0-9]{13}$/.test(value);
      return valid ? null : { invalidIdCard: true };
    };
  }

  /**
   * Validates passport number (6-9 alphanumeric characters)
   */
  static passport(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const value = control.value.toString().trim();
      const valid = /^[A-Z0-9]{6,9}$/i.test(value);
      return valid ? null : { invalidPassport: true };
    };
  }

  /**
   * Validates employee code format
   */
  static employeeCode(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const value = control.value.toString().trim();
      // Employee code: alphanumeric, 3-20 characters
      const valid = /^[A-Z0-9]{3,20}$/i.test(value);
      return valid ? null : { invalidEmployeeCode: true };
    };
  }

  /**
   * Validates that end date is greater than or equal to start date
   * Use this as a form-level validator
   */
  static dateRange(startKey: string, endKey: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!(control instanceof FormGroup)) return null;

      const startControl = control.get(startKey);
      const endControl = control.get(endKey);

      if (!startControl || !endControl) return null;

      const start = startControl.value;
      const end = endControl.value;

      if (!start || !end) return null;

      const startDate = new Date(start);
      const endDate = new Date(end);

      if (endDate >= startDate) {
        // Clear the error if it was previously set
        if (endControl.hasError('invalidDateRange')) {
          const errors = { ...endControl.errors };
          delete errors['invalidDateRange'];
          endControl.setErrors(Object.keys(errors).length ? errors : null);
        }
        return null;
      } else {
        // Set error on end date field
        endControl.setErrors({
          ...endControl.errors,
          invalidDateRange: true
        });
        return { invalidDateRange: true };
      }
    };
  }

  /**
   * Validates that end time is greater than start time
   * Use this as a form-level validator
   */
  static timeRange(startKey: string, endKey: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!(control instanceof FormGroup)) return null;

      const startControl = control.get(startKey);
      const endControl = control.get(endKey);

      if (!startControl || !endControl) return null;

      const start = startControl.value;
      const end = endControl.value;

      if (!start || !end) return null;

      // Convert time strings to comparable format (HH:mm)
      const startTime = this.timeToMinutes(start);
      const endTime = this.timeToMinutes(end);

      if (endTime > startTime) {
        // Clear the error if it was previously set
        if (endControl.hasError('invalidTimeRange')) {
          const errors = { ...endControl.errors };
          delete errors['invalidTimeRange'];
          endControl.setErrors(Object.keys(errors).length ? errors : null);
        }
        return null;
      } else {
        // Set error on end time field
        endControl.setErrors({
          ...endControl.errors,
          invalidTimeRange: true
        });
        return { invalidTimeRange: true };
      }
    };
  }

  /**
   * Validates that password and confirm password match
   * Use this as a form-level validator
   */
  static passwordMatch(passwordKey: string, confirmPasswordKey: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!(control instanceof FormGroup)) return null;

      const passwordControl = control.get(passwordKey);
      const confirmPasswordControl = control.get(confirmPasswordKey);

      if (!passwordControl || !confirmPasswordControl) return null;

      const password = passwordControl.value;
      const confirmPassword = confirmPasswordControl.value;

      if (!password || !confirmPassword) return null;

      if (password === confirmPassword) {
        // Clear the error if it was previously set
        if (confirmPasswordControl.hasError('passwordMismatch')) {
          const errors = { ...confirmPasswordControl.errors };
          delete errors['passwordMismatch'];
          confirmPasswordControl.setErrors(Object.keys(errors).length ? errors : null);
        }
        return null;
      } else {
        // Set error on confirm password field
        confirmPasswordControl.setErrors({
          ...confirmPasswordControl.errors,
          passwordMismatch: true
        });
        return { passwordMismatch: true };
      }
    };
  }

  /**
   * Validates positive number (greater than 0)
   */
  static positiveNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) return null;
      const value = parseFloat(control.value);
      return value > 0 ? null : { notPositive: true };
    };
  }

  /**
   * Validates non-negative number (greater than or equal to 0)
   */
  static nonNegativeNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) return null;
      const value = parseFloat(control.value);
      return value >= 0 ? null : { negative: true };
    };
  }

  /**
   * Validates number within a specific range
   */
  static numberRange(min: number, max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) return null;
      const value = parseFloat(control.value);
      if (isNaN(value)) return { invalidNumber: true };
      if (value < min) return { belowMin: { min, actual: value } };
      if (value > max) return { aboveMax: { max, actual: value } };
      return null;
    };
  }

  /**
   * Validates work permit dates for foreign employees
   * End date must be greater than start date
   */
  static workPermitDates(startKey: string, endKey: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!(control instanceof FormGroup)) return null;

      const startControl = control.get(startKey);
      const endControl = control.get(endKey);

      if (!startControl || !endControl) return null;

      const start = startControl.value;
      const end = endControl.value;

      // If both are empty, it's valid (optional fields)
      if (!start && !end) return null;

      // If one is filled, both must be filled
      if ((start && !end) || (!start && end)) {
        return { incompleteWorkPermitDates: true };
      }

      const startDate = new Date(start);
      const endDate = new Date(end);

      if (endDate > startDate) {
        // Clear errors
        if (endControl.hasError('invalidWorkPermitDates')) {
          const errors = { ...endControl.errors };
          delete errors['invalidWorkPermitDates'];
          endControl.setErrors(Object.keys(errors).length ? errors : null);
        }
        return null;
      } else {
        endControl.setErrors({
          ...endControl.errors,
          invalidWorkPermitDates: true
        });
        return { invalidWorkPermitDates: true };
      }
    };
  }

  /**
   * Validates that a value is less than or equal to another field's value
   */
  static maxValueOf(maxFieldKey: string, fieldLabel?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;

      const maxControl = control.parent.get(maxFieldKey);
      if (!maxControl) return null;

      const value = parseFloat(control.value);
      const maxValue = parseFloat(maxControl.value);

      if (isNaN(value) || isNaN(maxValue)) return null;

      return value <= maxValue
        ? null
        : { exceedsMaxValue: { max: maxValue, actual: value, field: fieldLabel } };
    };
  }

  /**
   * Validates month (1-12)
   */
  static month(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) return null;
      const value = parseInt(control.value, 10);
      return value >= 1 && value <= 12 ? null : { invalidMonth: true };
    };
  }

  /**
   * Validates year within a reasonable range
   */
  static year(minYear: number = 2000, maxYear: number = 2100): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) return null;
      const value = parseInt(control.value, 10);
      return value >= minYear && value <= maxYear
        ? null
        : { invalidYear: { min: minYear, max: maxYear } };
    };
  }

  /**
   * Helper method to convert time string to minutes for comparison
   */
  private static timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Validates that actual usage doesn't exceed allowance
   */
  static actualUsageVsAllowance(allowanceKey: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;

      const allowanceControl = control.parent.get(allowanceKey);
      if (!allowanceControl) return null;

      const actualUsage = parseFloat(control.value);
      const allowance = parseFloat(allowanceControl.value);

      if (isNaN(actualUsage) || isNaN(allowance)) return null;

      return actualUsage <= allowance
        ? null
        : { usageExceedsAllowance: { allowance, actual: actualUsage } };
    };
  }

  /**
   * Validates that monthly deduction doesn't exceed total amount
   */
  static monthlyDeductionVsAmount(amountKey: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;

      const amountControl = control.parent.get(amountKey);
      if (!amountControl) return null;

      const monthlyDeduction = parseFloat(control.value);
      const amount = parseFloat(amountControl.value);

      if (isNaN(monthlyDeduction) || isNaN(amount)) return null;

      return monthlyDeduction <= amount
        ? null
        : { deductionExceedsAmount: { amount, deduction: monthlyDeduction } };
    };
  }
}

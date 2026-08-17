import { FormGroup, FormControl, AbstractControl, ValidatorFn } from '@angular/forms';

/**
 * Helper methods for common form operations and error handling
 */
export class FormHelpers {
  /**
   * Marks all fields in a form group as touched
   * Useful for triggering validation on submit
   */
  static markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      // If it's a nested form group, recursively mark its controls
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Checks if a field is invalid and has been touched
   * Used to determine when to show validation errors
   */
  static isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Gets the appropriate error message for a field in Thai
   */
  static getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (!field?.errors) return '';

    const errors = field.errors;

    // Required validation
    if (errors['required']) {
      return 'กรุณากรอกข้อมูลนี้';
    }

    // Email validation
    if (errors['email']) {
      return 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    // Min length validation
    if (errors['minlength']) {
      const minLength = errors['minlength'].requiredLength;
      return `ต้องมีอย่างน้อย ${minLength} ตัวอักษร`;
    }

    // Max length validation
    if (errors['maxlength']) {
      const maxLength = errors['maxlength'].requiredLength;
      return `ต้องไม่เกิน ${maxLength} ตัวอักษร`;
    }

    // Phone validation
    if (errors['invalidPhone']) {
      return 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก';
    }

    // ID card validation
    if (errors['invalidIdCard']) {
      return 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก';
    }

    // Passport validation
    if (errors['invalidPassport']) {
      return 'รูปแบบหมายเลขพาสปอร์ตไม่ถูกต้อง (6-9 ตัวอักษร)';
    }

    // Employee code validation
    if (errors['invalidEmployeeCode']) {
      return 'รหัสพนักงานต้องเป็นตัวอักษรและตัวเลข 3-20 ตัว';
    }

    // Date range validation
    if (errors['invalidDateRange']) {
      return 'วันที่สิ้นสุดต้องมากกว่าหรือเท่ากับวันที่เริ่มต้น';
    }

    // Time range validation
    if (errors['invalidTimeRange']) {
      return 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น';
    }

    // Password match validation
    if (errors['passwordMismatch']) {
      return 'รหัสผ่านไม่ตรงกัน';
    }

    // Positive number validation
    if (errors['notPositive']) {
      return 'ต้องเป็นตัวเลขที่มากกว่า 0';
    }

    // Non-negative number validation
    if (errors['negative']) {
      return 'ต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0';
    }

    // Number range validation
    if (errors['belowMin']) {
      return `ต้องมากกว่าหรือเท่ากับ ${errors['belowMin'].min}`;
    }

    if (errors['aboveMax']) {
      return `ต้องน้อยกว่าหรือเท่ากับ ${errors['aboveMax'].max}`;
    }

    // Invalid number
    if (errors['invalidNumber']) {
      return 'ต้องเป็นตัวเลข';
    }

    // Month validation
    if (errors['invalidMonth']) {
      return 'เดือนต้องอยู่ระหว่าง 1-12';
    }

    // Year validation
    if (errors['invalidYear']) {
      const min = errors['invalidYear'].min;
      const max = errors['invalidYear'].max;
      return `ปีต้องอยู่ระหว่าง ${min}-${max}`;
    }

    // Work permit dates validation
    if (errors['invalidWorkPermitDates']) {
      return 'วันหมดอายุใบอนุญาตทำงานต้องมากกว่าวันเริ่มต้น';
    }

    if (errors['incompleteWorkPermitDates']) {
      return 'กรุณากรอกวันที่ใบอนุญาตทำงานให้ครบถ้วน';
    }

    // Async validation - uniqueness checks
    if (errors['employeeCodeTaken']) {
      return 'รหัสพนักงานนี้ถูกใช้งานแล้ว';
    }

    if (errors['emailTaken']) {
      return 'อีเมลนี้ถูกใช้งานแล้ว';
    }

    if (errors['idCardTaken']) {
      return 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว';
    }

    if (errors['passportTaken']) {
      return 'หมายเลขพาสปอร์ตนี้ถูกใช้งานแล้ว';
    }

    // Max value validation
    if (errors['exceedsMaxValue']) {
      const max = errors['exceedsMaxValue'].max;
      const field = errors['exceedsMaxValue'].field;
      return field
        ? `ต้องไม่เกิน${field} (${max})`
        : `ต้องไม่เกิน ${max}`;
    }

    // Usage exceeds allowance
    if (errors['usageExceedsAllowance']) {
      const allowance = errors['usageExceedsAllowance'].allowance;
      return `การใช้งานต้องไม่เกินวงเงิน (${allowance})`;
    }

    // Deduction exceeds amount
    if (errors['deductionExceedsAmount']) {
      const amount = errors['deductionExceedsAmount'].amount;
      return `ยอดหักต่อเดือนต้องไม่เกินยอดรวม (${amount})`;
    }

    // Default error message
    return 'ข้อมูลไม่ถูกต้อง';
  }

  /**
   * Resets a form to its initial state or provided values
   */
  static resetForm(formGroup: FormGroup, initialValues?: any): void {
    if (initialValues) {
      formGroup.reset(initialValues);
    } else {
      formGroup.reset();
    }
  }

  /**
   * Checks if the form has unsaved changes
   */
  static hasUnsavedChanges(formGroup: FormGroup): boolean {
    return formGroup.dirty;
  }

  /**
   * Gets all errors in a form group (useful for debugging)
   * Returns an object with field names as keys and error objects as values
   */
  static getAllErrors(formGroup: FormGroup): { [key: string]: any } {
    const errors: { [key: string]: any } = {};

    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }

      // If it's a nested form group, recursively get its errors
      if (control instanceof FormGroup) {
        const nestedErrors = this.getAllErrors(control);
        if (Object.keys(nestedErrors).length > 0) {
          errors[key] = nestedErrors;
        }
      }
    });

    // Also check for form-level errors
    if (formGroup.errors) {
      errors['_formLevel'] = formGroup.errors;
    }

    return errors;
  }

  /**
   * Updates validators for a field dynamically
   * Useful for conditional validation based on other field values
   */
  static updateConditionalValidation(
    formGroup: FormGroup,
    fieldName: string,
    validators: ValidatorFn | ValidatorFn[] | null
  ): void {
    const control = formGroup.get(fieldName);
    if (!control) return;

    control.clearValidators();
    if (validators) {
      control.setValidators(validators);
    }
    control.updateValueAndValidity();
  }

  /**
   * Checks if form is pending (async validation in progress)
   */
  static isFormPending(formGroup: FormGroup): boolean {
    return formGroup.pending;
  }

  /**
   * Disables all fields in a form group
   */
  static disableFormGroup(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.disable();

      if (control instanceof FormGroup) {
        this.disableFormGroup(control);
      }
    });
  }

  /**
   * Enables all fields in a form group
   */
  static enableFormGroup(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.enable();

      if (control instanceof FormGroup) {
        this.enableFormGroup(control);
      }
    });
  }

  /**
   * Gets the list of invalid field names
   * Useful for debugging or showing summary of errors
   */
  static getInvalidFieldNames(formGroup: FormGroup): string[] {
    const invalidFields: string[] = [];

    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control && control.invalid) {
        invalidFields.push(key);
      }

      if (control instanceof FormGroup) {
        const nestedInvalid = this.getInvalidFieldNames(control);
        invalidFields.push(...nestedInvalid.map(field => `${key}.${field}`));
      }
    });

    return invalidFields;
  }

  /**
   * Validates the form and returns true if valid, false otherwise
   * Also marks all fields as touched to show errors
   */
  static validateForm(formGroup: FormGroup): boolean {
    this.markFormGroupTouched(formGroup);
    return formGroup.valid;
  }

  /**
   * Gets a summary message of all validation errors
   * Returns a string listing all invalid fields with their error messages
   */
  static getValidationSummary(formGroup: FormGroup, fieldLabels?: { [key: string]: string }): string {
    const errors: string[] = [];

    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control && control.invalid && control.errors) {
        const label = fieldLabels?.[key] || key;
        const errorMsg = this.getFieldError(formGroup, key);
        errors.push(`• ${label}: ${errorMsg}`);
      }
    });

    if (errors.length === 0) {
      return 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง';
    }

    return `พบข้อผิดพลาด:\n${errors.join('\n')}`;
  }
}

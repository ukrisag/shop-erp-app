import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError, debounceTime } from 'rxjs/operators';
import { EmployeesService } from '../services/openapi-client/api/employees.service';

/**
 * Async validators for checking uniqueness of values against the database
 * These validators use debouncing to reduce API calls
 */
export class AsyncValidators {
  /**
   * Validates that employee code is unique
   * @param service - EmployeesService instance
   * @param currentId - Optional current employee ID (for edit mode, skip self-check)
   * @param debounce - Debounce time in milliseconds (default: 500ms)
   */
  static uniqueEmployeeCode(
    service: EmployeesService,
    currentId?: number,
    debounce: number = 500
  ): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      const code = control.value.toString().trim().toLowerCase();

      return timer(debounce).pipe(
        switchMap(() =>
          service.employeesGetAllEmployees().pipe(
            map((employees: any[]) => {
              const exists = employees.some(employee =>
                employee.employeeCode?.toLowerCase() === code &&
                employee.id !== currentId
              );
              return exists ? { employeeCodeTaken: true } : null;
            }),
            catchError(() => {
              // On error, don't block the form
              console.error('Error checking employee code uniqueness');
              return of(null);
            })
          )
        )
      );
    };
  }

  /**
   * Validates that email is unique
   * @param service - EmployeesService instance
   * @param currentId - Optional current employee ID (for edit mode, skip self-check)
   * @param debounce - Debounce time in milliseconds (default: 500ms)
   */
  static uniqueEmail(
    service: EmployeesService,
    currentId?: number,
    debounce: number = 500
  ): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      const email = control.value.toString().trim().toLowerCase();

      return timer(debounce).pipe(
        switchMap(() =>
          service.employeesGetAllEmployees().pipe(
            map((employees: any[]) => {
              const exists = employees.some(employee =>
                employee.email?.toLowerCase() === email &&
                employee.id !== currentId
              );
              return exists ? { emailTaken: true } : null;
            }),
            catchError(() => {
              console.error('Error checking email uniqueness');
              return of(null);
            })
          )
        )
      );
    };
  }

  /**
   * Validates that ID card number is unique
   * @param service - EmployeesService instance
   * @param currentId - Optional current employee ID (for edit mode, skip self-check)
   * @param debounce - Debounce time in milliseconds (default: 500ms)
   */
  static uniqueIdCard(
    service: EmployeesService,
    currentId?: number,
    debounce: number = 500
  ): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      const idCard = control.value.toString().trim();

      return timer(debounce).pipe(
        switchMap(() =>
          service.employeesGetAllEmployees().pipe(
            map((employees: any[]) => {
              const exists = employees.some((employee: any) =>
                employee.idCardNumber === idCard &&
                employee.id !== currentId
              );
              return exists ? { idCardTaken: true } : null;
            }),
            catchError(() => {
              console.error('Error checking ID card uniqueness');
              return of(null);
            })
          )
        )
      );
    };
  }

  /**
   * Validates that passport number is unique
   * @param service - EmployeesService instance
   * @param currentId - Optional current employee ID (for edit mode, skip self-check)
   * @param debounce - Debounce time in milliseconds (default: 500ms)
   */
  static uniquePassport(
    service: EmployeesService,
    currentId?: number,
    debounce: number = 500
  ): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      const passport = control.value.toString().trim().toUpperCase();

      return timer(debounce).pipe(
        switchMap(() =>
          service.employeesGetAllEmployees().pipe(
            map((employees: any[]) => {
              const exists = employees.some((employee: any) =>
                employee.passportNumber?.toUpperCase() === passport &&
                employee.id !== currentId
              );
              return exists ? { passportTaken: true } : null;
            }),
            catchError(() => {
              console.error('Error checking passport uniqueness');
              return of(null);
            })
          )
        )
      );
    };
  }
}

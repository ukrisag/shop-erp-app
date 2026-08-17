import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, retry, timer } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    // Retry สำหรับ network errors (status 0) และ 5xx errors
    retry({
      count: 2,
      delay: (error: HttpErrorResponse, retryCount) => {
        // Retry เฉพาะ network errors และ 5xx errors
        if (error.status === 0 || error.status >= 500) {
          const delayMs = retryCount * 1000; // 1s, 2s
          console.log(`Retry attempt ${retryCount} after ${delayMs}ms for ${req.url}`);
          return timer(delayMs);
        }
        // ไม่ retry สำหรับ error อื่นๆ
        throw error;
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // Skip showing toast for 401 errors (handled by auth interceptor)
      if (error.status === 401) {
        return throwError(() => error);
      }

      let errorMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `ข้อผิดพลาด: ${error.error.message}`;
      } else {
        // Server-side error
        switch (error.status) {
          case 0:
            errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
            break;
          case 400:
            errorMessage = error.error?.message || 'ข้อมูลไม่ถูกต้อง';
            break;
          case 403:
            errorMessage = 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
            break;
          case 404:
            errorMessage = 'ไม่พบข้อมูลที่ต้องการ';
            break;
          case 500:
            errorMessage = 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง';
            break;
          default:
            errorMessage = error.error?.message || errorMessage;
        }
      }

      notificationService.error(errorMessage);
      return throwError(() => error);
    })
  );
};

import { Injectable } from '@angular/core';
import { ReportsService } from './openapi-client/api/reports.service';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private readonly PDF_ACCEPT = { httpHeaderAccept: 'application/pdf' as const };
  private readonly EXCEL_ACCEPT = { httpHeaderAccept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' as const };

  constructor(private reportsService: ReportsService) { }

  /**
   * Download order details as PDF (A4 - default for customers)
   */
  downloadOrderPdf(orderId: number): void {
    // OpenAPI client จะ auto-detect responseType เป็น 'blob' จาก [Produces("application/pdf")]
    this.reportsService.reportsDownloadOrderPdf(orderId, 'body', false, this.PDF_ACCEPT).subscribe({
      next: (blob: any) => {
        this.downloadFile(blob, `Order-${orderId}.pdf`);
      },
      error: (error) => {
        console.error('Error downloading order PDF:', error);
      }
    });
  }

  /**
   * Download order details as PDF (Thermal 80mm - for admin/POS)
   */
  downloadOrderPdfThermal(orderId: number): void {
    this.reportsService.reportsDownloadOrderPdfThermal(orderId, 'body', false, this.PDF_ACCEPT).subscribe({
      next: (blob: any) => {
        this.downloadFile(blob, `Order-Thermal-${orderId}.pdf`);
      },
      error: (error) => {
        console.error('Error downloading order thermal PDF:', error);
      }
    });
  }

  /**
   * Download invoice PDF (A4 - default for customers)
   */
  downloadInvoicePdf(orderId: number): void {
    // OpenAPI client จะ auto-detect responseType เป็น 'blob' จาก [Produces("application/pdf")]
    this.reportsService.reportsDownloadInvoice(orderId, 'body', false, this.PDF_ACCEPT).subscribe({
      next: (blob: any) => {
        this.downloadFile(blob, `Invoice-${orderId}.pdf`);
      },
      error: (error) => {
        console.error('Error downloading invoice:', error);
      }
    });
  }

  /**
   * Download invoice PDF (Thermal 80mm - for admin/POS)
   */
  downloadInvoicePdfThermal(orderId: number): void {
    this.reportsService.reportsDownloadInvoiceThermal(orderId, 'body', false, this.PDF_ACCEPT).subscribe({
      next: (blob: any) => {
        this.downloadFile(blob, `Invoice-Thermal-${orderId}.pdf`);
      },
      error: (error) => {
        console.error('Error downloading invoice thermal:', error);
      }
    });
  }

  /**
   * Download orders Excel report (Admin only)
   */
  downloadOrdersExcel(startDate?: string, endDate?: string, status?: string): void {
    // OpenAPI client จะ auto-detect responseType เป็น 'blob' จาก [Produces("application/vnd.openxmlformats...")]
    this.reportsService.reportsDownloadOrdersExcel(startDate, endDate, status, 'body', false, this.EXCEL_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Orders-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading Excel report:', error);
      }
    });
  }

  /**
   * Download orders report as PDF (Admin only)
   */
  downloadOrdersPdf(startDate?: string, endDate?: string, status?: string): void {
    this.reportsService.reportsDownloadOrdersPdf(startDate, endDate, status, 'body', false, this.PDF_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Orders-Report-${new Date().toISOString().split('T')[0]}.pdf`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading orders PDF:', error);
      }
    });
  }

  /**
   * Download products report as Excel (Admin only)
   */
  downloadProductsExcel(categoryId?: number, brandId?: number): void {
    this.reportsService.reportsDownloadProductsExcel(categoryId, brandId, 'body', false, this.EXCEL_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Products-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading products Excel:', error);
      }
    });
  }

  /**
   * Download products report as PDF (Admin only)
   */
  downloadProductsPdf(categoryId?: number, brandId?: number): void {
    this.reportsService.reportsDownloadProductsPdf(categoryId, brandId, 'body', false, this.PDF_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Products-Report-${new Date().toISOString().split('T')[0]}.pdf`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading products PDF:', error);
      }
    });
  }

  /**
   * Download users report as Excel (Admin only)
   */
  downloadUsersExcel(role?: string): void {
    this.reportsService.reportsDownloadUsersExcel(role, 'body', false, this.EXCEL_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Users-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading users Excel:', error);
      }
    });
  }

  /**
   * Download users report as PDF (Admin only)
   */
  downloadUsersPdf(role?: string): void {
    this.reportsService.reportsDownloadUsersPdf(role, 'body', false, this.PDF_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Users-Report-${new Date().toISOString().split('T')[0]}.pdf`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading users PDF:', error);
      }
    });
  }

  /**
   * Download brands report as Excel (Admin only)
   */
  downloadBrandsExcel(): void {
    this.reportsService.reportsDownloadBrandsExcel('body', false, this.EXCEL_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Brands-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading brands Excel:', error);
      }
    });
  }

  /**
   * Download brands report as PDF (Admin only)
   */
  downloadBrandsPdf(): void {
    this.reportsService.reportsDownloadBrandsPdf('body', false, this.PDF_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Brands-Report-${new Date().toISOString().split('T')[0]}.pdf`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading brands PDF:', error);
      }
    });
  }

  /**
   * Download categories report as Excel (Admin only)
   */
  downloadCategoriesExcel(): void {
    this.reportsService.reportsDownloadCategoriesExcel('body', false, this.EXCEL_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Categories-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading categories Excel:', error);
      }
    });
  }

  /**
   * Download categories report as PDF (Admin only)
   */
  downloadCategoriesPdf(): void {
    this.reportsService.reportsDownloadCategoriesPdf('body', false, this.PDF_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Categories-Report-${new Date().toISOString().split('T')[0]}.pdf`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading categories PDF:', error);
      }
    });
  }

  /**
   * Download coupons report as Excel (Admin only)
   */
  downloadCouponsExcel(activeOnly?: boolean): void {
    this.reportsService.reportsDownloadCouponsExcel(activeOnly, 'body', false, this.EXCEL_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Coupons-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading coupons Excel:', error);
      }
    });
  }

  /**
   * Download coupons report as PDF (Admin only)
   */
  downloadCouponsPdf(activeOnly?: boolean): void {
    this.reportsService.reportsDownloadCouponsPdf(activeOnly, 'body', false, this.PDF_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Coupons-Report-${new Date().toISOString().split('T')[0]}.pdf`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading coupons PDF:', error);
      }
    });
  }

  /**
   * Download reviews report as Excel (Admin only)
   */
  downloadReviewsExcel(minRating?: number, maxRating?: number): void {
    this.reportsService.reportsDownloadReviewsExcel(minRating, maxRating, 'body', false, this.EXCEL_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Reviews-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading reviews Excel:', error);
      }
    });
  }

  /**
   * Download reviews report as PDF (Admin only)
   */
  downloadReviewsPdf(minRating?: number, maxRating?: number): void {
    this.reportsService.reportsDownloadReviewsPdf(minRating, maxRating, 'body', false, this.PDF_ACCEPT).subscribe({
      next: (blob: any) => {
        const filename = `Reviews-Report-${new Date().toISOString().split('T')[0]}.pdf`;
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error downloading reviews PDF:', error);
      }
    });
  }

  /**
   * Helper method to download file
   */
  private downloadFile(blob: any, filename: string): void {
    // Handle both Blob and ArrayBuffer
    const actualBlob = blob instanceof Blob ? blob : new Blob([blob]);
    const url = window.URL.createObjectURL(actualBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

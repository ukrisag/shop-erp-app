import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ErpSalesOrdersService, ErpSalesPaymentsService, BranchesService, ProductsService } from '../../../../services/openapi-client';
import {
  CreateErpSalesOrderDto,
  UpdateErpSalesOrderDto,
  CreateErpSalesPaymentDto,
  CreateErpSalesOrderItemDto,
  ProductDto
} from '../../../../services/openapi-client/model/models';
import { NotificationService } from '../../../../services/notification.service';
import { environment } from '../../../../../environments/environment';

// The generated ErpSalesOrdersController/ErpSalesPaymentsController/BranchesController actions
// return untyped IActionResult on the backend, so openapi-generator does not emit typed
// ErpSalesOrderDto / ErpSalesPaymentDto / BranchDto models. Define the shapes locally.
interface ErpSalesOrderItemDto {
  id?: number;
  salesOrderId?: number;
  productId?: number | null;
  productVariantId?: number | null;
  productName?: string | null;
  productSku?: string | null;
  productSize?: string | null;
  productDescription?: string | null;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  totalPrice?: number;
  notes?: string | null;
  createdAt?: string | null;
}

interface ErpSalesPaymentDto {
  id?: number;
  salesOrderId?: number;
  orderNumber?: string | null;
  branchId?: number;
  branchName?: string | null;
  paymentDate?: string | null;
  paymentType?: string | null;
  amount?: number;
  paymentMethod?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  transferDate?: string | null;
  slipUrl?: string | null;
  notes?: string | null;
  createdBy?: number | null;
  createdByName?: string | null;
  createdAt?: string | null;
}

interface ErpSalesOrderDto {
  id?: number;
  branchId?: number;
  branchName?: string | null;
  orderNumber?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerTaxId?: string | null;
  orderDate?: string | null;
  orderType?: string | null;
  status?: string | null;
  subtotal?: number;
  discountAmount?: number;
  discountPercentage?: number;
  amountBeforeVat?: number;
  vatEnabled?: boolean;
  vatPercentage?: number;
  vatAmount?: number;
  totalAmount?: number;
  depositAmount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  deliveryAppointmentDate?: string | null;
  deliveryDate?: string | null;
  deliveryStatus?: string | null;
  productStatus?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  createdBy?: number | null;
  createdByName?: string | null;
  updatedBy?: number | null;
  updatedByName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  items?: ErpSalesOrderItemDto[];
  payments?: ErpSalesPaymentDto[];
}

interface BranchDto {
  id?: number;
  name?: string | null;
  code?: string | null;
}

@Component({
  selector: 'app-sales-order-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales-order-admin.component.html',
  styleUrls: ['./sales-order-admin.component.css']
})
export class SalesOrderAdminComponent implements OnInit {
  orders = signal<ErpSalesOrderDto[]>([]);
  filteredOrders = signal<ErpSalesOrderDto[]>([]);
  branches = signal<BranchDto[]>([]);
  products = signal<ProductDto[]>([]);
  selectedOrder = signal<ErpSalesOrderDto | null>(null);
  loading = signal(false);
  loadingProducts = signal(false);
  uploadingSlip = signal(false);

  // Filters
  searchTerm = signal('');
  selectedBranch = signal<string>('');
  selectedStatus = signal<string>('');
  selectedOrderType = signal<string>('');

  // Modals
  showOrderModal = signal(false);
  showPaymentModal = signal(false);
  showDeleteModal = signal(false);
  isEditMode = signal(false);

  // Forms
  orderForm: any = {
    branchId: null,
    customerId: null,
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerTaxId: '',
    orderDate: '',
    orderType: 'quotation',
    status: 'draft',
    subtotal: 0,
    discountAmount: 0,
    discountPercentage: 0,
    vatEnabled: true,
    vatPercentage: 7,
    depositAmount: 0,
    deliveryAppointmentDate: '',
    notes: '',
    internalNotes: '',
    items: [] as CreateErpSalesOrderItemDto[]
  };

  paymentForm: any = {
    salesOrderId: null,
    branchId: null,
    paymentDate: '',
    paymentType: 'deposit',
    amount: 0,
    paymentMethod: 'transfer',
    bankName: '',
    accountNumber: '',
    transferDate: '',
    slipUrl: '',
    notes: ''
  };

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(10);

  orderTypes = [
    { value: 'quotation', label: 'ใบเสนอราคา' },
    { value: 'invoice', label: 'ใบแจ้งหนี้/ใบกำกับภาษี' }
  ];

  orderStatuses = [
    { value: 'draft', label: 'ฉบับร่าง' },
    { value: 'pending', label: 'รอดำเนินการ' },
    { value: 'approved', label: 'อนุมัติแล้ว' },
    { value: 'completed', label: 'เสร็จสิ้น' },
    { value: 'cancelled', label: 'ยกเลิก' }
  ];

  paymentTypes = [
    { value: 'deposit', label: 'มัดจำ' },
    { value: 'partial', label: 'ชำระบางส่วน' },
    { value: 'full', label: 'ชำระเต็มจำนวน' }
  ];

  paymentMethods = [
    { value: 'cash', label: 'เงินสด' },
    { value: 'transfer', label: 'โอนเงิน' },
    { value: 'check', label: 'เช็ค' },
    { value: 'credit_card', label: 'บัตรเครดิต' }
  ];

  Math = Math;

  constructor(
    private ordersService: ErpSalesOrdersService,
    private paymentsService: ErpSalesPaymentsService,
    private branchesService: BranchesService,
    private productsService: ProductsService,
    private router: Router,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    this.loadBranches();
    this.loadProducts();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.ordersService.erpSalesOrdersGetAll().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.orders.set(response.data);
          this.applyFilters();
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading orders:', error);
        this.loading.set(false);
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

  loadProducts(): void {
    this.loadingProducts.set(true);
    // Load all active products with large page size
    this.productsService.productsGetProducts(1, 1000).subscribe({
      next: (response: any) => {
        if (response.success && response.data?.items) {
          // Filter only active products
          const activeProducts = response.data.items.filter((p: ProductDto) => p.isActive);
          console.log('Loaded products:', activeProducts);
          console.log('Sample product basePrice:', activeProducts[0]?.basePrice);
          this.products.set(activeProducts);
        }
        this.loadingProducts.set(false);
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
        this.loadingProducts.set(false);
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.orders()];

    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(o =>
        o.orderNumber?.toLowerCase().includes(search) ||
        o.customerName?.toLowerCase().includes(search) ||
        o.customerPhone?.toLowerCase().includes(search)
      );
    }

    if (this.selectedBranch()) {
      filtered = filtered.filter(o => o.branchId?.toString() === this.selectedBranch());
    }

    if (this.selectedStatus()) {
      filtered = filtered.filter(o => o.status === this.selectedStatus());
    }

    if (this.selectedOrderType()) {
      filtered = filtered.filter(o => o.orderType === this.selectedOrderType());
    }

    this.filteredOrders.set(filtered);
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

  onStatusFilterChange(value: string): void {
    this.selectedStatus.set(value);
    this.applyFilters();
  }

  onOrderTypeFilterChange(value: string): void {
    this.selectedOrderType.set(value);
    this.applyFilters();
  }

  // Order CRUD
  openAddOrderModal(): void {
    this.isEditMode.set(false);
    this.selectedOrder.set(null);
    const today = new Date().toISOString().split('T')[0];
    this.orderForm = {
      branchId: null,
      customerId: null,
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      customerTaxId: '',
      orderDate: today,
      orderType: 'quotation',
      status: 'draft',
      subtotal: 0,
      discountAmount: 0,
      discountPercentage: 0,
      vatEnabled: true,
      vatPercentage: 7,
      depositAmount: 0,
      deliveryAppointmentDate: '',
      notes: '',
      internalNotes: '',
      items: []
    };
    this.showOrderModal.set(true);
  }

  openEditOrderModal(order: ErpSalesOrderDto): void {
    this.isEditMode.set(true);
    this.selectedOrder.set(order);
    this.orderForm = {
      branchId: order.branchId,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      customerTaxId: order.customerTaxId,
      orderDate: order.orderDate?.split('T')[0],
      orderType: order.orderType,
      status: order.status,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      discountPercentage: order.discountPercentage,
      vatEnabled: order.vatEnabled,
      vatPercentage: order.vatPercentage,
      depositAmount: order.depositAmount,
      deliveryAppointmentDate: order.deliveryAppointmentDate?.split('T')[0] || '',
      notes: order.notes,
      internalNotes: order.internalNotes,
      items: order.items || []
    };
    this.showOrderModal.set(true);
  }

  viewOrderDetails(order: ErpSalesOrderDto): void {
    this.selectedOrder.set(order);
  }

  closeOrderDetails(): void {
    this.selectedOrder.set(null);
  }

  openDeleteModal(order: ErpSalesOrderDto): void {
    this.selectedOrder.set(order);
    this.showDeleteModal.set(true);
  }

  saveOrder(): void {
    if (this.isEditMode()) {
      this.updateOrder();
    } else {
      this.createOrder();
    }
  }

  createOrder(): void {
    // Properly construct DTO with null for empty dates
    const dto: CreateErpSalesOrderDto = {
      branchId: this.orderForm.branchId,
      customerId: this.orderForm.customerId,
      customerName: this.orderForm.customerName,
      customerPhone: this.orderForm.customerPhone,
      customerAddress: this.orderForm.customerAddress,
      customerTaxId: this.orderForm.customerTaxId || null,
      orderDate: this.orderForm.orderDate,
      orderType: this.orderForm.orderType,
      status: this.orderForm.status,
      discountAmount: this.orderForm.discountAmount || 0,
      discountPercentage: this.orderForm.discountPercentage || 0,
      vatEnabled: this.orderForm.vatEnabled,
      vatPercentage: this.orderForm.vatPercentage || 7,
      depositAmount: this.orderForm.depositAmount || 0,
      deliveryAppointmentDate: this.orderForm.deliveryAppointmentDate?.trim() || null,
      notes: this.orderForm.notes || null,
      internalNotes: this.orderForm.internalNotes || null,
      items: this.orderForm.items
    };

    this.ordersService.erpSalesOrdersCreate(dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadOrders();
          this.closeModals();
          this.notificationService.success('สร้างรายการขายสำเร็จ');
        }
      },
      error: (error: any) => {
        console.error('Error creating order:', error);
        const errorMessage = error.error?.errors
          ? Object.values(error.error.errors).flat().join(', ')
          : error.error?.message || 'เกิดข้อผิดพลาดในการสร้างรายการ';
        this.notificationService.error(errorMessage);
      }
    });
  }

  updateOrder(): void {
    const order = this.selectedOrder();
    if (!order) return;

    // Properly construct DTO with null for empty dates
    const dto: UpdateErpSalesOrderDto = {
      customerId: this.orderForm.customerId,
      customerName: this.orderForm.customerName,
      customerPhone: this.orderForm.customerPhone,
      customerAddress: this.orderForm.customerAddress,
      customerTaxId: this.orderForm.customerTaxId || null,
      orderDate: this.orderForm.orderDate,
      status: this.orderForm.status,
      discountAmount: this.orderForm.discountAmount || 0,
      discountPercentage: this.orderForm.discountPercentage || 0,
      vatEnabled: this.orderForm.vatEnabled,
      vatPercentage: this.orderForm.vatPercentage || 7,
      deliveryAppointmentDate: this.orderForm.deliveryAppointmentDate?.trim() || null,
      notes: this.orderForm.notes || null,
      internalNotes: this.orderForm.internalNotes || null,
      items: this.orderForm.items
    };

    this.ordersService.erpSalesOrdersUpdate(order.id!, dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadOrders();
          this.closeModals();
          this.notificationService.success('อัปเดตรายการขายสำเร็จ');
        }
      },
      error: (error: any) => {
        console.error('Error updating order:', error);
        const errorMessage = error.error?.errors
          ? Object.values(error.error.errors).flat().join(', ')
          : error.error?.message || 'เกิดข้อผิดพลาดในการอัปเดตรายการ';
        this.notificationService.error(errorMessage);
      }
    });
  }

  deleteOrder(): void {
    const order = this.selectedOrder();
    if (!order) return;

    this.ordersService.erpSalesOrdersDelete(order.id!).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadOrders();
          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error deleting order:', error);
        this.notificationService.error(error.error?.message || 'เกิดข้อผิดพลาดในการลบรายการ');
      }
    });
  }

  // Payment
  openAddPaymentModal(order: ErpSalesOrderDto): void {
    this.selectedOrder.set(order);
    const today = new Date().toISOString().split('T')[0];
    this.paymentForm = {
      salesOrderId: order.id,
      branchId: order.branchId,  // เพิ่ม branchId จาก order
      paymentDate: today,
      paymentType: 'deposit',
      amount: 0,
      paymentMethod: 'transfer',
      bankName: '',
      accountNumber: '',
      transferDate: today,
      slipUrl: '',
      notes: ''
    };
    this.showPaymentModal.set(true);
  }

  onPaymentSlipSelect(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.notificationService.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.notificationService.error('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    this.uploadingSlip.set(true);

    const formData = new FormData();
    formData.append('file', file);

    // Upload to /api/upload/payment-slip endpoint
    const apiUrl = environment.apiUrl.replace('/api', '');
    this.http.post<any>(`${apiUrl}/api/upload/payment-slip`, formData).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.paymentForm.slipUrl = response.data;
          this.notificationService.success('อัปโหลดสลิปสำเร็จ');
        }
        this.uploadingSlip.set(false);
      },
      error: (error) => {
        console.error('Error uploading slip:', error);
        this.notificationService.error('เกิดข้อผิดพลาดในการอัปโหลดสลิป');
        this.uploadingSlip.set(false);
      }
    });
  }

  savePayment(): void {
    // Convert empty strings to null for optional fields
    const dto: CreateErpSalesPaymentDto = {
      ...this.paymentForm,
      paymentMethod: this.paymentForm.paymentMethod || null,
      bankName: this.paymentForm.bankName || null,
      accountNumber: this.paymentForm.accountNumber || null,
      transferDate: this.paymentForm.transferDate || null,
      slipUrl: this.paymentForm.slipUrl || null,
      notes: this.paymentForm.notes || null
    };

    this.paymentsService.erpSalesPaymentsCreate(dto).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.notificationService.success('บันทึกการชำระเงินสำเร็จ');

          // Reload the orders list
          this.loadOrders();

          // Reload the selected order details to show new payment
          const currentOrderId = this.selectedOrder()?.id;
          if (currentOrderId) {
            this.reloadOrderDetail(currentOrderId);
          }

          this.closeModals();
        }
      },
      error: (error: any) => {
        console.error('Error creating payment:', error);
        const errorMessage = error.error?.errors ?
          Object.values(error.error.errors).flat().join(', ') :
          error.error?.message || 'เกิดข้อผิดพลาดในการบันทึกการชำระเงิน';
        this.notificationService.error(errorMessage);
      }
    });
  }

  reloadOrderDetail(orderId: number): void {
    this.ordersService.erpSalesOrdersGetById(orderId).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.selectedOrder.set(response.data);
        }
      },
      error: (error: any) => {
        console.error('Error reloading order detail:', error);
      }
    });
  }

  closeModals(): void {
    this.showOrderModal.set(false);
    this.showPaymentModal.set(false);
    this.showDeleteModal.set(false);
  }

  // Helpers
  getPaginatedOrders(): ErpSalesOrderDto[] {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredOrders().slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredOrders().length / this.itemsPerPage());
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

  getOrderTypeLabel(type: string | null | undefined): string {
    const found = this.orderTypes.find(t => t.value === type);
    return found ? found.label : type || '-';
  }

  getStatusLabel(status: string | null | undefined): string {
    const found = this.orderStatuses.find(s => s.value === status);
    return found ? found.label : status || '-';
  }

  getPaymentTypeLabel(type: string | null | undefined): string {
    const found = this.paymentTypes.find(t => t.value === type);
    return found ? found.label : type || '-';
  }

  getPaymentMethodLabel(method: string | null | undefined): string {
    const found = this.paymentMethods.find(m => m.value === method);
    return found ? found.label : method || '-';
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH');
  }

  // Item Management
  addItem(): void {
    this.orderForm.items.push({
      productId: null,
      productName: '',
      productSku: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      notes: null
    });
  }

  onProductSelect(index: number, productId: any): void {
    // Convert to number if it's a string (from select dropdown)
    const numericProductId = typeof productId === 'string' ? parseInt(productId, 10) : productId;

    const product = this.products().find(p => p.id === numericProductId);
    console.log('Selected productId:', productId, 'Converted:', numericProductId);
    console.log('Selected product:', product);
    console.log('Product basePrice:', product?.basePrice);

    if (product) {
      // Use setTimeout to ensure the update happens after the current digest cycle
      setTimeout(() => {
        // Update all fields
        this.orderForm.items[index].productId = product.id;
        this.orderForm.items[index].productName = product.name || '';
        this.orderForm.items[index].productSku = product.sku || '';
        this.orderForm.items[index].unitPrice = product.basePrice || 0;

        console.log('Updated item unitPrice:', this.orderForm.items[index].unitPrice);
        console.log('Full item:', this.orderForm.items[index]);

        // Force update calculations
        this.updateItemTotal(index);

        // Manually trigger change detection
        this.cdr.detectChanges();
      }, 0);
    } else {
      console.error('Product not found! ProductId:', numericProductId, 'Available products:', this.products());
    }
  }

  removeItem(index: number): void {
    this.orderForm.items.splice(index, 1);
    this.calculateAmounts();
  }

  updateItemTotal(index: number): void {
    const item = this.orderForm.items[index];
    item.totalPrice = (item.quantity * item.unitPrice) - (item.discount || 0);
    this.calculateAmounts();
  }

  calculateAmounts(): void {
    // Calculate subtotal from items
    const subtotal = this.orderForm.items.reduce((sum: number, item: any) => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0) - (item.discount || 0);
      return sum + itemTotal;
    }, 0);

    this.orderForm.subtotal = subtotal;

    const discountAmount = this.orderForm.discountAmount || 0;
    const discountPercentage = this.orderForm.discountPercentage || 0;

    // Calculate discount
    let totalDiscount = discountAmount;
    if (discountPercentage > 0) {
      totalDiscount += (subtotal * discountPercentage) / 100;
    }

    const amountBeforeVat = subtotal - totalDiscount;

    // Calculate VAT
    let vatAmount = 0;
    if (this.orderForm.vatEnabled) {
      vatAmount = (amountBeforeVat * (this.orderForm.vatPercentage || 7)) / 100;
    }

    const totalAmount = amountBeforeVat + vatAmount;

    // Update form (for display purposes)
    this.orderForm.amountBeforeVat = amountBeforeVat;
    this.orderForm.vatAmount = vatAmount;
    this.orderForm.totalAmount = totalAmount;
  }
}

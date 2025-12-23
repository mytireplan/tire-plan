
export interface Store {
  id: string;
  name: string;
}

// Store Account for Login (Owners)
export interface StoreAccount extends Store {
  code: string; // 6-digit Login ID (RRSSSS)
  passwordHash: string; // Simulated Hash
  region: string; // '01', '02', etc.
  regionName: string; // '서울', '경기'
  isActive: boolean;
  ownerId: string; // Link to the Owner's Serial ID (e.g., '100001')
}

// Staff Member (Non-login entity)
export interface Staff {
  id: string;
  name: string;
  storeId: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number; // Total Stock (calculated)
  stockByStore: Record<string, number>; // { 'store_1': 10, 'store_2': 5 }
  category: string;
  brand?: string; // Brand name (e.g., '한국', '금호')
  barcode?: string;
  specification?: string; // e.g., 245/45R18
}

export interface SalesItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAtSale: number;
  specification?: string;
  brand?: string;
}

export const PaymentMethod = {
  CARD: 'CARD',
  CASH: 'CASH',
  TRANSFER: 'TRANSFER'
} as const;

export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];

export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  carModel?: string; // e.g., "Grandeur IG"
  vehicleNumber?: string; // e.g., "12가 3456"
  totalSpent: number;
  lastVisitDate: string;
  visitCount: number;
  // Business Info for Tax Invoice
  businessNumber?: string;
  companyName?: string;
  email?: string;
  ownerId?: string; // Link to Owner for scoping
}

export interface Sale {
  id: string;
  date: string; // ISO String
  storeId: string; // Where the sale happened
  totalAmount: number;
  paymentMethod: PaymentMethod;
  items: SalesItem[];
  staffName: string; // The staff member selected at checkout
  customer?: {
    name: string;
    phoneNumber: string;
    carModel?: string;
    vehicleNumber?: string;
    businessNumber?: string;
    companyName?: string;
    email?: string;
  };
  vehicleNumber?: string; // Top level for easier searching
  memo?: string;
  isTaxInvoiceRequested?: boolean;
  isCanceled?: boolean; // Payment Cancelled
  cancelDate?: string; // When it was cancelled
  isEdited?: boolean; // If the sale details were modified after creation
  inventoryAdjusted?: boolean; // Whether stock was deducted for this sale
}

export interface StockInRecord {
  id: string;
  date: string;
  storeId: string;
  supplier: string; // 거래처
  category: string;
  brand: string;
  productName: string;
  specification: string;
  quantity: number;
  purchasePrice?: number; // 매입가 (Admin only input in list)
  factoryPrice?: number; // 공장도가 (Entered at registration)
}

export interface StockTransferRecord {
  id: string;
  date: string;
  productId: string;
  productName: string;
  fromStoreId: string;
  toStoreId: string;
  quantity: number;
  staffName: string;
  fromStoreName?: string;
  toStoreName?: string;
}

export interface CartItem extends Product {
  cartItemId: string; // Unique identifier for line item
  quantity: number;
  isManual?: boolean; // If added via "+" button manually
  originalPrice?: number; // Original price before discount
  memo?: string; // Optional memo for specific items (e.g. unstocked tires)
}

export interface TaxInvoiceForm {
  companyName: string;
  ceoName: string;
  businessNumber: string;
  email: string;
  amount: number;
}

export type UserRole = 'SUPER_ADMIN' | 'STORE_ADMIN' | 'STAFF';

// Login User (Owner or Master)
export interface User {
  id: string;
  name: string;
  role: UserRole;
  storeId?: string; // Linked store context
  phoneNumber?: string; // Added for Owner Contact Info
}

export interface SalesFilter {
  type: 'ALL' | 'PAYMENT' | 'DATE';
  value: string; // 'CARD', '2023-10-25', or ''
  label: string; // Display title e.g. "카드 결제 내역", "10월 25일 매출 상세"
}

export interface StaffPermissions {
  viewInventory: boolean;
  viewSalesHistory: boolean;
  viewTaxInvoice: boolean;
}

// New Types for Financials
export interface ExpenseRecord {
  id: string;
  date: string;
  category: string; // '식비', '폐타이어처리비', '인건비', etc.
  description: string;
  amount: number;
  receiptImage?: string; // Base64 or URL
  isFixed?: boolean; // Generated from fixed cost config
  storeId?: string; // Linked to a specific branch for scoping
}

export interface FixedCostConfig {
  id: string;
  title: string; // e.g. '월세', '보안업체'
  amount: number;
  day: number; // Payment day (1-31)
  category: string;
}

// Leave Management Types
export type LeaveType = 'FULL' | 'HALF_AM' | 'HALF_PM';

export interface LeaveRequest {
  id: string;
  date: string; // YYYY-MM-DD
  staffId: string; // ID of the staff member
  staffName: string;
  type: LeaveType;
  reason?: string;
  createdAt: string;
}

// Reservation Types
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED';
export type StockStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'ORDERED' | 'CHECKING';

export interface Reservation {
  id: string;
  storeId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customerName: string;
  phoneNumber: string;
  vehicleNumber?: string;
  carModel?: string;
  productName: string; // e.g. "벤투스 S1" or general description
  specification?: string; // e.g. "245/45R18"
  brand?: string;
  quantity: number;
  status: ReservationStatus;
  stockStatus: StockStatus; 
  memo?: string;
  createdAt: string;
}

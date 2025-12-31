
export interface Store {
  id: string;
  name: string;
  ownerId?: string; // Owning account ID (for scoping)
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
  storeId?: string; // Optional: staff can work across stores
  ownerId?: string; // Owning account to prevent cross-tenant leakage
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number; // Total Stock (calculated)
  stockByStore: Record<string, number>; // { 'store_1': 10, 'store_2': 5 }
  category: string;
  ownerId?: string; // Owning account for multitenancy
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
  discountAmount?: number; // Optional discount applied to the sale
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
  productId?: string; // Linked product for precise stock updates
  supplier: string; // 거래처
  category: string;
  brand: string;
  productName: string;
  specification: string;
  quantity: number;
  receivedQuantity?: number; // 실입고 수량(즉시판매 시 원본 수량)
  consumedAtSaleId?: string; // 바로 판매에 사용된 판매 ID
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

// Shift schedule
export interface Shift {
  id: string;
  groupId?: string; // Same drag-range group
  staffId: string;
  staffName: string;
  storeId: string;
  start: string; // ISO string
  end: string; // ISO string
  role?: string;
  memo?: string;
  shiftType?: 'REGULAR' | 'NIGHT' | 'OFF' | 'VACATION';
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

// Subscription Types
export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
export type SubscriptionBillingCycle = 'MONTHLY' | 'YEARLY';
export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'CANCELED' | 'SUSPENDED';

export interface SubscriptionPlanFeatures {
  plan: SubscriptionPlan;
  monthlyPrice: number;
  yearlyPrice: number;
  maxStores: number; // -1 for unlimited
  maxStaff: number; // -1 for unlimited
  maxSalesPerMonth: number; // -1 for unlimited
  maxProducts: number; // -1 for unlimited
  dataRetentionDays: number; // -1 for unlimited
  features: {
    taxInvoice: boolean;
    advancedAnalytics: boolean;
    staffManagement: boolean;
    multiStore: boolean;
    reservationSystem: boolean;
    leaveManagement: boolean;
    financialReports: boolean;
    staffPerformance: boolean;
    customerManagement: boolean;
    dataExport: boolean;
    advancedInventory: boolean;
    dedicatedSupport?: boolean;
    customization?: boolean;
    apiAccess?: boolean;
    dataBackup?: boolean;
    advancedReports?: boolean;
    multiUserPermissions?: boolean;
  };
}

export interface BillingKey {
  id: string;
  ownerId: string;
  customerKey: string; // Toss Payments customer key
  cardNumber?: string; // Masked (e.g., "1234-****-****-5678")
  cardCompany?: string;
  isDefault: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface Subscription {
  id: string;
  ownerId: string;
  storeId: string; // Primary store
  plan: SubscriptionPlan;
  billingCycle: SubscriptionBillingCycle;
  status: SubscriptionStatus;
  billingKeyId: string; // Reference to BillingKey
  currentPeriodStart: string; // ISO string
  currentPeriodEnd: string; // ISO string
  nextBillingDate: string; // ISO string
  createdAt: string;
  updatedAt: string;
  canceledAt?: string;
}

export interface PaymentHistory {
  id: string;
  ownerId: string;
  subscriptionId: string;
  billingKeyId: string;
  orderId: string; // Toss Payments order ID
  amount: number;
  billingCycle: SubscriptionBillingCycle;
  status: 'SUCCESS' | 'FAILED' | 'PENDING'; // Payment status
  failureReason?: string;
  paidAt: string; // ISO string
  nextRetryAt?: string; // For failed payments
  createdAt: string;
}

export interface UsageMetrics {
  ownerId: string;
  periodStart: string; // ISO string
  periodEnd: string; // ISO string
  salesCount: number;
  productsCount: number;
  // Add more metrics as needed
}

// Menu Access Control by Plan
export type MenuType = 
  | 'dashboard' 
  | 'pos' 
  | 'salesHistory' 
  | 'inventory' 
  | 'reservation' 
  | 'customers' 
  | 'taxInvoice' 
  | 'stockIn' 
  | 'financials' 
  | 'schedule' 
  | 'settings';

export interface MenuAccess {
  menu: MenuType;
  label: string;
  enabled: boolean;
  restricted?: boolean; // true if accessible but with limitations
  description?: string;
}

export interface PlanMenuAccess {
  plan: SubscriptionPlan;
  menus: Record<MenuType, MenuAccess>;
  maxStores: number; // -1 for unlimited
  maxStaff: number; // -1 for unlimited
  maxSalesPerMonth: number; // -1 for unlimited
  maxProducts: number; // -1 for unlimited
  dataRetentionDays: number; // -1 for unlimited
}


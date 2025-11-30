#!/bin/bash

# 1. Project Directory Creation
echo "Creating project directory 'frontend'..."
mkdir -p frontend
cd frontend

# 2. Initialize package.json
echo "Creating package.json..."
cat <<'EOF' > package.json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "@google/genai": "^0.1.1",
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.12.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.6"
  }
}
EOF

# 3. Create Configuration Files
echo "Creating configuration files..."

cat <<'EOF' > vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
EOF

cat <<'EOF' > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

cat <<'EOF' > tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

cat <<'EOF' > tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'scale-in': { from: { transform: 'scale(0.95)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out'
      }
    },
  },
  plugins: [],
}
EOF

cat <<'EOF' > postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

cat <<'EOF' > index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SmartPOS & Inventory ERP</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# 4. Create Source Directory Structure
echo "Creating source directories..."
mkdir -p src/components

# 5. Create Source Files

# src/index.css
cat <<'EOF' > src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; }

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ccc; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
EOF

# src/main.tsx
cat <<'EOF' > src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# src/types.ts
cat <<'EOF' > src/types.ts
export interface Store {
  id: string;
  name: string;
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

export enum PaymentMethod {
  CARD = 'CARD',
  CASH = 'CASH',
  TRANSFER = 'TRANSFER'
}

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
}

export interface Sale {
  id: string;
  date: string; // ISO String
  storeId: string; // Where the sale happened
  totalAmount: number;
  paymentMethod: PaymentMethod;
  items: SalesItem[];
  staffName: string;
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

export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  name: string;
  role: UserRole;
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
  staffId: string;
  staffName: string;
  type: LeaveType;
  reason?: string;
  createdAt: string;
}
EOF

# 6. Create Components

# components/Dashboard.tsx
cat <<'EOF' > src/components/Dashboard.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { Sale, Product, PaymentMethod, Store, SalesFilter, User, StockInRecord, StockTransferRecord, ExpenseRecord, LeaveRequest } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Calendar, ChevronLeft, ChevronRight, Store as StoreIcon, Bell, ArrowRightLeft, Truck, CreditCard, Banknote, Smartphone, ArrowUpRight, ArrowDownRight, Receipt, Palmtree, Package } from 'lucide-react';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  stores: Store[];
  onNavigateToHistory: (filter: SalesFilter) => void;
  currentUser: User;
  currentStoreId: string;
  stockInHistory?: StockInRecord[];
  transferHistory?: StockTransferRecord[];
  expenses?: ExpenseRecord[];
  isSidebarOpen?: boolean;
  leaveRequests?: LeaveRequest[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg z-50">
        <p className="font-bold text-gray-800 mb-2">{label}</p>
        <div className="space-y-1 mb-2">
            {payload.map((entry: any, index: number) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-gray-600">{entry.name}:</span>
                    <span className="font-medium ml-auto">₩{entry.value.toLocaleString()}</span>
                </div>
            ))}
        </div>
        <div className="border-t border-gray-100 pt-2 mt-1">
            <div className="flex justify-between items-center gap-4">
                <span className="text-xs font-bold text-gray-500">일일 합계</span>
                <span className="text-sm font-bold text-blue-600">₩{total.toLocaleString()}</span>
            </div>
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ sales, products, stores, onNavigateToHistory, currentUser, currentStoreId, stockInHistory = [], transferHistory = [], expenses = [], isSidebarOpen = true, leaveRequests = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [chartStartDate, setChartStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d;
  });
  
  const [boardDate, setBoardDate] = useState(new Date());

  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
      if (currentUser.role === 'STAFF' && currentStoreId) {
          return currentStoreId;
      }
      return 'ALL';
  });

  useEffect(() => {
      if (currentUser.role === 'STAFF' && currentStoreId) {
          setSelectedStoreId(currentStoreId);
      }
  }, [currentUser, currentStoreId]);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const moveBoardDate = (days: number) => {
      const newDate = new Date(boardDate);
      newDate.setDate(newDate.getDate() + days);
      setBoardDate(newDate);
  };

  const formatDateYMD = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      const localDate = new Date(date.getTime() - offset);
      return localDate.toISOString().split('T')[0];
  };

  const boardDateStr = formatDateYMD(boardDate);
  const today = new Date();
  const isCurrentMonthView = currentDate.getMonth() === today.getMonth() && 
                             currentDate.getFullYear() === today.getFullYear();

  const filteredSalesByStore = useMemo(() => {
    if (selectedStoreId === 'ALL') return sales;
    return sales.filter(s => s.storeId === selectedStoreId);
  }, [sales, selectedStoreId]);

  const monthlySales = useMemo(() => {
    return filteredSalesByStore.filter(s => {
        const d = new Date(s.date);
        return d.getFullYear() === currentDate.getFullYear() && 
               d.getMonth() === currentDate.getMonth();
    });
  }, [filteredSalesByStore, currentDate]);

  const prevMonthSalesFull = useMemo(() => {
      const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      return filteredSalesByStore.filter(s => {
          const d = new Date(s.date);
          return d.getFullYear() === prevDate.getFullYear() && 
                 d.getMonth() === prevDate.getMonth();
      });
  }, [filteredSalesByStore, currentDate]);

  const prevMonthSamePeriodSales = useMemo(() => {
      const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const currentDay = today.getDate();

      return filteredSalesByStore.filter(s => {
          const d = new Date(s.date);
          const isPrevMonth = d.getFullYear() === prevDate.getFullYear() && 
                              d.getMonth() === prevDate.getMonth();
          
          if (!isPrevMonth) return false;
          if (isCurrentMonthView) {
              return d.getDate() <= currentDay;
          }
          return true;
      });
  }, [filteredSalesByStore, currentDate, isCurrentMonthView, today]);

  const prevMonthDailyAverage = useMemo(() => {
      const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const daysInPrevMonth = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
      const totalPrevRevenue = prevMonthSalesFull.reduce((sum, s) => sum + s.totalAmount, 0);
      return daysInPrevMonth > 0 ? totalPrevRevenue / daysInPrevMonth : 0;
  }, [prevMonthSalesFull, currentDate]);

  const totalRevenue = monthlySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const prevTotalRevenueSamePeriod = prevMonthSamePeriodSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  const calculateGrowth = (current: number, prev: number): string => {
      if (prev === 0) return current > 0 ? "100.0" : "0.0";
      return ((current - prev) / prev * 100).toFixed(1);
  };

  const revenueGrowth = calculateGrowth(totalRevenue, prevTotalRevenueSamePeriod);

  const getPaymentStats = (salesData: Sale[]) => {
    const stats = {
      [PaymentMethod.CARD]: 0,
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.TRANSFER]: 0
    };
    salesData.forEach(s => {
      if (stats[s.paymentMethod] !== undefined) {
        stats[s.paymentMethod] += s.totalAmount;
      }
    });
    return stats;
  };

  const paymentStats = useMemo(() => getPaymentStats(monthlySales), [monthlySales]);
  const prevPaymentStats = useMemo(() => getPaymentStats(prevMonthSamePeriodSales), [prevMonthSamePeriodSales]);

  const salesChartData = useMemo(() => {
    const data: any[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(chartStartDate);
        d.setDate(d.getDate() + i);
        const dateKey = formatDateYMD(d);
        const displayDate = `${d.getMonth() + 1}/${d.getDate()}`;

        const daySales = filteredSalesByStore.filter(s => s.date.startsWith(dateKey));
        const card = daySales.filter(s => s.paymentMethod === PaymentMethod.CARD).reduce((a, b) => a + b.totalAmount, 0);
        const cash = daySales.filter(s => s.paymentMethod === PaymentMethod.CASH).reduce((a, b) => a + b.totalAmount, 0);
        const transfer = daySales.filter(s => s.paymentMethod === PaymentMethod.TRANSFER).reduce((a, b) => a + b.totalAmount, 0);

        data.push({
            name: displayDate,
            fullDate: dateKey,
            CARD: card,
            CASH: cash,
            TRANSFER: transfer,
            total: card + cash + transfer
        });
    }
    return data;
  }, [filteredSalesByStore, chartStartDate]);

  const storeShareData = useMemo(() => {
    return stores.map(store => {
        const storeRevenue = monthlySales
            .filter(s => s.storeId === store.id)
            .reduce((sum, s) => sum + s.totalAmount, 0);
        return { name: store.name, value: storeRevenue };
    }).filter(d => d.value > 0);
  }, [monthlySales, stores]);

  const CHART_COLORS = { CARD: '#3b82f6', CASH: '#10b981', TRANSFER: '#8b5cf6' };
  const PIE_COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444'];

  const moveChartWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(chartStartDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setChartStartDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const calendarDays = getDaysInMonth(currentDate);

  const getDailyStats = (date: Date) => {
    const dateString = formatDateYMD(date);
    const daySales = filteredSalesByStore.filter(s => s.date.startsWith(dateString));
    const revenue = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const cash = daySales.filter(s => s.paymentMethod === PaymentMethod.CASH).reduce((sum, s) => sum + s.totalAmount, 0);
    const card = daySales.filter(s => s.paymentMethod === PaymentMethod.CARD).reduce((sum, s) => sum + s.totalAmount, 0);
    const transfer = daySales.filter(s => s.paymentMethod === PaymentMethod.TRANSFER).reduce((sum, s) => sum + s.totalAmount, 0);
    return { revenue, cash, card, transfer };
  };

  const dailySales = useMemo(() => filteredSalesByStore.filter(s => s.date.startsWith(boardDateStr)), [filteredSalesByStore, boardDateStr]);
  const dailyStockIns = useMemo(() => stockInHistory.filter(r => r.storeId === currentStoreId && r.date.startsWith(boardDateStr)), [stockInHistory, currentStoreId, boardDateStr]);
  const dailyTransfers = useMemo(() => transferHistory.filter(r => (r.fromStoreId === currentStoreId || r.toStoreId === currentStoreId) && r.date.startsWith(boardDateStr)), [transferHistory, currentStoreId, boardDateStr]);
  
  const combinedMovements = useMemo(() => {
      const stockIns = dailyStockIns.map(d => ({ type: 'STOCK_IN' as const, data: d, id: d.id }));
      const transfers = dailyTransfers.map(d => ({ type: 'TRANSFER' as const, data: d, id: d.id }));
      return [...stockIns, ...transfers].sort((a, b) => b.id.localeCompare(a.id));
  }, [dailyStockIns, dailyTransfers]);

  const dailyExpenses = useMemo(() => expenses.filter(e => e.date === boardDateStr), [expenses, boardDateStr]);
  const upcomingLeaves = useMemo(() => {
      if (currentUser.role === 'ADMIN') {
          return leaveRequests.filter(req => new Date(req.date) >= new Date(today.setHours(0,0,0,0))).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);
      }
      return leaveRequests.filter(req => req.date === boardDateStr);
  }, [leaveRequests, boardDateStr, currentUser.role]);

  const SummaryCard = ({ title, value, icon: Icon, color, growth, isPrimary = false, onClick, comparisonText, isSidebarOpen = true }: any) => (
    <div onClick={onClick} className={`relative overflow-hidden rounded-xl shadow-sm border transition-all cursor-pointer hover:scale-[1.02] hover:shadow-md ${isPrimary ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-600' : 'bg-white border-gray-100 hover:border-blue-200'} p-5 ${isSidebarOpen ? 'md:p-3 xl:p-5' : ''}`}>
        <div className="flex justify-between items-start mb-4 md:mb-2">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                     <Icon className={`hidden ${isSidebarOpen ? 'md:block xl:hidden' : ''} w-3.5 h-3.5 flex-shrink-0 ${isPrimary ? 'text-blue-200' : color.replace('bg-', 'text-')}`} />
                     <p className={`text-sm ${isSidebarOpen ? 'md:text-xs xl:text-sm' : ''} font-medium whitespace-nowrap ${isPrimary ? 'text-blue-100' : 'text-gray-500'}`}>{title}</p>
                </div>
                <h4 className={`font-bold tracking-tight whitespace-nowrap ${isPrimary ? 'text-2xl' : 'text-2xl text-gray-900'} ${isSidebarOpen ? 'md:text-lg xl:text-2xl' : ''}`}>{value}</h4>
            </div>
            <div className={`ml-2 ${isSidebarOpen ? 'md:hidden xl:block' : ''} lg:block p-3 lg:p-2 rounded-xl shadow-sm flex-shrink-0 ${isPrimary ? 'bg-white/20 text-white' : `${color.replace('bg-', 'bg-').replace('600', '50')} ${color.replace('bg-', 'text-')}`}`}>
                <Icon size={28} className="lg:w-7 lg:h-7" />
            </div>
        </div>
        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
            {comparisonText ? (
                 <span className={`${isPrimary ? 'text-blue-100' : 'text-gray-500'} font-medium ${isSidebarOpen ? 'md:text-[10px] xl:text-xs' : ''} lg:text-xs truncate`}>{comparisonText}</span>
            ) : (
                <>
                    <div className={`flex items-center px-1.5 py-0.5 rounded font-bold ${Number(growth) >= 0 ? (isPrimary ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700') : (isPrimary ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700')}`}>
                        {Number(growth) >= 0 ? <ArrowUpRight size={12} className="mr-0.5"/> : <ArrowDownRight size={12} className="mr-0.5"/>}
                        {Math.abs(Number(growth))}%
                    </div>
                    <span className={isPrimary ? 'text-blue-100' : 'text-gray-400'}>전월 대비</span>
                </>
            )}
        </div>
    </div>
  );

  if (currentUser.role === 'STAFF') {
      return (
          <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><StoreIcon size={24} /></div>
                    <div><h2 className="text-lg font-bold text-gray-800">지점 현황판</h2><p className="text-sm text-gray-500">{stores.find(s => s.id === currentStoreId)?.name || '지점 선택 필요'}</p></div>
                </div>
                <div className="flex items-center gap-3">
                     <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                         <button onClick={() => moveBoardDate(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all"><ChevronLeft size={20} /></button>
                         <div className="relative"><input type="date" value={boardDateStr} onChange={(e) => setBoardDate(new Date(e.target.value))} className="bg-transparent text-base font-bold text-gray-800 text-center px-2 focus:outline-none w-[140px] cursor-pointer" /></div>
                         <button onClick={() => moveBoardDate(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all"><ChevronRight size={20} /></button>
                     </div>
                     <button onClick={() => setBoardDate(new Date())} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">오늘</button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Bell className="text-orange-500" size={20} /> 공지 및 휴무</h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                         {upcomingLeaves.length > 0 && (
                             <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg mb-2">
                                 <h4 className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1"><Palmtree size={12}/> 금일 휴무자</h4>
                                 <div className="space-y-1">{upcomingLeaves.map(req => (<div key={req.id} className="text-sm text-gray-700 flex justify-between"><span>{req.staffName}</span><span className="font-medium text-purple-600">{req.type === 'FULL' ? '연차' : req.type === 'HALF_AM' ? '오전반차' : '오후반차'}</span></div>))}</div>
                             </div>
                         )}
                         <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg"><span className="text-xs font-bold text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-200 mb-1 inline-block">긴급</span><p className="text-sm font-bold text-gray-800">동절기 타이어 재고 점검 안내</p><p className="text-xs text-gray-500 mt-1">이번 주말 기온 하강 예보로 윈터타이어 수요 급증이 예상됩니다. 재고 확인 바랍니다.</p></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><DollarSign className="text-blue-600" size={20} /> 일간 판매 내역</div><span className="text-sm font-bold text-blue-600">총 {dailySales.length}건</span></h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {dailySales.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400"><ShoppingBag size={32} className="opacity-20 mb-2"/><p>{boardDateStr} 판매 내역이 없습니다.</p></div>) : (<div className="space-y-2">{dailySales.map(sale => (<div key={sale.id} className="flex justify-between items-center p-3 bg-blue-50/30 rounded-lg border border-blue-100 hover:bg-blue-50 transition-colors"><div><div className="font-bold text-sm text-gray-800">{sale.items[0].productName}</div><div className="text-xs text-gray-500">{sale.items.length > 1 ? `외 ${sale.items.length - 1}건` : sale.items[0].specification}</div></div><div className="text-right"><div className="font-bold text-blue-600">₩{sale.totalAmount.toLocaleString()}</div><div className="text-xs text-gray-400">{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div></div></div>))}</div>)}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center"><span className="text-sm text-gray-500 font-medium">일 매출 합계</span><span className="text-xl font-bold text-gray-900">₩{dailySales.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}</span></div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><Receipt className="text-rose-600" size={20} /> 일간 지출 내역</div><span className="text-sm font-bold text-rose-600">총 ₩{dailyExpenses.reduce((a,b)=>a+b.amount,0).toLocaleString()}</span></h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {dailyExpenses.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400"><Receipt size={32} className="opacity-20 mb-2"/><p>금일 지출 내역이 없습니다.</p></div>) : (<div className="space-y-2">{dailyExpenses.map(exp => (<div key={exp.id} className="flex justify-between items-center p-3 bg-rose-50/30 rounded-lg border border-rose-100 hover:bg-rose-50 transition-colors"><div><div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">{exp.category}</span></div><div className="font-medium text-sm text-gray-800">{exp.description}</div></div><div className="font-bold text-rose-600">₩{exp.amount.toLocaleString()}</div></div>))}</div>)}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><Package className="text-emerald-600" size={20} /> 일간 자재 변동 내역</div><span className="text-sm font-bold text-emerald-600">총 {combinedMovements.length}건</span></h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {combinedMovements.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400"><ArrowRightLeft size={32} className="opacity-20 mb-2"/><p>금일 입고 또는 이동 내역이 없습니다.</p></div>) : (<div className="space-y-2">{combinedMovements.map(item => { if (item.type === 'STOCK_IN') { const record = item.data as StockInRecord; return (<div key={record.id} className="p-3 bg-emerald-50/30 rounded-lg border border-emerald-100 hover:bg-emerald-50 transition-colors"><div className="flex justify-between mb-1"><span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">입고 (매입)</span><span className="text-xs text-gray-400">{record.supplier}</span></div><div className="flex justify-between items-center"><div><div className="font-bold text-sm text-gray-800">{record.productName}</div><div className="text-xs text-gray-500">{record.specification}</div></div><div className="text-lg font-bold text-emerald-600">+{record.quantity}</div></div></div>); } else { const record = item.data as StockTransferRecord; const isIncoming = record.toStoreId === currentStoreId; return (<div key={record.id} className={`p-3 rounded-lg border hover:bg-opacity-50 transition-colors ${isIncoming ? 'bg-blue-50/50 border-blue-100' : 'bg-orange-50/50 border-orange-100'}`}><div className="flex justify-between items-center mb-1"><span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isIncoming ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{isIncoming ? '이동 (수신)' : '이동 (발신)'}</span><span className="text-xs text-gray-500">{isIncoming ? `From: ${stores.find(s=>s.id === record.fromStoreId)?.name}` : `To: ${stores.find(s=>s.id === record.toStoreId)?.name}`}</span></div><div className="flex justify-between items-center"><div className="text-sm font-bold text-gray-800">{record.productName}</div><div className={`text-lg font-bold ${isIncoming ? 'text-blue-600' : 'text-orange-600'}`}>{isIncoming ? '+' : '-'}{record.quantity}</div></div></div>); } })}</div>)}
                    </div>
                </div>
            </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-6"><h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><TrendingUp className="text-blue-600" /> 매출 현황 대시보드</h2><div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200"><button onClick={prevMonth} className="p-1 hover:bg-white rounded shadow-sm transition-all text-gray-600"><ChevronLeft size={20} /></button><span className="text-sm font-bold text-gray-800 min-w-[100px] text-center">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</span><button onClick={nextMonth} className="p-1 hover:bg-white rounded shadow-sm transition-all text-gray-600"><ChevronRight size={20} /></button></div></div>
        <div className="flex items-center gap-3 w-full md:w-auto"><StoreIcon size={18} className="text-gray-500" /><select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} className={`bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 w-full md:w-auto`}><option value="ALL">전체 매장 통합</option>{stores.map(store => (<option key={store.id} value={store.id}>{store.name}</option>))}</select></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-2 lg:gap-6">
        <SummaryCard title={`${currentDate.getMonth() + 1}월 총 매출`} value={`₩${totalRevenue.toLocaleString()}`} icon={TrendingUp} color="bg-blue-600" textColor="text-blue-700" bgColor="bg-blue-50" isPrimary={true} growth={revenueGrowth} comparisonText={isCurrentMonthView ? `전월 동일 시점 대비 ${Math.abs(Number(revenueGrowth))}% ${Number(revenueGrowth) >= 0 ? '상승' : '하락'}` : undefined} onClick={() => onNavigateToHistory({ type: 'ALL', value: '', label: '전체 매출 상세' })} isSidebarOpen={isSidebarOpen} />
        <SummaryCard title={`${currentDate.getMonth() + 1}월 현금 매출`} value={`₩${paymentStats.CASH.toLocaleString()}`} icon={Banknote} color="bg-emerald-600" growth={calculateGrowth(paymentStats.CASH, prevPaymentStats.CASH)} onClick={() => onNavigateToHistory({ type: 'PAYMENT', value: PaymentMethod.CASH, label: '현금 매출 상세' })} isSidebarOpen={isSidebarOpen} />
        <SummaryCard title={`${currentDate.getMonth() + 1}월 카드 매출`} value={`₩${paymentStats.CARD.toLocaleString()}`} icon={CreditCard} color="bg-blue-600" growth={calculateGrowth(paymentStats.CARD, prevPaymentStats.CARD)} onClick={() => onNavigateToHistory({ type: 'PAYMENT', value: PaymentMethod.CARD, label: '카드 매출 상세' })} isSidebarOpen={isSidebarOpen} />
        <SummaryCard title={`${currentDate.getMonth() + 1}월 계좌 이체`} value={`₩${paymentStats.TRANSFER.toLocaleString()}`} icon={Smartphone} color="bg-violet-600" growth={calculateGrowth(paymentStats.TRANSFER, prevPaymentStats.TRANSFER)} onClick={() => onNavigateToHistory({ type: 'PAYMENT', value: PaymentMethod.TRANSFER, label: '계좌이체 매출 상세' })} isSidebarOpen={isSidebarOpen} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Palmtree className="text-purple-600" size={20} /> 다가오는 휴무</h3>
            <div className="space-y-3">{upcomingLeaves.length === 0 ? (<div className="text-center py-6 text-gray-400 text-sm">예정된 휴무가 없습니다.</div>) : (upcomingLeaves.map(req => (<div key={req.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100"><div><div className="text-xs font-bold text-gray-500">{new Date(req.date).toLocaleDateString()}</div><div className="font-bold text-gray-800">{req.staffName}</div></div><span className={`text-xs px-2 py-1 rounded-full font-bold ${req.type === 'FULL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{req.type === 'FULL' ? '연차' : '반차'}</span></div>)))}</div>
        </div>
        <div className="md:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-w-0">
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-gray-800">주간 매출 상세 (결제수단별)</h3><div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1"><button onClick={() => moveChartWeek('prev')} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronLeft size={20}/></button><span className="text-sm font-medium px-2">{chartStartDate.toLocaleDateString()} ~ {new Date(new Date(chartStartDate).setDate(chartStartDate.getDate()+6)).toLocaleDateString()}</span><button onClick={() => moveChartWeek('next')} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronRight size={20}/></button></div></div>
                <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={salesChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} onClick={(data) => { if (data && data.activeLabel) { const clickedItem = salesChartData.find(item => item.name === data.activeLabel); if (clickedItem) onNavigateToHistory({ type: 'DATE', value: clickedItem.fullDate, label: `${clickedItem.name} 매출 상세` }); } }} className="cursor-pointer"><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => value === 0 ? '0' : `₩${(value/10000).toLocaleString()}만`} /><Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} /><Legend /><Bar dataKey="CARD" name="카드" stackId="a" fill={CHART_COLORS.CARD} /><Bar dataKey="CASH" name="현금" stackId="a" fill={CHART_COLORS.CASH} /><Bar dataKey="TRANSFER" name="이체" stackId="a" fill={CHART_COLORS.TRANSFER} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 mb-1">{currentDate.getMonth() + 1}월 매장별 점유율</h3>
                <p className="text-xs text-gray-500 mb-4">총 ₩{totalRevenue.toLocaleString()} 중 비중</p>
                {storeShareData.length > 0 ? (<div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={storeShareData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>{storeShareData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}</Pie><Tooltip formatter={(value: number) => `₩${value.toLocaleString()}`} /><Legend verticalAlign="bottom" align="left" /></PieChart></ResponsiveContainer></div>) : (<div className="h-80 flex items-center justify-center text-gray-400">데이터가 없습니다.</div>)}
            </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between"><h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Calendar className="text-blue-600" size={20} /> {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 매출 캘린더</h3>{prevMonthDailyAverage > 0 && (<span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 font-medium">전월 일 평균 ₩{Math.round(prevMonthDailyAverage).toLocaleString()} 초과 달성일 강조</span>)}</div>
        <div className="p-4 md:p-6">
            <div className="grid grid-cols-7 mb-2">{['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (<div key={day} className={`text-center text-xs md:text-sm font-medium py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>{day}</div>))}</div>
            <div className="grid grid-cols-7 gap-1 md:gap-2">
                {calendarDays.map((date, index) => {
                    if (!date) return <div key={`empty-${index}`} className="min-h-[80px] md:h-28 bg-gray-50/50 rounded-lg"></div>;
                    const { revenue, cash, card, transfer } = getDailyStats(date);
                    const isToday = new Date().toDateString() === date.toDateString();
                    const isSunday = date.getDay() === 0;
                    const isSaturday = date.getDay() === 6;
                    const dateString = formatDateYMD(date);
                    const isHighRevenue = prevMonthDailyAverage > 0 && revenue > prevMonthDailyAverage;
                    return (
                        <div key={date.toISOString()} onClick={() => onNavigateToHistory({ type: 'DATE', value: dateString, label: `${date.getMonth()+1}월 ${date.getDate()}일 매출 상세` })} className={`min-h-[80px] md:h-28 rounded-lg border p-1 md:p-2 flex flex-col justify-between transition-all cursor-pointer ${isToday ? 'border-blue-500 ring-1 ring-blue-200 bg-blue-50' : isHighRevenue ? 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-300 hover:shadow-md' : 'border-gray-100 hover:border-blue-300 bg-white hover:shadow-md hover:-translate-y-1'}`}>
                            <span className={`text-xs md:text-sm font-medium ${isSunday ? 'text-red-500' : isSaturday ? 'text-blue-500' : 'text-gray-700'}`}>{date.getDate()}</span>
                            {revenue > 0 && (<div className="text-right flex flex-col items-end gap-0.5 mt-1"><div className={`font-bold text-sm leading-tight tracking-tight ${isHighRevenue ? 'text-emerald-700' : 'text-slate-800'}`}>₩{revenue.toLocaleString()}</div><div className="flex flex-col items-end text-[10px] text-gray-400 font-medium leading-snug mt-1">{card > 0 && <span className="text-blue-400/80">카드 ₩{Math.round(card/10000).toLocaleString()}만</span>}{cash > 0 && <span className="text-emerald-400/80">현금 ₩{Math.round(cash/10000).toLocaleString()}만</span>}{transfer > 0 && <span className="text-violet-400/80">이체 ₩{Math.round(transfer/10000).toLocaleString()}만</span>}</div></div>)}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
EOF

# components/POS.tsx
cat <<'EOF' > src/components/POS.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Product, CartItem, Sale, PaymentMethod, Store, User, Customer } from '../types';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, ShoppingCart, User as UserIcon, FileCheck, Pencil, X, ChevronUp, ChevronDown, Car, Tag, MapPin, Percent, Calculator, Users, AlertTriangle, FileText } from 'lucide-react';

interface POSProps {
  products: Product[];
  stores: Store[];
  categories: string[];
  tireBrands?: string[];
  currentUser: User;
  currentStoreId: string;
  allUsers: User[];
  customers: Customer[];
  onSaleComplete: (sale: Sale) => void;
  onAddProduct: (product: Product) => void;
  onAddCategory: (category: string) => void;
  tireModels: Record<string, string[]>;
}

interface CustomerForm {
    name: string;
    phoneNumber: string;
    carModel: string;
    agreedToPrivacy: boolean;
    requestTaxInvoice: boolean;
    businessNumber: string;
    companyName: string;
    email: string;
}

interface CheckoutForm {
    staffId: string;
    vehicleNumber: string;
}

interface CartItemRowProps {
  item: CartItem;
  onRemove: (cartItemId: string) => void;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onUpdatePrice: (cartItemId: string, newPrice: number) => void;
  priceEditId: string | null;
  onSetPriceEditId: (cartItemId: string | null) => void;
  onOpenDiscount: (item: CartItem) => void;
  onUpdateMemo: (cartItemId: string, memo: string) => void;
  onUpdateName: (cartItemId: string, name: string) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ 
  item, 
  onRemove, 
  onUpdateQuantity, 
  onUpdatePrice, 
  priceEditId, 
  onSetPriceEditId,
  onOpenDiscount,
  onUpdateMemo,
  onUpdateName
}) => {
    const isDiscounted = item.originalPrice !== undefined && item.price < item.originalPrice;
    const isTempProduct = item.id === '99999';
    const [localPrice, setLocalPrice] = useState('');

    useEffect(() => {
        if (priceEditId === item.cartItemId) {
            setLocalPrice(item.price === 0 ? '' : item.price.toLocaleString());
        }
    }, [priceEditId, item.cartItemId, item.price]);

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        if (raw === '') {
            setLocalPrice('');
            return;
        }
        const num = Number(raw);
        setLocalPrice(num.toLocaleString());
    };

    const commitPrice = () => {
        const finalPrice = localPrice === '' ? 0 : Number(localPrice.replace(/[^0-9]/g, ''));
        onUpdatePrice(item.cartItemId, finalPrice);
    };
    
    return (
      <div className={`flex flex-col p-3 rounded-lg border gap-2 group ${isTempProduct ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                  <div className="mb-1">
                      <div className="flex items-center gap-2 mb-1">
                           <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                               isTempProduct ? 'bg-orange-100 text-orange-700' : (item.stock || 0) <= 0 && (item.stock || 0) < 900 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                           }`}>
                               {isTempProduct ? '우선결제(가매출)' : (item.stock || 0) > 900 ? '서비스' : `재고 ${(item.stock || 0)}개`}
                           </span>
                           <span className="text-xs font-semibold text-gray-400 block text-left">{item.category}</span>
                      </div>
                  </div>
                  {isTempProduct ? (
                      <input 
                          type="text" 
                          className="font-bold text-gray-800 text-sm leading-tight text-left truncate w-full pr-2 border-b border-orange-300 bg-orange-50 focus:bg-white focus:outline-none focus:border-blue-500 rounded px-1 -mx-1 py-0.5"
                          value={item.name}
                          onChange={(e) => onUpdateName(item.cartItemId, e.target.value)}
                          placeholder="상품명 입력"
                      />
                  ) : (
                      <h4 className="font-medium text-gray-800 leading-tight text-left truncate w-full pr-2" title={item.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                  )}
                  
                  <div className="flex gap-2 mt-1">
                      {item.brand && <span className="text-[10px] bg-white border px-1 rounded text-gray-500">{item.brand}</span>}
                      {item.specification && <span className="text-xs text-blue-600">{item.specification}</span>}
                  </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                  <button 
                      onClick={() => onOpenDiscount(item)}
                      className="px-2 py-1 bg-white border border-gray-200 text-xs font-medium text-blue-600 rounded hover:bg-blue-50 transition-colors"
                  >
                      할인
                  </button>
                  <button 
                      onClick={() => onRemove(item.cartItemId)}
                      className="text-gray-400 hover:text-red-500 p-1"
                  >
                      <Trash2 size={16} />
                  </button>
              </div>
          </div>
          
          <div className="flex items-center justify-between mt-1">
              <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1.5">
                      {isDiscounted && (
                          <span className="text-xs text-gray-400 line-through decoration-gray-400">
                              ₩{(item.originalPrice! * item.quantity).toLocaleString()}
                          </span>
                      )}
                      
                      {priceEditId === item.cartItemId ? (
                          <input 
                              autoFocus
                              type="text" 
                              className="w-24 text-sm p-1 border border-blue-500 rounded outline-none text-right font-bold"
                              value={localPrice}
                              onChange={handlePriceChange}
                              onBlur={commitPrice}
                              placeholder="0"
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                  if(e.key === 'Enter') {
                                      commitPrice();
                                      e.currentTarget.blur();
                                  }
                              }}
                          />
                      ) : (
                          <div 
                              onClick={() => onSetPriceEditId(item.cartItemId)}
                              className={`text-sm font-bold px-1 rounded cursor-pointer flex items-center gap-1 ${isDiscounted ? 'text-blue-600' : 'text-gray-700'} hover:bg-gray-200`}
                              title="단가 수정하려면 클릭"
                          >
                              ₩{(item.price * item.quantity).toLocaleString()}
                              <Pencil size={10} className="text-gray-400 opacity-0 group-hover:opacity-100" />
                          </div>
                      )}
                  </div>
              </div>

              <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-0.5">
                  <button 
                      onClick={() => onUpdateQuantity(item.cartItemId, -1)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600"
                  >
                      <Minus size={14} />
                  </button>
                  <span className="font-bold text-gray-800 w-4 text-center text-sm">{item.quantity}</span>
                  <button 
                      onClick={() => onUpdateQuantity(item.cartItemId, 1)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600"
                  >
                      <Plus size={14} />
                  </button>
              </div>
          </div>
          
          {isTempProduct && (
              <div className="mt-2">
                  <label className="text-[10px] font-bold text-orange-600 mb-1 block">메모 (선택사항)</label>
                  <input 
                      type="text" 
                      className="w-full p-2 text-xs border border-orange-200 rounded bg-white focus:bg-white focus:border-orange-400 outline-none placeholder-gray-400 text-gray-800 font-medium shadow-sm"
                      placeholder="예: 한국타이어 235/55R19 2본 (퀵)"
                      value={item.memo || ''}
                      onChange={(e) => onUpdateMemo(item.cartItemId, e.target.value)}
                  />
                  <div className="text-[10px] text-orange-400 mt-1 flex items-center gap-1">
                      <AlertTriangle size={10} /> 나중에 정식 상품으로 매칭 가능합니다.
                  </div>
              </div>
          )}
      </div>
    );
};

const POS: React.FC<POSProps> = ({ products, stores, categories, tireBrands = [], currentUser, currentStoreId, allUsers, customers, onSaleComplete, onAddProduct, onAddCategory, tireModels }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  
  const [adminSelectedStoreId, setAdminSelectedStoreId] = useState<string>(stores[0]?.id || '');
  const activeStoreId = currentUser.role === 'STAFF' ? currentStoreId : adminSelectedStoreId;

  useEffect(() => {
      if(currentUser.role === 'ADMIN' && !adminSelectedStoreId && stores.length > 0) {
          setAdminSelectedStoreId(stores[0].id);
      }
  }, [currentUser, stores, adminSelectedStoreId]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [discountModal, setDiscountModal] = useState<{ isOpen: boolean, item: CartItem | null }>({ isOpen: false, item: null });
  const [discountInput, setDiscountInput] = useState({ type: 'PERCENT' as 'PERCENT' | 'AMOUNT', value: '' });
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({ category: categories[0], brand: tireBrands[0] || '', stockByStore: {} });
  const [confirmation, setConfirmation] = useState<{ isOpen: boolean; method: PaymentMethod | null }>({ isOpen: false, method: null });
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>({ staffId: currentUser.id, vehicleNumber: '' });
  const [customerForm, setCustomerForm] = useState<CustomerForm>({ name: '', phoneNumber: '', carModel: '', agreedToPrivacy: false, requestTaxInvoice: false, businessNumber: '', companyName: '', email: '' });
  const [priceEditId, setPriceEditId] = useState<string | null>(null);

  useEffect(() => {
      if (confirmation.isOpen) setCheckoutForm(prev => ({ ...prev, staffId: currentUser.id }));
  }, [confirmation.isOpen, currentUser.id]);

  const filteredCustomers = useMemo(() => {
      if (!customerSearchTerm) return [];
      return customers.filter(c => c.phoneNumber.includes(customerSearchTerm) || c.vehicleNumber?.includes(customerSearchTerm) || c.name.includes(customerSearchTerm));
  }, [customers, customerSearchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
      setCustomerForm({ name: customer.name, phoneNumber: customer.phoneNumber, carModel: customer.carModel || '', agreedToPrivacy: true, requestTaxInvoice: false, businessNumber: customer.businessNumber || '', companyName: customer.companyName || '', email: customer.email || '' });
      setCheckoutForm(prev => ({ ...prev, vehicleNumber: customer.vehicleNumber || '' }));
      setIsCustomerSearchOpen(false);
      setCustomerSearchTerm('');
  };

  const clearSelectedCustomer = () => {
      setCustomerForm({ name: '', phoneNumber: '', carModel: '', agreedToPrivacy: false, requestTaxInvoice: false, businessNumber: '', companyName: '', email: '' });
      setCheckoutForm(prev => ({ ...prev, vehicleNumber: '' }));
  };

  const showBrandTabs = useMemo(() => searchTerm.length > 0 || selectedCategory === '타이어', [searchTerm, selectedCategory]);

  const filteredProducts = useMemo(() => {
      const lowerSearch = searchTerm.toLowerCase().trim();
      const numericSearch = lowerSearch.replace(/\D/g, '');
      let result = products.filter(p => {
        if (p.id === '99999') return false;
        const nameMatch = p.name.toLowerCase().includes(lowerSearch);
        const brandMatch = p.brand?.toLowerCase().includes(lowerSearch);
        let specMatch = false;
        if (p.specification) {
            const lowerSpec = p.specification.toLowerCase();
            if (lowerSpec.includes(lowerSearch)) specMatch = true;
            if (!specMatch && numericSearch.length >= 3) {
                const numericSpec = lowerSpec.replace(/\D/g, '');
                if (numericSpec.includes(numericSearch)) specMatch = true;
            }
        }
        const matchesSearch = nameMatch || specMatch || brandMatch;
        if (selectedCategory === 'All' && !searchTerm && p.category === '타이어') return false;
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesBrand = selectedBrand === 'All' || p.brand === selectedBrand;
        return matchesSearch && matchesCategory && matchesBrand;
      });
      const brandOrder = tireBrands.reduce((acc, brand, idx) => { acc[brand] = idx; return acc; }, {} as Record<string, number>);
      result.sort((a, b) => {
          if (tireBrands.length > 0) {
              const brandA = a.brand || '기타';
              const brandB = b.brand || '기타';
              const orderA = brandOrder[brandA] ?? 99;
              const orderB = brandOrder[brandB] ?? 99;
              if (orderA !== orderB) return orderA - orderB;
          }
          return a.name.localeCompare(b.name);
      });
      return result;
  }, [products, searchTerm, selectedCategory, selectedBrand, tireBrands]);

  const getStock = (product: Product) => product.stockByStore[activeStoreId] || 0;

  const addToCart = (product: Product, overridePrice?: number, overrideName?: string) => {
    const currentStock = product.stockByStore[activeStoreId] || 0;
    const isSpecialItem = product.id === '99999' || currentStock > 900;
    if (currentStock <= 0 && !isSpecialItem) return; 
    setCart(prev => {
      if (product.id !== '99999') {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
            if (!isSpecialItem && existing.quantity >= currentStock) return prev;
            return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
      }
      const priceToUse = overridePrice !== undefined ? overridePrice : product.price;
      const nameToUse = overrideName || product.name;
      const newCartItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return [...prev, { ...product, cartItemId: newCartItemId, name: nameToUse, price: priceToUse, quantity: 1, originalPrice: priceToUse }];
    });
  };

  const addDummyProduct = () => {
      const dummyProduct = products.find(p => p.id === '99999');
      if (dummyProduct) addToCart(dummyProduct, 0);
      else alert('임시 상품 데이터(ID:99999)가 없습니다. 시스템 관리자에게 문의하세요.');
  };

  const updateMemo = (cartItemId: string, memo: string) => setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, memo } : item));
  const updateName = (cartItemId: string, name: string) => setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, name } : item));
  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null; 
        if (!item.isManual && item.stock < 900 && item.id !== '99999') {
            const product = products.find(p => p.id === item.id);
            if (product && newQty > getStock(product)) return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const updatePrice = (cartItemId: string, newPrice: number) => {
      setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, price: newPrice } : item));
      setPriceEditId(null);
  };

  const openDiscountModal = (item: CartItem) => {
      setDiscountModal({ isOpen: true, item });
      setDiscountInput({ type: 'PERCENT', value: '' });
  };

  const applyDiscount = () => {
      if (!discountModal.item) return;
      const value = Number(discountInput.value);
      if (value < 0) return;
      let newPrice = discountModal.item.price;
      if (discountInput.type === 'PERCENT') newPrice = newPrice * (1 - value / 100);
      else newPrice = newPrice - value;
      newPrice = Math.floor(Math.max(0, newPrice));
      updatePrice(discountModal.item.cartItemId, newPrice);
      setDiscountModal({ isOpen: false, item: null });
  };

  const removeFromCart = (cartItemId: string) => setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const requestCheckout = (method: PaymentMethod) => { if (cart.length > 0) setConfirmation({ isOpen: true, method }); };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '');
      let formatted = raw;
      if (raw.length > 3 && raw.length <= 7) formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
      else if (raw.length > 7) formatted = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
      setCustomerForm(prev => ({ ...prev, phoneNumber: formatted }));
  };

  const processCheckout = () => {
    if (!confirmation.method) return;
    if ((customerForm.name || customerForm.phoneNumber) && !customerForm.agreedToPrivacy) { alert('고객 정보를 입력한 경우, 개인정보 수집 및 이용에 동의해야 합니다.'); return; }
    if (customerForm.requestTaxInvoice) { if (!customerForm.businessNumber || !customerForm.companyName || !customerForm.email) { alert('세금계산서 발행을 위한 필수 정보를 입력해주세요.'); return; } }
    const method = confirmation.method;
    const salesStaff = allUsers.find(u => u.id === checkoutForm.staffId) || currentUser;
    setConfirmation({ isOpen: false, method: null });
    setIsProcessing(true);
    const itemMemos = cart.filter(item => item.memo && item.memo.trim() !== '').map(item => item.id === '99999' ? item.memo : `[${item.name}]: ${item.memo}`).join(', ');
    setTimeout(() => {
      const newSale: Sale = {
        id: `S-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        storeId: activeStoreId,
        totalAmount: cartTotal,
        paymentMethod: method,
        staffName: salesStaff.name,
        vehicleNumber: checkoutForm.vehicleNumber,
        memo: itemMemos,
        isTaxInvoiceRequested: customerForm.requestTaxInvoice,
        customer: (customerForm.name || checkoutForm.vehicleNumber) ? {
            name: customerForm.name || '방문고객',
            phoneNumber: customerForm.phoneNumber,
            carModel: customerForm.carModel,
            vehicleNumber: checkoutForm.vehicleNumber,
            businessNumber: customerForm.businessNumber,
            companyName: customerForm.companyName,
            email: customerForm.email
        } : undefined,
        items: cart.map(item => ({ productId: item.id, productName: item.name, quantity: item.quantity, priceAtSale: item.price, specification: item.specification, brand: item.brand }))
      };
      onSaleComplete(newSale);
      setCart([]);
      setCustomerForm({ name: '', phoneNumber: '', carModel: '', agreedToPrivacy: false, requestTaxInvoice: false, businessNumber: '', companyName: '', email: '' });
      setCheckoutForm({ staffId: currentUser.id, vehicleNumber: '' });
      setIsProcessing(false);
      alert('결제가 완료되었습니다!');
    }, 800);
  };

  const currentStoreName = stores.find(s => s.id === activeStoreId)?.name || '매장 미선택';
  const getPaymentMethodName = (method: PaymentMethod | null) => {
      if (method === PaymentMethod.CARD) return '신용/체크카드';
      if (method === PaymentMethod.CASH) return '현금';
      if (method === PaymentMethod.TRANSFER) return '계좌이체';
      return '';
  };

  return (
    <>
        <div className="flex flex-col lg:flex-row h-auto lg:h-full gap-6 relative">
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[50vh] lg:min-h-0">
            <div className="p-4 border-b border-gray-100 space-y-4 sticky top-0 bg-white z-10">
                 <div className="flex flex-col md:flex-row gap-2">
                     <div className="relative flex-1"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500" size={20} /><input type="text" placeholder="상품명, 규격 (예: 245/45 또는 2454518)" className="w-full pl-10 pr-4 py-3 bg-blue-50 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-medium placeholder-blue-300" value={searchTerm} onChange={(e) => { let val = e.target.value; if (/^\d{7}$/.test(val)) { val = `${val.slice(0, 3)}/${val.slice(3, 5)}R${val.slice(5, 7)}`; } setSearchTerm(val); }} /></div>
                    {currentUser.role === 'ADMIN' && (<div className="relative w-full md:w-48"><MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} /><select value={adminSelectedStoreId} onChange={(e) => { setAdminSelectedStoreId(e.target.value); setCart([]); }} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-bold">{stores.map(store => (<option key={store.id} value={store.id}>{store.name}</option>))}</select></div>)}
                 </div>
                {showBrandTabs ? (
                     <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar animate-fade-in"><button onClick={() => setSelectedBrand('All')} className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors border ${selectedBrand === 'All' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>전체 브랜드</button>{tireBrands.map(brand => (<button key={brand} onClick={() => setSelectedBrand(brand)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${selectedBrand === brand ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{brand}</button>))}</div>
                ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"><button onClick={() => setSelectedCategory('All')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'All' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>전체</button>{categories.map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat}</button>))}</div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-[400px] pb-32 lg:pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    <button onClick={addDummyProduct} className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 transition-colors min-h-[11rem] gap-2 group"><div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div><span className="font-bold text-orange-700 text-sm">우선결제</span><span className="text-xs text-orange-500">가매출 잡기 (즉시 추가)</span></button>
                    {filteredProducts.map(product => { const stock = getStock(product); const isService = stock > 900; const isLowStock = !isService && stock < 10; return (<button key={product.id} onClick={() => addToCart(product)} disabled={stock <= 0 && !isService} className={`group flex flex-col justify-between items-start p-4 rounded-xl border bg-white transition-all shadow-sm h-full min-h-[11rem] relative text-left ${stock <= 0 && !isService ? 'opacity-50 cursor-not-allowed border-gray-200' : 'hover:border-blue-500 hover:shadow-md cursor-pointer border-gray-100'}`}>{product.brand && product.brand !== '기타' && (<span className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 z-10">{product.brand}</span>)}<div className="w-full mt-1"><div className="text-xs md:text-sm font-semibold text-gray-400 mb-1 text-left">{product.category}</div><h4 className="font-bold text-base md:text-lg text-gray-800 w-full text-left mb-2 pr-6 truncate" title={product.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h4>{product.specification && (<div className="text-left"><span className="text-sm text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded inline-block">{product.specification}</span></div>)}</div><div className="w-full mt-4 pt-3 border-t border-gray-50 flex flex-col items-end gap-0.5"><span className={`text-[10px] md:text-xs font-medium px-2 py-0.5 rounded-full ${isLowStock ? 'bg-[#EF4444] text-white' : 'bg-green-100 text-green-700'}`}>{isService ? '서비스' : `재고 ${stock}개`}</span><span className="text-lg md:text-xl font-bold text-gray-900">₩{product.price.toLocaleString()}</span></div></button>); })}
                </div>
            </div>
        </div>
        <div className="hidden lg:flex lg:w-[38%] xl:w-[30%] bg-white rounded-xl shadow-xl border border-gray-100 flex-col h-full flex-shrink-0">
            <div className="p-5 border-b border-gray-100 bg-slate-50 rounded-t-xl sticky top-0 z-10"><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><ShoppingCart size={20} /> 견적 / 결제</h3><div className="flex justify-between items-center mt-2"><div className="flex items-center gap-2"><span className="font-medium text-blue-600 text-sm">{currentStoreName}</span>{customerForm.name ? (<div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200"><UserIcon size={12} /> {customerForm.name}<button onClick={clearSelectedCustomer} className="ml-1 hover:text-red-500"><X size={12}/></button></div>) : (<button className="flex items-center gap-1 text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 transition-colors" onClick={() => setIsCustomerSearchOpen(true)}><Search size={12} /> 고객 검색</button>)}</div><span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span></div></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">{cart.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 py-10"><ShoppingCart size={48} className="opacity-20" /><p>상품을 선택하면 여기에 표시됩니다.</p></div>) : (cart.map(item => (<CartItemRow key={item.cartItemId} item={item} onRemove={removeFromCart} onUpdateQuantity={updateQuantity} onUpdatePrice={updatePrice} priceEditId={priceEditId} onSetPriceEditId={setPriceEditId} onOpenDiscount={openDiscountModal} onUpdateMemo={updateMemo} onUpdateName={updateName} />)))}</div>
            <div className="p-5 border-t border-gray-100 bg-slate-50 rounded-b-xl"><div className="flex justify-between items-center mb-4"><span className="text-gray-600">총 결제 금액</span><span className="text-[32px] font-bold text-blue-600">₩{cartTotal.toLocaleString()}</span></div><div className="grid grid-cols-3 gap-2"><PaymentButton icon={CreditCard} label="카드" onClick={() => requestCheckout(PaymentMethod.CARD)} disabled={cart.length === 0 || isProcessing} color="bg-blue-600 hover:bg-blue-700" /><PaymentButton icon={Banknote} label="현금" onClick={() => requestCheckout(PaymentMethod.CASH)} disabled={cart.length === 0 || isProcessing} color="bg-emerald-600 hover:bg-emerald-700" /><PaymentButton icon={Smartphone} label="이체" onClick={() => requestCheckout(PaymentMethod.TRANSFER)} disabled={cart.length === 0 || isProcessing} color="bg-violet-600 hover:bg-violet-700" /></div></div>
        </div>
        {cart.length > 0 && (<button onClick={() => setIsMobileCartOpen(true)} className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex flex-col items-center justify-center z-50 animate-bounce-in"><div className="relative"><ShoppingCart size={24} /><span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span></div></button>)}
        {isMobileCartOpen && (<div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-white animate-slide-up"><div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><ShoppingCart size={20} className="text-blue-600"/> 장바구니<span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">{cartCount}</span></h3><button onClick={() => setIsMobileCartOpen(false)} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500"><X size={20}/></button></div><div className="flex-1 overflow-y-auto p-4 space-y-3">{cart.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2"><ShoppingCart size={48} className="opacity-20" /><p>장바구니가 비어있습니다.</p></div>) : (cart.map(item => (<CartItemRow key={item.cartItemId} item={item} onRemove={removeFromCart} onUpdateQuantity={updateQuantity} onUpdatePrice={updatePrice} priceEditId={priceEditId} onSetPriceEditId={setPriceEditId} onOpenDiscount={openDiscountModal} onUpdateMemo={updateMemo} onUpdateName={updateName} />)))}</div><div className="p-4 border-t border-gray-100 bg-gray-50"><div className="flex justify-between items-center mb-4"><span className="text-gray-600 font-medium">총 결제 금액</span><span className="text-2xl font-bold text-blue-600">₩{cartTotal.toLocaleString()}</span></div><div className="grid grid-cols-3 gap-2"><PaymentButton icon={CreditCard} label="카드" onClick={() => requestCheckout(PaymentMethod.CARD)} disabled={cart.length === 0 || isProcessing} color="bg-blue-600 hover:bg-blue-700" /><PaymentButton icon={Banknote} label="현금" onClick={() => requestCheckout(PaymentMethod.CASH)} disabled={cart.length === 0 || isProcessing} color="bg-emerald-600 hover:bg-emerald-700" /><PaymentButton icon={Smartphone} label="이체" onClick={() => requestCheckout(PaymentMethod.TRANSFER)} disabled={cart.length === 0 || isProcessing} color="bg-violet-600 hover:bg-violet-700" /></div></div></div>)}
        </div>
        {isCustomerSearchOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in"><div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-gray-800">고객 검색</h3><button onClick={() => { setIsCustomerSearchOpen(false); setCustomerSearchTerm(''); }} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="p-4"><div className="relative mb-4"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /><input autoFocus type="text" placeholder="전화번호 뒷자리, 이름, 차량번호" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)} /></div><div className="max-h-60 overflow-y-auto space-y-2">{filteredCustomers.length === 0 ? (<div className="text-center py-8 text-gray-400">{customerSearchTerm ? '검색 결과가 없습니다.' : '검색어를 입력하세요.'}</div>) : (filteredCustomers.map(customer => (<button key={customer.id} onClick={() => handleSelectCustomer(customer)} className="w-full text-left p-3 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors flex justify-between items-center group"><div><div className="font-bold text-gray-800">{customer.name}</div><div className="text-xs text-gray-500">{customer.phoneNumber} | {customer.vehicleNumber}</div></div><div className="text-blue-600 opacity-0 group-hover:opacity-100 text-sm font-bold">선택</div></button>)))}</div></div></div></div>)}
        {discountModal.isOpen && discountModal.item && (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden animate-scale-in"><div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-gray-800">할인 적용</h3><button onClick={() => setDiscountModal({ isOpen: false, item: null })} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="p-5"><p className="text-sm text-gray-600 mb-4 font-medium">{discountModal.item.name}</p><div className="flex gap-2 mb-4"><button onClick={() => setDiscountInput(prev => ({ ...prev, type: 'PERCENT' }))} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${discountInput.type === 'PERCENT' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>% 퍼센트</button><button onClick={() => setDiscountInput(prev => ({ ...prev, type: 'AMOUNT' }))} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${discountInput.type === 'AMOUNT' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>₩ 금액</button></div><div className="relative mb-4"><input autoFocus type="number" className="w-full p-2 text-right border border-gray-300 rounded-lg font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" value={discountInput.value} onChange={(e) => setDiscountInput(prev => ({ ...prev, value: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && applyDiscount()} /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{discountInput.type === 'PERCENT' ? <Percent size={16}/> : '₩'}</span></div><button onClick={applyDiscount} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800">적용하기</button></div></div></div>)}
        {confirmation.isOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in"><div className="p-6 text-center"><div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><CreditCard size={32} /></div><h3 className="text-xl font-bold text-gray-900 mb-1">결제 확인</h3><p className="text-gray-500 mb-6">총 결제금액: <span className="text-blue-600 font-bold text-lg">₩{cartTotal.toLocaleString()}</span><br/><span className="text-sm bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">{getPaymentMethodName(confirmation.method)}</span></p><div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-3 border border-gray-100"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">담당 직원</label><select className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white" value={checkoutForm.staffId} onChange={(e) => setCheckoutForm({...checkoutForm, staffId: e.target.value})}>{allUsers.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}</select></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">고객 정보 (선택)</label><div className="space-y-2"><input type="text" placeholder="고객명 (예: 홍길동)" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={customerForm.name} onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})} /><input type="tel" placeholder="연락처 (숫자만 입력)" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={customerForm.phoneNumber} onChange={handlePhoneNumberChange} /><div className="flex gap-2"><input type="text" placeholder="차량번호" className="w-1/2 p-2 border border-gray-300 rounded-lg text-sm" value={checkoutForm.vehicleNumber} onChange={(e) => setCheckoutForm({...checkoutForm, vehicleNumber: e.target.value})} /><input type="text" placeholder="차종" className="w-1/2 p-2 border border-gray-300 rounded-lg text-sm" value={customerForm.carModel} onChange={(e) => setCustomerForm({...customerForm, carModel: e.target.value})} /></div></div></div>{(customerForm.name || customerForm.phoneNumber) && (<div className="flex items-start gap-2 pt-2 border-t border-gray-200"><input type="checkbox" id="privacy-agree" className="mt-1" checked={customerForm.agreedToPrivacy} onChange={(e) => setCustomerForm({...customerForm, agreedToPrivacy: e.target.checked})} /><label htmlFor="privacy-agree" className="text-xs text-gray-600 leading-tight"><span className="font-bold text-blue-600">[필수]</span> 개인정보 수집 및 이용에 동의합니다. (고객관리, 정비이력 조회 목적)</label></div>)}<div className="pt-2 border-t border-gray-200"><div className="flex items-center gap-2 mb-2"><input type="checkbox" id="tax-invoice-req" checked={customerForm.requestTaxInvoice} onChange={(e) => setCustomerForm({...customerForm, requestTaxInvoice: e.target.checked})} /><label htmlFor="tax-invoice-req" className="text-sm font-bold text-gray-700">세금계산서 발행 요청</label></div>{customerForm.requestTaxInvoice && (<div className="space-y-2 animate-fade-in pl-1"><input type="text" placeholder="사업자번호" className="w-full p-2 border border-gray-300 rounded-lg text-xs" value={customerForm.businessNumber} onChange={(e) => setCustomerForm({...customerForm, businessNumber: e.target.value})} /><div className="flex gap-2"><input type="text" placeholder="상호(법인명)" className="w-1/2 p-2 border border-gray-300 rounded-lg text-xs" value={customerForm.companyName} onChange={(e) => setCustomerForm({...customerForm, companyName: e.target.value})} /><input type="email" placeholder="이메일" className="w-1/2 p-2 border border-gray-300 rounded-lg text-xs" value={customerForm.email} onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})} /></div></div>)}</div></div><div className="flex gap-3"><button onClick={() => setConfirmation({ isOpen: false, method: null })} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors">취소</button><button onClick={processCheckout} disabled={isProcessing} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2">{isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>} 결제 완료</button></div></div></div></div>)}
    </>
  );
};

const PaymentButton = ({ icon: Icon, label, onClick, disabled, color }: any) => (<button onClick={onClick} disabled={disabled} className={`flex flex-col items-center justify-center p-4 rounded-xl text-white font-bold transition-all shadow-md active:scale-95 ${color} ${disabled ? 'opacity-50 cursor-not-allowed shadow-none' : 'hover:shadow-lg'}`}><Icon size={24} className="mb-1" /><span className="text-sm">{label}</span></button>);

export default POS;
EOF

# components/Inventory.tsx
cat <<'EOF' > src/components/Inventory.tsx
import React, { useState, useMemo } from 'react';
import { Product, Store, User } from '../types';
import { Search, Plus, Edit2, Save, X, AlertTriangle, Filter, MapPin, Settings, ArrowRightLeft, Disc } from 'lucide-react';

interface InventoryProps {
  products: Product[];
  stores: Store[];
  categories: string[];
  onUpdate: (product: Product) => void;
  onAdd: (product: Product) => void;
  onAddCategory: (category: string) => void;
  currentUser: User;
  currentStoreId: string;
  onStockTransfer: (productId: string, fromStoreId: string, toStoreId: string, quantity: number) => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, stores, categories, onUpdate, onAdd, onAddCategory, currentUser, currentStoreId, onStockTransfer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({ productId: '', fromStoreId: '', toStoreId: '', quantity: 1 });

  const totalTireStock = useMemo(() => {
    return products.filter(p => p.category === '타이어').reduce((sum, p) => { if (currentStoreId === 'ALL' || !currentStoreId) { return sum + (p.stock || 0); } return sum + (p.stockByStore[currentStoreId] || 0); }, 0);
  }, [products, currentStoreId]);

  const currentStoreName = useMemo(() => { if (currentStoreId === 'ALL' || !currentStoreId) return '전체'; return stores.find(s => s.id === currentStoreId)?.name || '해당 지점'; }, [currentStoreId, stores]);

  const filteredProducts = products.filter(p => {
    const lowerTerm = searchTerm.toLowerCase();
    const numericSearchTerm = lowerTerm.replace(/\D/g, '');
    const matchesNameOrCategory = p.name?.toLowerCase().includes(lowerTerm) || p.category?.toLowerCase().includes(lowerTerm);
    let matchesSpec = false;
    if (p.specification) {
        const lowerSpec = p.specification.toLowerCase();
        if (lowerSpec.includes(lowerTerm)) matchesSpec = true;
        else if (numericSearchTerm.length > 0) { const numericSpec = lowerSpec.replace(/\D/g, ''); if (numericSpec.includes(numericSearchTerm)) matchesSpec = true; }
    }
    const matchesSearch = matchesNameOrCategory || matchesSpec;
    const isServiceItem = (p.stock || 0) > 900;
    const isLowStock = !isServiceItem && (p.stock || 0) <= lowStockThreshold;
    if (filterLowStock && !isLowStock) return false;
    return matchesSearch;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct.name || editingProduct.price === undefined) return;
    const stockByStore: Record<string, number> = editingProduct.stockByStore || {};
    stores.forEach(s => { if (stockByStore[s.id] === undefined) stockByStore[s.id] = 0; });
    const totalStock = (Object.values(stockByStore) as number[]).reduce((a, b) => a + b, 0);
    const productToSave: Product = { id: editingProduct.id || Date.now().toString(), name: editingProduct.name, price: Number(editingProduct.price), stock: totalStock, stockByStore: stockByStore, category: editingProduct.category || categories[0], specification: editingProduct.specification };
    if (editingProduct.id) onUpdate(productToSave); else onAdd(productToSave);
    setIsModalOpen(false); setEditingProduct({});
  };

  const handleAddCategorySubmit = () => { if (newCategoryName.trim()) { onAddCategory(newCategoryName.trim()); setNewCategoryName(''); setShowCategoryInput(false); } };
  const openEdit = (product: Product) => { setEditingProduct(JSON.parse(JSON.stringify(product))); setIsModalOpen(true); };
  const openAdd = () => { const initialStockByStore: Record<string, number> = {}; stores.forEach(s => initialStockByStore[s.id] = 0); setEditingProduct({ category: categories[0], stock: 0, stockByStore: initialStockByStore }); setIsModalOpen(true); };
  const openTransfer = (product: Product) => { const defaultFrom = currentUser.role === 'STAFF' ? currentStoreId : stores[0]?.id; const defaultTo = stores.find(s => s.id !== defaultFrom)?.id || ''; setTransferData({ productId: product.id, fromStoreId: defaultFrom || '', toStoreId: defaultTo, quantity: 1 }); setTransferModalOpen(true); };
  const submitTransfer = () => { if (transferData.fromStoreId === transferData.toStoreId) { alert('출고 지점과 입고 지점이 같습니다.'); return; } onStockTransfer(transferData.productId, transferData.fromStoreId, transferData.toStoreId, transferData.quantity); setTransferModalOpen(false); };
  const handleStoreStockChange = (storeId: string, val: number) => { if (currentUser.role !== 'ADMIN') return; setEditingProduct(prev => ({ ...prev, stockByStore: { ...prev.stockByStore, [storeId]: val } })); };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="모델명, 사이즈(2454518) 검색" className="w-full pl-10 pr-4 h-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-shadow" value={searchTerm} onChange={(e) => { let val = e.target.value; if (/^\d{7}$/.test(val)) { val = `${val.slice(0, 3)}/${val.slice(3, 5)}R${val.slice(5, 7)}`; } setSearchTerm(val); }} /></div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 bg-slate-800 text-white px-3 h-10 rounded-lg shadow-sm border border-slate-700 whitespace-nowrap flex-shrink-0"><Disc size={16} className="text-blue-400" /><span className="text-xs font-medium">{currentStoreName} 재고: <span className="text-blue-400 text-sm font-bold ml-0.5">{totalTireStock.toLocaleString()}</span></span></div>
            <div className="flex items-center bg-gray-50 p-0.5 rounded-lg border border-gray-200 h-10 flex-shrink-0"><div className="flex items-center px-2 gap-1 border-r border-gray-300"><span className="text-[10px] text-gray-500 font-bold whitespace-nowrap">기준:</span><input type="number" min="1" max="100" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(Math.max(1, Number(e.target.value)))} className="w-8 bg-transparent text-sm font-bold focus:outline-none text-center" /></div><button onClick={() => setFilterLowStock(!filterLowStock)} className={`flex items-center gap-1 px-3 h-full rounded-md text-xs font-bold transition-colors whitespace-nowrap ${filterLowStock ? 'bg-rose-100 text-rose-700' : 'text-gray-500 hover:bg-gray-200'}`}><AlertTriangle size={12} />부족 알림</button></div>
            <button onClick={openAdd} className="flex items-center gap-1.5 px-4 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0 whitespace-nowrap"><Plus size={16} /><span className="text-sm font-bold">신규 등록</span></button>
        </div>
      </div>
      <div className="hidden md:grid md:grid-cols-[minmax(180px,1fr)_70px_90px_210px_40px] gap-4 bg-gray-50 px-6 py-3 text-xs font-bold text-gray-500 border-b border-gray-100 items-center"><div>상품 정보</div><div className="text-center whitespace-nowrap">카테고리</div><div className="text-right pr-2 whitespace-nowrap">단가</div><div className="text-left pl-1 whitespace-nowrap">지점별 재고</div><div className="text-right whitespace-nowrap">관리</div></div>
      <div className="flex-1 overflow-y-auto p-2 md:p-0">
        {filteredProducts.length === 0 ? (<div className="flex flex-col items-center justify-center h-64 text-gray-400"><Search size={48} className="opacity-20 mb-4" /><p>검색 결과가 없습니다.</p></div>) : (filteredProducts.map(product => { const isService = product.stock > 900; const isLowStock = !isService && product.stock <= lowStockThreshold; return (<div key={product.id} className={`relative flex flex-col sm:flex-row sm:items-center sm:justify-between md:grid md:grid-cols-[minmax(180px,1fr)_70px_90px_210px_40px] px-4 md:px-6 py-4 border-b border-gray-100 transition-colors hover:bg-gray-50 gap-3 md:gap-4 rounded-lg md:rounded-none bg-white shadow-sm md:shadow-none mb-2 md:mb-0 min-h-[60px] ${isLowStock ? 'bg-rose-50/50 hover:bg-rose-50 border border-rose-100' : 'border border-gray-100 md:border-0'}`}><div className="w-full flex justify-between items-start sm:w-auto sm:block sm:flex-1"><div className="flex flex-col text-left sm:min-w-0 sm:pr-4">{isLowStock && <div className="flex items-center gap-1 text-rose-500 text-[10px] font-bold mb-0.5"><AlertTriangle size={10} />재고부족</div>}<div className="text-lg md:text-base font-bold text-gray-900 leading-tight mb-1 text-left">{product.specification || <span className="text-gray-400 text-sm font-normal">규격 미입력</span>}</div><div className="flex items-center gap-2 text-left">{product.brand && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold whitespace-nowrap">{product.brand}</span>}<div className="text-sm text-gray-500 font-medium truncate">{product.name}</div></div></div><button onClick={() => openEdit(product)} className="sm:hidden p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg border border-gray-100 flex-shrink-0 ml-2"><Edit2 size={16} /></button></div><div className="flex flex-col gap-1.5 mt-2 sm:mt-0 sm:flex-row sm:items-center sm:gap-4 md:contents w-full sm:w-auto"><div className="text-sm text-gray-600 flex items-center gap-2 sm:block md:text-center whitespace-nowrap"><span className="sm:hidden text-xs text-gray-400 w-16">카테고리</span><span className="bg-gray-100 px-2 py-1 rounded-full text-xs font-medium inline-block">{product.category}</span></div><div className="text-sm font-bold text-gray-900 flex items-center gap-2 sm:block sm:text-right md:pr-2 whitespace-nowrap"><span className="sm:hidden text-xs text-gray-400 w-16 font-normal">단가</span> ₩{product.price.toLocaleString()}</div><div className="flex items-center justify-start sm:justify-end md:justify-start gap-2 overflow-hidden w-full"><div className="flex items-center gap-2 text-[11px] text-gray-600 bg-gray-50 px-2 py-1.5 rounded border border-gray-200 w-full overflow-x-auto no-scrollbar">{stores.map((store) => { const stock = product.stockByStore[store.id] || 0; const isStoreLow = !isService && stock <= (Math.ceil(lowStockThreshold / stores.length)); return (<div key={store.id} className={`flex items-center gap-1 whitespace-nowrap ${isStoreLow ? 'text-rose-600' : ''}`}><MapPin size={10} className={isStoreLow ? 'text-rose-500' : 'text-gray-400'} /><span className="truncate max-w-[50px] font-medium">{store.name.split(' ')[1] || store.name}</span><span className="font-bold tabular-nums">{isService ? '∞' : stock}</span></div>); })}</div>{!isService && (<button onClick={(e) => { e.stopPropagation(); openTransfer(product); }} className="p-1.5 bg-white text-blue-600 rounded border border-blue-200 hover:bg-blue-50 flex-shrink-0 transition-colors" title="재고 이동"><ArrowRightLeft size={14} /></button>)}</div><div className="hidden sm:block text-right"><button onClick={() => openEdit(product)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button></div></div></div>); }))}
      </div>
      {isModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in"><div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-gray-800">{editingProduct.id ? '상품 정보 및 재고 관리' : '신규 상품 등록'}</h3><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div><form onSubmit={handleSave} className="p-6 space-y-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">상품명</label><input required type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} placeholder="예: Hankook Ventus S1" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">규격 / 사양</label><input type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={editingProduct.specification || ''} onChange={e => { let val = e.target.value; if (/^\d{7}$/.test(val)) { val = `${val.slice(0, 3)}/${val.slice(3, 5)}R${val.slice(5, 7)}`; } setEditingProduct({...editingProduct, specification: val}); }} placeholder="예: 245/45R18" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">단가 (₩)</label><input required type="number" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} /></div></div><div><label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label><div className="flex gap-2">{!showCategoryInput ? (<><select className="flex-1 p-2 border border-gray-300 rounded-lg outline-none" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select><button type="button" onClick={() => setShowCategoryInput(true)} className="px-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-200"><Plus size={16} /></button></>) : (<><input type="text" className="flex-1 p-2 border border-blue-300 rounded-lg outline-none ring-2 ring-blue-100" placeholder="새 카테고리명" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} autoFocus /><button type="button" onClick={handleAddCategorySubmit} className="px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">추가</button><button type="button" onClick={() => setShowCategoryInput(false)} className="px-3 text-gray-500 hover:text-gray-700">취소</button></>)}</div></div><div className="pt-2"><label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><MapPin size={16} className="text-gray-500"/> 지점별 재고 관리 {currentUser.role === 'STAFF' ? (<span className="text-xs text-red-500 font-normal">(직원은 수정 불가)</span>) : editingProduct.id ? (<span className="text-xs text-red-500 font-normal">(수정 불가 - 입고/이동 메뉴 이용)</span>) : null}</label><div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">{stores.map(store => (<div key={store.id} className="flex items-center justify-between"><span className="text-sm text-gray-700">{store.name}</span><div className="flex items-center gap-2"><button type="button" disabled={currentUser.role === 'STAFF' || !!editingProduct.id} onClick={() => { const current = editingProduct.stockByStore?.[store.id] || 0; handleStoreStockChange(store.id, Math.max(0, current - 1)); }} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">-</button><input type="number" disabled={currentUser.role === 'STAFF' || !!editingProduct.id} className="w-16 text-center p-1 border border-gray-300 rounded disabled:bg-gray-100" value={editingProduct.stockByStore?.[store.id] || 0} onChange={e => handleStoreStockChange(store.id, Number(e.target.value))} /><button type="button" disabled={currentUser.role === 'STAFF' || !!editingProduct.id} onClick={() => { const current = editingProduct.stockByStore?.[store.id] || 0; handleStoreStockChange(store.id, current + 1); }} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">+</button></div></div>))}</div></div><div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium">취소</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-200"><Save size={18} /> 저장하기</button></div></form></div></div>)}
      {transferModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in"><div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><ArrowRightLeft size={20} className="text-blue-600"/> 재고 이동</h3><button onClick={() => setTransferModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="p-6 space-y-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">보내는 지점</label><select value={transferData.fromStoreId} disabled={currentUser.role === 'STAFF'} onChange={e => setTransferData({...transferData, fromStoreId: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 disabled:text-gray-500">{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="flex justify-center text-gray-400"><ArrowRightLeft className="rotate-90"/></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">받는 지점</label><select value={transferData.toStoreId} onChange={e => setTransferData({...transferData, toStoreId: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">{stores.map(s => (<option key={s.id} value={s.id} disabled={s.id === transferData.fromStoreId}>{s.name}</option>))}</select></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">이동 수량</label><input type="number" min="1" value={transferData.quantity} onChange={e => setTransferData({...transferData, quantity: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-lg font-bold text-center focus:ring-2 focus:ring-blue-500" /></div><p className="text-xs text-gray-500 bg-blue-50 p-2 rounded">* 재고 수량만 이동되며, 최초 매입(지출) 기록은 보내는 지점에 유지됩니다.</p><button onClick={submitTransfer} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">확인 및 이동</button></div></div></div>)}
    </div>
  );
};

export default Inventory;
EOF

# components/TaxInvoice.tsx
cat <<'EOF' > src/components/TaxInvoice.tsx
import React, { useState, useMemo } from 'react';
import { Sale } from '../types';
import { FileText, Send, CheckCircle, Loader2, Building, Filter, AlertCircle, Edit2, Save, X, Check } from 'lucide-react';

interface TaxInvoiceProps {
    sales: Sale[];
    onUpdateSale: (updatedSale: Sale) => void;
}

type Tab = 'REQUESTED' | 'ALL';

const TaxInvoice: React.FC<TaxInvoiceProps> = ({ sales, onUpdateSale }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('REQUESTED');
    const [loading, setLoading] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [editForm, setEditForm] = useState({ businessNumber: '', companyName: '', ceoName: '', email: '' });
    const [invoiceForm, setInvoiceForm] = useState({ businessNumber: '', companyName: '', ceoName: '', email: '' });

    const filteredSales = useMemo(() => {
        let result = sales;
        if (activeTab === 'REQUESTED') { result = sales.filter(s => s.isTaxInvoiceRequested); }
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, activeTab]);

    const requestedCount = useMemo(() => sales.filter(s => s.isTaxInvoiceRequested).length, [sales]);

    const handleSelectSale = (sale: Sale) => {
        setSelectedSaleId(sale.id);
        setInvoiceForm({ businessNumber: sale.customer?.businessNumber || '', companyName: sale.customer?.companyName || '', ceoName: sale.customer?.name || '', email: sale.customer?.email || '' });
        setStep(2);
    };

    const handleOpenEdit = (e: React.MouseEvent, sale: Sale) => {
        e.stopPropagation();
        setEditingSale(sale);
        setEditForm({ businessNumber: sale.customer?.businessNumber || '', companyName: sale.customer?.companyName || '', ceoName: sale.customer?.name || '', email: sale.customer?.email || '' });
    };

    const handleSaveEdit = () => {
        if (editingSale) {
            const updatedSale: Sale = { ...editingSale, customer: { ...editingSale.customer!, businessNumber: editForm.businessNumber, companyName: editForm.companyName, name: editForm.ceoName, email: editForm.email } };
            onUpdateSale(updatedSale);
            setEditingSale(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setLoading(true); setTimeout(() => { setLoading(false); setStep(3); }, 2000); };
    const reset = () => { setStep(1); setSelectedSaleId(null); setInvoiceForm({ businessNumber: '', companyName: '', ceoName: '', email: '' }); };
    const selectedSale = sales.find(s => s.id === selectedSaleId);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-center"><h2 className="text-2xl font-bold text-gray-800">전자세금계산서 발행</h2><p className="text-gray-500 mt-2">국세청 연동 API를 시뮬레이션하는 페이지입니다.</p></div>
            <div className="flex justify-center mb-8"><div className="flex items-center w-full max-w-md"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div><div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div><div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div></div></div>
            {step === 1 && (<div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-fade-in overflow-hidden"><div className="flex border-b border-gray-100"><button onClick={() => setActiveTab('REQUESTED')} className={`flex-1 py-4 text-sm font-bold transition-colors relative ${activeTab === 'REQUESTED' ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>발행 요청 건 ({requestedCount}건){activeTab === 'REQUESTED' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}</button><button onClick={() => setActiveTab('ALL')} className={`flex-1 py-4 text-sm font-bold transition-colors relative ${activeTab === 'ALL' ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>전체 내역{activeTab === 'ALL' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}</button></div><div className="p-4 space-y-3 min-h-[300px] bg-gray-50">{filteredSales.map(sale => { const bizInfo = sale.customer; const isMissingInfo = !bizInfo?.businessNumber || !bizInfo?.email || !bizInfo?.companyName; const isRequested = sale.isTaxInvoiceRequested; return (<div key={sale.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative"><div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"><div className="flex-1"><div className="flex items-center gap-2 mb-1">{isRequested && (<span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">요청됨</span>)}{isMissingInfo && isRequested && (<span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded flex items-center gap-1"><AlertCircle size={10} /> 정보 확인 필요</span>)}<span className="text-xs text-gray-400">{new Date(sale.date).toLocaleDateString()}</span></div><h3 className="text-lg font-bold text-gray-900 mb-1">{bizInfo?.companyName || '상호 미입력'} <span className="text-gray-500 font-normal text-base ml-1">({bizInfo?.name || '대표자 미입력'})</span></h3><div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500"><span>{bizInfo?.businessNumber || '사업자번호 없음'}</span><span className="w-1 h-1 bg-gray-300 rounded-full"></span><span>{bizInfo?.email || '이메일 없음'}</span><span className="w-1 h-1 bg-gray-300 rounded-full"></span><span>주문번호: {sale.id}</span></div></div><div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end"><div className="text-right mr-2"><div className="font-bold text-lg text-gray-900">₩{sale.totalAmount.toLocaleString()}</div><div className="text-xs text-gray-400">공급가 ₩{Math.round(sale.totalAmount / 1.1).toLocaleString()}</div></div><div className="flex items-center gap-2"><button onClick={(e) => handleOpenEdit(e, sale)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-colors" title="정보 수정"><Edit2 size={18} /></button><button onClick={() => handleSelectSale(sale)} disabled={isRequested && isMissingInfo} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${isRequested && isMissingInfo ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}`}>선택하기</button></div></div></div></div>); })}{filteredSales.length === 0 && (<div className="flex flex-col items-center justify-center h-64 text-gray-400"><Filter size={32} className="opacity-20 mb-2" /><p>{activeTab === 'REQUESTED' ? '발행 요청된 내역이 없습니다.' : '거래 내역이 없습니다.'}</p></div>)}</div></div>)}
            {step === 2 && (<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fade-in"><h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Building className="text-blue-600" /> 공급받는자 정보 확인</h3><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호</label><input required type="text" placeholder="000-00-00000" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={invoiceForm.businessNumber} onChange={e => setInvoiceForm({...invoiceForm, businessNumber: e.target.value})} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">상호(법인명)</label><input required type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={invoiceForm.companyName} onChange={e => setInvoiceForm({...invoiceForm, companyName: e.target.value})} /></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">대표자명</label><input required type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={invoiceForm.ceoName} onChange={e => setInvoiceForm({...invoiceForm, ceoName: e.target.value})} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">이메일 (계산서 수신)</label><input required type="email" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={invoiceForm.email} onChange={e => setInvoiceForm({...invoiceForm, email: e.target.value})} /></div></div><div className="bg-gray-50 p-4 rounded-lg mt-6"><div className="flex justify-between mb-2"><span className="text-gray-600">공급가액</span><span className="font-medium">₩{Math.round(Number(selectedSale?.totalAmount || 0) / 1.1).toLocaleString()}</span></div><div className="flex justify-between mb-2"><span className="text-gray-600">세액 (10%)</span><span className="font-medium">₩{Math.round((Number(selectedSale?.totalAmount || 0) / 1.1) * 0.1).toLocaleString()}</span></div><div className="flex justify-between border-t border-gray-200 pt-2 mt-2"><span className="font-bold text-lg">합계금액</span><span className="font-bold text-lg text-blue-600">₩{selectedSale?.totalAmount.toLocaleString()}</span></div></div><div className="flex gap-3 mt-6"><button type="button" onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">이전</button><button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-200">{loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}{loading ? '전송 중...' : '국세청 전송 및 발행'}</button></div></form></div>)}
            {step === 3 && (<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center animate-fade-in"><div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600"><CheckCircle size={40} /></div><h3 className="text-2xl font-bold text-gray-800 mb-2">발행이 완료되었습니다!</h3><p className="text-gray-500 mb-8">입력하신 이메일({invoiceForm.email})로<br/>전자세금계산서가 발송되었습니다.</p><button onClick={reset} className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors">다른 건 발행하기</button></div>)}
            {editingSale && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"><div className="bg-white w-full max-w-md rounded-xl shadow-2xl animate-scale-in"><div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl"><h3 className="font-bold text-lg text-gray-800">사업자 정보 수정</h3><button onClick={() => setEditingSale(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div><div className="p-6 space-y-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">사업자등록번호</label><input type="text" className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.businessNumber} onChange={e => setEditForm({...editForm, businessNumber: e.target.value})} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">상호(법인명)</label><input type="text" className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.companyName} onChange={e => setEditForm({...editForm, companyName: e.target.value})} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">대표자명</label><input type="text" className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.ceoName} onChange={e => setEditForm({...editForm, ceoName: e.target.value})} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">이메일</label><input type="email" className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div><div className="flex gap-3 pt-2"><button onClick={() => setEditingSale(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50">취소</button><button onClick={handleSaveEdit} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2"><Save size={16} /> 저장 완료</button></div></div></div></div>)}
        </div>
    );
};

export default TaxInvoice;
EOF

# components/SalesHistory.tsx
cat <<'EOF' > src/components/SalesHistory.tsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Sale, SalesFilter, PaymentMethod, Store, User, StockInRecord, Product, SalesItem } from '../types';
import { ArrowLeft, CreditCard, MapPin, ChevronLeft, ChevronRight, X, ShoppingBag, User as UserIcon, Car, Trophy, Target, TrendingUp, Lock, Search, Edit3, Save, Banknote, Smartphone, AlertTriangle, ArrowRightLeft, Tag, Trash2, Box, Check, Plus, Minus, PenTool, Truck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesHistoryProps {
  sales: Sale[];
  stores: Store[];
  products: Product[];
  filter: SalesFilter;
  onBack: () => void;
  currentUser: User;
  currentStoreId: string;
  onUpdateMemo: (saleId: string, memo: string) => void;
  stockInHistory: StockInRecord[];
  onSwapProduct: (saleId: string, originalItemId: string, newProduct: Product) => void;
  onUpdateSale: (sale: Sale) => void;
  onCancelSale: (saleId: string) => void;
  onStockIn: (record: StockInRecord, sellingPrice?: number, forceProductId?: string) => void;
  categories: string[];
  tireBrands: string[];
  tireModels: Record<string, string[]>;
}

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'staff';

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, stores, products, filter, onBack, currentUser, currentStoreId, onUpdateMemo, stockInHistory, onSwapProduct, onUpdateSale, onCancelSale, onStockIn, categories, tireBrands, tireModels }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activePaymentMethod, setActivePaymentMethod] = useState<string>('ALL');
  const [activeStoreId, setActiveStoreId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ saleId: string, itemId?: string, isEditMode?: boolean, itemIndex?: number, isAdding?: boolean } | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [swapSearchBrand, setSwapSearchBrand] = useState<string>('ALL');
  const [editFormData, setEditFormData] = useState<Sale | null>(null);
  const [activeEditField, setActiveEditField] = useState<string | null>(null);
  const [lockedTotalAmount, setLockedTotalAmount] = useState<number>(0);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [stockInForm, setStockInForm] = useState({ supplier: '', category: '타이어', brand: tireBrands[0] || '기타', productName: '', specification: '', quantity: 1, factoryPrice: 0 });
  const isAdmin = currentUser.role === 'ADMIN';

  useEffect(() => { if (filter.type === 'DATE' && filter.value) { setCurrentDate(new Date(filter.value)); setViewMode('daily'); } else if (filter.type === 'PAYMENT') { setActivePaymentMethod(filter.value); setActiveStoreId('ALL'); setViewMode('monthly'); setCurrentDate(new Date()); } }, [filter]);
  useEffect(() => { if (currentUser.role === 'STAFF' && currentStoreId) { setActiveStoreId(currentStoreId); } }, [currentUser, currentStoreId]);
  useEffect(() => { if (selectedSale) { setEditFormData(JSON.parse(JSON.stringify(selectedSale))); setLockedTotalAmount(selectedSale.totalAmount); setActiveEditField(null); } else { setEditFormData(null); } }, [selectedSale]);

  const handlePrev = () => { const newDate = new Date(currentDate); if (viewMode === 'daily') newDate.setDate(newDate.getDate() - 1); if (viewMode === 'weekly') newDate.setDate(newDate.getDate() - 7); if (viewMode === 'monthly' || viewMode === 'staff') newDate.setMonth(newDate.getMonth() - 1); setCurrentDate(newDate); };
  const handleNext = () => { const newDate = new Date(currentDate); if (viewMode === 'daily') newDate.setDate(newDate.getDate() + 1); if (viewMode === 'weekly') newDate.setDate(newDate.getDate() + 7); if (viewMode === 'monthly' || viewMode === 'staff') newDate.setMonth(newDate.getMonth() + 1); setCurrentDate(newDate); };
  const getDateRange = () => { const start = new Date(currentDate); const end = new Date(currentDate); if (viewMode === 'daily') { start.setHours(0,0,0,0); end.setHours(23,59,59,999); } else if (viewMode === 'weekly') { const day = start.getDay(); start.setDate(start.getDate() - day); start.setHours(0,0,0,0); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999); } else { start.setDate(1); start.setHours(0,0,0,0); end.setMonth(end.getMonth() + 1); end.setDate(0); end.setHours(23,59,59,999); } return { start, end }; };
  const { start: filterStart, end: filterEnd } = getDateRange();
  const getLatestCost = (productName: string, spec?: string) => { if (!stockInHistory || stockInHistory.length === 0) return 0; const matches = stockInHistory.filter(r => { const nameMatch = r.productName.trim() === productName.trim(); const specMatch = spec ? (r.specification || '').trim() === (spec || '').trim() : true; return nameMatch && specMatch && (r.purchasePrice || 0) > 0; }); matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); return matches[0]?.purchasePrice || 0; };
  const filteredSales = useMemo(() => { return sales.filter(sale => { const saleDate = new Date(sale.date); if (saleDate < filterStart || saleDate > filterEnd) return false; if (activePaymentMethod !== 'ALL' && sale.paymentMethod !== activePaymentMethod) return false; if (activeStoreId !== 'ALL' && sale.storeId !== activeStoreId) return false; if (searchTerm) { const term = searchTerm.toLowerCase(); const vehicle = sale.vehicleNumber?.toLowerCase() || ''; const phone = sale.customer?.phoneNumber || ''; if (!vehicle.includes(term) && !phone.includes(term)) return false; } return true; }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); }, [sales, filterStart, filterEnd, activePaymentMethod, activeStoreId, searchTerm]);
  const salesWithMetrics = useMemo(() => { return filteredSales.map(sale => { let totalCost = 0; sale.items.forEach(item => { const cost = getLatestCost(item.productName, item.specification); totalCost += (cost * item.quantity); }); const margin = sale.totalAmount - totalCost; return { ...sale, metrics: { totalCost, margin, marginRate: sale.totalAmount > 0 ? (margin / sale.totalAmount) * 100 : 0 } }; }); }, [filteredSales, stockInHistory]);
  const aggregates = useMemo(() => { return salesWithMetrics.reduce((acc, curr) => ({ revenue: acc.revenue + (curr.isCanceled ? 0 : curr.totalAmount), cost: acc.cost + (curr.isCanceled ? 0 : curr.metrics.totalCost), margin: acc.margin + (curr.isCanceled ? 0 : curr.metrics.margin) }), { revenue: 0, cost: 0, margin: 0 }); }, [salesWithMetrics]);
  const staffStats = useMemo(() => { if (viewMode !== 'staff' || currentUser.role !== 'ADMIN') return []; const stats: Record<string, { name: string, count: number, total: number }> = {}; filteredSales.filter(s => !s.isCanceled).forEach(sale => { const name = sale.staffName || '미지정'; if (!stats[name]) { stats[name] = { name, count: 0, total: 0 }; } stats[name].count += 1; stats[name].total += sale.totalAmount; }); return Object.values(stats).sort((a, b) => b.total - a.total); }, [filteredSales, viewMode, currentUser.role]);
  const staffChartData = useMemo(() => { return staffStats.map(stat => ({ name: stat.name, amount: stat.total, count: stat.count })); }, [staffStats]);
  const dateLabel = useMemo(() => { const y = currentDate.getFullYear(); const m = currentDate.getMonth() + 1; const d = currentDate.getDate(); if (viewMode === 'daily') return `${y}. ${m}. ${d}`; if (viewMode === 'monthly' || viewMode === 'staff') return `${y}년 ${m}월`; const start = new Date(filterStart); const end = new Date(filterEnd); return `${start.getMonth()+1}.${start.getDate()} ~ ${end.getMonth()+1}.${end.getDate()}`; }, [currentDate, viewMode, filterStart, filterEnd]);
  const getPaymentIcon = (method: PaymentMethod) => { switch (method) { case PaymentMethod.CARD: return <CreditCard size={14} />; case PaymentMethod.CASH: return <Banknote size={14} />; case PaymentMethod.TRANSFER: return <Smartphone size={14} />; default: return <CreditCard size={14} />; } };
  const getPrimaryItem = (sale: Sale) => { const itemsWithCat = sale.items.map(item => { const product = products.find(p => p.id === item.productId); let category = product?.category || '기타'; if (category === '기타' && item.specification && /\d{3}\/\d{2}/.test(item.specification)) { category = '타이어'; } return { ...item, category }; }); const tires = itemsWithCat.filter(i => i.category === '타이어'); if (tires.length > 0) return tires[0]; const parts = itemsWithCat.filter(i => i.category === '부품/수리'); if (parts.length > 0) return parts[0]; return itemsWithCat[0] || sale.items[0]; };
  const openSwapModal = (saleId: string, itemId: string, isEditMode = false, itemIndex = -1) => { setSwapTarget({ saleId, itemId, isEditMode, itemIndex, isAdding: false }); setIsSwapModalOpen(true); setProductSearchTerm(''); setSwapSearchBrand('ALL'); };
  const openAddModal = (saleId: string) => { setSwapTarget({ saleId, isEditMode: true, isAdding: true }); setIsSwapModalOpen(true); setProductSearchTerm(''); setSwapSearchBrand('ALL'); };
  const handleInstantStockIn = () => { const { productName, quantity, storeId } = stockInForm as any; if (!productName.trim() || quantity <= 0) { alert('상품명과 수량을 입력해주세요.'); return; } const record: StockInRecord = { id: `IN-${Date.now()}`, date: new Date().toISOString().split('T')[0], storeId: selectedSale ? selectedSale.storeId : currentStoreId, supplier: stockInForm.supplier || '자체입고', category: stockInForm.category, brand: stockInForm.brand, productName: stockInForm.productName.trim(), specification: stockInForm.specification.trim(), quantity: stockInForm.quantity, factoryPrice: stockInForm.factoryPrice, purchasePrice: 0 }; const existingProduct = products.find(p => p.name === record.productName && (p.specification || '') === (record.specification || '')); const targetProductId = existingProduct ? existingProduct.id : `P-NEW-${Date.now()}`; onStockIn(record, 0, targetProductId); const proxyProduct: Product = { id: targetProductId, name: record.productName, price: 0, stock: record.quantity, stockByStore: { [record.storeId]: record.quantity }, category: record.category, brand: record.brand, specification: record.specification }; executeSwap(proxyProduct); setIsStockInModalOpen(false); setStockInForm({ supplier: '', category: '타이어', brand: tireBrands[0] || '기타', productName: '', specification: '', quantity: 1, factoryPrice: 0 }); };
  const recalculateUnitPrices = (currentItems: SalesItem[], fixedTotal: number): SalesItem[] => { if (currentItems.length === 0) return currentItems; if (currentItems.length === 1) { const item = currentItems[0]; const newItemPrice = Math.floor(fixedTotal / item.quantity); return [{ ...item, priceAtSale: newItemPrice }]; } let totalWeight = currentItems.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0); if (totalWeight === 0) { const splitPrice = Math.floor(fixedTotal / currentItems.length); return currentItems.map((item, idx) => ({ ...item, priceAtSale: idx === 0 ? splitPrice + (fixedTotal - (splitPrice * currentItems.length)) : splitPrice })); } const factor = fixedTotal / totalWeight; const newItems = currentItems.map((item) => { let newUnitPrice = Math.floor(item.priceAtSale * factor); return { ...item, priceAtSale: newUnitPrice }; }); let newActualTotal = newItems.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0); let remainder = fixedTotal - newActualTotal; if (remainder !== 0) { const bestCandidate = newItems.findIndex(i => i.quantity === 1); if (bestCandidate !== -1) { newItems[bestCandidate].priceAtSale += remainder; } else { const firstItem = newItems[0]; if (firstItem.quantity > 0) { const priceIncrease = Math.floor(remainder / firstItem.quantity); newItems[0].priceAtSale += priceIncrease; } } } return newItems; };
  const executeSwap = (product: Product) => { if (!swapTarget) return; if (swapTarget.isEditMode && editFormData) { let newItems = [...editFormData.items]; if (swapTarget.isAdding) { newItems.push({ productId: product.id, productName: product.name, brand: product.brand, specification: product.specification, quantity: 1, priceAtSale: product.price }); } else { const idx = swapTarget.itemIndex!; if (newItems[idx]) { newItems[idx] = { ...newItems[idx], productId: product.id, productName: product.name, brand: product.brand, specification: product.specification, priceAtSale: product.price }; } } newItems = recalculateUnitPrices(newItems, lockedTotalAmount); setEditFormData({ ...editFormData, items: newItems }); setIsSwapModalOpen(false); setSwapTarget(null); } else if (swapTarget.itemId) { onSwapProduct(swapTarget.saleId, swapTarget.itemId, product); setIsSwapModalOpen(false); setSwapTarget(null); if (selectedSale && selectedSale.id === swapTarget.saleId) { setSelectedSale(null); } } };
  const handleEditChange = (field: string, value: any, itemIndex?: number) => { if (!editFormData) return; if (itemIndex !== undefined) { let newItems = [...editFormData.items]; if (field === 'quantity') { const newQty = Number(value); if (newQty >= 0) { newItems[itemIndex] = { ...newItems[itemIndex], quantity: newQty }; newItems = recalculateUnitPrices(newItems, lockedTotalAmount); } } else if (field === 'priceAtSale') { if (newItems.length === 1) { return; } const newUnitPrice = Number(value); const targetItem = newItems[itemIndex]; const targetCost = newUnitPrice * targetItem.quantity; const remainingBudget = lockedTotalAmount - targetCost; const otherItemsIndices = newItems.map((_, i) => i).filter(i => i !== itemIndex); if (otherItemsIndices.length === 0) { newItems[itemIndex] = { ...targetItem, priceAtSale: newUnitPrice }; const fixedPrice = Math.floor(lockedTotalAmount / targetItem.quantity); newItems[itemIndex].priceAtSale = fixedPrice; } else { newItems[itemIndex] = { ...targetItem, priceAtSale: newUnitPrice }; const currentWeightOfOthers = otherItemsIndices.reduce((sum, idx) => { return sum + (newItems[idx].priceAtSale * newItems[idx].quantity); }, 0); if (currentWeightOfOthers === 0) { const firstOther = otherItemsIndices[0]; const qty = newItems[firstOther].quantity; if (qty > 0) { newItems[firstOther].priceAtSale = Math.floor(remainingBudget / qty); } } else { const factor = remainingBudget / currentWeightOfOthers; otherItemsIndices.forEach(idx => { const item = newItems[idx]; const adjustedPrice = Math.floor(item.priceAtSale * factor); newItems[idx] = { ...item, priceAtSale: adjustedPrice }; }); } const currentTotal = newItems.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0); const drift = lockedTotalAmount - currentTotal; if (drift !== 0) { const absorbIdx = otherItemsIndices[0]; if (absorbIdx !== undefined) { const absorbItem = newItems[absorbIdx]; if (absorbItem.quantity > 0) { newItems[absorbIdx].priceAtSale += Math.floor(drift / absorbItem.quantity); } } } } } else { newItems[itemIndex] = { ...newItems[itemIndex], [field]: value }; } setEditFormData({ ...editFormData, items: newItems }); } else if (field.startsWith('customer.')) { const custField = field.split('.')[1]; setEditFormData({ ...editFormData, customer: { ...editFormData.customer!, [custField]: value } }); } else { setEditFormData({ ...editFormData, [field]: value }); } };
  const handlePhoneChange = (val: string) => { const raw = val.replace(/[^0-9]/g, ''); let formatted = raw; if (raw.length > 3 && raw.length <= 7) { formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`; } else if (raw.length > 7) { formatted = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`; } handleEditChange('customer.phoneNumber', formatted); };
  const removeItem = (index: number) => { if (!editFormData) return; let newItems = editFormData.items.filter((_, i) => i !== index); newItems = recalculateUnitPrices(newItems, lockedTotalAmount); setEditFormData({ ...editFormData, items: newItems }); };
  const renderEditableField = (id: string, value: string | number, onChange: (val: string) => void, type: 'text' | 'number' = 'text', labelClass = '') => { const isEditing = activeEditField === id; if (selectedSale?.isCanceled) { return <span className={labelClass}>{value}</span>; } if (isEditing) { return (<input autoFocus type={type} className="w-full border border-blue-500 rounded p-1 text-sm bg-white" value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => setActiveEditField(null)} onKeyDown={(e) => { if(e.key === 'Enter') setActiveEditField(null); }} />); } return (<div onClick={() => setActiveEditField(id)} className={`cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 border border-transparent hover:border-gray-200 transition-colors ${labelClass}`} title="클릭하여 수정">{value || <span className="text-gray-300 italic">입력...</span>}</div>); };
  const saveDetailEdit = () => { if (editFormData && onUpdateSale) { const calculatedTotal = editFormData.items.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0); const updatedSale = { ...editFormData, totalAmount: calculatedTotal, isEdited: true }; onUpdateSale(updatedSale); setSelectedSale(null); setEditFormData(null); setActiveEditField(null); } };
  const confirmCancelSale = () => { if (selectedSale && onCancelSale) { onCancelSale(selectedSale.id); setSelectedSale(null); } else { console.error("Cancel failed: Sale or onCancelSale handler missing", selectedSale, onCancelSale); } };
  const uniqueBrands = useMemo(() => { const brands = new Set<string>(); products.forEach(p => { if (p.brand && p.brand !== '기타' && p.id !== '99999') { brands.add(p.brand); } }); return Array.from(brands).sort(); }, [products]);
  const filteredSearchProducts = useMemo(() => { const term = productSearchTerm.trim().toLowerCase(); const numericTerm = term.replace(/\D/g, ''); return products.filter(p => { if (p.id === '99999') return false; if (swapSearchBrand !== 'ALL' && p.brand !== swapSearchBrand) return false; if (!term) return true; const nameMatch = p.name.toLowerCase().includes(term); const specMatch = p.specification?.toLowerCase().includes(term); let numericSpecMatch = false; if (!nameMatch && !specMatch && numericTerm.length >= 3 && p.specification) { const productNumericSpec = p.specification.toLowerCase().replace(/\D/g, ''); if (productNumericSpec.includes(numericTerm)) { numericSpecMatch = true; } } return nameMatch || specMatch || numericSpecMatch; }); }, [products, productSearchTerm, swapSearchBrand]);
  const isStoreSelected = activeStoreId !== 'ALL';

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-4">
      <div className="flex flex-col bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4"><div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-4 gap-3"><div className="flex items-center gap-3 w-full md:w-auto"><button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"><ArrowLeft size={24} /></button><h2 className="text-lg md:text-xl font-bold text-gray-800 truncate">{viewMode === 'staff' ? '직원별 성과 분석' : '판매 내역 조회'}</h2></div><div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto no-scrollbar">{(['daily', 'weekly', 'monthly', 'staff'] as const).filter(mode => mode !== 'staff' || currentUser.role === 'ADMIN').map((mode) => (<button key={mode} onClick={() => setViewMode(mode)} className={`flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{mode === 'daily' ? '일간' : mode === 'weekly' ? '주간' : mode === 'monthly' ? '월간' : '직원별'}</button>))}</div></div><div className="flex flex-col lg:flex-row justify-between items-center gap-4"><div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 w-full lg:w-auto justify-between lg:justify-start"><button onClick={handlePrev} className="p-1 hover:bg-white rounded-full transition-all shadow-sm"><ChevronLeft size={20} /></button><span className="text-base md:text-lg font-bold text-gray-800 min-w-[140px] text-center">{dateLabel}</span><button onClick={handleNext} className="p-1 hover:bg-white rounded-full transition-all shadow-sm"><ChevronRight size={20} /></button></div><div className="grid grid-cols-1 md:flex items-center gap-3 w-full lg:w-auto"><div className="relative w-full md:w-64"><Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input type="text" placeholder="차량번호 또는 전화번호 뒷자리" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div className="grid grid-cols-2 gap-2 w-full md:w-auto"><div className="relative w-full md:w-auto"><select value={activePaymentMethod} onChange={(e) => setActivePaymentMethod(e.target.value)} className="w-full md:w-auto appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-9 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm"><option value="ALL">모든 결제</option><option value={PaymentMethod.CARD}>카드</option><option value={PaymentMethod.CASH}>현금</option><option value={PaymentMethod.TRANSFER}>계좌이체</option></select><CreditCard size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /></div><div className="relative w-full md:w-auto"><select value={activeStoreId} onChange={(e) => setActiveStoreId(e.target.value)} disabled={currentUser.role === 'STAFF'} className={`w-full md:w-auto appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-9 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm ${currentUser.role === 'STAFF' ? 'bg-gray-100' : ''}`}><option value="ALL">전체 매장</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /></div></div></div></div></div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
         {viewMode === 'staff' ? ( currentUser.role === 'ADMIN' ? (<div className="p-4 md:p-6">{staffStats.length === 0 ? (<div className="flex flex-col items-center justify-center h-64 text-gray-400"><UserIcon size={48} className="opacity-20 mb-4" /><p>해당 기간의 판매 실적이 없습니다.</p></div>) : (<div className="space-y-6"><div className="h-64 w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><ResponsiveContainer width="100%" height="100%"><BarChart data={staffChartData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={70} tick={{fontSize: 12}} /><Tooltip formatter={(value) => `₩${Number(value).toLocaleString()}`} /><Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} /></BarChart></ResponsiveContainer></div></div>)}</div>) : (<div className="flex flex-col items-center justify-center h-full text-gray-400 p-10"><Lock size={48} className="mb-4 text-gray-300" /><h3 className="text-lg font-bold text-gray-600">접근 권한이 없습니다</h3></div>) ) : (
            <><div className="hidden md:flex flex-col"><div className="overflow-x-auto bg-white"><table className="w-full text-sm text-left table-fixed"><thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10"><tr><th className="px-4 py-3 text-center w-[100px]">시간</th><th className="px-4 py-3 text-left">규격 / 브랜드 / 모델</th><th className="px-4 py-3 text-right w-[120px]">결제 금액</th>{isAdmin && <th className="px-4 py-3 text-right w-[120px]">매입가</th>}{isAdmin && <th className="px-4 py-3 text-right w-[120px]">마진</th>}<th className="px-4 py-3 text-left w-[140px]">{isStoreSelected ? '담당자' : '지점 / 담당자'}</th><th className="px-4 py-3 text-left w-[180px]">메모</th></tr></thead><tbody className="divide-y divide-gray-100">{salesWithMetrics.length === 0 ? (<tr><td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-400"><p>조회된 판매 내역이 없습니다.</p></td></tr>) : (salesWithMetrics.map((sale) => { const displayItem = getPrimaryItem(sale); return (<tr key={sale.id} onClick={() => setSelectedSale(sale)} className={`hover:bg-blue-50 cursor-pointer transition-colors ${sale.isCanceled ? 'bg-gray-50' : ''}`}><td className="px-4 py-3 text-center text-gray-500 font-medium whitespace-nowrap text-xs truncate">{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}{sale.isEdited && !sale.isCanceled && (<span className="block text-[9px] text-blue-500 font-bold mt-0.5">(수정됨)</span>)}</td><td className="px-4 py-3 whitespace-nowrap overflow-hidden"><div className="flex items-center gap-2">{sale.isCanceled && (<span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold border border-red-200">취소됨</span>)}{sale.items[0].productId === '99999' && !sale.isCanceled && (<span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-bold border border-orange-200 animate-pulse">⚠️ 우선결제</span>)}<span className={`text-sm font-bold truncate ${sale.isCanceled ? 'text-red-400 line-through' : 'text-blue-600'}`}>{displayItem.specification}</span><span className={`font-medium truncate ${sale.isCanceled ? 'text-red-400 line-through' : 'text-gray-800'}`}>{displayItem.brand} {displayItem.productName}{sale.items.length > 1 && <span className="text-gray-400 text-xs ml-1">외 {sale.items.length - 1}건</span>}</span></div></td><td className="px-4 py-3 text-right whitespace-nowrap"><div className="flex items-center justify-end gap-2"><span className={`font-bold ${sale.isCanceled ? 'text-red-400 line-through' : 'text-gray-900'}`}>₩{sale.totalAmount.toLocaleString()}</span><span className="text-gray-400">{getPaymentIcon(sale.paymentMethod)}</span></div></td>{isAdmin && (<td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">{sale.isCanceled ? '-' : `₩${sale.metrics.totalCost.toLocaleString()}`}</td>)}{isAdmin && (<td className="px-4 py-3 text-right whitespace-nowrap">{sale.isCanceled ? '-' : (<div className="flex flex-col items-end"><span className={`font-bold text-sm ${sale.metrics.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₩{sale.metrics.margin.toLocaleString()}</span></div>)}</td>)}<td className="px-4 py-3 text-left text-sm text-gray-600 whitespace-nowrap truncate">{isStoreSelected ? sale.staffName : <>{stores.find(s => s.id === sale.storeId)?.name} <span className="text-gray-400">({sale.staffName})</span></>}</td><td className="px-4 py-3 text-left whitespace-nowrap overflow-hidden"><div className="truncate text-xs text-gray-500" title={sale.memo}>{sale.memo}</div></td></tr>); }))}</tbody></table></div><div className="bg-gray-50 border-t border-gray-200 p-4 sticky bottom-0 z-20 flex justify-between items-center shadow-md"><div className="text-xs font-bold text-gray-500 uppercase">{viewMode === 'daily' ? `${currentDate.toLocaleDateString()} 합계` : '조회 기간 합계'}</div><div className="flex gap-6 text-sm"><div className="text-right"><span className="text-xs text-gray-500 block">총 매출</span><span className="font-bold text-blue-600 text-lg">₩{aggregates.revenue.toLocaleString()}</span></div>{isAdmin && (<div className="text-right"><span className="text-xs text-gray-500 block">총 마진</span><span className={`font-bold text-lg ${aggregates.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₩{aggregates.margin.toLocaleString()}</span></div>)}</div></div></div></>
         )}
      </div>
      {selectedSale && editFormData && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in"><div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"><div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"><div><h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><ShoppingBag size={20} className="text-blue-600"/> 판매 상세 (수정)</h3><div className="flex items-center gap-2 mt-1"><p className="text-xs text-gray-500">주문번호: {selectedSale.id}</p>{selectedSale.isEdited && <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">수정됨</span>}</div></div><button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div><div className="flex-1 overflow-y-auto p-6 space-y-6">{selectedSale.isCanceled && (<div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center"><AlertTriangle size={32} className="text-red-500 mx-auto mb-2"/><h3 className="font-bold text-red-600">결제 취소된 내역입니다.</h3><p className="text-xs text-gray-500">취소일시: {selectedSale.cancelDate ? new Date(selectedSale.cancelDate).toLocaleString() : '-'}</p></div>)}<div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center"><div><div className="text-xs text-blue-500 font-bold uppercase mb-1">총 결제 금액 (고정)</div><div className={`text-2xl font-bold ${selectedSale.isCanceled ? 'text-red-500 line-through' : 'text-blue-700'}`}>₩{lockedTotalAmount.toLocaleString()}</div><div className="text-[10px] text-blue-400 mt-1">수량/상품 변경 시 단가가 자동 조정됩니다.</div></div><div className="text-right"><div className={`inline-block px-3 py-1 rounded-full text-sm font-bold bg-white shadow-sm mb-1 ${selectedSale.paymentMethod === PaymentMethod.CARD ? 'text-blue-600' : selectedSale.paymentMethod === PaymentMethod.CASH ? 'text-emerald-600' : 'text-violet-600'}`}>{selectedSale.paymentMethod}</div><div className="text-xs text-gray-500">{new Date(selectedSale.date).toLocaleString()}</div></div></div><div><div className="flex justify-between items-center mb-3"><h4 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingBag size={16}/> 구매 상품</h4></div><div className="space-y-3">{editFormData.items.map((item, idx) => (<div key={idx} className={`flex flex-col p-3 rounded-lg border ${item.productId === '99999' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}><div className="flex justify-between items-start"><div className="flex-1 mr-4"><div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold">상품명 (재고 연동)</label><button disabled={selectedSale.isCanceled} onClick={() => openSwapModal(selectedSale.id, item.productId, true, idx)} className={`w-full text-left bg-white border border-gray-200 rounded p-2 text-sm font-bold text-gray-700 hover:border-blue-300 hover:bg-blue-50 flex justify-between items-center ${selectedSale.isCanceled ? 'opacity-50 cursor-not-allowed' : ''}`}><span className="truncate">{item.specification ? `[${item.specification}] ` : ''}{item.productName}</span><Search size={14} className="flex-shrink-0 text-gray-400" /></button></div></div><div className="text-right min-w-[100px]"><div className="flex flex-col gap-1 items-end"><div className="flex items-center gap-1 justify-end"><span className="text-xs text-gray-500">단가</span>{editFormData.items.length === 1 ? (<span className="text-sm font-bold text-right w-20 text-gray-400 cursor-not-allowed" title="단일 상품은 총액과 동일해야 합니다">{item.priceAtSale.toLocaleString()}</span>) : (renderEditableField(`item-${idx}-price`, item.priceAtSale, (val) => handleEditChange('priceAtSale', Number(val), idx), 'number', 'text-sm font-bold text-right w-20'))}</div><div className="flex items-center gap-1 justify-end h-8 mt-1"><span className="text-xs text-gray-500">수량</span>{activeEditField === `item-${idx}-qty` && !selectedSale.isCanceled ? (<div className="flex items-center border border-blue-500 rounded bg-white"><button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); const newQty = Math.max(1, item.quantity - 1); handleEditChange('quantity', newQty, idx); }} className="px-2 py-1 text-gray-600 hover:bg-gray-100"><Minus size={12}/></button><input autoFocus type="number" className="w-8 text-center text-sm p-1 outline-none appearance-none font-bold" value={item.quantity} onChange={(e) => handleEditChange('quantity', Number(e.target.value), idx)} onBlur={() => setActiveEditField(null)} onKeyDown={(e) => { if(e.key === 'Enter') setActiveEditField(null); }} /><button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); const newQty = item.quantity + 1; handleEditChange('quantity', newQty, idx); }} className="px-2 py-1 text-gray-600 hover:bg-gray-100"><Plus size={12}/></button></div>) : (<div onClick={() => !selectedSale.isCanceled && setActiveEditField(`item-${idx}-qty`)} className={`cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-1 border border-transparent hover:border-gray-200 transition-colors text-sm font-medium text-right ${selectedSale.isCanceled ? 'cursor-default' : ''}`} title="클릭하여 수정">{item.quantity}</div>)}</div></div></div></div>{!selectedSale.isCanceled && (<div className="mt-2 text-right"><button onClick={() => removeItem(idx)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 ml-auto"><Trash2 size={12} /> 삭제</button></div>)}</div>))}</div>{!selectedSale.isCanceled && (<button onClick={() => openAddModal(selectedSale.id)} className="w-full mt-3 py-2 border border-dashed border-blue-300 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> 상품/서비스 추가</button>)}</div><div><h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><UserIcon size={16}/> 고객 및 차량 정보</h4><div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2"><div className="flex justify-between items-center min-h-[28px]"><span className="text-sm text-gray-500 w-20">고객명</span><div className="flex-1 text-right">{renderEditableField('customer.name', editFormData.customer?.name || '', (val) => handleEditChange('customer.name', val), 'text', 'text-sm font-medium')}</div></div><div className="flex justify-between items-center min-h-[28px]"><span className="text-sm text-gray-500 w-20">연락처</span><div className="flex-1 text-right">{renderEditableField('customer.phoneNumber', editFormData.customer?.phoneNumber || '', handlePhoneChange, 'text', 'text-sm font-medium')}</div></div><div className="flex justify-between items-center min-h-[28px]"><span className="text-sm text-gray-500 w-20">차량번호</span><div className="flex-1 text-right">{renderEditableField('vehicleNumber', editFormData.vehicleNumber || '', (val) => handleEditChange('vehicleNumber', val), 'text', 'text-sm font-bold text-blue-600')}</div></div><div className="flex justify-between items-center min-h-[28px]"><span className="text-sm text-gray-500 w-20">차종</span><div className="flex-1 text-right">{renderEditableField('customer.carModel', editFormData.customer?.carModel || '', (val) => handleEditChange('customer.carModel', val), 'text', 'text-sm font-medium')}</div></div></div></div><div><h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Edit3 size={16}/> 관리자 메모</h4>{selectedSale.isCanceled ? (<div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">{editFormData.memo}</div>) : (<textarea className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-shadow" rows={3} placeholder="판매 관련 특이사항 기록" value={editFormData.memo || ''} onChange={(e) => handleEditChange('memo', e.target.value)} />)}</div></div><div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">{!selectedSale.isCanceled && (<button type="button" onClick={confirmCancelSale} className="px-4 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 flex items-center gap-2 transition-colors"><Trash2 size={18}/> 결제 취소</button>)}<button disabled={selectedSale.isCanceled} onClick={saveDetailEdit} className={`flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors shadow-md ${selectedSale.isCanceled ? 'opacity-50 cursor-not-allowed' : ''}`}><Save size={18} /> 변경사항 저장</button></div></div></div>)}
      {isSwapModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in"><div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-0 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"><div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"><h3 className="font-bold text-lg text-gray-800">{swapTarget?.isAdding ? '상품/서비스 추가' : (swapTarget?.isEditMode ? '상품 변경' : '정식 상품으로 변경')}</h3><button onClick={() => setIsSwapModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="p-4 bg-white space-y-3 shrink-0"><button onClick={() => setIsStockInModalOpen(true)} className="w-full py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 shadow-sm mb-2"><Truck size={18}/> + 신규 상품 등록 (바로 입고)</button><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Tag size={12}/> 브랜드 필터</label><div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"><button onClick={() => setSwapSearchBrand('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${swapSearchBrand === 'ALL' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>전체</button>{uniqueBrands.map(brand => (<button key={brand} onClick={() => setSwapSearchBrand(brand)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${swapSearchBrand === brand ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{brand}</button>))}</div></div><div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input autoFocus type="text" placeholder="상품명 또는 규격 검색 (예: 2454518, HP71)" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} /></div></div><div className="flex-1 overflow-y-auto bg-gray-50 p-4 pt-0"><div className="space-y-2">{filteredSearchProducts.length === 0 ? (<div className="text-center py-12 text-gray-400 text-sm flex flex-col items-center"><Search size={32} className="opacity-20 mb-2" />검색 결과가 없습니다.</div>) : (filteredSearchProducts.map(product => (<div key={product.id} onClick={() => executeSwap(product)} className="p-3 border border-gray-200 rounded-xl bg-white hover:border-blue-300 hover:shadow-sm cursor-pointer flex justify-between items-center group transition-all"><div><div className="text-xs font-bold text-blue-600">{product.specification}</div><div className="font-bold text-gray-800 text-sm group-hover:text-blue-600">{product.brand} {product.name}</div><div className="text-xs text-gray-500 mt-1">단가: ₩{product.price.toLocaleString()}</div></div><div className="text-right"><div className={`text-xs font-bold px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>재고: {product.stock > 900 ? '∞' : product.stock}</div></div></div>)))}</div></div></div></div>)}
      {isStockInModalOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in"><div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-scale-in"><div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Truck size={18} className="text-blue-600"/> 신규 입고 등록</h3><button onClick={() => setIsStockInModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="p-5 space-y-3"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">카테고리</label><select className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white" value={stockInForm.category} onChange={e => setStockInForm({...stockInForm, category: e.target.value})}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">규격 (Size)</label><input type="text" placeholder="예: 245/45R18" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={stockInForm.specification} onChange={e => { let val = e.target.value; if (/^\d{7}$/.test(val)) val = `${val.slice(0, 3)}/${val.slice(3, 5)}R${val.slice(5, 7)}`; setStockInForm({...stockInForm, specification: val}) }} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">브랜드</label><select className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white" value={stockInForm.brand} onChange={e => setStockInForm({...stockInForm, brand: e.target.value})}>{tireBrands.map(b => <option key={b} value={b}>{b}</option>)}</select></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">모델명</label><input type="text" list="stockin-model-list" placeholder="모델명 검색/입력" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={stockInForm.productName} onChange={e => setStockInForm({...stockInForm, productName: e.target.value})} /><datalist id="stockin-model-list">{tireModels[stockInForm.brand]?.map(model => (<option key={model} value={model} />))}</datalist></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">거래처 (선택)</label><input type="text" placeholder="거래처명" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={stockInForm.supplier} onChange={e => setStockInForm({...stockInForm, supplier: e.target.value})} /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">입고 수량</label><input type="number" min="1" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={stockInForm.quantity} onChange={e => setStockInForm({...stockInForm, quantity: Number(e.target.value)})} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">공장도가</label><input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-sm text-right" placeholder="0" value={stockInForm.factoryPrice || ''} onChange={e => setStockInForm({...stockInForm, factoryPrice: Number(e.target.value)})} /></div></div><div className="pt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">* [입고 완료] 시 재고가 즉시 증가하며, 판매 리스트에 자동 추가됩니다.</div><button onClick={handleInstantStockIn} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg">입고 완료 및 추가</button></div></div></div>)}
    </div>
  );
};

export default SalesHistory;
EOF

# components/Settings.tsx
cat <<'EOF' > src/components/Settings.tsx
import React, { useState, useEffect } from 'react';
import { Store, StaffPermissions, User } from '../types';
import { Settings as SettingsIcon, Plus, Trash2, Save, Lock, Users, MapPin, ShieldCheck, AlertCircle, Type, Edit2, X, AlertTriangle, UserPlus, KeyRound, Check } from 'lucide-react';

interface SettingsProps {
  stores: Store[];
  onAddStore: (name: string) => void;
  onUpdateStore: (id: string, name: string) => void;
  onRemoveStore: (id: string) => void;
  staffPermissions: StaffPermissions;
  onUpdatePermissions: (perms: StaffPermissions) => void;
  currentAdminPassword: string;
  onUpdatePassword: (newPass: string) => void;
  appTitle: string;
  onUpdateAppTitle: (title: string) => void;
  users: User[];
  onAddUser: (user: User) => void;
  onRemoveUser: (id: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ stores, onAddStore, onUpdateStore, onRemoveStore, staffPermissions, onUpdatePermissions, currentAdminPassword, onUpdatePassword, appTitle, onUpdateAppTitle, users, onAddUser, onRemoveUser }) => {
  const [newStoreName, setNewStoreName] = useState('');
  const [localAppTitle, setLocalAppTitle] = useState(appTitle);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editStoreNameInput, setEditStoreNameInput] = useState('');
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
  const [pwdMessage, setPwdMessage] = useState({ text: '', isError: false });
  const [newStaffForm, setNewStaffForm] = useState({ name: '', id: '' });

  useEffect(() => { setLocalAppTitle(appTitle); }, [appTitle]);

  const handleAddStore = (e: React.FormEvent) => { e.preventDefault(); if (newStoreName.trim()) { onAddStore(newStoreName.trim()); setNewStoreName(''); } };
  const handleAppTitleSave = () => { if(localAppTitle.trim()) { onUpdateAppTitle(localAppTitle.trim()); alert('매장명이 변경되었습니다.'); } };
  const openEditModal = (store: Store) => { setEditingStore(store); setEditStoreNameInput(store.name); };
  const saveEditStore = () => { if(editingStore && editStoreNameInput.trim()) { onUpdateStore(editingStore.id, editStoreNameInput.trim()); setEditingStore(null); setEditStoreNameInput(''); } };
  const openDeleteModal = (store: Store) => { setDeletingStore(store); setDeletePasswordInput(''); setDeleteError(''); };
  const confirmDeleteStore = (e: React.FormEvent) => { e.preventDefault(); if(deletePasswordInput === currentAdminPassword) { if(deletingStore) { onRemoveStore(deletingStore.id); setDeletingStore(null); setDeletePasswordInput(''); setDeleteError(''); } } else { setDeleteError('관리자 비밀번호가 일치하지 않습니다.'); } };
  const handlePasswordChange = (e: React.FormEvent) => { e.preventDefault(); if (pwdForm.current !== currentAdminPassword) { setPwdMessage({ text: '현재 비밀번호가 일치하지 않습니다.', isError: true }); return; } if (pwdForm.new.length < 4) { setPwdMessage({ text: '새 비밀번호는 4자리 이상이어야 합니다.', isError: true }); return; } if (pwdForm.new !== pwdForm.confirm) { setPwdMessage({ text: '새 비밀번호가 일치하지 않습니다.', isError: true }); return; } onUpdatePassword(pwdForm.new); setPwdMessage({ text: '비밀번호가 성공적으로 변경되었습니다.', isError: false }); setPwdForm({ current: '', new: '', confirm: '' }); };
  const handleAddStaff = (e: React.FormEvent) => { e.preventDefault(); if (newStaffForm.name.trim() && newStaffForm.id.trim()) { if (users.some(u => u.id === newStaffForm.id.trim())) { alert('이미 존재하는 ID입니다. 다른 ID를 사용해주세요.'); return; } const newUser: User = { id: newStaffForm.id.trim(), name: newStaffForm.name.trim(), role: 'STAFF' }; onAddUser(newUser); setNewStaffForm({ name: '', id: '' }); } };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10 relative">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><SettingsIcon className="text-gray-600" /> 시스템 환경 설정</h2><p className="text-sm text-gray-500 mt-1">매장 관리, 직원 권한 및 관리자 보안 설정을 관리합니다.</p></div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><Type className="text-blue-600" size={20} /> 매장명(브랜드) 설정</h3><div className="flex items-end gap-2 max-w-md"><div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">시스템 타이틀</label><input type="text" value={localAppTitle} onChange={(e) => setLocalAppTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="예: 타이어테크" /></div><button onClick={handleAppTitleSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors h-[42px]">저장</button></div><p className="text-xs text-gray-500 mt-2">상단 로고 및 로그인 화면에 표시되는 이름입니다.</p></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full"><h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><MapPin className="text-blue-600" size={20} /> 매장(지점) 관리</h3><div className="flex-1 overflow-y-auto min-h-[200px] mb-4 border rounded-lg bg-gray-50">{stores.map(store => (<div key={store.id} className="flex justify-between items-center p-3 border-b border-gray-200 last:border-0 hover:bg-gray-50 group transition-colors"><span className="font-medium text-gray-700">{store.name}</span><div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity"><button onClick={() => openEditModal(store)} className="text-blue-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors" title="수정"><Edit2 size={16} /></button>{stores.length > 1 && (<button onClick={() => openDeleteModal(store)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors" title="삭제"><Trash2 size={16} /></button>)}</div></div>))}</div><form onSubmit={handleAddStore} className="flex gap-2"><input type="text" placeholder="새 지점명 입력 (예: 부산점)" className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} /><button type="submit" disabled={!newStoreName.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"><Plus size={18} /> 추가</button></form></div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col"><h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><Users className="text-green-600" size={20} /> 직원 계정 관리</h3><div className="flex-1 overflow-y-auto min-h-[150px] mb-4 border rounded-lg bg-gray-50">{users.filter(u => u.role === 'STAFF').length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-gray-400 py-6"><Users size={24} className="opacity-20 mb-1"/><p className="text-xs">등록된 직원이 없습니다.</p></div>) : (users.filter(u => u.role === 'STAFF').map(user => (<div key={user.id} className="flex justify-between items-center p-3 border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors group"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">{user.name[0]}</div><div><div className="text-sm font-bold text-gray-800">{user.name}</div><div className="text-xs text-gray-500">ID: {user.id}</div></div></div><button onClick={() => onRemoveUser(user.id)} className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors" title="삭제"><Trash2 size={16} /></button></div>)))}</div><form onSubmit={handleAddStaff} className="grid grid-cols-2 gap-2 mb-6"><input type="text" placeholder="이름 (예: 홍길동)" className="p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500" value={newStaffForm.name} onChange={(e) => setNewStaffForm({...newStaffForm, name: e.target.value})} /><div className="flex gap-2"><input type="text" placeholder="ID (예: staff3)" className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500" value={newStaffForm.id} onChange={(e) => setNewStaffForm({...newStaffForm, id: e.target.value})} /><button type="submit" disabled={!newStaffForm.name || !newStaffForm.id} className="bg-green-600 text-white px-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"><Plus size={18} /></button></div></form><div className="border-t border-gray-100 pt-4 mt-auto"><h4 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-1"><Lock size={14}/> 공통 접근 권한 설정</h4><div className="space-y-2"><PermissionToggle label="재고 관리" checked={staffPermissions.viewInventory} onChange={(checked) => onUpdatePermissions({...staffPermissions, viewInventory: checked})} /><PermissionToggle label="매출 상세 내역" checked={staffPermissions.viewSalesHistory} onChange={(checked) => onUpdatePermissions({...staffPermissions, viewSalesHistory: checked})} /><PermissionToggle label="세금계산서 발행" checked={staffPermissions.viewTaxInvoice} onChange={(checked) => onUpdatePermissions({...staffPermissions, viewTaxInvoice: checked})} /></div></div></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="p-6 bg-slate-50 border-b border-gray-200 flex items-center gap-3"><div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100"><ShieldCheck className="text-slate-800" size={24} /></div><div><h3 className="font-bold text-lg text-slate-800">관리자 보안 설정</h3><p className="text-xs text-slate-500">최고 관리자 비밀번호를 주기적으로 변경하여 보안을 강화하세요.</p></div></div><div className="p-6 lg:p-8"><form onSubmit={handlePasswordChange} className="max-w-2xl mx-auto"><div className="space-y-6"><div><label className="block text-sm font-bold text-gray-700 mb-2">현재 비밀번호</label><div className="relative"><Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" value={pwdForm.current} onChange={e => setPwdForm({...pwdForm, current: e.target.value})} className="w-full pl-10 p-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none transition-all" placeholder="현재 사용 중인 비밀번호를 입력하세요" /></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호</label><div className="relative"><KeyRound size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" /><input type="password" value={pwdForm.new} onChange={e => setPwdForm({...pwdForm, new: e.target.value})} className="w-full pl-10 p-3 bg-blue-50/30 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" placeholder="변경할 비밀번호" /></div></div><div><label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호 확인</label><div className="relative"><KeyRound size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" /><input type="password" value={pwdForm.confirm} onChange={e => setPwdForm({...pwdForm, confirm: e.target.value})} className="w-full pl-10 p-3 bg-blue-50/30 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" placeholder="비밀번호 재입력" /></div></div></div><div className={`flex items-center justify-between p-4 rounded-xl transition-all ${pwdMessage.text ? (pwdMessage.isError ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100') : 'bg-gray-50 border border-gray-100'}`}><div className="flex items-center gap-2 text-sm font-medium">{pwdMessage.text ? (<>{pwdMessage.isError ? <AlertCircle className="text-red-500" size={18}/> : <Check className="text-green-500" size={18}/>}<span className={pwdMessage.isError ? 'text-red-600' : 'text-green-700'}>{pwdMessage.text}</span></>) : (<span className="text-gray-400 flex items-center gap-2"><AlertCircle size={16}/> 안전한 비밀번호 사용을 권장합니다.</span>)}</div><button type="submit" className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-200"><Save size={18} /> 변경 내용 저장</button></div></div></form></div></div>
        {editingStore && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"><div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-gray-900">매장명 수정</h3><button onClick={() => setEditingStore(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div><input autoFocus type="text" value={editStoreNameInput} onChange={(e) => setEditStoreNameInput(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-blue-500" /><div className="flex gap-2"><button onClick={() => setEditingStore(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50">취소</button><button onClick={saveEditStore} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">저장</button></div></div></div>)}
        {deletingStore && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"><div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in border-t-4 border-red-500"><div className="flex justify-between items-start mb-4"><div><h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><AlertTriangle className="text-red-500" size={20}/> 매장 삭제 확인</h3><p className="text-sm text-gray-500 mt-1"><strong>{deletingStore.name}</strong>을(를) 삭제하시겠습니까?<br/>해당 매장의 재고 정보가 모두 삭제될 수 있습니다.</p></div><button onClick={() => setDeletingStore(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div><form onSubmit={confirmDeleteStore}><div className="mb-4"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">관리자 비밀번호 입력</label><div className="relative"><Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input autoFocus type="password" value={deletePasswordInput} onChange={(e) => { setDeletePasswordInput(e.target.value); setDeleteError(''); }} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" placeholder="비밀번호 입력" /></div>{deleteError && <p className="text-xs text-red-500 mt-2">{deleteError}</p>}</div><div className="flex gap-2"><button type="button" onClick={() => setDeletingStore(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50">취소</button><button type="submit" className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200">삭제 확인</button></div></form></div></div>)}
    </div>
  );
};

const PermissionToggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (<div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100"><div className="font-medium text-gray-700 text-sm">{label}</div><button onClick={() => onChange(!checked)} className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative ${checked ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>);

export default Settings;
EOF

# components/CustomerList.tsx
cat <<'EOF' > src/components/CustomerList.tsx
import React, { useState } from 'react';
import { Customer, Sale } from '../types';
import { Search, Users, Car, Phone, Calendar, ChevronRight, X, ShoppingBag } from 'lucide-react';

interface CustomerListProps {
  customers: Customer[];
  sales: Sale[];
}

const CustomerList: React.FC<CustomerListProps> = ({ customers, sales }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phoneNumber.includes(searchTerm) ||
    c.carModel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customerSales = selectedCustomer 
    ? sales.filter(s => s.customer?.phoneNumber === selectedCustomer.phoneNumber)
    : [];

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col pb-6">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4"><div><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-blue-600" /> 고객 관리</h2><p className="text-sm text-gray-500 mt-1">등록된 고객 정보를 조회하고 관리합니다.</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="이름, 전화번호, 차종 검색" className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
         <div className="hidden md:block overflow-x-auto flex-1"><table className="w-full text-sm text-left"><thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 sticky top-0"><tr><th className="px-6 py-4">고객명</th><th className="px-6 py-4">연락처</th><th className="px-6 py-4">차종</th><th className="px-6 py-4 text-center">방문 횟수</th><th className="px-6 py-4 text-right">총 이용 금액</th><th className="px-6 py-4">최근 방문일</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredCustomers.length === 0 ? (<tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400"><div className="flex flex-col items-center justify-center gap-2"><Users size={32} className="opacity-20" /><p>등록된 고객 정보가 없습니다.</p></div></td></tr>) : (filteredCustomers.map(customer => (<tr key={customer.id} onClick={() => setSelectedCustomer(customer)} className="hover:bg-blue-50 transition-colors cursor-pointer active:bg-blue-100"><td className="px-6 py-4 font-medium text-gray-900">{customer.name}</td><td className="px-6 py-4 text-gray-600"><div className="flex items-center gap-2"><Phone size={14} className="text-gray-400" />{customer.phoneNumber}</div></td><td className="px-6 py-4 text-gray-600"><div className="flex items-center gap-2"><Car size={14} className="text-gray-400" />{customer.carModel || '-'}</div></td><td className="px-6 py-4 text-center"><span className="bg-blue-50 text-blue-600 py-1 px-2 rounded-full text-xs font-bold">{customer.visitCount}회</span></td><td className="px-6 py-4 text-right font-bold text-slate-700">₩{customer.totalSpent.toLocaleString()}</td><td className="px-6 py-4 text-gray-500 text-xs">{new Date(customer.lastVisitDate).toLocaleDateString()}</td></tr>)))}</tbody></table></div>
         <div className="md:hidden p-4 bg-gray-50 flex-1 overflow-y-auto">{filteredCustomers.length === 0 ? (<div className="flex flex-col items-center justify-center py-12 text-gray-400"><Users size={32} className="opacity-20 mb-2" /><p>등록된 고객 정보가 없습니다.</p></div>) : (filteredCustomers.map(customer => (<div key={customer.id} onClick={() => setSelectedCustomer(customer)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 active:scale-[0.98] transition-transform"><div className="flex justify-between items-start mb-2"><div><h3 className="font-bold text-gray-900 text-lg">{customer.name}</h3><div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5"><Phone size={12} /> {customer.phoneNumber}</div></div><div className="text-right"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold">{customer.visitCount}회 방문</span></div></div><div className="flex justify-between items-center border-t border-gray-50 pt-2 mt-2"><div className="flex items-center gap-2 text-sm text-gray-600"><Car size={14} /> {customer.carModel || '-'}</div><div className="text-right"><div className="text-xs text-gray-400">총 이용 금액</div><div className="font-bold text-slate-700">₩{customer.totalSpent.toLocaleString()}</div></div></div></div>)))}</div>
      </div>
      {selectedCustomer && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in"><div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"><div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"><div><h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><ShoppingBag size={20} className="text-blue-600"/> 고객 판매 내역</h3><p className="text-xs text-gray-500 mt-1">{selectedCustomer.name} | {selectedCustomer.phoneNumber}</p></div><button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div><div className="flex-1 overflow-y-auto p-0 bg-gray-50">{customerSales.length === 0 ? (<div className="flex flex-col items-center justify-center py-12 text-gray-400"><ShoppingBag size={40} className="mb-2 opacity-20"/><p>구매 이력이 없습니다.</p></div>) : (<div className="space-y-2 p-4">{customerSales.map(sale => (<div key={sale.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100"><div><span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{new Date(sale.date).toLocaleDateString()}</span><div className="text-xs text-gray-400 mt-1">주문번호: {sale.id}</div></div><div className="text-right"><div className="font-bold text-gray-900">₩{sale.totalAmount.toLocaleString()}</div><div className="text-xs text-gray-500">{sale.paymentMethod}</div></div></div><div className="space-y-2">{sale.items.map((item, idx) => (<div key={`${sale.id}-item-${idx}`} className="flex justify-between text-sm"><div className="text-gray-700"><span className="font-medium">{item.productName}</span><span className="text-gray-400 text-xs ml-1">x {item.quantity}</span></div><div className="text-gray-600">₩{(item.priceAtSale * item.quantity).toLocaleString()}</div></div>))}</div></div>))}</div>)}</div><div className="p-4 border-t border-gray-100 bg-white shrink-0"><button onClick={() => setSelectedCustomer(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">닫기</button></div></div></div>)}
    </div>
  );
};

export default CustomerList;
EOF

# components/StockIn.tsx
cat <<'EOF' > src/components/StockIn.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { StockInRecord, Store, Product, User } from '../types';
import { Truck, Calendar, Save, AlertCircle, FileUp, Split, Filter, Tag, MapPin, Store as StoreIcon, Eye, X, Search } from 'lucide-react';

interface StockInProps {
    stores: Store[];
    categories: string[];
    tireBrands: string[];
    products: Product[];
    onStockIn: (record: StockInRecord, sellingPrice?: number) => void;
    currentUser: User;
    stockInHistory: StockInRecord[];
    currentStoreId: string;
    onUpdateStockInRecord: (record: StockInRecord) => void;
    tireModels: Record<string, string[]>;
}

const StockIn: React.FC<StockInProps> = ({ stores, categories, tireBrands, products, onStockIn, currentUser, stockInHistory, currentStoreId, onUpdateStockInRecord, tireModels }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        storeId: (currentStoreId && currentStoreId !== 'ALL') ? currentStoreId : (stores[0]?.id || ''),
        supplier: '',
        category: '타이어',
        brand: tireBrands[0] || '기타',
        productName: '',
        specification: '',
        quantity: 0,
        factoryPrice: 0
    });
    const [isNewProduct, setIsNewProduct] = useState(false);
    const [inputs, setInputs] = useState({ quantity: '', factoryPrice: '' });
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
    const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('ALL');
    const [verificationImage, setVerificationImage] = useState<string | null>(null);
    const [isComparing, setIsComparing] = useState(false);

    useEffect(() => {
        if (currentUser.role === 'STAFF' && currentStoreId) {
            setFormData(prev => ({ ...prev, storeId: currentStoreId }));
        } else if (currentUser.role === 'ADMIN') {
            setFormData(prev => {
                if ((prev.storeId === 'ALL' || !prev.storeId) && stores.length > 0) {
                    return { ...prev, storeId: stores[0].id };
                }
                return prev;
            });
        }
    }, [currentStoreId, currentUser, stores]);

    useEffect(() => {
        if (!formData.productName) { setIsNewProduct(false); return; }
        const normalize = (str: string | undefined) => (str || '').trim().toLowerCase();
        const existing = products.find(p => {
            const nameMatch = normalize(p.name) === normalize(formData.productName);
            if (p.category === '타이어') {
                const specMatch = normalize(p.specification) === normalize(formData.specification);
                return nameMatch && specMatch;
            }
            return nameMatch;
        });
        setIsNewProduct(!existing);
    }, [formData.productName, formData.specification, products]);

    const formatNumber = (num: number | string) => { if (!num) return ''; const n = Number(num); return isNaN(n) ? '' : n.toLocaleString(); };
    const handleNumberChange = (field: keyof typeof inputs, value: string) => { const rawValue = value.replace(/[^0-9]/g, ''); const numValue = Number(rawValue); setInputs(prev => ({ ...prev, [field]: rawValue === '' ? '' : formatNumber(rawValue) })); setFormData(prev => ({ ...prev, [field]: numValue })); };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = formData.productName.trim();
        const trimmedSpec = formData.specification.trim();
        if (!trimmedName || formData.quantity <= 0) { alert('상품명과 수량을 올바르게 입력해주세요.'); return; }
        const finalStoreId = formData.storeId === 'ALL' || !formData.storeId ? stores[0]?.id : formData.storeId;
        const record: StockInRecord = { id: `IN-${Date.now()}`, date: formData.date, storeId: finalStoreId, supplier: formData.supplier.trim(), category: formData.category, brand: formData.brand, productName: trimmedName, specification: trimmedSpec, quantity: formData.quantity, factoryPrice: formData.factoryPrice, purchasePrice: 0 };
        onStockIn(record, 0);
        setFormData(prev => ({ ...prev, productName: '', specification: '', quantity: 0, factoryPrice: 0 }));
        setInputs({ quantity: '', factoryPrice: '' });
        alert('입고 처리가 완료되었습니다.');
    };
    const handleUpdatePurchasePrice = (record: StockInRecord, val: string) => { const rawValue = val.replace(/[^0-9]/g, ''); const numValue = Number(rawValue); onUpdateStockInRecord({ ...record, purchasePrice: numValue }); };
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; const imageUrl = URL.createObjectURL(file); setVerificationImage(imageUrl); setIsComparing(true); } };

    const uniqueSuppliers = useMemo(() => Array.from(new Set(stockInHistory.map(r => r.supplier).filter(s => s && s.trim() !== ''))), [stockInHistory]);
    const sortedProductNames = useMemo(() => { return tireModels[formData.brand] || []; }, [tireModels, formData.brand]);
    const uniqueSpecs = useMemo(() => Array.from(new Set(products.map(p => p.specification).filter(Boolean) as string[])), [products]);
    const filteredHistory = useMemo(() => { return stockInHistory.filter(record => { const matchesMonth = record.date.startsWith(selectedMonth); const matchesSupplier = selectedSupplier === 'ALL' || record.supplier === selectedSupplier; const matchesStore = selectedStoreFilter === 'ALL' || record.storeId === selectedStoreFilter; return matchesMonth && matchesSupplier && matchesStore; }); }, [stockInHistory, selectedMonth, selectedSupplier, selectedStoreFilter]);
    const monthlyTotals = useMemo(() => { return filteredHistory.reduce((acc, curr) => ({ qty: acc.qty + curr.quantity, cost: acc.cost + (curr.purchasePrice || 0) * curr.quantity }), { qty: 0, cost: 0 }); }, [filteredHistory]);
    const getDiscountBadge = (factoryPrice: number, purchasePrice: number) => { if (!factoryPrice || !purchasePrice) return null; const discount = ((factoryPrice - purchasePrice) / factoryPrice) * 100; if (discount <= 0) return null; return (<div className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100 text-center whitespace-nowrap">{discount.toFixed(1)}%</div>); };

    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-full gap-4 lg:overflow-hidden">
            <div className="w-full lg:w-[340px] flex flex-col gap-4 flex-shrink-0 min-h-0 lg:overflow-y-auto pb-10 border-b lg:border-b-0 lg:border-r border-gray-200 pr-0 lg:pr-2"><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100"><Truck className="text-blue-600" size={20} /><h2 className="text-lg font-bold text-gray-800">입고 등록</h2></div><form onSubmit={handleSubmit} className="space-y-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">입고 정보</label><div className="flex flex-col gap-2 mb-2"><input type="date" required className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />{currentUser.role === 'ADMIN' ? (<select className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.storeId} onChange={e => setFormData({...formData, storeId: e.target.value})}>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>) : (<div className="w-full p-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 font-bold flex items-center">{stores.find(s => s.id === currentStoreId)?.name || '지점 미선택'}</div>)}</div><input type="text" list="supplier-list" placeholder="거래처명 (예: 넥센물류)" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} /><datalist id="supplier-list">{uniqueSuppliers.map(s => <option key={s} value={s} />)}</datalist></div><div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3"><label className="block text-xs font-bold text-gray-500 uppercase">상품 정보</label><select className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select><div className="w-full"><label className="block text-xs font-medium text-gray-500 mb-1">규격 (Size)</label><input type="text" list="product-specs" placeholder="예: 245/45R18 (2454518 입력가능)" className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold text-blue-800" value={formData.specification} onChange={e => { let val = e.target.value; if (/^\d{7}$/.test(val)) { const found = uniqueSpecs.find(s => s.replace(/\D/g, '') === val); if (found) val = found; else val = `${val.slice(0, 3)}/${val.slice(3, 5)}R${val.slice(5, 7)}`; } setFormData({...formData, specification: val}); }} /><datalist id="product-specs">{uniqueSpecs.map(spec => <option key={spec} value={spec} />)}</datalist></div><div className="w-full"><label className="block text-xs font-medium text-gray-500 mb-1">브랜드</label><select className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})}>{tireBrands.map(b => <option key={b} value={b}>{b}</option>)}<option value="기타">기타</option></select></div><div className="w-full"><label className="block text-xs font-medium text-gray-500 mb-1">모델명</label><input type="text" required list="product-names" placeholder="모델명 검색/입력" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} /><datalist id="product-names">{sortedProductNames.map(name => <option key={name} value={name} />)}</datalist></div></div><div className="space-y-3"><div className="flex flex-col gap-2"><div className="w-full"><label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Tag size={12}/> 공장도가 (정가)</label><input type="text" inputMode="numeric" placeholder="0" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={inputs.factoryPrice} onChange={e => handleNumberChange('factoryPrice', e.target.value)} /></div><div className="w-full"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">수량</label><input type="text" inputMode="numeric" required placeholder="0" className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold" value={inputs.quantity} onChange={e => handleNumberChange('quantity', e.target.value)} /></div></div>{isNewProduct && (<div className="animate-fade-in mt-2 bg-blue-50 p-2 rounded text-xs text-blue-700 flex gap-1"><AlertCircle size={14} /> 신규 상품으로 자동 등록됩니다. (판매가는 재고관리에서 설정해주세요)</div>)}</div><button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-md mt-2"><Save size={18} /> 입고 처리</button></form></div></div>
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-auto lg:h-full min-h-[500px] relative">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 shrink-0 z-20 relative"><div className="flex items-center gap-3 w-full md:w-auto flex-wrap"><h3 className="font-bold text-gray-800 whitespace-nowrap mr-2">입고 내역 조회</h3><div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"><Calendar size={16} className="text-gray-500" /><input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="text-sm font-bold text-gray-700 outline-none bg-transparent cursor-pointer" /></div>{currentUser.role === 'ADMIN' && (<div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"><StoreIcon size={16} className="text-gray-500" /><select value={selectedStoreFilter} onChange={(e) => setSelectedStoreFilter(e.target.value)} className="text-sm font-bold text-gray-700 outline-none bg-transparent cursor-pointer appearance-none pr-4"><option value="ALL">전체 지점</option>{stores.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></div>)}<div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"><Filter size={16} className="text-gray-500" /><select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className="text-sm font-bold text-gray-700 outline-none bg-transparent cursor-pointer appearance-none pr-4"><option value="ALL">전체 거래처</option>{uniqueSuppliers.map(s => (<option key={s} value={s}>{s}</option>))}</select></div></div><div className="flex items-center gap-3 w-full md:w-auto justify-end"><input type="file" id="verification-upload" accept="image/*" className="hidden" onChange={handleImageUpload} />{verificationImage && (<div className="flex items-center gap-2"><button onClick={() => setIsComparing(!isComparing)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isComparing ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50'}`}>{isComparing ? <Split size={14} /> : <Eye size={14} />}{isComparing ? '비교 모드 끄기' : '비교 모드 켜기'}</button><button onClick={() => { setVerificationImage(null); setIsComparing(false); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50"><X size={16} /></button></div>)}</div></div>
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative">
                    <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 min-h-[300px] ${isComparing ? 'lg:border-r lg:border-gray-200' : ''}`}><div className="flex-1 overflow-auto bg-white relative"><table className="min-w-full text-sm text-left border-collapse relative"><thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm"><tr><th className="px-4 py-3 whitespace-nowrap bg-gray-50">날짜</th><th className="px-4 py-3 whitespace-nowrap bg-gray-50">거래처</th><th className="px-4 py-3 whitespace-nowrap bg-gray-50">상품</th><th className="px-4 py-3 text-center whitespace-nowrap bg-gray-50">입고수량</th>{currentUser.role === 'ADMIN' && (<><th className="px-4 py-3 whitespace-nowrap bg-gray-50 text-right">공장도가</th><th className="px-4 py-3 whitespace-nowrap bg-gray-50 text-center">매입가(입력)</th><th className="px-4 py-3 whitespace-nowrap bg-gray-50 text-right">총 매입가</th></>)}</tr></thead><tbody className="divide-y divide-gray-100">{filteredHistory.length === 0 ? (<tr><td colSpan={currentUser.role === 'ADMIN' ? 7 : 4} className="px-6 py-12 text-center text-gray-400"><Search size={32} className="mx-auto mb-2 opacity-20" />{selectedMonth} 내역이 없습니다.</td></tr>) : (filteredHistory.map(record => (<tr key={record.id} className="hover:bg-blue-50 transition-colors group"><td className="px-4 py-3 text-gray-600 whitespace-nowrap align-middle">{record.date.slice(5)}</td><td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap align-middle max-w-[120px] truncate">{record.supplier}</td><td className="px-4 py-3 align-middle whitespace-nowrap"><div className="text-gray-900 font-medium truncate max-w-[160px]" title={record.productName}>{record.productName}</div><div className="text-xs text-gray-500">{record.specification}</div></td><td className="px-4 py-3 text-center font-bold text-blue-600 align-middle whitespace-nowrap">+{record.quantity}</td>{currentUser.role === 'ADMIN' && (<><td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap align-middle">₩{record.factoryPrice?.toLocaleString() || '0'}</td><td className="px-4 py-3 align-middle whitespace-nowrap"><div className="flex items-center justify-center gap-2"><input type="text" inputMode="numeric" className="w-20 p-1 text-xs border border-gray-300 rounded text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold bg-gray-50 focus:bg-white" value={record.purchasePrice ? record.purchasePrice.toLocaleString() : ''} placeholder="0" onChange={(e) => handleUpdatePurchasePrice(record, e.target.value)} />{getDiscountBadge(record.factoryPrice || 0, record.purchasePrice || 0)}</div></td><td className="px-4 py-3 text-right font-bold text-gray-800 whitespace-nowrap align-middle">₩{((record.purchasePrice || 0) * record.quantity).toLocaleString()}</td></>)}</tr>)))}</tbody></table></div><div className="p-4 bg-slate-50 border-t border-gray-200 flex justify-between items-center shrink-0 z-20"><span className="text-xs font-bold text-gray-500 uppercase">{selectedMonth} 합계</span><div className="text-right"><div className="text-sm text-gray-700">총 입고 수량: <span className="font-bold text-blue-600">{monthlyTotals.qty}개</span></div>{currentUser.role === 'ADMIN' && (<div className="text-sm text-rose-600">총 매입: <span className="font-bold">₩{monthlyTotals.cost.toLocaleString()}</span></div>)}</div></div></div>
                    {isComparing && verificationImage && (<div className="flex-1 bg-gray-100 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-200 animate-slide-in-right min-h-[300px]"><div className="p-2 bg-white border-b border-gray-200 flex justify-between items-center shrink-0"><span className="text-xs font-bold text-gray-500 flex items-center gap-1"><FileUp size={12} /> 업로드된 마감자료</span></div><div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-slate-200/50 min-h-0"><img src={verificationImage} alt="Verification Document" className="max-w-full shadow-lg rounded border border-gray-300" /></div></div>)}
                </div>
                {!verificationImage && (<label htmlFor="verification-upload" className="absolute bottom-24 right-6 h-14 w-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-transform hover:scale-105 z-30 cursor-pointer" title="마감자료 업로드"><FileUp size={24} /></label>)}
            </div>
        </div>
    );
};

export default StockIn;
EOF

# components/Financials.tsx
cat <<'EOF' > src/components/Financials.tsx
import React, { useState, useMemo, useRef } from 'react';
import { Sale, StockInRecord, ExpenseRecord, FixedCostConfig, SalesFilter, User } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, ComposedChart, Area, Bar } from 'recharts';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Printer, Image as ImageIcon, Settings as SettingsIcon, Save, X, UploadCloud, Loader2, FileText, CheckCircle2, Filter, ArrowUpDown, ChevronDown } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface FinancialsProps {
  sales: Sale[];
  stockInHistory: StockInRecord[];
  expenses: ExpenseRecord[];
  onAddExpense: (expense: ExpenseRecord) => void;
  onUpdateExpense: (expense: ExpenseRecord) => void;
  onRemoveExpense: (id: string) => void;
  fixedCosts: FixedCostConfig[];
  onUpdateFixedCosts: (costs: FixedCostConfig[]) => void;
  onNavigateToHistory: (filter: SalesFilter) => void;
  currentUser: User;
}

const EXPENSE_CATEGORIES = ['식비', '교통/유류비', '공과금', '폐타이어처리비', '인건비', '회식비', '소모품비', '임대료', '기타'];

const Financials: React.FC<FinancialsProps> = ({ sales, stockInHistory, expenses, onAddExpense, onUpdateExpense, onRemoveExpense, fixedCosts, onUpdateFixedCosts, onNavigateToHistory, currentUser }) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [showFixedCostModal, setShowFixedCostModal] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);
    const isAdmin = currentUser.role === 'ADMIN';
    const [tableCategoryFilter, setTableCategoryFilter] = useState<string>('ALL');
    const [tableSortOrder, setTableSortOrder] = useState<'desc' | 'asc'>('desc');
    const [editCell, setEditCell] = useState<{id: string, field: keyof ExpenseRecord} | null>(null);
    const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().slice(0, 10), category: EXPENSE_CATEGORIES[0], description: '', amount: '', receiptImage: null as string | null });
    const [isDragging, setIsDragging] = useState(false);
    const [processingQueue, setProcessingQueue] = useState<{id: string, fileName: string, status: 'pending' | 'success' | 'error'}[]>([]);

    const calculateMonthlyExpenses = (monthStr: string) => { const purchases = isAdmin ? stockInHistory.filter(r => r.date.startsWith(monthStr)).reduce((sum, r) => sum + ((r.purchasePrice || 0) * r.quantity), 0) : 0; const variable = expenses.filter(e => e.date.startsWith(monthStr) && !e.isFixed).reduce((sum, e) => sum + e.amount, 0); const fixed = isAdmin ? fixedCosts.reduce((sum, fc) => sum + fc.amount, 0) : 0; return purchases + variable + fixed; };
    const monthlyRevenue = useMemo(() => { return sales.filter(s => s.date.startsWith(selectedMonth)).reduce((sum, s) => sum + s.totalAmount, 0); }, [sales, selectedMonth]);
    const totalExpenses = useMemo(() => calculateMonthlyExpenses(selectedMonth), [selectedMonth, stockInHistory, expenses, fixedCosts, isAdmin]);
    const prevMonthStr = useMemo(() => { const d = new Date(selectedMonth + '-01'); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); }, [selectedMonth]);
    const prevTotalExpenses = useMemo(() => calculateMonthlyExpenses(prevMonthStr), [prevMonthStr, stockInHistory, expenses, fixedCosts, isAdmin]);
    const expenseChangeRate = prevTotalExpenses > 0 ? Math.round(((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100) : 0;
    const netProfit = monthlyRevenue - totalExpenses;
    const pieChartData = useMemo(() => { const data: Record<string, number> = {}; const purchases = isAdmin ? stockInHistory.filter(r => r.date.startsWith(selectedMonth)).reduce((sum, r) => sum + ((r.purchasePrice || 0) * r.quantity), 0) : 0; if (purchases > 0) data['매입원가'] = purchases; expenses.filter(e => e.date.startsWith(selectedMonth) && !e.isFixed).forEach(e => { data[e.category] = (data[e.category] || 0) + e.amount; }); if (isAdmin) { fixedCosts.forEach(fc => { const cat = fc.category || '고정지출'; data[cat] = (data[cat] || 0) + fc.amount; }); } return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value); }, [selectedMonth, stockInHistory, expenses, fixedCosts, isAdmin]);
    const expenseTrendData = useMemo(() => { const data = []; const current = new Date(selectedMonth + '-01'); for (let i = 5; i >= 0; i--) { const d = new Date(current.getFullYear(), current.getMonth() - i, 1); const mStr = d.toISOString().slice(0, 7); data.push({ name: `${d.getMonth() + 1}월`, value: calculateMonthlyExpenses(mStr) }); } return data; }, [selectedMonth, stockInHistory, expenses, fixedCosts, isAdmin]);
    const financialFlowData = useMemo(() => { const data = []; const today = new Date(); for (let i = 11; i >= 0; i--) { const d = new Date(today.getFullYear(), today.getMonth() - i, 1); const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; const revenue = sales.filter(s => s.date.startsWith(monthStr)).reduce((sum, s) => sum + s.totalAmount, 0); const expense = calculateMonthlyExpenses(monthStr); const profit = revenue - expense; data.push({ name: `${d.getMonth() + 1}월`, revenue, expense, profit, monthStr }); } return data; }, [sales, stockInHistory, expenses, fixedCosts, isAdmin]);
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
    const visibleVariableExpenses = useMemo(() => { let filtered = expenses.filter(e => e.date.startsWith(selectedMonth) && !e.isFixed); if (tableCategoryFilter !== 'ALL') { filtered = filtered.filter(e => e.category === tableCategoryFilter); } return filtered.sort((a, b) => { if (tableSortOrder === 'desc') return b.amount - a.amount; return a.amount - b.amount; }); }, [expenses, selectedMonth, tableCategoryFilter, tableSortOrder]);
    const visibleFixedCostsList = useMemo(() => { if (!isAdmin) return []; let filtered = fixedCosts; if (tableCategoryFilter !== 'ALL') { filtered = filtered.filter(fc => fc.category === tableCategoryFilter); } return filtered; }, [fixedCosts, isAdmin, tableCategoryFilter]);

    const fillFormWithReceipt = async (file: File) => { const processId = Date.now().toString(); setProcessingQueue(prev => [...prev, { id: processId, fileName: file.name, status: 'pending' }]); try { const reader = new FileReader(); const base64Promise = new Promise<string>((resolve) => { reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]); reader.readAsDataURL(file); }); const base64Data = await base64Promise; const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [ { inlineData: { mimeType: file.type, data: base64Data } }, { text: `Analyze this receipt. Extract date (YYYY-MM-DD), amount (number, no symbols), store name (as description), and category from [${EXPENSE_CATEGORIES.join(', ')}]. Return valid JSON.` } ], config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { date: { type: Type.STRING }, amount: { type: Type.NUMBER }, description: { type: Type.STRING }, category: { type: Type.STRING } } } } }); const resultText = response.text; if (resultText) { const parsed = JSON.parse(resultText); setExpenseForm(prev => ({ ...prev, date: parsed.date || prev.date, amount: parsed.amount ? String(parsed.amount) : prev.amount, description: parsed.description || prev.description, category: parsed.category || prev.category, })); setProcessingQueue(prev => prev.map(p => p.id === processId ? { ...p, status: 'success' } : p)); } } catch (error) { console.error(error); setProcessingQueue(prev => prev.map(p => p.id === processId ? { ...p, status: 'error' } : p)); } setTimeout(() => setProcessingQueue(prev => prev.filter(p => p.id !== processId)), 3000); };

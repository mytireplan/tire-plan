import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { LayoutDashboard, ShoppingCart, Package, FileText, Menu, X, Store as StoreIcon, LogOut, UserCircle, List, Lock, Settings as SettingsIcon, Users, Truck, PieChart, Calendar, PhoneCall, ShieldCheck } from 'lucide-react';
import { orderBy, where, limit, collection, query, getDocs, doc, deleteDoc, writeBatch, type QueryConstraint } from 'firebase/firestore';
import { db, auth } from './firebase';
// 1. 진짜 물건(값)인 PaymentMethod는 그냥 가져옵니다. (type 없음!)
import { PaymentMethod } from './types';

// 2. 설계도(Type)인 친구들은 type을 붙여서 가져옵니다.
import type { Customer, Sale, Product, StockInRecord, User, UserRole, StoreAccount, Staff, ExpenseRecord, FixedCostConfig, LeaveRequest, Reservation, StaffPermissions, StockTransferRecord, SalesFilter, Shift } from './types';

// Firebase imports
import { saveBulkToFirestore, getCollectionPage, getAllFromFirestore, saveToFirestore, deleteFromFirestore, getFromFirestore, COLLECTIONS, migrateLocalStorageToFirestore, subscribeToQuery, subscribeToCollection } from './utils/firestore'; 
// (뒤에 더 있는 것들도 여기에 다 넣어주세요)
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import TaxInvoice from './components/TaxInvoice';
import SalesHistory from './components/SalesHistory';
import Settings from './components/Settings';
import CustomerList from './components/CustomerList';
import StockIn from './components/StockIn';
import Financials from './components/Financials';
import ScheduleAndLeave from './components/ScheduleAndLeave';
import ReservationSystem from './components/ReservationSystem';
import LoginScreen from './components/LoginScreen';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import AdminDashboard from './components/AdminDashboard';
import StoreSelectionScreen from './components/StoreSelectionScreen';

// Owner account persisted in Firestore
type OwnerAccount = { id: string; name: string; role: UserRole; storeId?: string; password: string; ownerPin?: string; phoneNumber?: string; joinDate: string };

// Mock Password Hash Utility (Simple Simulation)
const mockHash = (pwd: string) => btoa(pwd); // Base64 encoding for demo purposes
const DEFAULT_MANAGER_PIN = '4567';
const DEFAULT_OWNER_ID = '250001';

// Auth Database (Mock) - Owners and Master ONLY
const MOCK_AUTH_USERS: { id: string; password: string; ownerPin?: string; name: string; role: UserRole; storeId?: string; phoneNumber?: string; joinDate: string }[] = [
    { id: '250001', password: '1234', ownerPin: '1234', name: '김대표', role: 'STORE_ADMIN', phoneNumber: '010-1234-5678', joinDate: '2025.05.01' },
    { id: '250002', password: '1234', ownerPin: '1234', name: '박사장', role: 'STORE_ADMIN', phoneNumber: '010-9876-5432', joinDate: '2025.05.02' },
    { id: '999999', password: '1234', ownerPin: '1234', name: 'Master', role: 'SUPER_ADMIN', joinDate: '2025.01.01' },
];

// Normalized owner list used for initial seeds and to backfill missing docs
const DEFAULT_OWNER_ACCOUNTS: OwnerAccount[] = MOCK_AUTH_USERS.map((u) => ({
    ...u,
    joinDate: u.joinDate || '2025.01.01',
    ownerPin: u.ownerPin || u.password,
}));

// Initial Stores linked to Owner IDs (Updated IDs to 25xxxx format)
const INITIAL_STORE_ACCOUNTS: StoreAccount[] = [
    { id: 'ST-1', code: '250001', name: '서울 강남 본점', region: '01', regionName: '서울', passwordHash: mockHash('4567'), isActive: true, ownerId: '250001' },
    { id: 'ST-2', code: '250001', name: '경기 수원점', region: '02', regionName: '경기', passwordHash: mockHash('4567'), isActive: true, ownerId: '250001' },
    { id: 'ST-3', code: '250001', name: '인천 송도점', region: '03', regionName: '인천', passwordHash: mockHash('4567'), isActive: true, ownerId: '250001' },
];

// Staff Database (Entities, NOT Login Users)
const INITIAL_STAFF: Staff[] = [
    { id: 'staff_1', name: '이정비', isActive: true, ownerId: DEFAULT_OWNER_ID },
    { id: 'staff_2', name: '박매니저', isActive: true, ownerId: DEFAULT_OWNER_ID },
    { id: 'staff_3', name: '최신입', isActive: true, ownerId: DEFAULT_OWNER_ID },
];

const SALES_PAGE_SIZE = 200; // Firestore 읽기 제한을 위한 기본 페이지 크기

const INITIAL_TIRE_BRANDS = [
    '한국',
    '금호',
    '넥센',
    '미쉐린',
    '콘티넨탈',
    '피렐리',
    '굿이어',
    '브리지스톤',
    '라우펜',
    '기타'
];
const TIRE_MODELS: Record<string, string[]> = {
  '한국': [
    '벤투스 S1 에보3 (K127)', '벤투스 S2 AS (H462)', '키너지 EX (H308)', '키너지 GT (H436)', '다이나프로 HL3 (RA45)',
    '다이나프로 HP2 (RA33)', '윈터 아이셉트 에보3 (W330)', '반트라 LT (RA18)', '스마트 플러스 (H449)', '옵티모 H426',
    '벤투스 V2 컨셉2 (H457)', '벤투스 RS4 (Z232)', '벤투스 프라임3 (K125)', '키너지 4S2 (H750)', '다이나프로 AT2 (RF11)',
    '다이나프로 MT2 (RT05)', '윈터 아이셉트 iZ2 (W626)', '윈터 아이셉트 X (RW10)', '벤투스 S1 에보 Z (K129)', '아이온 에보 (iON evo)'
  ],
  '금호': [
    '마제스티 9 솔루스 TA91', '솔루스 TA51', '솔루스 TA21', '엑스타 PS71', '엑스타 PS31',
    '크루젠 HP71', '크루젠 HP51', '윈터크래프트 WP72', '윈터크래프트 WS71', '포트란 KC53',
    '엑스타 V720', '엑스타 PS91', '솔루스 HA31', '로드벤처 AT51', '로드벤처 MT51',
    '에코윙 ES31', '슈퍼마일 TX31', '센스 KR26', '마제스티 솔루스 KU50', '아이젠 KW31'
  ],
  '넥센': [
    '엔페라 슈프림', '엔페라 AU7', '엔페라 SU1', '엔프리즈 AH8', '엔프리즈 RH7',
    '로디안 GTX', '로디안 HTX RH5', '윈가드 스포츠 2', '윈가드 아이스', '엔블루 HD Plus',
    '엔페라 RU5', 'CP672', '마일캡 2', '로디안 MT', '로디안 AT 프로 RA8',
    '엔페라 프리머스', '엔페라 스포츠', '윈가드 윈스파이크 3', '엔프리즈 AH5', 'IQ 시리즈 1'
  ],
  '미쉐린': [
    '파일럿 스포츠 5', '파일럿 스포츠 4 S', '프라이머시 4', '프라이머시 투어 A/S', '크로스클라이밋 2',
    '래티튜드 스포츠 3', 'LTX 프리미어', '파일럿 알핀 5', 'X-아이스 스노우', '에너지 세이버+',
    '아질리스 3', '파일럿 슈퍼 스포츠', '파일럿 스포츠 컵 2', '디펜더 LTX', '래티튜드 투어 HP',
    '프라이머시 3', '프라이머시 MXM4', '파일럿 스포츠 EV', 'e.프라이머시', '알핀 6'
  ],
  '콘티넨탈': [
    '프로콘택트 TX', '프로콘택트 GX', '콘티프로콘택트', '익스트림콘택트 DWS06 플러스', '울트라콘택트 UC6',
    '맥스콘택트 MC6', '프리미엄콘택트 6', '스포츠콘택트 7', '크로스콘택트 LX 스포츠', '바이킹콘택트 7',
    '에코콘택트 6', '컴포트콘택트 CC6', '콘티스포츠콘택트 5', '콘티크로스콘택트 LX2', '트루콘택트 투어',
    '퓨어콘택트 LS', '윈터콘택트 TS 870', '올시즌콘택트', '밴콘택트', '콘티프리미엄콘택트 2'
  ],
  '피렐리': [
    '피제로 (P ZERO)', '피제로 올시즌', '신투라토 P7', '신투라토 P7 올시즌', '스콜피온 베르데',
    '스콜피온 베르데 올시즌', '스콜피온 제로', '스콜피온 올테레인 플러스', '윈터 소토제로 3', '아이스 제로 FR',
    '캐리어 (Carrier)', '피제로 코르사', '피제로 트로페오 R', '신투라토 P1 베르데', '신투라토 P6',
    '스콜피온 윈터', '파워지 (Powergy)', '피제로 네로 GT', '스콜피온 ATR', '크로노 시리즈'
  ],
  '굿이어': [
    '이글 F1 어심메트릭 5', '이글 F1 어심메트릭 3', '이피션트그립 퍼포먼스', '어슈어런스 컴포트트레드', '어슈어런스 맥스가드',
    '랭글러 듀라트랙', '랭글러 AT 사일런트트랙', '울트라그립 퍼포먼스+', '울트라그립 아이스 2', '이글 스포츠 올시즌',
    '어슈어런스 웨더레디', '이피션트그립 SUV', '이글 투어링', '이글 엑설러레이트', '어슈어런스 퓨얼맥스',
    '랭글러 포티튜드 HT', '카고 마라톤', '이피션트그립 카고', '벡터 4시즌 젠-3', '이글 F1 슈퍼스포츠'
  ],
  '라우펜': [
    'S FIT AS', 'G FIT AS', 'X FIT HT', 'X FIT AT', 'I FIT ICE',
    'S FIT EQ', 'G FIT EQ', 'X FIT Van', 'I FIT', 'S FIT AS-01',
    'G FIT AS-01', 'Z FIT EQ', 'X FIT HP', 'I FIT+', 'I FIT LW',
    'G FIT 4S', 'S FIT 4S', 'X FIT HT-01', 'X FIT AT-01'
  ],
  '기타': [
      '기타 타이어 모델'
  ]
};

// Normalize legacy categories (merge '부품/수리' into '기타')
const normalizeCategory = (category: string) => category === '부품/수리' ? '기타' : category;
const normalizeProducts = (list: Product[]) => list.map(p => ({ ...p, category: normalizeCategory(p.category) }));

const generateInitialProducts = (): Product[] => {
    const demoStock = { 'ST-1': 12, 'ST-2': 8, 'ST-3': 10 };
    const products: Product[] = [
        {
            id: 'P-001',
            name: '벤투스 S1 에보3',
            brand: '한국',
            specification: '245/45R18',
            category: '타이어',
            price: 180000,
            stock: 30,
            stockByStore: demoStock,
            ownerId: DEFAULT_OWNER_ID,
        },
        {
            id: 'P-002',
            name: '마제스티 9 솔루스',
            brand: '금호',
            specification: '225/55R17',
            category: '타이어',
            price: 165000,
            stock: 24,
            stockByStore: demoStock,
            ownerId: DEFAULT_OWNER_ID,
        },
        {
            id: 'P-003',
            name: '엔페라 SU1',
            brand: '넥센',
            specification: '235/45R18',
            category: '타이어',
            price: 150000,
            stock: 20,
            stockByStore: demoStock,
            ownerId: DEFAULT_OWNER_ID,
        },
        {
            id: 'P-004',
            name: '파일럿 스포츠 5',
            brand: '미쉐린',
            specification: '245/40R19',
            category: '타이어',
            price: 260000,
            stock: 15,
            stockByStore: demoStock,
            ownerId: DEFAULT_OWNER_ID,
        },
        {
            id: 'P-005',
            name: '엔진오일 5W30 (4L)',
            brand: '기타',
            specification: '5W30',
            category: '오일',
            price: 45000,
            stock: 40,
            stockByStore: demoStock,
            ownerId: DEFAULT_OWNER_ID,
        },
        {
            id: 'P-006',
            name: '브레이크패드 세트',
            brand: '기타',
            specification: '국산 세단 호환',
            category: '기타',
            price: 60000,
            stock: 25,
            stockByStore: demoStock,
            ownerId: DEFAULT_OWNER_ID,
        },
        {
            id: 'P-007',
            name: '에어컨 필터',
            brand: '기타',
            specification: '대부분 차종',
            category: '기타',
            price: 15000,
            stock: 50,
            stockByStore: demoStock,
            ownerId: DEFAULT_OWNER_ID,
        },
        {
            id: 'P-008',
            name: '윈터 타이어 세트',
            brand: '콘티넨탈',
            specification: '225/50R17',
            category: '타이어',
            price: 210000,
            stock: 18,
            stockByStore: demoStock,
            ownerId: DEFAULT_OWNER_ID,
        }
    ];

    return normalizeProducts(products);
};

const INITIAL_PRODUCTS: Product[] = generateInitialProducts();

const generateMockSales = (): Sale[] => {
  const sales: Sale[] = [];
  const products = INITIAL_PRODUCTS.filter(p => p.id !== '99999');
  const stores = INITIAL_STORE_ACCOUNTS; 
  const methods = [PaymentMethod.CARD, PaymentMethod.CASH, PaymentMethod.TRANSFER];
  const staff = ['이정비', '박매니저', '최신입']; // Use staff names
  const today = new Date();
  
  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dailySalesCount = Math.floor(Math.random() * 9) + 2;
    for (let j = 0; j < dailySalesCount; j++) {
      const store = stores[Math.floor(Math.random() * stores.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const method = methods[Math.floor(Math.random() * methods.length)];
      date.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
      sales.push({
        id: `S-${date.getTime()}-${j}`,
        date: date.toISOString(),
        storeId: store.id,
        totalAmount: product.price * quantity,
        paymentMethod: method,
        items: [{
          productId: product.id,
          productName: product.name,
          quantity: quantity,
          priceAtSale: product.price,
          specification: product.specification,
          brand: product.brand
        }],
        staffName: staff[Math.floor(Math.random() * staff.length)],
        customer: Math.random() > 0.3 ? {
          name: ['홍길동', '김철수', '이영희', '박민수'][Math.floor(Math.random() * 4)],
          phoneNumber: '010-0000-0000',
          carModel: ['그랜저', '쏘나타', '아반떼', '제네시스'][Math.floor(Math.random() * 4)],
          vehicleNumber: ['12가3456', '34나5678', '56다7890'][Math.floor(Math.random() * 3)]
        } : undefined
      });
    }
  }
  return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const generateMockExpenses = (): ExpenseRecord[] => {
    const expenses: ExpenseRecord[] = [];
    const categories = ['식비', '교통/유류비', '공과금', '소모품비', '회식비'];
    const today = new Date();
    // Default demo owner stores
    const demoStoreIds = ['ST-1', 'ST-2', 'ST-3'];

    for (let i = 0; i < 90; i++) {
        if (Math.random() > 0.6) continue;
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const storeId = demoStoreIds[Math.floor(Math.random() * demoStoreIds.length)];
        const dateToLocalString = (d: Date): string => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        expenses.push({
            id: `E-${date.getTime()}`,
            date: dateToLocalString(date),
            category: cat,
            description: `${cat} 지출`,
            amount: Math.floor(Math.random() * 40000) + 8000,
            isFixed: false,
            storeId: storeId // Add storeId to scope expenses
        });
    }
    return expenses;
};

const generateMockLeaveRequests = (): LeaveRequest[] => {
    const today = new Date();
    // 현재 주의 월요일 구하기
    const dayOfWeek = today.getDay(); // 0=일, 1=월, ... 6=토
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + daysToMonday);
    
    // 이번 주 월~일 중에서 샘플 데이터 생성
    const toDate = (daysFromMonday: number) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + daysFromMonday);
        return d.toISOString().split('T')[0];
    };
    
    return [
        {
            id: 'L-1',
            date: toDate(1), // 화요일
            staffId: 'staff_1',
            staffName: '이정비',
            storeId: 'ST-1',
            type: 'FULL',
            reason: '개인 사정',
            createdAt: new Date().toISOString(),
            status: 'pending'
        },
        {
            id: 'L-2',
            date: toDate(3), // 목요일
            staffId: 'staff_2',
            staffName: '박매니저',
            storeId: 'ST-2',
            type: 'HALF_AM',
            reason: '병원 검진',
            createdAt: new Date().toISOString(),
            status: 'pending'
        },
        {
            id: 'L-3',
            date: toDate(5), // 토요일
            staffId: 'staff_3',
            staffName: '최신입',
            storeId: 'ST-3',
            type: 'FULL',
            reason: '가족 행사',
            createdAt: new Date().toISOString(),
            status: 'approved'
        }
    ];
};

const generateMockReservations = (): Reservation[] => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return [
        {
            id: 'R-1',
            storeId: 'ST-1',
            date: today.toISOString().split('T')[0],
            time: '14:00',
            customerName: '최예약',
            phoneNumber: '010-1111-2222',
            vehicleNumber: '99하1234',
            carModel: '제네시스 G80',
            productName: '벤투스 S1 에보3',
            specification: '245/45R19',
            brand: '한국',
            quantity: 4,
            status: 'CONFIRMED',
            stockStatus: 'IN_STOCK',
            createdAt: new Date().toISOString()
        },
        {
            id: 'R-2',
            storeId: 'ST-2',
            date: tomorrow.toISOString().split('T')[0],
            time: '10:30',
            customerName: '김미리',
            phoneNumber: '010-3333-4444',
            vehicleNumber: '45고6789',
            carModel: '카니발 KA4',
            productName: '마제스티 9 솔루스',
            specification: '235/55R19',
            brand: '금호',
            quantity: 4,
            status: 'PENDING',
            stockStatus: 'IN_STOCK',
            createdAt: new Date().toISOString()
        },
        {
            id: 'R-3',
            storeId: 'ST-3',
            date: tomorrow.toISOString().split('T')[0],
            time: '16:20',
            customerName: '장도윤',
            phoneNumber: '010-7777-8888',
            vehicleNumber: '12사3456',
            carModel: '투싼 NX4',
            productName: '엔페라 AU7',
            specification: '225/55R18',
            brand: '넥센',
            quantity: 2,
            status: 'CONFIRMED',
            stockStatus: 'IN_STOCK',
            createdAt: new Date().toISOString()
        }
    ];
};

const generateMockStockHistory = (products: Product[]): StockInRecord[] => {
    const suppliers = ['한국타이어물류', '금호공급', '넥센딜러'];
    const today = new Date();
    return products.map((product, idx) => {
        const date = new Date(today);
        date.setDate(today.getDate() - idx);
        const purchasePrice = Math.max(40000, Math.floor(product.price * 0.6));
        return {
            id: `STOCK-${idx + 1}`,
            date: date.toISOString(),
            storeId: 'ST-1',
            supplier: suppliers[idx % suppliers.length],
            category: product.category,
            brand: product.brand || '기타',
            productName: product.name,
            specification: product.specification || '',
            quantity: 10 + idx,
            purchasePrice,
            factoryPrice: purchasePrice,
        } as StockInRecord;
    });
};

const INITIAL_SALES: Sale[] = generateMockSales();
const INITIAL_STOCK_HISTORY: StockInRecord[] = generateMockStockHistory(INITIAL_PRODUCTS);
// Link Initial Customers to Default Demo Owner '250001'
const INITIAL_CUSTOMERS: Customer[] = [
    { id: 'C1', name: '홍길동', phoneNumber: '010-1234-5678', carModel: '쏘나타 DN8', vehicleNumber: '12가3456', totalSpent: 350000, lastVisitDate: '2023-10-15', visitCount: 2, ownerId: '250001' },
    { id: 'C2', name: '김철수', phoneNumber: '010-9876-5432', carModel: '아반떼 CN7', vehicleNumber: '56다7890', totalSpent: 120000, lastVisitDate: '2023-10-20', visitCount: 1, ownerId: '250001' },
    { id: 'C3', name: '박영희', phoneNumber: '010-2222-3333', carModel: '카니발 KA4', vehicleNumber: '33모1234', totalSpent: 450000, lastVisitDate: '2023-11-05', visitCount: 3, ownerId: '250001' },
    { id: 'C4', name: '이민수', phoneNumber: '010-4444-5555', carModel: 'GV80', vehicleNumber: '77가7777', totalSpent: 780000, lastVisitDate: '2023-11-18', visitCount: 4, ownerId: '250001' },
    { id: 'C5', name: '정하늘', phoneNumber: '010-6666-7777', carModel: '투싼 NX4', vehicleNumber: '18루2025', totalSpent: 260000, lastVisitDate: '2023-12-02', visitCount: 2, ownerId: '250001' },
];
const INITIAL_EXPENSES: ExpenseRecord[] = generateMockExpenses();
const INITIAL_FIXED_COSTS: FixedCostConfig[] = [
    { id: 'FC1', title: '월세(본점)', amount: 2500000, day: 1, category: '고정지출', storeId: 'ST-1' },
    { id: 'FC2', title: '인터넷/통신', amount: 55000, day: 25, category: '공과금', storeId: 'ST-1' },
    { id: 'FC3', title: '전기/가스 요금', amount: 180000, day: 20, category: '공과금', storeId: 'ST-1' },
    { id: 'FC4', title: '보험료(화재/배상)', amount: 90000, day: 10, category: '고정지출', storeId: 'ST-2' },
    { id: 'FC5', title: '보안/경비 서비스', amount: 65000, day: 15, category: '기타', storeId: 'ST-2' },
];
const INITIAL_CATEGORIES = ['타이어', '기타'];
const INITIAL_LEAVE_REQUESTS = generateMockLeaveRequests();
const INITIAL_RESERVATIONS = generateMockReservations();
const INITIAL_TRANSFER_HISTORY: StockTransferRecord[] = [
    {
        id: 'TR-SEED-1',
        date: '2024-01-05T09:30:00Z',
        productId: '1',
        productName: '벤투스 S1 에보3 (K127)',
        fromStoreId: 'ST-1',
        toStoreId: 'ST-2',
        quantity: 4,
        staffName: '이정비',
        fromStoreName: '서울 강남 본점',
        toStoreName: '경기 수원점'
    },
    {
        id: 'TR-SEED-2',
        date: '2024-01-06T10:10:00Z',
        productId: '2',
        productName: '벤투스 S2 AS (H462)',
        fromStoreId: 'ST-2',
        toStoreId: 'ST-3',
        quantity: 2,
        staffName: '박매니저',
        fromStoreName: '경기 수원점',
        toStoreName: '인천 송도점'
    },
    {
        id: 'TR-SEED-3',
        date: '2024-01-07T11:40:00Z',
        productId: '3',
        productName: '키너지 EX (H308)',
        fromStoreId: 'ST-3',
        toStoreId: 'ST-1',
        quantity: 3,
        staffName: '최신입',
        fromStoreName: '인천 송도점',
        toStoreName: '서울 강남 본점'
    }
];

// Demo seeding guard: only seed mock data when explicitly enabled.
const SHOULD_SEED_DEMO = import.meta.env.VITE_SEED_DEMO === 'true';

type Tab = 'dashboard' | 'pos' | 'reservation' | 'inventory' | 'stockIn' | 'tax' | 'history' | 'settings' | 'customers' | 'financials' | 'leave' | 'superadmin' | 'admin';

type ViewState = 'LOGIN' | 'STORE_SELECT' | 'APP' | 'SUPER_ADMIN';

type DeviceBinding = {
    ownerId: string;
    storeId: string;
    deviceId: string;
};

const App: React.FC = () => {
    // App Config State
    const appTitle = 'TirePlan';
    const [viewState, setViewState] = useState<ViewState>('LOGIN');

    const [deviceBinding, setDeviceBinding] = useState<DeviceBinding | null>(null);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [managerSession, setManagerSession] = useState(false);
    const adminTimerRef = useRef<number | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionRole, setSessionRole] = useState<UserRole>('STAFF'); // Role for the current app session
  const [currentStoreId, setCurrentStoreId] = useState<string>(''); 
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // Sidebar & Menu State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false); 

    const [isMobileViewport, setIsMobileViewport] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768;
    });

    useEffect(() => {
        const handleResize = () => {
            if (typeof window === 'undefined') return;
            setIsMobileViewport(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (isStoreDropdownOpen && !target.closest('[data-store-dropdown]')) {
                setIsStoreDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isStoreDropdownOpen]);

    // 예약 화면 전용 실시간 구독 (지점 단위 + 최근 날짜 제한)
    useEffect(() => {
        // 탭이 예약이 아니면 구독 해제
        if (activeTab !== 'reservation') {
            reservationUnsubRef.current?.();
            reservationUnsubRef.current = null;
            return;
        }

        // 현재 지점이 없으면 구독 생략
        const storeFilter = currentStoreId && currentStoreId !== 'ALL' ? currentStoreId : null;

        const today = new Date();
        const dateToLocalString = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const todayISO = dateToLocalString(today); // YYYY-MM-DD

        const constraints: QueryConstraint[] = [orderBy('date', 'desc'), limit(50), where('date', '>=', todayISO)];
        if (storeFilter) {
            constraints.push(where('storeId', '==', storeFilter));
        }

        const unsub = subscribeToQuery<Reservation>(COLLECTIONS.RESERVATIONS, constraints, (data) => {
            setReservations(data);
        });
        reservationUnsubRef.current = unsub;

        return () => {
            unsub?.();
            reservationUnsubRef.current = null;
        };
    }, [activeTab, currentStoreId]);

  
  const [staffPermissions, setStaffPermissions] = useState<StaffPermissions>({
    viewInventory: true,
    viewSalesHistory: true,
    viewTaxInvoice: true,
  });

        const [stores, setStores] = useState<StoreAccount[]>(INITIAL_STORE_ACCOUNTS);
        const [tireBrands, setTireBrands] = useState<string[]>(INITIAL_TIRE_BRANDS);

        const [users, setUsers] = useState<OwnerAccount[]>(DEFAULT_OWNER_ACCOUNTS);
  
  const [staffList, setStaffList] = useState<Staff[]>(INITIAL_STAFF); // Manage Staff Entities
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [stockInHistory, setStockInHistory] = useState<StockInRecord[]>(INITIAL_STOCK_HISTORY);
  const [transferHistory, setTransferHistory] = useState<StockTransferRecord[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [shiftRange, setShiftRange] = useState<{ start: string; end: string }>(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return { start: start.toISOString(), end: end.toISOString() };
    });

    const handleShiftRangeChange = useCallback((start: string, end: string) => {
        setShiftRange({ start, end });
    }, []);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(INITIAL_EXPENSES);
  const [fixedCosts, setFixedCosts] = useState<FixedCostConfig[]>(INITIAL_FIXED_COSTS);
  const [historyFilter, setHistoryFilter] = useState<SalesFilter>({ type: 'ALL', value: '', label: '전체 판매 내역' });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [reservations, setReservations] = useState<Reservation[]>(INITIAL_RESERVATIONS);
    const reservationUnsubRef = useRef<(() => void) | null>(null);
        const leaveUnsubRef = useRef<(() => void) | null>(null);
    const shiftsUnsubRef = useRef<(() => void) | null>(null);
        const salesUnsubRef = useRef<(() => void) | null>(null);
        const stockInUnsubRef = useRef<(() => void) | null>(null);

    // 실시간 구독: 판매/입고 히스토리 최신화 (화면이 APP일 때만)
    useEffect(() => {
        const cleanup = () => {
            salesUnsubRef.current?.();
            stockInUnsubRef.current?.();
            salesUnsubRef.current = null;
            stockInUnsubRef.current = null;
        };

        if (viewState !== 'APP') {
            cleanup();
            return;
        }

        const salesConstraints: QueryConstraint[] = [orderBy('date', 'desc'), limit(SALES_PAGE_SIZE)];
        salesUnsubRef.current = subscribeToQuery<Sale>(COLLECTIONS.SALES, salesConstraints, (data) => {
            const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setSales(sorted);
        });

        const stockConstraints: QueryConstraint[] = [orderBy('date', 'desc'), limit(SALES_PAGE_SIZE)];
        stockInUnsubRef.current = subscribeToQuery<StockInRecord>(COLLECTIONS.STOCK_IN, stockConstraints, (data) => {
            // Normalize numeric fields to avoid string -> 0 issues when rendering
            const normalized = data.map(r => ({
                ...r,
                factoryPrice: Number(r.factoryPrice ?? 0),
                purchasePrice: Number(r.purchasePrice ?? 0),
                quantity: Number(r.quantity ?? 0),
                receivedQuantity: r.receivedQuantity !== undefined ? Number(r.receivedQuantity) : undefined
            }));

            const sorted = normalized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setStockInHistory(sorted);
        });

        return cleanup;
    }, [viewState]);

      // 실시간 구독: 휴가 신청 (현재 월 범위)
      useEffect(() => {
          if (leaveUnsubRef.current) {
              leaveUnsubRef.current();
              leaveUnsubRef.current = null;
          }
          // Convert ISO range to local date strings (YYYY-MM-DD)
          const isoToLocalDate = (iso: string) => iso.split('T')[0];
          const startDate = isoToLocalDate(shiftRange.start);
          const endDate = isoToLocalDate(shiftRange.end);

          const constraints: QueryConstraint[] = [
              orderBy('date', 'asc'),
              where('date', '>=', startDate),
              where('date', '<=', endDate),
          ];

          const unsub = subscribeToQuery<LeaveRequest>(COLLECTIONS.LEAVE_REQUESTS, constraints, (data) => {
              // Sort by date ascending so week/month views are stable
              const sorted = [...data].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
              setLeaveRequests(sorted);
          });
          leaveUnsubRef.current = unsub;
          return () => {
              unsub?.();
              leaveUnsubRef.current = null;
          };
      }, [shiftRange.start, shiftRange.end]);

  // Admin auto-timeout (5 minutes of inactivity)
  useEffect(() => {
      const resetTimer = () => {
          if (sessionRole === 'STAFF') return;
          if (adminTimerRef.current) window.clearTimeout(adminTimerRef.current);
          adminTimerRef.current = window.setTimeout(() => {
              setSessionRole('STAFF');
              setManagerSession(false);
              setActiveTab('pos');
          }, 5 * 60 * 1000);
      };

      if (sessionRole !== 'STAFF') {
          resetTimer();
          const events = ['mousemove', 'keydown', 'click', 'touchstart'];
          events.forEach(evt => window.addEventListener(evt, resetTimer));
          return () => {
              if (adminTimerRef.current) window.clearTimeout(adminTimerRef.current);
              events.forEach(evt => window.removeEventListener(evt, resetTimer));
          };
      }

      if (adminTimerRef.current) window.clearTimeout(adminTimerRef.current);
  }, [sessionRole]);

  // Device binding bootstrap
  useEffect(() => {
      if (deviceBinding || currentUser) return;
      const saved = localStorage.getItem('device-binding');
      if (saved) {
          try {
              const parsed = JSON.parse(saved) as DeviceBinding;
              setDeviceBinding(parsed);
              const ownerUser = users.find(u => u.id === parsed.ownerId);
              if (ownerUser) {
                  setCurrentUser({ id: ownerUser.id, name: ownerUser.name, role: ownerUser.role, storeId: parsed.storeId });
                  setCurrentStoreId(parsed.storeId);
                  setSessionRole('STAFF');
                  setActiveTab('pos');
                  setViewState('APP');
              } else {
                  setViewState('LOGIN');
              }
          } catch (err) {
              console.error('❌ Failed to parse device binding', err);
              setViewState('LOGIN');
          }
      } else {
          setViewState('LOGIN');
      }
  }, [deviceBinding, currentUser, users]);

  // ID 기반 로그인으로 변경되어 Firebase Auth는 더 이상 필요 없음
  // onAuthStateChanged 제거됨 - handleLoginWithState에서 직접 상태 관리

    // Firebase 데이터 로드 및 마이그레이션 + 더미 데이터 복구(컬렉션 비어있을 때만)
    useEffect(() => {
        const seedIfEmpty = async <T extends { id: string },>(
            label: string,
            collectionName: string,
            fetched: T[],
            seed: T[],
            setter: (data: T[]) => void
        ) => {
            if (fetched.length > 0) {
                setter(fetched);
                console.log(`↪️ ${label} already exist in Firestore:`, fetched.length);
                return;
            }
            if (!seed || seed.length === 0) {
                console.log(`⚪ No seed data provided for ${label}`);
                return;
            }
            await saveBulkToFirestore(collectionName, seed);
            setter(seed);
            console.log(`🌱 Seeded ${seed.length} ${label} into Firestore`);
        };

        const ensureDefaultOwners = async (existing: OwnerAccount[]): Promise<OwnerAccount[]> => {
            const missing = DEFAULT_OWNER_ACCOUNTS.filter((owner) => !existing.some((o) => o.id === owner.id));
            if (missing.length === 0) return existing;
            try {
                await saveBulkToFirestore(COLLECTIONS.OWNERS, missing);
                console.log(`🌱 Added missing default owners: ${missing.map((m) => m.id).join(', ')}`);
            } catch (error) {
                console.error('❌ Failed to add missing default owners:', error);
            }
            return [...existing, ...missing];
        };

        const initializeData = async () => {
            try {
                // localStorage에서 Firestore로 마이그레이션 (최초 1회만)
                const migrated = localStorage.getItem('firestore-migrated');
                if (!migrated) {
                    await migrateLocalStorageToFirestore();
                    localStorage.setItem('firestore-migrated', 'true');
                }

                // Firestore에서 데이터 로드 (판매: 당일만, 고객: 전체)
                const PAGE_SIZE = SALES_PAGE_SIZE;

                const salesQuery = query(
                    collection(db, COLLECTIONS.SALES),
                    orderBy('date', 'desc'),
                    limit(PAGE_SIZE)
                );

                const salesPagePromise = getDocs(salesQuery).then(snapshot => snapshot.docs.map(d => d.data() as Sale));

                const [
                    firestoreOwners,
                    firestoreStores,
                    firestoreProductsPage,
                    firestoreStockInPage,
                    firestoreExpensesPage,
                    firestoreFixedCosts,
                    firestoreLeaveRequestsPage,
                    firestoreReservationsPage,
                    firestoreTransfersPage,
                    firestoreStaffPage,
                    firestoreSalesPage,
                    firestoreCustomersAll
                ] = await Promise.all([
                    getCollectionPage<OwnerAccount>(COLLECTIONS.OWNERS, { pageSize: PAGE_SIZE, orderByField: 'id' }),
                    getCollectionPage<StoreAccount>(COLLECTIONS.STORES, { pageSize: PAGE_SIZE }),
                    getCollectionPage<Product>(COLLECTIONS.PRODUCTS, { pageSize: PAGE_SIZE, orderByField: 'id', applyOwnerFilter: false }),
                    getCollectionPage<StockInRecord>(COLLECTIONS.STOCK_IN, { pageSize: PAGE_SIZE, orderByField: 'date', direction: 'desc' }),
                    getCollectionPage<ExpenseRecord>(COLLECTIONS.EXPENSES, { pageSize: PAGE_SIZE, orderByField: 'date', direction: 'desc' }),
                    getCollectionPage<FixedCostConfig>(COLLECTIONS.FIXED_COSTS, { pageSize: PAGE_SIZE, orderByField: 'id' }),
                    getCollectionPage<LeaveRequest>(COLLECTIONS.LEAVE_REQUESTS, { pageSize: PAGE_SIZE, orderByField: 'createdAt', direction: 'desc' }),
                    getCollectionPage<Reservation>(COLLECTIONS.RESERVATIONS, { pageSize: PAGE_SIZE, orderByField: 'id' }),
                    getCollectionPage<StockTransferRecord>(COLLECTIONS.TRANSFERS, { pageSize: PAGE_SIZE, orderByField: 'date', direction: 'desc' }),
                    getCollectionPage<Staff>(COLLECTIONS.STAFF, { pageSize: PAGE_SIZE, orderByField: 'id' }),
                    salesPagePromise,
                    getAllFromFirestore<Customer>(COLLECTIONS.CUSTOMERS)
                ]);

                const ownersWithDefaults = await ensureDefaultOwners(firestoreOwners.data);
                const normalizedFetchedProducts = normalizeProducts(firestoreProductsPage.data);

                if (SHOULD_SEED_DEMO) {
                    // 빈 컬렉션만 초기 시드 후 상태 설정 (기존 데이터는 절대 덮어쓰지 않음)
                    await seedIfEmpty<OwnerAccount>('owners', COLLECTIONS.OWNERS, ownersWithDefaults, DEFAULT_OWNER_ACCOUNTS, setUsers);
                    await seedIfEmpty<StoreAccount>('stores', COLLECTIONS.STORES, firestoreStores.data, INITIAL_STORE_ACCOUNTS, setStores);
                    
                    // 판매 기록을 바탕으로 제품 재고 재계산 후 시드
                    const seedProducts = async () => {
                        const sortedSales = INITIAL_SALES.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        const productsWithAdjustedStock = INITIAL_PRODUCTS.map(prod => {
                            if (prod.id === '99999') return prod;
                            
                            const safeStockByStore = prod.stockByStore || {};
                            const newStockByStore = { ...safeStockByStore };
                            
                            sortedSales.forEach(sale => {
                                if (sale.isCanceled || !sale.inventoryAdjusted) return;
                                
                                const soldQty = sale.items.reduce((sum, item) => {
                                    // Only match by productId when available - most reliable
                                    if (item.productId) {
                                        return item.productId === prod.id ? sum + item.quantity : sum;
                                    }
                                    
                                    // Fallback to name+spec match ONLY if both are non-empty
                                    const normalize = (v?: string) => (v || '').toLowerCase().replace(/\s+/g, '');
                                    const itemName = normalize(item.productName);
                                    const itemSpec = normalize(item.specification);
                                    const prodName = normalize(prod.name);
                                    const prodSpec = normalize(prod.specification);
                                    
                                    // Both name and spec must match, and both must be non-empty
                                    const fallbackMatch = itemName && itemSpec && prodName && prodSpec && 
                                                        itemName === prodName && itemSpec === prodSpec;
                                    
                                    return fallbackMatch ? sum + item.quantity : sum;
                                }, 0);
                                
                                if (soldQty > 0) {
                                    newStockByStore[sale.storeId] = Math.max(0, (newStockByStore[sale.storeId] || 0) - soldQty);
                                }
                            });
                            
                            const newTotalStock = (Object.values(newStockByStore) as number[]).reduce((a, b) => a + b, 0);
                            return { ...prod, stockByStore: newStockByStore, stock: newTotalStock };
                        });
                        
                        return productsWithAdjustedStock;
                    };
                    
                    const adjustedProducts = await seedProducts();
                    await seedIfEmpty<Product>('products', COLLECTIONS.PRODUCTS, normalizedFetchedProducts, adjustedProducts, (data) => setProducts(normalizeProducts(data)));
                    await seedIfEmpty<Sale>('sales', COLLECTIONS.SALES, firestoreSalesPage, INITIAL_SALES, setSales);
                    await seedIfEmpty<Customer>('customers', COLLECTIONS.CUSTOMERS, firestoreCustomersAll, INITIAL_CUSTOMERS, setCustomers);
                    await seedIfEmpty<StockInRecord>('stock-in history', COLLECTIONS.STOCK_IN, firestoreStockInPage.data, INITIAL_STOCK_HISTORY, setStockInHistory);
                    await seedIfEmpty<ExpenseRecord>('expenses', COLLECTIONS.EXPENSES, firestoreExpensesPage.data, INITIAL_EXPENSES, setExpenses);
                    await seedIfEmpty<FixedCostConfig>('fixed costs', COLLECTIONS.FIXED_COSTS, firestoreFixedCosts.data, INITIAL_FIXED_COSTS, setFixedCosts);
                    await seedIfEmpty<LeaveRequest>('leave requests', COLLECTIONS.LEAVE_REQUESTS, firestoreLeaveRequestsPage.data, INITIAL_LEAVE_REQUESTS, setLeaveRequests);
                    await seedIfEmpty<Reservation>('reservations', COLLECTIONS.RESERVATIONS, firestoreReservationsPage.data, INITIAL_RESERVATIONS, setReservations);
                    await seedIfEmpty<StockTransferRecord>('stock transfers', COLLECTIONS.TRANSFERS, firestoreTransfersPage.data, INITIAL_TRANSFER_HISTORY || [], setTransferHistory);
                    await seedIfEmpty<Staff>('staff', COLLECTIONS.STAFF, firestoreStaffPage.data, INITIAL_STAFF, setStaffList);
                } else {
                    // 프로덕션에서는 Firestore 저장된 값을 그대로 사용 (재계산 하지 않음)
                    // handleSaleComplete에서 이미 재고 조정이 발생했으므로, 중복 감소를 방지하기 위해 저장된 값 사용
                    setUsers(ownersWithDefaults);
                    setStores(firestoreStores.data);
                    setProducts(normalizeProducts(normalizedFetchedProducts));
                    setSales(firestoreSalesPage);
                    setCustomers(firestoreCustomersAll);
                    setStockInHistory(firestoreStockInPage.data);
                    setExpenses(firestoreExpensesPage.data);
                    setFixedCosts(firestoreFixedCosts.data);
                    setLeaveRequests(firestoreLeaveRequestsPage.data);
                    setReservations(firestoreReservationsPage.data);
                    setTransferHistory(firestoreTransfersPage.data);
                    setStaffList(firestoreStaffPage.data);
                }

                console.log('✅ Initial data loaded (paged, one-time fetch, inventory recalculated)');
            } catch (error) {
                console.error('❌ Error loading/seeding data from Firestore:', error);
            }
        };

        initializeData();
    }, []);

  // Firestore 실시간 리스너 (데이터 자동 동기화)
  useEffect(() => {
      const unsubscribeList: Array<() => void> = [];

      try {
          // LeaveRequests 실시간 구독
          const unsubLeaveRequests = subscribeToCollection<LeaveRequest>(COLLECTIONS.LEAVE_REQUESTS, (data) => {
              console.log('📥 Leave requests updated from Firestore:', data.length);
              setLeaveRequests(data);
          });
          unsubscribeList.push(unsubLeaveRequests);

          // Sales 실시간 구독
          const unsubSales = subscribeToCollection<Sale>(COLLECTIONS.SALES, (data) => {
              console.log('📥 Sales updated from Firestore:', data.length);
              setSales(data);
          });
          unsubscribeList.push(unsubSales);

          // Customers 실시간 구독
          const unsubCustomers = subscribeToCollection<Customer>(COLLECTIONS.CUSTOMERS, (data) => {
              console.log('📥 Customers updated from Firestore:', data.length);
              setCustomers(data);
          });
          unsubscribeList.push(unsubCustomers);

          // Products 실시간 구독
          const unsubProducts = subscribeToCollection<Product>(COLLECTIONS.PRODUCTS, (data) => {
              console.log('📥 Products updated from Firestore:', data.length);
              // Filter out products with missing or empty name or specification
              const validProducts = data.filter(p => 
                  p.name && p.name.trim() !== '' && 
                  p.specification && p.specification.trim() !== ''
              );
              console.log('✅ Valid products after filter:', validProducts.length);
              setProducts(validProducts);
          });
          unsubscribeList.push(unsubProducts);

          // Staff 실시간 구독
          const unsubStaff = subscribeToCollection<Staff>(COLLECTIONS.STAFF, (data) => {
              console.log('📥 Staff updated from Firestore:', data.length);
              setStaffList(data);
          });
          unsubscribeList.push(unsubStaff);

          // Stores 실시간 구독
          const unsubStores = subscribeToCollection<StoreAccount>(COLLECTIONS.STORES, (data) => {
              console.log('📥 Stores updated from Firestore:', data.length);
              setStores(data);
          });
          unsubscribeList.push(unsubStores);

          // Expenses 실시간 구독
          const unsubExpenses = subscribeToCollection<ExpenseRecord>(COLLECTIONS.EXPENSES, (data) => {
              console.log('📥 Expenses updated from Firestore:', data.length);
              setExpenses(data);
          });
          unsubscribeList.push(unsubExpenses);

          // FixedCosts 실시간 구독
          const unsubFixedCosts = subscribeToCollection<FixedCostConfig>(COLLECTIONS.FIXED_COSTS, (data) => {
              console.log('📥 Fixed costs updated from Firestore:', data.length);
              setFixedCosts(data);
          });
          unsubscribeList.push(unsubFixedCosts);

          // Reservations 실시간 구독
          const unsubReservations = subscribeToCollection<Reservation>(COLLECTIONS.RESERVATIONS, (data) => {
              console.log('📥 Reservations updated from Firestore:', data.length);
              setReservations(data);
          });
          unsubscribeList.push(unsubReservations);

          // StockIn 실시간 구독
          const unsubStockIn = subscribeToCollection<StockInRecord>(COLLECTIONS.STOCK_IN, (data) => {
              console.log('📥 Stock-in history updated from Firestore:', data.length);
              setStockInHistory(data);
          });
          unsubscribeList.push(unsubStockIn);

          // Transfers 실시간 구독
          const unsubTransfers = subscribeToCollection<StockTransferRecord>(COLLECTIONS.TRANSFERS, (data) => {
              console.log('📥 Transfers updated from Firestore:', data.length);
              setTransferHistory(data);
          });
          unsubscribeList.push(unsubTransfers);

          console.log('🔌 Firestore real-time listeners registered');
      } catch (error) {
          console.error('❌ Error registering Firestore listeners:', error);
      }

      // Cleanup: unsubscribe all listeners when component unmounts
      return () => {
          console.log('🔕 Unsubscribing from all Firestore listeners');
          unsubscribeList.forEach(unsub => unsub());
      };
  }, []);

  // 데이터 변경 시 Firestore 자동 저장
    // Removed bulk auto-save effects to avoid duplicate writes with real-time subscriptions.

  // 달력 날짜 클릭 시 판매내역으로 이동하는 이벤트 리스너
  useEffect(() => {
    const handleNavigateToDailyHistory = (event: any) => {
      const dateStr = event.detail.date;
      setHistoryFilter({ type: 'DATE', value: dateStr, label: `${dateStr} 매출 상세` });
      setActiveTab('history');
    };

    const handleNavigateToScheduleWithType = (event: any) => {
      const type = event.detail.type; // 'LEAVE' for 휴무
      // ScheduleAndLeave에서 근무 추가 시 타입을 휴무로 미리 선택
      localStorage.setItem('scheduleDefaultType', type);
      setActiveTab('leave');
    };

    window.addEventListener('navigateToDailyHistory', handleNavigateToDailyHistory);
    window.addEventListener('navigateToScheduleWithType', handleNavigateToScheduleWithType);
    return () => {
      window.removeEventListener('navigateToDailyHistory', handleNavigateToDailyHistory);
      window.removeEventListener('navigateToScheduleWithType', handleNavigateToScheduleWithType);
    };
  }, []);

  // Compute effective user to pass down
  const effectiveUser = useMemo(() => {
    if (!currentUser) return null;
    return { ...currentUser, role: sessionRole };
  }, [currentUser, sessionRole]);

  const ownerPin = useMemo(() => {
      if (!currentUser) return '';
      const ownerUser = users.find(u => u.id === currentUser.id);
      return ownerUser?.ownerPin || ownerUser?.password || '';
  }, [currentUser, users]);

  // Manager PIN: decode per-store hash with safe fallback
  const storePin = useMemo(() => {
      const store = stores.find(s => s.id === currentStoreId);
      if (!store) return DEFAULT_MANAGER_PIN;
      try {
          return store.passwordHash ? atob(store.passwordHash) : DEFAULT_MANAGER_PIN;
      } catch (err) {
          console.error('❌ Failed to decode store PIN', err);
          return DEFAULT_MANAGER_PIN;
      }
  }, [stores, currentStoreId]);

  // Filter stores for the current logged in user
  const visibleStores = useMemo(() => {
      if (!currentUser) return [];
      // Defensive check: if stores is undefined or null, return empty array
      if (!stores) return [];
      
      if (currentUser.role === 'SUPER_ADMIN') return stores;
      // Filter stores owned by this user
      return stores.filter(s => s.ownerId === currentUser.id);
  }, [stores, currentUser]);

  // --- Data Scoping Logic ---
  // Only pass data relevant to the current user's stores (or owner ID)
  // Safely map visibleStores to ensure we get an array of strings
  const visibleStoreIds = useMemo(() => (visibleStores || []).map(s => s.id), [visibleStores]);

  const visibleSales = useMemo(() => {
      if (currentUser?.role === 'SUPER_ADMIN') return sales;
      return sales.filter(s => visibleStoreIds.includes(s.storeId));
  }, [sales, visibleStoreIds, currentUser]);

  const visibleExpenses = useMemo(() => {
      if (currentUser?.role === 'SUPER_ADMIN') return expenses;
      // Filter expenses that match visible stores.
      return expenses.filter(e => e.storeId && visibleStoreIds.includes(e.storeId));
  }, [expenses, visibleStoreIds, currentUser]);

  const visibleCustomers = useMemo(() => {
      if (currentUser?.role === 'SUPER_ADMIN') return customers;
      // Filter customers by ownerId. 
      // For Staff, currentUser.id is the Owner's ID (since they logged in via Owner account essentially)
      // or we rely on the fact that staff view is scoped by store anyway.
      // But customers are shared per Owner.
      return customers.filter(c => c.ownerId === currentUser?.id);
  }, [customers, currentUser]);

  const visibleProducts = useMemo(() => {
      if (!currentUser) return [];

      const normalizeOwnerId = (ownerId?: string) => ownerId && ownerId !== 'null' ? ownerId : undefined;
      const isSeedProduct = (product: Product) => product.ownerId === DEFAULT_OWNER_ID;
      const shouldHideSeedProducts = currentUser.id !== DEFAULT_OWNER_ID;
      const isEtcItem = (p: Product) => {
          const cat = p.category === '부품/수리' ? '기타' : (p.category || '기타');
          return cat === '기타';
      };

      if (currentUser.role === 'SUPER_ADMIN') {
          // Super admin: show user-added products only, never seeded demo items
          return products.filter(p => {
              if (isSeedProduct(p)) return false;
              if (!p.name || p.name.trim() === '') return false;
              // 기타 항목은 모든 필터 무시하고 통과
              if (isEtcItem(p)) return true;
              // 타이어/부품은 specification 필수
              if (!p.specification || p.specification.trim() === '') return false;
              return true;
          });
      }

      const ownerId = currentUser.id;
      return products.filter(p => {
          if (shouldHideSeedProducts && isSeedProduct(p)) return false;
          const productOwnerId = normalizeOwnerId(p.ownerId);
          // Filter out products with missing or empty name
          if (!p.name || p.name.trim() === '') return false;
          
          // 기타 항목은 ownerId 체크만 하고 통과
          if (isEtcItem(p)) {
              return !productOwnerId || productOwnerId === ownerId;
          }
          
          // 타이어/부품은 specification 필수
          if (!p.specification || p.specification.trim() === '') return false;
          return !productOwnerId || productOwnerId === ownerId;
      });
  }, [products, currentUser]);

  const visibleStockHistory = useMemo(() => {
      if (currentUser?.role === 'SUPER_ADMIN') return stockInHistory;
      return stockInHistory.filter(r => visibleStoreIds.includes(r.storeId));
  }, [stockInHistory, visibleStoreIds, currentUser]);

  const visibleStaff = useMemo(() => {
      if (!currentUser) return [] as Staff[];
      if (currentUser.role === 'SUPER_ADMIN') return staffList.filter(s => s && s.name); // Guard against undefined
      return staffList.filter((s) => {
          if (!s || !s.name) return false; // Guard against undefined entries
          if (s.ownerId) return s.ownerId === currentUser.id;
          if (s.storeId) return visibleStoreIds.includes(s.storeId);
          return false;
      });
  }, [staffList, currentUser, visibleStoreIds]);

  const visibleLeaveRequests = useMemo(() => {
      if (!currentUser) return [] as LeaveRequest[];
      if (currentUser.role === 'SUPER_ADMIN') return leaveRequests;
      // Filter leave requests by checking if the staff member belongs to the current user
      return leaveRequests.filter(lr => {
          const staff = staffList.find(s => s.id === lr.staffId);
          if (!staff) return false;
          if (staff.ownerId) return staff.ownerId === currentUser.id;
          if (staff.storeId) return visibleStoreIds.includes(staff.storeId);
          return false;
      });
  }, [leaveRequests, staffList, currentUser, visibleStoreIds]);

  // 근무표 실시간 구독 (월 범위 + 지점 필터)
  useEffect(() => {
      if (shiftsUnsubRef.current) {
          shiftsUnsubRef.current();
          shiftsUnsubRef.current = null;
      }

      const storeFilter = visibleStoreIds.length && visibleStoreIds.length <= 10 ? [...visibleStoreIds] : null;
      const constraints: QueryConstraint[] = [
          orderBy('start', 'desc'),
          where('start', '>=', shiftRange.start),
          where('start', '<=', shiftRange.end),
      ];
      if (storeFilter) {
          constraints.push(where('storeId', 'in', storeFilter));
      }

      const unsub = subscribeToQuery<Shift>(COLLECTIONS.SHIFTS, constraints, (data) => {
          const sorted = [...data].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
          setShifts(sorted);
      });
      shiftsUnsubRef.current = unsub;
      return () => {
          unsub?.();
          shiftsUnsubRef.current = null;
      };
  }, [shiftRange.start, shiftRange.end, visibleStoreIds]);


  // --- Auth Handlers ---

  const handleLoginWithState = async (userId: string, _email: string): Promise<void> => {
      // ID 기반 로그인 (Firebase Auth 없이 직접 처리)
      try {
          console.log('🔐 Attempting ID-based login:', userId);
          
          // Firestore에서 사용자 정보 로드
          const userDoc = await getFromFirestore<OwnerAccount>(COLLECTIONS.OWNERS, userId);
          
          if (!userDoc) {
              console.error('❌ User not found:', userId);
              return;
          }
          
          const userData: User = {
              id: userDoc.id,
              name: userDoc.name,
              role: userDoc.role,
              storeId: userDoc.storeId
          };
          
          setCurrentUser(userData);
          
          if (userDoc.role === 'STORE_ADMIN') {
              setViewState('STORE_SELECT');
              setSessionRole('STAFF');
              console.log('✅ STORE_ADMIN 로그인 완료:', userId);
          } else if (userDoc.role === 'SUPER_ADMIN') {
              setCurrentStoreId('ALL');
              setViewState('SUPER_ADMIN');
              setSessionRole('SUPER_ADMIN');
              console.log('👑 SUPER_ADMIN 로그인 완료:', userId);
          }
      } catch (error) {
          console.error('❌ Login error:', error);
      }
  };

  const handleUpdatePassword = (newPass: string) => {
      if(!currentUser) return;
      setUsers(prev => {
          const next = prev.map(u => u.id === currentUser.id ? { ...u, password: newPass } : u);
          const owner = next.find(u => u.id === currentUser.id);
          if (owner) {
              saveToFirestore<OwnerAccount>(COLLECTIONS.OWNERS, owner)
                  .then(() => console.log('✅ Password updated in Firestore for owner:', owner.id))
                  .catch((err) => console.error('❌ Failed to update owner password in Firestore:', err));
          }
          return next;
      });
  };

  const handleUpdateOwnerPin = (newPin: string) => {
      if(!currentUser) return;
      setUsers(prev => {
          const next = prev.map(u => u.id === currentUser.id ? { ...u, ownerPin: newPin } : u);
          const owner = next.find(u => u.id === currentUser.id);
          if (owner) {
              saveToFirestore<OwnerAccount>(COLLECTIONS.OWNERS, owner)
                  .then(() => console.log('✅ Owner PIN updated in Firestore:', owner.id))
                  .catch((err) => console.error('❌ Failed to update owner PIN in Firestore:', err));
          }
          return next;
      });
  };

  const handleValidateOwnerPin = (pin: string): boolean => {
      const userAccount = users.find(u => u.id === currentUser?.id);
      if (!userAccount) return false;
      const normalizedPin = pin.trim();
      return normalizedPin !== '' && (userAccount.ownerPin || userAccount.password) === normalizedPin;
  };

  const handlePinSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = pinInput.trim();
      if (!trimmed) {
          setPinError('PIN을 입력하세요.');
          return;
      }
    const isOwner = ownerPin && trimmed === ownerPin;
    const isManager = storePin && trimmed === storePin;
      if (isOwner) {
          setSessionRole('STORE_ADMIN');
          setManagerSession(false);
          setIsAdminModalOpen(false);
          setPinInput('');
          setPinError('');
          setActiveTab('dashboard');
          return;
      }
      if (isManager) {
          setSessionRole('STORE_ADMIN');
          setManagerSession(true);
          setIsAdminModalOpen(false);
          setPinInput('');
          setPinError('');
          setActiveTab('dashboard');
          return;
      }
      setPinError('관리자 권한이 없습니다.');
  };

  const handleSelectStore = (storeId: string, role: UserRole) => {
      // Bind device on first store selection for owners
      if (currentUser?.role === 'STORE_ADMIN') {
          const binding: DeviceBinding = {
              ownerId: currentUser.id,
              storeId,
              deviceId: deviceBinding?.deviceId || `POS-${Date.now()}`,
          };
          setDeviceBinding(binding);
          localStorage.setItem('device-binding', JSON.stringify(binding));
      }
      setCurrentStoreId(storeId);
      setSessionRole(role);
      setViewState('APP');
      setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    // If we are in the App, return to Store Selection
    if (viewState === 'APP' && currentUser?.role === 'STORE_ADMIN') {
        setViewState('STORE_SELECT');
        setCurrentStoreId('');
        setSessionRole('STAFF'); // Reset session role
        setActiveTab('dashboard');
        setIsMobileMenuOpen(false);
    } else {
        // Full Logout - Firebase Auth signOut
        try {
            await auth.signOut();
            setCurrentUser(null);
            setCurrentStoreId('');
            setActiveTab('dashboard');
            setIsMobileMenuOpen(false);
            setViewState('LOGIN');
            console.log('✅ Logged out successfully');
        } catch (error) {
            console.error('❌ Error logging out:', error);
        }
    }
  };
  
  const handleFullLogout = async () => {
      try {
          await auth.signOut();
          setCurrentUser(null);
          setCurrentStoreId('');
          setViewState('LOGIN');
          console.log('✅ Logged out successfully');
      } catch (error) {
          console.error('❌ Error logging out:', error);
      }
  };

  // Ensure staff mode never stays on ALL; snap back to bound store
  useEffect(() => {
      if (sessionRole === 'STAFF' && currentStoreId === 'ALL') {
          const fallbackStoreId = deviceBinding?.storeId || currentUser?.storeId || '';
          if (fallbackStoreId) setCurrentStoreId(fallbackStoreId);
      }
  }, [sessionRole, currentStoreId, deviceBinding, currentUser]);

  const handleLockAdmin = () => {
      const fallbackStoreId = deviceBinding?.storeId || currentUser?.storeId || currentStoreId || '';
      if (currentStoreId === 'ALL' || !currentStoreId) {
          setCurrentStoreId(fallbackStoreId);
      }
      setSessionRole('STAFF');
      setManagerSession(false);
      setActiveTab('pos');
  };

  const handleUpdateManagerPin = (storeId: string, newPin: string) => {
      const hashed = mockHash(newPin);
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, passwordHash: hashed } : s));
      const storeDoc = stores.find(s => s.id === storeId);
      if (storeDoc) {
          const updated = { ...storeDoc, passwordHash: hashed } as StoreAccount;
          saveToFirestore<StoreAccount>(COLLECTIONS.STORES, updated)
              .then(() => console.log('✅ Manager PIN updated for store:', storeId))
              .catch((err) => console.error('❌ Failed to update manager PIN:', err));
      }
  };

  // --- Super Admin Actions ---

    const persistOwner = (owner: OwnerAccount) => {
            return saveToFirestore<OwnerAccount>(COLLECTIONS.OWNERS, owner)
                .then(() => console.log('✅ Owner saved in Firestore:', owner.id))
                .catch((err) => console.error('❌ Failed to save owner in Firestore:', err));
    };
  
  // 1. Create New Owner (with initial store)
  const handleCreateOwner = (name: string, region: string, phoneNumber: string, branchName: string) => {
      const currentYearShort = new Date().getFullYear().toString().slice(-2); // e.g. "25"
      const yearPrefix = currentYearShort;
      
      const existingIds = users
          .map(u => u.id)
          .filter(id => id.startsWith(yearPrefix));
      
      let maxSerial = 0;
      existingIds.forEach(id => {
          const serialPart = parseInt(id.slice(2));
          if (!isNaN(serialPart) && serialPart > maxSerial) {
              maxSerial = serialPart;
          }
      });

      const nextSerial = maxSerial + 1;
      const newOwnerId = `${yearPrefix}${String(nextSerial).padStart(4, '0')}`; // e.g. 250001
      
      const regionNames: Record<string, string> = { '01': '서울', '02': '경기', '03': '인천', '04': '강원', '05': '충청', '06': '전라', '07': '경상', '08': '제주' };

      // Set Join Date to Today (Fix: Explicit YYYY.MM.DD formatting)
      const now = new Date();
      const joinDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

      // Create Store
      const newStore: StoreAccount = {
          id: `ST-${Date.now()}`,
          name: branchName || `${name} 1호점`, 
          code: newOwnerId, 
          region,
          regionName: regionNames[region] || '기타',
          passwordHash: mockHash('4567'), 
          isActive: true,
          ownerId: newOwnerId 
      };

            setStores([...stores, newStore]);
            saveToFirestore<StoreAccount>(COLLECTIONS.STORES, newStore)
                .then(() => console.log('✅ Store created in Firestore:', newStore.id))
                .catch((err) => console.error('❌ Failed to create store in Firestore:', err));

      // Create default staff using owner name to avoid empty POS staff list
      const defaultStaff: Staff = {
          id: `staff_${Date.now()}`,
          name,
          ownerId: newOwnerId,
          storeId: newStore.id,
          isActive: true
      };
      setStaffList(prev => [...prev, defaultStaff]);
      saveToFirestore<Staff>(COLLECTIONS.STAFF, defaultStaff)
        .then(() => console.log('✅ Default staff created for new owner:', defaultStaff.id))
        .catch((err) => console.error('❌ Failed to create default staff for new owner:', err));
      
      // Create User with joinDate
      const newOwner: OwnerAccount = {
          id: newOwnerId,
          name: name,
          role: 'STORE_ADMIN',
          storeId: newStore.id, // Primary store
          password: '1234',
          ownerPin: '1234',
          phoneNumber: phoneNumber,
          joinDate: joinDate
      };
      setUsers(prev => [...prev, newOwner]);
      persistOwner(newOwner);

      // Init Stock (Empty for new store)
      setProducts(prev => prev.map(p => ({
          ...p,
          stockByStore: { ...p.stockByStore, [newStore.id]: 0 }
      })));
  };

  const handleUpdateOwner = (id: string, updates: { name?: string, phoneNumber?: string, status?: boolean, password?: string }) => {
      // 1. Update User Record
      setUsers(prev => prev.map(u => {
          if (u.id === id) {
              return {
                  ...u,
                  name: updates.name || u.name,
                  phoneNumber: updates.phoneNumber || u.phoneNumber,
                  password: updates.password || u.password
              };
          }
          return u;
      }));

      // 2. Update Status for All Stores associated with this owner (if status is provided)
      if (updates.status !== undefined) {
          setStores(prev => prev.map(s => {
              if (s.ownerId === id) {
                  return { ...s, isActive: updates.status! };
              }
              return s;
          }));
          const affected = stores.filter(s => s.ownerId === id).map(s => ({ ...s, isActive: updates.status! }));
          affected.forEach(s => {
            saveToFirestore<StoreAccount>(COLLECTIONS.STORES, s)
              .then(() => console.log('✅ Store status updated in Firestore:', s.id))
              .catch((err) => console.error('❌ Failed to update store status in Firestore:', err));
          });
      }
  };

  const handleAddBranch = (ownerId: string, branchName: string, region: string) => {
      const regionNames: Record<string, string> = { '01': '서울', '02': '경기', '03': '인천', '04': '강원', '05': '충청', '06': '전라', '07': '경상', '08': '제주' };
      
      const newStore: StoreAccount = {
          id: `ST-${Date.now()}`,
          name: branchName,
          code: ownerId, 
          region,
          regionName: regionNames[region] || '기타',
          passwordHash: mockHash('4567'),
          isActive: true,
          ownerId: ownerId
      };

            setStores(prev => [...prev, newStore]);
            saveToFirestore<StoreAccount>(COLLECTIONS.STORES, newStore)
                .then(() => console.log('✅ Branch added in Firestore:', newStore.id))
                .catch((err) => console.error('❌ Failed to add branch in Firestore:', err));
      
      // Init Stock
      setProducts(prev => prev.map(p => ({
          ...p,
          stockByStore: { ...p.stockByStore, [newStore.id]: 0 }
      })));
  };

  const handleResetPassword = (code: string) => {
      setUsers(prev => prev.map(u => u.id === code ? { ...u, password: '1234', ownerPin: '1234' } : u));
      alert('비밀번호가 1234로 초기화되었습니다.');
  };

    const handleDeleteStore = (storeId: string) => {
            setStores(prev => prev.filter(s => s.id !== storeId));
            deleteFromFirestore(COLLECTIONS.STORES, storeId)
                .then(() => console.log('✅ Store deleted in Firestore:', storeId))
                .catch((err) => console.error('❌ Failed to delete store in Firestore:', err));
    };

    const handleDeleteOwner = (ownerId: string) => {
            const toDelete = stores.filter(s => s.ownerId === ownerId);
            setStores(prev => prev.filter(s => s.ownerId !== ownerId));
            setUsers(prev => prev.filter(u => u.id !== ownerId));
            if (toDelete.length > 0) {
                Promise.all(toDelete.map(s => deleteFromFirestore(COLLECTIONS.STORES, s.id)))
                    .then(() => console.log('✅ Owner stores deleted in Firestore:', toDelete.length))
                    .catch((err) => console.error('❌ Failed deleting owner stores in Firestore:', err));
            }
    };

  // --- Data Management Handlers --- 
        const handleAddStore = () => { };
    const handleUpdateStore = (id: string, name: string) => {
            const updated = stores.map(s => s.id === id ? { ...s, name } : s);
            setStores(updated);
            const target = updated.find(s => s.id === id);
            if (target) {
                saveToFirestore<StoreAccount>(COLLECTIONS.STORES, target)
                    .then(() => console.log('✅ Store updated in Firestore:', target.id))
                    .catch((err) => console.error('❌ Failed to update store in Firestore:', err));
            }
    };
    const handleRemoveStore = (id: string) => {
            setStores(stores.filter(s => s.id !== id));
            deleteFromFirestore(COLLECTIONS.STORES, id)
                .then(() => console.log('✅ Store deleted in Firestore:', id))
                .catch((err) => console.error('❌ Failed to delete store in Firestore:', err));
    };
  
  const handleAddStaff = (name: string) => {
      const selectStoreId = currentStoreId && currentStoreId !== 'ALL'
          ? currentStoreId
          : visibleStoreIds[0] || stores[0]?.id || 'ALL';
      const resolvedOwnerId = currentUser?.id
          ?? stores.find(store => store.id === selectStoreId)?.ownerId
          ?? DEFAULT_OWNER_ID;

      const newStaff: Staff = {
          id: `staff_${Date.now()}`,
          name,
          isActive: true,
          ownerId: resolvedOwnerId,
          storeId: selectStoreId
      };
      setStaffList(prev => [...prev, newStaff]);
      saveToFirestore<Staff>(COLLECTIONS.STAFF, newStaff)
        .then(() => console.log('✅ Staff saved to Firestore:', newStaff.id))
        .catch((err) => console.error('❌ Failed to save staff to Firestore:', err));
  };
  const handleRemoveStaff = (id: string) => { 
      setStaffList(staffList.filter(s => s.id !== id));
      deleteFromFirestore(COLLECTIONS.STAFF, id)
        .then(() => console.log('✅ Staff deleted in Firestore:', id))
        .catch((err) => console.error('❌ Failed to delete staff in Firestore:', err));
  };

    const handleAddReservation = (r: Reservation) => {
            setReservations(prev => [...prev, r]);
            saveToFirestore<Reservation>(COLLECTIONS.RESERVATIONS, r)
                .then(() => console.log('✅ Reservation saved to Firestore:', r.id))
                .catch((err) => console.error('❌ Failed to save reservation to Firestore:', err));
    };
    const handleUpdateReservation = (u: Reservation) => {
            setReservations(prev => prev.map(r => r.id === u.id ? u : r));
            saveToFirestore<Reservation>(COLLECTIONS.RESERVATIONS, u)
                .then(() => console.log('✅ Reservation updated in Firestore:', u.id))
                .catch((err) => console.error('❌ Failed to update reservation in Firestore:', err));
    };
    const handleRemoveReservation = (id: string) => {
            setReservations(prev => prev.filter(r => r.id !== id));
            deleteFromFirestore(COLLECTIONS.RESERVATIONS, id)
                .then(() => console.log('✅ Reservation deleted in Firestore:', id))
                .catch((err) => console.error('❌ Failed to delete reservation in Firestore:', err));
    };

    const handleSaleComplete = (newSale: Sale, options?: { adjustInventory?: boolean }) => {
            const persistProducts = (list: Product[]) => {
                if (!list.length) return Promise.resolve();
                const sanitized = list.map(p => JSON.parse(JSON.stringify(p)) as Product);
                return Promise.all(sanitized.map(p => saveToFirestore<Product>(COLLECTIONS.PRODUCTS, p)));
            };

        const adjustInventory = options?.adjustInventory !== false;
        const sanitizeCustomer = (customer?: Sale['customer']) => {
            if (!customer) return undefined;
            const cleaned = { ...customer } as Record<string, unknown>;
            Object.keys(cleaned).forEach(key => {
                if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === '') delete cleaned[key];
            });
            return Object.keys(cleaned).length === 0 ? undefined : (cleaned as Sale['customer']);
        };

        const sanitizedCustomer = sanitizeCustomer(newSale.customer);
        const saleToSave: Sale = { ...newSale, inventoryAdjusted: adjustInventory };
        if (sanitizedCustomer) {
            saleToSave.customer = sanitizedCustomer;
        } else {
            delete saleToSave.customer;
        }

        const cleanSaleToSave = JSON.parse(JSON.stringify(saleToSave)) as Sale;
        setSales(prev => [cleanSaleToSave, ...prev]);
        saveToFirestore<Sale>(COLLECTIONS.SALES, cleanSaleToSave)
                .then(() => console.log('✅ Sale saved to Firestore:', cleanSaleToSave.id))
                .catch((err) => console.error('❌ Failed to save sale to Firestore:', err));
    
    // Add New Customer if not exists (with Owner Scope)
        if (saleToSave.customer && currentUser) {
        const custPhone = saleToSave.customer.phoneNumber;
        const custVehicle = saleToSave.customer.vehicleNumber || saleToSave.vehicleNumber;
        const ownerScopeId = stores.find(s => s.id === saleToSave.storeId)?.ownerId || currentUser.id;
        
        // Find existing customer by phone OR vehicle number
        const existing = customers.find(c => {
            const phoneMatch = custPhone && c.phoneNumber === custPhone && c.ownerId === ownerScopeId;
            const vehicleMatch = custVehicle && c.vehicleNumber === custVehicle && c.ownerId === ownerScopeId;
            return phoneMatch || vehicleMatch;
        });
        
        const buildCustomerRecord = () => {
            const base: Customer = {
                id: `C-${Date.now()}`,
                name: saleToSave.customer!.name,
                phoneNumber: saleToSave.customer!.phoneNumber,
                totalSpent: saleToSave.totalAmount,
                lastVisitDate: saleToSave.date,
                visitCount: 1,
                ownerId: ownerScopeId
            };
            if (saleToSave.customer!.carModel) base.carModel = saleToSave.customer!.carModel;
            if (custVehicle) base.vehicleNumber = custVehicle;
            if (saleToSave.customer!.businessNumber) base.businessNumber = saleToSave.customer!.businessNumber;
            if (saleToSave.customer!.companyName) base.companyName = saleToSave.customer!.companyName;
            if (saleToSave.customer!.email) base.email = saleToSave.customer!.email;
            return base;
        };
        
                        if (!existing) {
                        const newCustomer = buildCustomerRecord();
                        const cleanCustomer = JSON.parse(JSON.stringify(newCustomer)) as Customer;
                        setCustomers(prev => [...prev, cleanCustomer]);
                        saveToFirestore<Customer>(COLLECTIONS.CUSTOMERS, cleanCustomer)
              .then(() => console.log('✅ Customer saved to Firestore:', newCustomer.id))
              .catch((err) => console.error('❌ Failed to save customer to Firestore:', err));
        } else {
            // Update existing customer stats
            let updatedCustomer: Customer | null = null;
            setCustomers(prev => prev.map(c => {
                const phoneMatch = custPhone && c.phoneNumber === custPhone && c.ownerId === ownerScopeId;
                const vehicleMatch = custVehicle && c.vehicleNumber === custVehicle && c.ownerId === ownerScopeId;
                
                if (phoneMatch || vehicleMatch) {
                    const updated = {
                        ...c,
                        totalSpent: c.totalSpent + saleToSave.totalAmount,
                        visitCount: c.visitCount + 1,
                        lastVisitDate: saleToSave.date,
                        // Update phone/vehicle if missing
                        phoneNumber: c.phoneNumber || custPhone,
                        vehicleNumber: c.vehicleNumber || custVehicle
                    } as Customer;
                    updatedCustomer = updated;
                    return updated;
                }
                return c;
            }));
                        if (updatedCustomer) {
                            const cleanUpdated = JSON.parse(JSON.stringify(updatedCustomer)) as Customer;
                            saveToFirestore<Customer>(COLLECTIONS.CUSTOMERS, cleanUpdated)
                                .then(() => console.log('✅ Customer updated in Firestore:', updatedCustomer?.id))
                                .catch((err) => console.error('❌ Failed to update customer in Firestore:', err));
            }
        }
    }

        if (adjustInventory) {
            console.log('📊 Starting inventory adjustment for sale:', saleToSave.id);
            const normalize = (v?: string) => (v || '').toLowerCase().replace(/\s+/g, '');
            const updatedProducts: Product[] = [];
            const consumptionLogs: StockInRecord[] = [];
            const saleStoreId = saleToSave.storeId;

            console.log('📌 Sale store ID:', saleStoreId);
            console.log('📌 Sale items:', saleToSave.items);
            console.log('📌 Total products loaded:', products.length);

            const nextProducts = products.map(prod => {
                if (prod.id === '99999' || !saleStoreId) return prod;

                const safeStockByStore = prod.stockByStore || {};

                // Sum sold qty for this product by id, or fallback to name/spec match
                const soldQty = saleToSave.items.reduce((sum, item) => {
                    // Only match by productId when available - most reliable
                    if (item.productId) {
                        return item.productId === prod.id ? sum + item.quantity : sum;
                    }

                    // Fallback to name+spec match ONLY if both are non-empty
                    const itemName = normalize(item.productName);
                    const itemSpec = normalize(item.specification);
                    const prodName = normalize(prod.name);
                    const prodSpec = normalize(prod.specification);
                    
                    // Both name and spec must match, and both must be non-empty
                    const fallbackMatch = itemName && itemSpec && prodName && prodSpec && 
                                        itemName === prodName && itemSpec === prodSpec;

                    return fallbackMatch ? sum + item.quantity : sum;
                }, 0);

                if (soldQty <= 0) return prod;

                console.log(`🔄 Product "${prod.name}" matched with sold qty: ${soldQty}, store stock before: ${safeStockByStore[saleStoreId] || 0}`);

                const currentStoreStock = safeStockByStore[saleStoreId] || 0;
                const newStoreStock = Math.max(0, currentStoreStock - soldQty);
                const newStockByStore = { ...safeStockByStore, [saleStoreId]: newStoreStock };
                const newTotalStock = (Object.values(newStockByStore) as number[]).reduce((a, b) => a + b, 0);
                const updated = { ...prod, stockByStore: newStockByStore, stock: newTotalStock } as Product;
                updatedProducts.push(updated);
                console.log(`✏️ Product updated - store stock after: ${newStoreStock}`);

                // Log consumption to stock history (for visibility and refresh persistence)
                const consumptionRecord: StockInRecord = {
                    id: `IN-CONSUME-${Date.now()}-${prod.id}`,
                    date: new Date().toISOString(),
                    storeId: saleStoreId,
                    productId: prod.id,
                    supplier: '판매소진',
                    category: prod.category,
                    brand: prod.brand || '기타',
                    productName: prod.name,
                    specification: prod.specification || '',
                    quantity: 0,
                    receivedQuantity: soldQty,
                    consumedAtSaleId: saleToSave.id,
                    purchasePrice: 0,
                    factoryPrice: prod.price
                };
                consumptionLogs.push(consumptionRecord);
                return updated;
            });

            setProducts(nextProducts);

            if (updatedProducts.length > 0) {
                persistProducts(updatedProducts)
                    .then(() => console.log('✅ Product stock updated after sale'))
                    .catch(err => console.error('❌ Failed to update product stock after sale:', err));
            }

            if (consumptionLogs.length > 0) {
                consumptionLogs.forEach(log => {
                    const clean = JSON.parse(JSON.stringify(log)) as StockInRecord;
                    setStockInHistory(prev => [clean, ...prev]);
                    saveToFirestore<StockInRecord>(COLLECTIONS.STOCK_IN, clean)
                        .then(() => console.log('✅ Stock consumption logged after sale:', clean.id))
                        .catch(err => console.error('❌ Failed to log stock consumption after sale:', err));
                });
            }
        }
  };

  const handleUpdateSale = (updatedSale: Sale) => {
      const stripUndefined = <T,>(input: T): T => JSON.parse(JSON.stringify(input));
      const sanitizeCustomer = (customer?: Sale['customer']) => {
          if (!customer) return undefined;
          const cleaned = { ...customer } as Record<string, unknown>;
          Object.keys(cleaned).forEach(key => {
              if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === '') delete cleaned[key];
          });
          return Object.keys(cleaned).length === 0 ? undefined : (cleaned as Sale['customer']);
      };

      // Find previous sale to compute stock deltas
      const prevSale = sales.find(s => s.id === updatedSale.id);

      const sanitizedCustomer = sanitizeCustomer(updatedSale.customer);
      const salePayload: Sale = { ...updatedSale };
      // Default inventory adjustment to true unless explicitly false
      if (salePayload.inventoryAdjusted === undefined || salePayload.inventoryAdjusted === null) {
          salePayload.inventoryAdjusted = true;
      }
      if (sanitizedCustomer) {
          salePayload.customer = sanitizedCustomer;
      } else {
          delete salePayload.customer;
      }

      // Upsert customer when sale updates include customer info
      if (salePayload.customer) {
          const custPhone = salePayload.customer.phoneNumber;
          const custVehicle = salePayload.customer.vehicleNumber || salePayload.vehicleNumber;
          const ownerScopeId = stores.find(s => s.id === salePayload.storeId)?.ownerId || currentUser?.id;
          if (ownerScopeId) {
              // Find existing customer by phone OR vehicle number
              const existing = customers.find(c => {
                  const phoneMatch = custPhone && c.phoneNumber === custPhone && c.ownerId === ownerScopeId;
                  const vehicleMatch = custVehicle && c.vehicleNumber === custVehicle && c.ownerId === ownerScopeId;
                  return phoneMatch || vehicleMatch;
              });
              
              const prevPhone = prevSale?.customer?.phoneNumber;
              const prevVehicle = prevSale?.customer?.vehicleNumber || prevSale?.vehicleNumber;
              const spendDelta = (salePayload.totalAmount || 0) - (prevSale?.totalAmount || 0);

              if (!existing) {
                  const newCustomer: Customer = {
                      id: `C-${Date.now()}`,
                      name: salePayload.customer.name,
                      phoneNumber: custPhone,
                      totalSpent: salePayload.totalAmount,
                      lastVisitDate: salePayload.date,
                      visitCount: 1,
                      ownerId: ownerScopeId
                  };
                  if (salePayload.customer.carModel) newCustomer.carModel = salePayload.customer.carModel;
                  if (custVehicle) newCustomer.vehicleNumber = custVehicle;
                  if (salePayload.customer.businessNumber) newCustomer.businessNumber = salePayload.customer.businessNumber;
                  if (salePayload.customer.companyName) newCustomer.companyName = salePayload.customer.companyName;
                  if (salePayload.customer.email) newCustomer.email = salePayload.customer.email;
                  const cleanCustomer = stripUndefined(newCustomer);
                  setCustomers(prev => [...prev, newCustomer]);
                  saveToFirestore<Customer>(COLLECTIONS.CUSTOMERS, cleanCustomer)
                    .then(() => console.log('✅ Customer saved to Firestore (sale update):', newCustomer.id))
                    .catch((err) => console.error('❌ Failed to save customer during sale update:', err));
              } else {
                  let updatedCustomer: Customer | null = null;
                  setCustomers(prev => prev.map(c => {
                      const phoneMatch = custPhone && c.phoneNumber === custPhone && c.ownerId === ownerScopeId;
                      const vehicleMatch = custVehicle && c.vehicleNumber === custVehicle && c.ownerId === ownerScopeId;
                      
                      if (phoneMatch || vehicleMatch) {
                          // Count as new visit if phone OR vehicle changed
                          const visitBump = ((!prevPhone || prevPhone !== custPhone) && (!prevVehicle || prevVehicle !== custVehicle)) ? 1 : 0;
                          const updated = {
                              ...c,
                              name: salePayload.customer!.name || c.name,
                              carModel: salePayload.customer!.carModel || c.carModel,
                              phoneNumber: c.phoneNumber || custPhone,
                              vehicleNumber: c.vehicleNumber || custVehicle,
                              totalSpent: Math.max(0, (c.totalSpent || 0) + spendDelta),
                              visitCount: c.visitCount + visitBump,
                              lastVisitDate: salePayload.date
                          } as Customer;
                          updatedCustomer = updated;
                          return updated;
                      }
                      return c;
                  }));
                  if (updatedCustomer) {
                      const cleanUpdatedCustomer = stripUndefined(updatedCustomer);
                      saveToFirestore<Customer>(COLLECTIONS.CUSTOMERS, cleanUpdatedCustomer)
                        .then(() => console.log('✅ Customer updated in Firestore (sale update):', updatedCustomer?.id))
                        .catch((err) => console.error('❌ Failed to update customer during sale update:', err));
                  }
              }
          }
      }

      // Update sale record
            const saleToPersist = stripUndefined(salePayload);
            setSales(prev => prev.map(s => s.id === salePayload.id ? saleToPersist : s));
        saveToFirestore<Sale>(COLLECTIONS.SALES, saleToPersist)
      .then(() => console.log('✅ Sale updated in Firestore:', salePayload.id))
      .catch((err) => console.error('❌ Failed to update sale in Firestore:', err));

      // If we have a previous sale, reconcile inventory differences when inventory is tracked
      if (prevSale) {
          const storeId = salePayload.storeId;
          const prevTracked = prevSale.inventoryAdjusted !== false;
          const newTracked = salePayload.inventoryAdjusted !== false;

          if (prevTracked || newTracked) {
              const normalizeKey = (name?: string, spec?: string) => `${(name || '').toLowerCase().replace(/\s+/g, '')}__${(spec || '').toLowerCase().replace(/\s+/g, '')}`;

              const prevQtyMap: Record<string, number> = {};
              const prevNameSpecMap: Record<string, number> = {};
              prevSale.items.forEach(it => {
                  prevQtyMap[it.productId] = (prevQtyMap[it.productId] || 0) + it.quantity;
                  const key = normalizeKey(it.productName, it.specification);
                  prevNameSpecMap[key] = (prevNameSpecMap[key] || 0) + it.quantity;
              });

              const newQtyMap: Record<string, number> = {};
              const newNameSpecMap: Record<string, number> = {};
              salePayload.items.forEach(it => {
                  newQtyMap[it.productId] = (newQtyMap[it.productId] || 0) + it.quantity;
                  const key = normalizeKey(it.productName, it.specification);
                  newNameSpecMap[key] = (newNameSpecMap[key] || 0) + it.quantity;
              });

              const allProductIds = new Set<string>([...Object.keys(prevQtyMap), ...Object.keys(newQtyMap)]);
              const allNameSpecKeys = new Set<string>([...Object.keys(prevNameSpecMap), ...Object.keys(newNameSpecMap)]);

              const updatedProducts: Product[] = [];
              const consumptionLogs: StockInRecord[] = [];

              setProducts(prevProducts => prevProducts.map(prod => {
                  const key = normalizeKey(prod.name, prod.specification);
                  const hasIdMatch = allProductIds.has(prod.id);
                  const hasKeyMatch = allNameSpecKeys.has(key);
                  if ((!hasIdMatch && !hasKeyMatch) || prod.id === '99999') return prod;

                  // Only allow fallback to name+spec when productId is absent; never name-only
                  const safePrevQty = prevQtyMap[prod.id] ?? 0;
                  const safeNewQty = newQtyMap[prod.id] ?? 0;
                  const fallbackPrev = prevNameSpecMap[key] ?? 0;
                  const fallbackNew = newNameSpecMap[key] ?? 0;

                  const oldQty = prevTracked ? (safePrevQty || (prevQtyMap[prod.id] ? safePrevQty : fallbackPrev)) : 0;
                  const newQty = newTracked ? (safeNewQty || (newQtyMap[prod.id] ? safeNewQty : fallbackNew)) : 0;
                  const delta = newQty - oldQty; // positive => more sold now -> reduce stock

                  const safeStockByStore = prod.stockByStore || {};
                  const currentStoreStock = safeStockByStore[storeId] || 0;
                  const updatedStoreStock = Math.max(0, currentStoreStock - delta);
                  const newStockByStore = { ...safeStockByStore, [storeId]: updatedStoreStock };
                  const newTotalStock = (Object.values(newStockByStore) as number[]).reduce((a, b) => a + b, 0);
                  const updated = { ...prod, stockByStore: newStockByStore, stock: newTotalStock } as Product;
                  updatedProducts.push(updated);

                  // Log consumption when additional quantity is sold via edit (for stock history visibility)
                  if (newTracked && delta > 0) {
                      const consumptionRecord: StockInRecord = {
                          id: `IN-CONSUME-${Date.now()}-${prod.id}`,
                          date: new Date().toISOString(),
                          storeId,
                          productId: prod.id,
                          supplier: '판매소진',
                          category: prod.category,
                          brand: prod.brand || '기타',
                          productName: prod.name,
                          specification: prod.specification || '',
                          quantity: 0,
                          receivedQuantity: delta,
                          consumedAtSaleId: salePayload.id,
                          purchasePrice: 0,
                          factoryPrice: prod.price
                      };
                      consumptionLogs.push(consumptionRecord);
                      console.log('[Inventory Edit] consumption logged', { saleId: salePayload.id, productId: prod.id, delta });
                  } else {
                      console.log('[Inventory Edit] reconciled without consumption log', { saleId: salePayload.id, productId: prod.id, delta });
                  }
                  return updated;
              }));

              // Persist reconciled products
              updatedProducts.forEach(p => {
                  saveToFirestore<Product>(COLLECTIONS.PRODUCTS, p)
                    .then(() => console.log('✅ Product stock reconciled after sale edit:', p.id))
                    .catch(err => console.error('❌ Failed to persist reconciled product:', err));
              });

              // Persist consumption logs so stock history shows the deductions after edits
              if (consumptionLogs.length > 0) {
                  consumptionLogs.forEach(log => {
                      const clean = JSON.parse(JSON.stringify(log)) as StockInRecord;
                      setStockInHistory(prev => [clean, ...prev]);
                      saveToFirestore<StockInRecord>(COLLECTIONS.STOCK_IN, clean)
                        .then(() => console.log('✅ Stock consumption logged after sale edit:', clean.id))
                        .catch(err => console.error('❌ Failed to log stock consumption after sale edit:', err));
                  });
              }
          }
      }
  };
  const handleCancelSale = (saleId: string) => { 
      const targetSale = sales.find(s => s.id === saleId);
      if (!targetSale || targetSale.isCanceled) return;
      const canceledSale = { ...targetSale, isCanceled: true, cancelDate: new Date().toISOString() };
      const qtyMap: Record<string, number> = {};
      targetSale.items.forEach(it => {
          qtyMap[it.productId] = (qtyMap[it.productId] || 0) + it.quantity;
      });
      const storeId = targetSale.storeId;
      const updatedProducts: Product[] = [];

      const shouldRestock = targetSale.inventoryAdjusted !== false;
      if (!shouldRestock) {
          setSales(prev => prev.map(s => s.id === saleId ? canceledSale : s));
          saveToFirestore<Sale>(COLLECTIONS.SALES, canceledSale)
            .then(() => console.log('✅ Sale cancelled (no inventory restock):', saleId))
            .catch((err) => console.error('❌ Failed to cancel sale:', err));
          return;
      }

      setProducts(prev => prev.map(prod => {
          const qty = qtyMap[prod.id];
          if (!qty || prod.id === '99999' || !storeId) return prod;
          const currentStoreStock = prod.stockByStore[storeId] || 0;
          const newStockByStore = { ...prod.stockByStore, [storeId]: currentStoreStock + qty };
          const newTotalStock = (Object.values(newStockByStore) as number[]).reduce((a, b) => a + b, 0);
          const updated = { ...prod, stockByStore: newStockByStore, stock: newTotalStock } as Product;
          updatedProducts.push(updated);
          return updated;
      }));

      updatedProducts.forEach(p => {
          saveToFirestore<Product>(COLLECTIONS.PRODUCTS, p)
              .then(() => console.log('✅ Restocked after cancel:', p.id))
              .catch((err) => console.error('❌ Failed to restock after cancel:', err));
      });

      setSales(prev => prev.map(s => s.id === canceledSale.id ? canceledSale : s));
            saveToFirestore<Sale>(COLLECTIONS.SALES, canceledSale)
                .then(() => console.log('✅ Sale canceled in Firestore:', canceledSale.id))
                .catch((err) => console.error('❌ Failed to cancel sale in Firestore:', err));
  };

  const handleDeleteSale = (saleId: string) => {
      const targetSale = sales.find(s => s.id === saleId);
      if (!targetSale) return;

      // Remove from local state
      setSales(prev => prev.filter(s => s.id !== saleId));

      // Delete from Firestore
      const saleRef = doc(db, COLLECTIONS.SALES, saleId);
      deleteDoc(saleRef)
          .then(() => console.log('✅ Sale deleted from Firestore:', saleId))
          .catch((err) => console.error('❌ Failed to delete sale from Firestore:', err));
  };

    const handleStockIn = async (record: StockInRecord, sellingPrice?: number) => {
        const isConsumed = Boolean(record.consumedAtSaleId);
        const receivedQty = record.receivedQuantity ?? record.quantity ?? 0;
        const qtyForStock = isConsumed ? 0 : receivedQty;

        // 정규화 함수
        const normalizeName = (v?: string) => (v || '').toLowerCase().trim().replace(/\s+/g, '');
        const normalizeSpec = (v?: string) => (v || '').toLowerCase().replace(/[^0-9]/g, '');
        
        // Product ID 생성: P-{ownerId}-{이름}-{규격}
        const generateProductId = (ownerId: string, name: string, spec: string): string => {
            const normalizedName = normalizeName(name).slice(0, 20); // 길이 제한
            const normalizedSpec = normalizeSpec(spec).slice(0, 15);
            return `P-${ownerId}-${normalizedName}-${normalizedSpec}`;
        };

        const ownerIdFromAuth = auth.currentUser?.uid;
        const recordOwnerId = stores.find(s => s.id === record.storeId)?.ownerId || currentUser?.id || ownerIdFromAuth || '';
        const resolvedOwnerId = recordOwnerId || ownerIdFromAuth || currentUser?.id || 'owner-unknown';
        
        // 기존 제품 찾기: 같은 이름/규격 + 같은 ownerId
        const matchedByNameSpec = products.find(p => {
            const nameMatch = normalizeName(p.name) === normalizeName(record.productName);
            const specMatch = normalizeSpec(p.specification) === normalizeSpec(record.specification);
            const ownerMatch = p.ownerId === resolvedOwnerId;  // ← ownerId 체크 추가!
            return ownerMatch && (p.specification && record.specification ? (nameMatch && specMatch) : nameMatch);
        });

        // Product ID 결정
        const resolvedProductId = matchedByNameSpec?.id || generateProductId(resolvedOwnerId, record.productName, record.specification);

        const recordToSave: StockInRecord = record.consumedAtSaleId
            ? { ...record, productId: resolvedProductId, quantity: 0, receivedQuantity: record.receivedQuantity ?? record.quantity ?? 0 }
            : { ...record, productId: resolvedProductId, receivedQuantity: record.receivedQuantity ?? record.quantity ?? 0 };

        try {
            // 1) Product 찾기 및 계산
            let existingProductIndex = products.findIndex(p => p.id === resolvedProductId);
            if (existingProductIndex < 0) {
                existingProductIndex = products.findIndex(p => {
                    const nameMatch = normalizeName(p.name) === normalizeName(record.productName);
                    const specMatch = normalizeSpec(p.specification) === normalizeSpec(record.specification);
                    return p.specification && record.specification ? (nameMatch && specMatch) : nameMatch;
                });
            }

            let productToSave: Product;

            if (existingProductIndex >= 0) {
                const product = products[existingProductIndex];
                const currentStoreStock = product.stockByStore[record.storeId] || 0;
                const adjustAmount = isConsumed ? (record.receivedQuantity ?? record.quantity ?? 0) : qtyForStock;
                const nextStoreStock = isConsumed
                    ? Math.max(0, currentStoreStock - adjustAmount)
                    : currentStoreStock + qtyForStock;
                const newStockByStore = { ...product.stockByStore, [record.storeId]: nextStoreStock };
                const newTotalStock = (Object.values(newStockByStore) as number[]).reduce((a, b) => a + b, 0);
                const updatedFactoryPrice = record.factoryPrice || product.factoryPrice || 0;

                productToSave = {
                    ...product,
                    stockByStore: newStockByStore,
                    stock: newTotalStock,
                    factoryPrice: updatedFactoryPrice,
                    ownerId: product.ownerId || resolvedOwnerId
                };
            } else {
                // 신규 제품: 해당 사장의 지점만 포함
                const newStockByStore: Record<string, number> = {};
                const ownerStores = stores.filter(s => s.ownerId === resolvedOwnerId);
                ownerStores.forEach(s => newStockByStore[s.id] = 0);
                newStockByStore[record.storeId] = qtyForStock;

                productToSave = {
                    id: resolvedProductId,
                    name: record.productName,
                    price: sellingPrice || 0,
                    stock: qtyForStock,
                    stockByStore: newStockByStore,
                    category: record.category,
                    brand: record.brand,
                    specification: record.specification,
                    factoryPrice: record.factoryPrice || 0,
                    ownerId: resolvedOwnerId
                };
            }

            const sanitizedRecord = JSON.parse(JSON.stringify(recordToSave)) as StockInRecord;
            const stockRecordToSave: StockInRecord = {
                ...sanitizedRecord,
                ownerId: resolvedOwnerId
            };

            // 2) writeBatch로 Product + StockInRecord 원자적 저장
            const batch = writeBatch(db);
            const productRef = doc(db, COLLECTIONS.PRODUCTS, productToSave.id);
            const stockInRef = doc(db, COLLECTIONS.STOCK_IN, stockRecordToSave.id);
            batch.set(productRef, productToSave, { merge: true });
            batch.set(stockInRef, stockRecordToSave, { merge: true });

            await batch.commit();
            console.log('✅ Batch commit success:', { productId: productToSave.id, stockInId: stockRecordToSave.id });

            // 3) Firestore 성공 후 로컬 state 반영
            setProducts(prev => {
                if (existingProductIndex >= 0) {
                    const updated = [...prev];
                    updated[existingProductIndex] = productToSave;
                    return updated;
                }
                return [...prev, productToSave];
            });

            setStockInHistory(prev => [stockRecordToSave, ...prev]);

            if (record.brand && record.brand.trim() !== '') {
                setTireBrands(prev => prev.includes(record.brand) ? prev : [...prev, record.brand]);
            }

        } catch (err) {
            console.error('❌ 입고 처리 실패 (batch):', err);
            alert(`❌ 입고 처리 실패!\\n${record.productName}\\n네트워크를 확인하고 다시 시도해주세요.`);
        }
    };

    const handleUpdateStockInRecord = (r: StockInRecord) => {
            // Find the old record to calculate the difference
            const oldRecord = stockInHistory.find(old => old.id === r.id);
            
            setStockInHistory(prev => prev.map(old => old.id === r.id ? r : old));
            saveToFirestore<StockInRecord>(COLLECTIONS.STOCK_IN, r)
                .then(() => console.log('✅ Stock-in record updated in Firestore:', r.id))
                .catch((err) => console.error('❌ Failed to update stock-in record in Firestore:', err));
            
            // Update product stock if quantity changed
            if (oldRecord && r.productId) {
                const oldQty = oldRecord.receivedQuantity ?? oldRecord.quantity ?? 0;
                const newQty = r.receivedQuantity ?? r.quantity ?? 0;
                const isConsumed = Boolean(r.consumedAtSaleId);
                
                // Only adjust stock for non-consumed records
                if (!isConsumed && oldQty !== newQty) {
                    const qtyDiff = newQty - oldQty;
                    console.log(`📦 Stock quantity changed for ${r.productName}: ${oldQty} → ${newQty} (diff: ${qtyDiff})`);
                    
                    setProducts(prev => {
                        const productIndex = prev.findIndex(p => p.id === r.productId);
                        if (productIndex < 0) {
                            console.warn('⚠️ Product not found for stock update:', r.productId);
                            return prev;
                        }
                        
                        const updatedProducts = [...prev];
                        const product = updatedProducts[productIndex];
                        const currentStoreStock = product.stockByStore[r.storeId] || 0;
                        const newStoreStock = Math.max(0, currentStoreStock + qtyDiff);
                        const newStockByStore = { ...product.stockByStore, [r.storeId]: newStoreStock };
                        const newTotalStock = (Object.values(newStockByStore) as number[]).reduce((a, b) => a + b, 0);
                        
                        const updatedProduct = { 
                            ...product, 
                            stockByStore: newStockByStore, 
                            stock: newTotalStock 
                        };
                        
                        updatedProducts[productIndex] = updatedProduct;
                        
                        // Save to Firestore
                        saveToFirestore<Product>(COLLECTIONS.PRODUCTS, updatedProduct)
                            .then(() => console.log('✅ Product stock updated after quantity change:', updatedProduct.id, `${currentStoreStock} → ${newStoreStock}`))
                            .catch((err) => console.error('❌ Failed to update product stock:', err));
                        
                        return updatedProducts;
                    });
                }
            }
    };
        const handleDeleteStockInRecord = (id: string) => {
            setStockInHistory(prev => prev.filter(r => r.id !== id));
            deleteFromFirestore(COLLECTIONS.STOCK_IN, id)
                .then(() => console.log('🗑️ Stock-in record deleted:', id))
                .catch((err) => console.error('❌ Failed to delete stock-in record:', err));
        };
  const handleStockTransfer = (pid: string, from: string, to: string, qty: number) => {
      if (!pid || !from || !to) return;
      if (from === to) return;
      if (!Number.isFinite(qty) || qty <= 0) return;

      setProducts(prev => {
          const idx = prev.findIndex(p => p.id === pid);
          if (idx < 0) return prev;
          const updated = [...prev];
          const prod = updated[idx];
          const fromQty = prod.stockByStore[from] || 0;
          if (fromQty < qty) {
              // Not enough stock to transfer
              // Keep state unchanged; consumer UI may show alert
              return prev;
          }
          const newStockByStore = { ...prod.stockByStore };
          newStockByStore[from] = Math.max(0, fromQty - qty);
          newStockByStore[to] = (newStockByStore[to] || 0) + qty;
          const newTotal = (Object.values(newStockByStore) as number[]).reduce((a, b) => a + b, 0);
          const updatedProduct: Product = { ...prod, stockByStore: newStockByStore, stock: newTotal };
          updated[idx] = updatedProduct;
          saveToFirestore<Product>(COLLECTIONS.PRODUCTS, updatedProduct)
            .then(() => console.log('✅ Product transfer saved in Firestore:', updatedProduct.id))
            .catch((err) => console.error('❌ Failed to save product transfer in Firestore:', err));
          return updated;
      });

      // Append transfer record for audit/history
      const prod = products.find(p => p.id === pid);
      const fromStoreName = stores.find(s => s.id === from)?.name || '';
      const toStoreName = stores.find(s => s.id === to)?.name || '';
      const tr: StockTransferRecord = {
          id: `TR-${Date.now()}`,
          date: new Date().toISOString(),
          productId: pid,
          productName: prod?.name || '',
          fromStoreId: from,
          toStoreId: to,
          quantity: qty,
          staffName: currentUser?.name || '',
          fromStoreName,
          toStoreName
      };
      setTransferHistory(prev => [tr, ...prev]);
            saveToFirestore<StockTransferRecord>(COLLECTIONS.TRANSFERS, tr)
                .then(() => console.log('✅ Transfer saved to Firestore:', tr.id))
                .catch((err) => console.error('❌ Failed to save transfer to Firestore:', err));
  };
    const handleAddExpense = (e: ExpenseRecord) => {
            setExpenses(prev => [e, ...prev]);
            saveToFirestore<ExpenseRecord>(COLLECTIONS.EXPENSES, e)
                .then(() => console.log('✅ Expense saved to Firestore:', e.id))
                .catch((err) => console.error('❌ Failed to save expense in Firestore:', err));
    };
    const handleUpdateExpense = (e: ExpenseRecord) => {
            setExpenses(prev => prev.map(old => old.id === e.id ? e : old));
            saveToFirestore<ExpenseRecord>(COLLECTIONS.EXPENSES, e)
                .then(() => console.log('✅ Expense updated in Firestore:', e.id))
                .catch((err) => console.error('❌ Failed to update expense in Firestore:', err));
    };
    const handleRemoveExpense = (id: string) => {
            setExpenses(prev => prev.filter(e => e.id !== id));
            deleteFromFirestore(COLLECTIONS.EXPENSES, id)
                .then(() => console.log('✅ Expense deleted in Firestore:', id))
                .catch((err) => console.error('❌ Failed to delete expense in Firestore:', err));
    };
    const handleUpdateFixedCosts = (updatedCosts: FixedCostConfig[]) => {
            // STORE_ADMIN: 자신 지점의 항목만 저장/삭제, 다른 오너 항목은 그대로 유지
            if (effectiveUser?.role === 'STORE_ADMIN') {
                let ownCosts: FixedCostConfig[] = [];
                let removedOwn: FixedCostConfig[] = [];
                let merged: FixedCostConfig[] = [];

                setFixedCosts(prev => {
                    const isOwnCost = (fc: FixedCostConfig) => {
                        if (!fc.storeId) return true; // storeId가 없으면 공용으로 간주
                        return visibleStoreIds.includes(fc.storeId);
                    };

                    // Set ownerId for all costs being saved
                    ownCosts = updatedCosts.map(cost => ({
                        ...cost,
                        ownerId: effectiveUser.id
                    }));
                    const ownIds = new Set(ownCosts.map(c => c.id));

                    const prevOwn = prev.filter(isOwnCost);
                    removedOwn = prevOwn.filter(fc => !ownIds.has(fc.id));
                    const otherOwnerCosts = prev.filter(fc => !isOwnCost(fc));

                    merged = [...ownCosts, ...otherOwnerCosts];
                    return merged;
                });

                (async () => {
                    try {
                        await Promise.all([
                            ...ownCosts.map(cost => saveToFirestore<FixedCostConfig>(COLLECTIONS.FIXED_COSTS, cost)),
                            ...removedOwn.map(cost => deleteFromFirestore(COLLECTIONS.FIXED_COSTS, cost.id))
                        ]);
                        console.log('✅ Fixed costs synced (owner scope):', {
                            saved: ownCosts.length,
                            removed: removedOwn.length
                        });
                    } catch (err) {
                        console.error('❌ Failed to sync fixed costs (owner scope):', err);
                    }
                })();
                return;
            }

            // SUPER_ADMIN: 전체 업서트 + 제거 (ownerId도 설정)
            let removed: FixedCostConfig[] = [];
            const costsWithOwnerId = updatedCosts.map(cost => ({
                ...cost,
                ownerId: effectiveUser?.id
            }));
            
            setFixedCosts(prev => {
                const newIds = new Set(costsWithOwnerId.map(c => c.id));
                removed = prev.filter(fc => !newIds.has(fc.id));
                return costsWithOwnerId;
            });

            (async () => {
                try {
                    await Promise.all([
                        ...costsWithOwnerId.map(cost => saveToFirestore<FixedCostConfig>(COLLECTIONS.FIXED_COSTS, cost)),
                        ...removed.map(cost => deleteFromFirestore(COLLECTIONS.FIXED_COSTS, cost.id))
                    ]);
                    console.log('✅ Fixed costs synced (super admin):', {
                        saved: costsWithOwnerId.length,
                        removed: removed.length
                    });
                } catch (err) {
                    console.error('❌ Failed to sync fixed costs (super admin):', err);
                }
            })();
    };

    // Shift handlers (Firestore + local)
    const sanitizeShiftPayload = (shift: Shift) => {
        const payload = { ...shift } as Partial<Shift>;
        if (payload.memo === undefined) {
            delete payload.memo;
        }
        return payload as Shift;
    };

    const handleAddShift = async (shift: Shift) => {
        setShifts(prev => [...prev, shift]);
        try {
            await saveToFirestore<Shift>(COLLECTIONS.SHIFTS, sanitizeShiftPayload(shift));
        } catch (err) {
            console.error('❌ Failed to save shift in Firestore:', err);
        }
    };
    const handleUpdateShift = async (shift: Shift) => {
        setShifts(prev => prev.map(s => s.id === shift.id ? shift : s));
        try {
            await saveToFirestore<Shift>(COLLECTIONS.SHIFTS, sanitizeShiftPayload(shift));
        } catch (err) {
            console.error('❌ Failed to update shift in Firestore:', err);
        }
    };
    const handleRemoveShift = async (id: string) => {
        setShifts(prev => prev.filter(s => s.id !== id));
        try {
            await deleteFromFirestore(COLLECTIONS.SHIFTS, id);
        } catch (err) {
            console.error('❌ Failed to delete shift in Firestore:', err);
        }
    };

    // LeaveRequest 핸들러
    const handleAddLeaveRequest = async (req: LeaveRequest) => {
        setLeaveRequests(prev => [...prev, req]);
        try {
            await saveToFirestore<LeaveRequest>(COLLECTIONS.LEAVE_REQUESTS, req);
            console.log('✅ Leave request saved to Firestore:', req.id);
        } catch (err) {
            console.error('❌ Failed to save leave request in Firestore:', err);
        }
    };

    const handleRemoveLeaveRequest = async (id: string) => {
        setLeaveRequests(prev => prev.filter(lr => lr.id !== id));
        try {
            await deleteFromFirestore(COLLECTIONS.LEAVE_REQUESTS, id);
            console.log('✅ Leave request deleted from Firestore:', id);
        } catch (err) {
            console.error('❌ Failed to delete leave request in Firestore:', err);
        }
    };

    // 휴가 신청 거절
    const handleRejectLeave = async (leaveId: string, rejectionReason: string) => {
        const targetLeave = leaveRequests.find(lr => lr.id === leaveId);
        if (!targetLeave) return;

        // 1. LeaveRequest 상태 업데이트
        const rejectedLeave: LeaveRequest = {
            ...targetLeave,
            status: 'rejected',
            rejectionReason
        };

        setLeaveRequests(prev => prev.map(lr => lr.id === leaveId ? rejectedLeave : lr));
        try {
            await saveToFirestore<LeaveRequest>(COLLECTIONS.LEAVE_REQUESTS, rejectedLeave);
        } catch (err) {
            console.error('❌ Failed to reject leave in Firestore:', err);
        }

        alert(`${targetLeave.staffName}의 휴가 신청이 거절되었습니다.`);
    };

    // 휴가 신청 승인
    const handleApproveLeave = async (leaveId: string) => {
        const targetLeave = leaveRequests.find(lr => lr.id === leaveId);
        if (!targetLeave) return;

        // 1. LeaveRequest 상태 업데이트
        const approvedLeave: LeaveRequest = {
            ...targetLeave,
            status: 'approved',
            approvedBy: currentUser?.id,
            approvedAt: new Date().toISOString()
        };

        setLeaveRequests(prev => prev.map(lr => lr.id === leaveId ? approvedLeave : lr));
        try {
            await saveToFirestore<LeaveRequest>(COLLECTIONS.LEAVE_REQUESTS, approvedLeave);
        } catch (err) {
            console.error('❌ Failed to approve leave in Firestore:', err);
        }

        // 2. 승인된 휴무를 Shift로 자동 변환
        const leaveTypeToShiftType: Record<LeaveRequest['type'], Shift['shiftType']> = {
            FULL: 'VACATION',
            HALF_AM: 'HALF',
            HALF_PM: 'HALF'
        };

        const newShift: Shift = {
            id: `SHIFT-LEAVE-${leaveId}`,
            staffId: targetLeave.staffId,
            staffName: targetLeave.staffName,
            storeId: targetLeave.storeId,
            start: `${targetLeave.date}T00:00:00`,
            end: `${targetLeave.date}T23:59:59`,
            shiftType: leaveTypeToShiftType[targetLeave.type] || 'OFF',
            memo: `${targetLeave.type === 'FULL' ? '월차' : '반차'} 승인 (${targetLeave.reason || ''})`
        };

        setShifts(prev => [...prev, newShift]);
        try {
            await saveToFirestore<Shift>(COLLECTIONS.SHIFTS, newShift);
            console.log('✅ Approved leave converted to Shift:', newShift.id);
        } catch (err) {
            console.error('❌ Failed to save shift from approved leave:', err);
        }

        alert(`${targetLeave.staffName}의 휴가 신청이 승인되었습니다.`);
    };
  
  // Navigation & Permissions Logic
  const navItems = useMemo(() => {
    if (effectiveUser?.role === 'SUPER_ADMIN') {
        return [{ id: 'superadmin', label: '매장 관리', icon: LayoutDashboard, show: true, type: 'CORE' }];
    }
    const isAdmin = effectiveUser?.role === 'STORE_ADMIN'; 
    const items = [
      { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, show: true, type: 'CORE' },
      { id: 'pos', label: '판매 (POS)', icon: ShoppingCart, show: true, type: 'CORE' },
      { id: 'reservation', label: '예약 관리', icon: PhoneCall, show: true, type: 'CORE' },
      { id: 'history', label: '판매 내역', icon: List, show: true, type: 'CORE' }, 
      { id: 'tax', label: '세금계산서', icon: FileText, show: true, type: 'CORE' }, 
    { id: 'customers', label: '고객 관리', icon: Users, show: isAdmin && !managerSession, type: 'ADMIN' }, // Admin Only (숨김: 점장 세션)
      { id: 'DIVIDER_1', label: '', icon: X, show: true, type: 'DIVIDER' }, // Divider
      { id: 'inventory', label: '재고 관리', icon: Package, show: true, type: 'CORE' }, 
      { id: 'stockIn', label: '입고 관리', icon: Truck, show: true, type: 'CORE' }, 
      { id: 'financials', label: isAdmin ? '재무/결산' : '지출', icon: PieChart, show: true, type: 'CORE' }, // Dynamic Label
      { id: 'DIVIDER_2', label: '', icon: X, show: true, type: 'DIVIDER' }, // Divider
    { id: 'leave', label: '근무표', icon: Calendar, show: true, type: 'CORE' },
      // Settings: Show only if isAdmin
            { id: 'settings', label: '설정', icon: SettingsIcon, show: isAdmin && !managerSession, type: 'ADMIN' } 
    ];
    return items.filter(item => item.show);
  }, [effectiveUser, staffPermissions]);

  const currentUserPassword = users.find(u => u.id === currentUser?.id)?.password || '';

    const compactDate = useMemo(() => {
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
            return `${month}/${day} (${weekdays[now.getDay()]})`;
    }, []);

    const isMobilePOS = isMobileViewport && activeTab === 'pos';
    const isMobileReservation = isMobileViewport && activeTab === 'reservation';

  // Main Render Logic
  if (viewState === 'LOGIN') {
      return <LoginScreen onLogin={handleLoginWithState} />;
  }

  if (viewState === 'STORE_SELECT' && currentUser) {
      return (
        <StoreSelectionScreen 
            stores={visibleStores} 
            onSelectStore={handleSelectStore} 
            currentUser={currentUser} 
            onLogout={handleFullLogout} 
            validateOwnerPin={handleValidateOwnerPin}
        />
      );
  }

  if (viewState === 'SUPER_ADMIN' && currentUser) {
      return (
          <SuperAdminDashboard 
              stores={stores}
              users={users}
              onCreateOwner={handleCreateOwner}
              onUpdateOwner={handleUpdateOwner}
              onAddBranch={handleAddBranch}
              onResetPassword={handleResetPassword}
              onDeleteStore={handleDeleteStore}
              onDeleteOwner={handleDeleteOwner}
              onLogout={handleFullLogout}
          />
      );
  }

  if (viewState === 'APP' && effectiveUser) {
    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
        {/* Mobile Menu */}
        <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div
                className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />
            <div
                className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85%] bg-white shadow-xl transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <StoreIcon className="text-blue-500" size={22} />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{appTitle}</p>
                                <p className="text-xs text-gray-500 truncate">
                                    {currentStoreId === 'ALL' ? '전체 지점' : stores.find(s => s.id === currentStoreId)?.name || '지점 선택'}
                                </p>
                            </div>
                        </div>
                        <button
                            aria-label="Close menu"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto p-3">
                        <ul className="space-y-1">
                            {navItems.map((item, idx) => {
                                if (item.type === 'DIVIDER') {
                                    return <li key={idx} className="h-px bg-gray-200 my-2" />;
                                }
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <li key={item.id}>
                                        <button
                                            onClick={() => {
                                                setActiveTab(item.id as Tab);
                                                if (item.id === 'history') setHistoryFilter({ type: 'ALL', value: '', label: '전체 판매 내역' });
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors relative
                                                ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
                                        >
                                            <Icon size={20} />
                                            <span className="truncate">{item.label}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    <div className="border-t border-gray-200 px-4 py-3 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${effectiveUser.role === 'STORE_ADMIN' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                {effectiveUser.role === 'STORE_ADMIN' ? <ShieldCheck size={18}/> : <UserCircle size={18}/>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 truncate">{effectiveUser.role === 'STORE_ADMIN' ? (managerSession ? '점장 모드' : '사장님 모드') : '직원 모드'}</p>
                            </div>
                            {effectiveUser.role === 'STORE_ADMIN' ? (
                                <button
                                    onClick={() => { handleLockAdmin(); setIsMobileMenuOpen(false); }}
                                    className="px-3 py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                                >
                                    직원 모드
                                </button>
                            ) : (
                                <button
                                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                                    className="px-3 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                                >
                                    로그아웃
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <aside className={`hidden md:flex ${isSidebarOpen ? 'xl:w-64 md:w-56' : 'w-20'} bg-slate-900 text-white transition-all duration-300 ease-in-out flex-col shadow-xl z-20`}>
            <div className="p-5 flex items-center justify-center md:justify-between border-b border-slate-800 h-16">
            {isSidebarOpen && (
                <div className="hidden md:flex items-center gap-2">
                <StoreIcon className="text-blue-400" size={24} />
                <h1 className="text-xl font-bold tracking-tight text-blue-400 truncate">{appTitle}</h1>
                </div>
            )}
            {!isSidebarOpen && null}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-1 hover:bg-slate-800 rounded-lg transition-colors ${isSidebarOpen ? 'ml-auto' : 'mx-auto'}`}>
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            </div>
            <nav className="flex-1 py-8">
            <ul className="space-y-2 px-3">
                {navItems.map((item, idx) => {
                    if (item.type === 'DIVIDER') {
                        return <div key={idx} className="h-0.5 bg-slate-800 my-4 mx-3"></div>;
                    }
                    const Icon = item.icon;
                    return (
                        <li key={item.id}>
                        <button
                            onClick={() => {
                                setActiveTab(item.id as Tab);
                                if (item.id === 'history') setHistoryFilter({ type: 'ALL', value: '', label: '전체 판매 내역' });
                            }}
                            className={`w-full flex items-center p-4 rounded-lg transition-all duration-200 group relative
                                ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} 
                                ${!isSidebarOpen ? 'justify-center' : 'justify-start'}
                            `}
                        >
                            <Icon size={22} className={`${isSidebarOpen ? 'mr-4' : ''}`} />
                            {isSidebarOpen && (
                                <div className="flex-1 flex justify-between items-center">
                                    <span className="font-medium text-sm tracking-tight sidebar-menu-label">{item.label}</span>
                                </div>
                            )}
                        </button>
                        </li>
                    );
                })}
            </ul>
            </nav>
            <div className="p-5 border-t border-slate-800">
            {isSidebarOpen ? (
                <div className="flex items-center justify-between">
                    <div 
                        className={`flex items-center gap-3 overflow-hidden hidden md:flex rounded-lg p-1.5 transition-colors ${
                            effectiveUser.role === 'STORE_ADMIN' 
                            ? 'hover:bg-blue-900/50 cursor-pointer' 
                            : ''
                        }`}
                        onClick={() => {
                            // Staff profile is not clickable
                        }}
                    >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${effectiveUser.role === 'STORE_ADMIN' ? 'bg-blue-500 text-white ring-2 ring-blue-400' : 'bg-slate-600 text-slate-300'}`}>
                            {effectiveUser.role === 'STORE_ADMIN' ? <ShieldCheck size={18}/> : <UserCircle size={18}/>}
                        </div>
                        <div className="min-w-0">
                            <p className={`text-sm font-bold truncate ${effectiveUser.role === 'STORE_ADMIN' ? 'text-blue-400' : 'text-slate-300'}`}>
                                {effectiveUser.role === 'STORE_ADMIN' ? (managerSession ? '점장 모드' : '사장님(Owner)') : '직원 모드'}
                            </p>
                        </div>
                    </div>
                    {effectiveUser.role === 'STORE_ADMIN' ? (
                        <button onClick={handleLockAdmin} className="text-blue-400 hover:text-white p-1" title="직원 모드로 잠금"><Lock size={18} /></button>
                    ) : (
                        <button onClick={handleLogout} className="text-slate-400 hover:text-white p-1" title="로그아웃"><LogOut size={18} /></button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                     <button 
                        onClick={() => effectiveUser.role === 'STORE_ADMIN' ? handleLockAdmin() : handleLogout()} 
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold transition-colors ${effectiveUser.role === 'STORE_ADMIN' ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-300'}`}
                        title={effectiveUser.role === 'STORE_ADMIN' ? "직원 모드로 전환" : "로그아웃"}
                    >
                        {effectiveUser.role === 'STORE_ADMIN' ? <ShieldCheck size={18}/> : <LogOut size={18}/>}
                    </button>
                </div>
            )}
            </div>
        </aside>

        <main className="flex-1 flex flex-col bg-gray-50 relative overflow-hidden">
            <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-8 justify-between relative md:sticky md:top-0 z-10 shadow-sm flex-shrink-0 print:hidden">
            <div className="flex items-center gap-3">
                <button className={`md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg text-gray-600`} onClick={() => setIsMobileMenuOpen(true)}><Menu size={24} /></button>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 truncate tracking-tight">{activeTab === 'history' ? '판매 내역' : navItems.find(i => i.id === activeTab)?.label}</h2>
            </div>
            <div className="flex items-center gap-4 text-xs md:text-sm text-gray-500 text-right">
                <div className="hidden sm:flex items-center gap-2 relative" data-store-dropdown>
                    {(sessionRole === 'STORE_ADMIN' && !managerSession) ? (
                        <>
                            <button 
                                onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                                className="flex items-center gap-1 font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition-colors"
                                title="지점 변경"
                            >
                                <StoreIcon size={14} />
                                {currentStoreId === 'ALL' ? '전체 지점 통합' : stores.find(s => s.id === currentStoreId)?.name}
                                <span className="text-blue-600">▼</span>
                            </button>
                            {isStoreDropdownOpen && (
                                <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                                    <button
                                        onClick={() => {
                                            setCurrentStoreId('ALL');
                                            setIsStoreDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg transition-colors ${currentStoreId === 'ALL' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-700'}`}
                                    >
                                        전체 지점 통합
                                    </button>
                                    {stores.filter(s => s.ownerId === currentUser?.id).map(store => (
                                        <button
                                            key={store.id}
                                            onClick={() => {
                                                setCurrentStoreId(store.id);
                                                setIsStoreDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 last:rounded-b-lg transition-colors ${currentStoreId === store.id ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-700'}`}
                                        >
                                            {store.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-1 font-bold text-slate-500 px-2 py-1 rounded">
                            <StoreIcon size={14} />
                            {currentStoreId === 'ALL' ? '전체 지점 통합' : stores.find(s => s.id === currentStoreId)?.name || '지점 선택됨'}
                        </div>
                    )}
                    {sessionRole === 'STORE_ADMIN' && !managerSession && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">사장님 모드</span>
                    )}
                    {managerSession && (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">점장 모드</span>
                    )}
                </div>
                {!(isMobilePOS || isMobileReservation) && (
                    sessionRole === 'STAFF' ? (
                        <button
                            onClick={() => { setIsAdminModalOpen(true); setPinInput(''); setPinError(''); }}
                            className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-800"
                        >
                            관리자 모드
                        </button>
                    ) : (
                        <button
                            onClick={() => { setSessionRole('STAFF'); setManagerSession(false); setActiveTab('pos'); }}
                            className="border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-100"
                        >
                            관리자 종료
                        </button>
                    )
                )}
                <span className="text-[11px] leading-tight text-gray-400 font-medium">{compactDate}</span>
            </div>
            </header>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 max-w-7xl mx-auto w-full print:p-0 print:overflow-visible">
            {activeTab === 'dashboard' && (
                <>
                    {effectiveUser?.role === 'STORE_ADMIN' ? (
                        <AdminDashboard
                            sales={visibleSales} 
                            stores={visibleStores}
                            staffList={visibleStaff}
                            leaveRequests={visibleLeaveRequests}
                            products={products}
                            shifts={shifts}
                            onNavigateToLeaveSchedule={() => {
                              localStorage.setItem('scheduleDefaultType', 'OFF');
                              setActiveTab('leave');
                            }}
                        />
                    ) : (
                        <Dashboard 
                            sales={visibleSales} 
                            stores={visibleStores} 
                            onNavigateToHistory={(f) => { setHistoryFilter(f); setActiveTab('history'); }}
                            currentUser={effectiveUser} 
                            currentStoreId={currentStoreId}
                            stockInHistory={visibleStockHistory} 
                            transferHistory={transferHistory} 
                            expenses={visibleExpenses}
                            isSidebarOpen={isSidebarOpen} 
                            leaveRequests={visibleLeaveRequests}
                            shifts={shifts}
                        />
                    )}
                </>
            )}
            {activeTab === 'admin' && (
                <AdminDashboard
                sales={visibleSales} 
                stores={visibleStores}
                staffList={visibleStaff}
                leaveRequests={visibleLeaveRequests}
                products={products}
                shifts={shifts}
                />
            )}
            {activeTab === 'pos' && (
                <POS 
                products={visibleProducts} stores={visibleStores} categories={categories} tireBrands={tireBrands}
                currentUser={effectiveUser} currentStoreId={currentStoreId}
                staffList={visibleStaff}
                shifts={shifts}
                customers={visibleCustomers} tireModels={TIRE_MODELS}
                onSaleComplete={handleSaleComplete} onAddCategory={(c) => setCategories([...categories, c])}
                />
            )}
            {activeTab === 'reservation' && (
                <ReservationSystem
                    reservations={reservations} onAddReservation={handleAddReservation} onUpdateReservation={handleUpdateReservation} onRemoveReservation={handleRemoveReservation}
                    products={visibleProducts} currentStoreId={currentStoreId} currentUser={effectiveUser} stores={visibleStores} tireBrands={tireBrands} tireModels={TIRE_MODELS}
                    isMobile={isMobileViewport}
                />
            )}
            {activeTab === 'leave' && (
                <ScheduleAndLeave
                    staffList={visibleStaff}
                    leaveRequests={visibleLeaveRequests}
                    stores={visibleStores}
                    shifts={shifts.filter(s => visibleStoreIds.includes(s.storeId))}
                    currentStoreId={currentStoreId}
                    onShiftRangeChange={handleShiftRangeChange}
                    onAddShift={handleAddShift}
                    onUpdateShift={handleUpdateShift}
                    onRemoveShift={handleRemoveShift}
                    onApproveLeave={handleApproveLeave}
                    onRejectLeave={handleRejectLeave}
                    onAddLeaveRequest={handleAddLeaveRequest}
                    onRemoveLeaveRequest={handleRemoveLeaveRequest}
                    currentUser={effectiveUser}
                />
            )}
            {activeTab === 'stockIn' && (
                <StockIn
                    stores={visibleStores} categories={categories} tireBrands={tireBrands} products={visibleProducts}
                    onStockIn={handleStockIn} currentUser={effectiveUser} stockInHistory={visibleStockHistory} currentStoreId={currentStoreId} onUpdateStockInRecord={handleUpdateStockInRecord} onDeleteStockInRecord={handleDeleteStockInRecord} tireModels={TIRE_MODELS}
                />
            )}
            {(activeTab === 'inventory') && (
                <Inventory 
                products={visibleProducts} stores={visibleStores} categories={categories}
                tireBrands={tireBrands}
                onUpdate={(p) => setProducts(products.map(old => old.id === p.id ? p : old))} 
                onAdd={(p) => setProducts([...products, p])} 
                onDelete={(productId) => setProducts(products.filter(p => p.id !== productId))}
                onAddCategory={(c) => setCategories([...categories, c])}
                currentUser={effectiveUser} currentStoreId={currentStoreId} onStockTransfer={handleStockTransfer}
                />
            )}
            {(activeTab === 'tax') && 
                <TaxInvoice sales={visibleSales.filter(s => currentStoreId === 'ALL' || s.storeId === currentStoreId)} onUpdateSale={handleUpdateSale} />
            }
            {(activeTab === 'history') && (
                <SalesHistory 
                sales={visibleSales} stores={visibleStores} products={visibleProducts} filter={historyFilter} 
                onBack={() => setActiveTab('dashboard')} currentUser={effectiveUser} currentStoreId={currentStoreId}
                stockInHistory={visibleStockHistory} onSwapProduct={() => {/* swap logic */}}
                onUpdateSale={handleUpdateSale} onCancelSale={handleCancelSale} onDeleteSale={handleDeleteSale} onQuickAddSale={handleSaleComplete} onStockIn={handleStockIn}
                categories={categories} tireBrands={tireBrands} tireModels={TIRE_MODELS}
                shifts={shifts} staffList={staffList}
                />
            )}
            {(activeTab === 'financials') && (
                <Financials 
                    sales={visibleSales} 
                    stockInHistory={visibleStockHistory}
                    onUpdateStockInRecord={handleUpdateStockInRecord}
                    expenses={visibleExpenses} onAddExpense={handleAddExpense} onUpdateExpense={handleUpdateExpense} onRemoveExpense={handleRemoveExpense}
                    fixedCosts={fixedCosts} onUpdateFixedCosts={handleUpdateFixedCosts} onNavigateToHistory={() => {}} currentUser={effectiveUser}
                    stores={visibleStores} currentStoreId={currentStoreId}
                />
            )}
            {(activeTab === 'customers' && effectiveUser.role === 'STORE_ADMIN') && (
                <CustomerList 
                    customers={visibleCustomers} 
                    sales={visibleSales}
                />
            )}
            {activeTab === 'settings' && effectiveUser.role === 'STORE_ADMIN' && (
                <Settings
                stores={visibleStores} onAddStore={handleAddStore} onUpdateStore={handleUpdateStore} onRemoveStore={handleRemoveStore}
                staffPermissions={staffPermissions} onUpdatePermissions={setStaffPermissions}
                currentAdminPassword={currentUserPassword} onUpdatePassword={handleUpdatePassword}
                currentOwnerPin={ownerPin} onUpdateOwnerPin={handleUpdateOwnerPin}
                currentManagerPin={storePin} onUpdateManagerPin={handleUpdateManagerPin}
                staffList={visibleStaff} onAddStaff={handleAddStaff} onRemoveStaff={handleRemoveStaff}
                currentStoreId={currentStoreId}
                ownerId={currentUser?.id || ''}
                currentSubscription={null}
                billingKeys={[]}
                paymentHistory={[]}
                onSelectSubscriptionPlan={async () => {}}
                onCancelSubscription={async () => {}}
                />
            )}
            </div>
        </main>
        {isAdminModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">관리자 PIN 입력</h3>
                    <p className="text-sm text-slate-600 mb-4">사장님 PIN이면 전체 지점, 점장 PIN이면 현재 지점 권한으로 전환됩니다.</p>
                    <form onSubmit={handlePinSubmit} className="space-y-4">
                        <input
                            autoFocus
                            type="password"
                            value={pinInput}
                            onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                            placeholder="숫자 PIN 입력"
                        />
                        {pinError && <p className="text-sm text-red-600">{pinError}</p>}
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { setIsAdminModalOpen(false); setPinInput(''); setPinError(''); }} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50">닫기</button>
                            <button type="submit" className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800">확인</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </div>
    );
  }

  return null; // Fallback
};

export default App;
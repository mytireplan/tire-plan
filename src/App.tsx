import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LayoutDashboard, ShoppingCart, Package, FileText, Menu, X, Store as StoreIcon, LogOut, UserCircle, List, Lock, Settings as SettingsIcon, Users, Truck, PieChart, Calendar, PhoneCall, ShieldCheck } from 'lucide-react';
import { orderBy, where, limit, collection, query, getDocs, type QueryConstraint } from 'firebase/firestore';
import { db } from './firebase';
// 1. 진짜 물건(값)인 PaymentMethod는 그냥 가져옵니다. (type 없음!)
import { PaymentMethod } from './types';

// 2. 설계도(Type)인 친구들은 type을 붙여서 가져옵니다.
import type { Customer, Sale, Product, StockInRecord, User, UserRole, StoreAccount, Staff, ExpenseRecord, FixedCostConfig, LeaveRequest, Reservation, StaffPermissions, StockTransferRecord, SalesFilter, Shift } from './types';

// Firebase imports
import { saveBulkToFirestore, getCollectionPage, getAllFromFirestore, saveToFirestore, deleteFromFirestore, COLLECTIONS, migrateLocalStorageToFirestore, subscribeToQuery } from './utils/firestore'; 
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
import StoreSelectionScreen from './components/StoreSelectionScreen';

// Mock Password Hash Utility (Simple Simulation)
const mockHash = (pwd: string) => btoa(pwd); // Base64 encoding for demo purposes
const DEFAULT_MANAGER_PIN = '4567';

// Initial Stores linked to Owner IDs (Updated IDs to 25xxxx format)
const INITIAL_STORE_ACCOUNTS: StoreAccount[] = [
    { id: 'ST-1', code: '250001', name: '서울 강남 본점', region: '01', regionName: '서울', passwordHash: mockHash('4567'), isActive: true, ownerId: '250001' },
    { id: 'ST-2', code: '250001', name: '경기 수원점', region: '02', regionName: '경기', passwordHash: mockHash('4567'), isActive: true, ownerId: '250001' },
    { id: 'ST-3', code: '250001', name: '인천 송도점', region: '03', regionName: '인천', passwordHash: mockHash('4567'), isActive: true, ownerId: '250001' },
];

// Auth Database (Mock) - Owners and Master ONLY
const MOCK_AUTH_USERS: { id: string; password: string; ownerPin?: string; name: string; role: UserRole; storeId?: string; phoneNumber?: string; joinDate: string }[] = [
    { id: '250001', password: '1234', ownerPin: '1234', name: '김대표', role: 'STORE_ADMIN', phoneNumber: '010-1234-5678', joinDate: '2025.05.01' },
    { id: '250002', password: '1234', ownerPin: '1234', name: '박사장', role: 'STORE_ADMIN', phoneNumber: '010-9876-5432', joinDate: '2025.05.02' },
    { id: '999999', password: '1234', ownerPin: '1234', name: 'Master', role: 'SUPER_ADMIN', joinDate: '2025.01.01' },
];

// Staff Database (Entities, NOT Login Users)
const INITIAL_STAFF: Staff[] = [
    { id: 'staff_1', name: '이정비', isActive: true },
    { id: 'staff_2', name: '박매니저', isActive: true },
    { id: 'staff_3', name: '최신입', isActive: true },
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

const TIRE_SPECS = [
  '155/70R13', '165/60R14', '175/50R15', '185/65R14',
  '195/65R15', '205/55R16', '205/60R16', '185/65R15', '195/60R16', '215/60R16',
  '215/55R17', '225/55R17', '215/50R17', '225/50R17', '225/60R17', '235/55R17', '225/45R17', '215/45R17',
  '245/45R18', '235/45R18', '225/45R18', '235/60R18', '225/55R18', '245/50R18', '225/40R18', '245/40R18', '235/50R18', '255/55R18',
  '245/40R19', '275/36R19', '245/45R19', '275/40R19', '235/55R19', '255/50R19', '235/45R19', '255/45R19', '225/55R19', '235/50R19',
  '255/50R20', '265/45R20', '245/45R20', '255/45R20', '275/40R20', '265/40R21', '265/50R20', '275/45R20', '295/35R21', '235/55R20',
  '145R13', '195/70R15', '195R15', '205/70R15', '215/70R16', '215/70R15'
];

// Normalize legacy categories (merge '부품/수리' into '기타')
const normalizeCategory = (category: string) => category === '부품/수리' ? '기타' : category;
const DEFAULT_OWNER_ID = '250001';
const normalizeProducts = (list: Product[]) => list.map(p => ({ ...p, category: normalizeCategory(p.category) }));

const generateInitialProducts = (): Product[] => {
    const products: Product[] = [];
    let idCounter = 1;
    products.push({
        id: '99999',
        name: '우선결제_임시',
        brand: '기타',
        category: '기타', 
        price: 0,
        stock: 9999, 
        stockByStore: { 'ST-1': 9999, 'ST-2': 9999, 'ST-3': 9999 },
        specification: '규격미정',
        ownerId: DEFAULT_OWNER_ID
    });
    Object.entries(TIRE_MODELS).forEach(([brand, models]) => {
        models.slice(0, 5).forEach(modelName => {
            products.push({
                id: String(idCounter++),
                brand: brand,
                name: modelName,
                price: 100000 + Math.floor(Math.random() * 200000), 
                stock: 20 + Math.floor(Math.random() * 30),
                category: '타이어',
                stockByStore: { 'ST-1': 10 + Math.floor(Math.random() * 15), 'ST-2': 10 + Math.floor(Math.random() * 15), 'ST-3': 5 },
                specification: TIRE_SPECS[Math.floor(Math.random() * TIRE_SPECS.length)],
                ownerId: DEFAULT_OWNER_ID
            });
        });
    });
    products.push(
        { id: '101', brand: '기타', name: '엔진오일 교환 (합성유)', price: 80000, stock: 100, category: '기타', stockByStore: { 'ST-1': 50, 'ST-2': 50, 'ST-3': 0 }, ownerId: DEFAULT_OWNER_ID }, 
        { id: '102', brand: '기타', name: '브레이크 패드 교체 (전륜)', price: 120000, stock: 15, category: '기타', stockByStore: { 'ST-1': 10, 'ST-2': 5, 'ST-3': 0 }, ownerId: DEFAULT_OWNER_ID },
        { id: '103', brand: '기타', name: '와이퍼 세트 (Premium)', price: 35000, stock: 50, category: '기타', stockByStore: { 'ST-1': 25, 'ST-2': 25, 'ST-3': 0 }, ownerId: DEFAULT_OWNER_ID },
        { id: '104', brand: '기타', name: '휠 밸런스 조정', price: 20000, stock: 999, category: '기타', stockByStore: { 'ST-1': 999, 'ST-2': 999, 'ST-3': 999 }, ownerId: DEFAULT_OWNER_ID }
    );
    return products;
};

const INITIAL_PRODUCTS: Product[] = normalizeProducts(generateInitialProducts());

const generateMockStockHistory = (products: Product[]): StockInRecord[] => {
  const records: StockInRecord[] = [];
  const suppliers = ['한국타이어 본사', '금호타이어 물류', '넥센타이어 강남지사', '미쉐린 코리아', '파츠모아'];
  products.forEach((prod, idx) => {
    if (prod.id === '99999') return; 
    const purchasePrice = Math.floor(prod.price * (0.6 + Math.random() * 0.05));
    const factoryPrice = Math.floor(prod.price * 0.75);
    records.push({
      id: `INIT-IN-1-${idx}`,
      date: '2023-01-01', 
      storeId: 'ST-1',
      supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
      category: prod.category,
      brand: prod.brand || '기타',
      productName: prod.name,
      specification: prod.specification || '',
      quantity: 50,
      factoryPrice: factoryPrice,
      purchasePrice: purchasePrice 
    });
    // Add for ST-2
    records.push({
      id: `INIT-IN-2-${idx}`,
      date: '2023-01-01',
      storeId: 'ST-2',
      supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
      category: prod.category,
      brand: prod.brand || '기타',
      productName: prod.name,
      specification: prod.specification || '',
      quantity: 50,
      factoryPrice: factoryPrice,
      purchasePrice: purchasePrice
    });
  });
  return records;
};

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
        
        expenses.push({
            id: `E-${date.getTime()}`,
            date: date.toISOString().slice(0, 10),
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
    const toDate = (offset: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() + offset);
        return d.toISOString().split('T')[0];
    };
    return [
        {
            id: 'L-1',
            date: toDate(2),
            staffId: 'staff_1',
            staffName: '이정비',
            type: 'FULL',
            reason: '개인 사정',
            createdAt: new Date().toISOString()
        },
        {
            id: 'L-2',
            date: toDate(5),
            staffId: 'staff_2',
            staffName: '박매니저',
            type: 'HALF_AM',
            reason: '병원 검진',
            createdAt: new Date().toISOString()
        },
        {
            id: 'L-3',
            date: toDate(7),
            staffId: 'staff_3',
            staffName: '최신입',
            type: 'FULL',
            reason: '가족 행사',
            createdAt: new Date().toISOString()
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
    { id: 'FC1', title: '월세(본점)', amount: 2500000, day: 1, category: '고정지출' },
    { id: 'FC2', title: '인터넷/통신', amount: 55000, day: 25, category: '공과금' },
    { id: 'FC3', title: '전기/가스 요금', amount: 180000, day: 20, category: '공과금' },
    { id: 'FC4', title: '보험료(화재/배상)', amount: 90000, day: 10, category: '고정지출' },
    { id: 'FC5', title: '보안/경비 서비스', amount: 65000, day: 15, category: '기타' },
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

type Tab = 'dashboard' | 'pos' | 'reservation' | 'inventory' | 'stockIn' | 'tax' | 'history' | 'settings' | 'customers' | 'financials' | 'leave' | 'superadmin';

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
        const todayISO = today.toISOString().slice(0, 10); // YYYY-MM-DD

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
  
  // Initialize Users with Join Date
        type OwnerAccount = {id: string, name: string, role: UserRole, storeId?: string, password: string, ownerPin?: string, phoneNumber?: string, joinDate: string};

        const [users, setUsers] = useState<OwnerAccount[]>(
            MOCK_AUTH_USERS.map(u => ({...u, joinDate: u.joinDate || '2025.01.01', ownerPin: u.ownerPin || u.password }))
    );
  
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
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(INITIAL_EXPENSES);
  const [fixedCosts, setFixedCosts] = useState<FixedCostConfig[]>(INITIAL_FIXED_COSTS);
  const [historyFilter, setHistoryFilter] = useState<SalesFilter>({ type: 'ALL', value: '', label: '전체 판매 내역' });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [reservations, setReservations] = useState<Reservation[]>(INITIAL_RESERVATIONS);
    const reservationUnsubRef = useRef<(() => void) | null>(null);
    const shiftsUnsubRef = useRef<(() => void) | null>(null);

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

                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);

                const todaySalesPromise = getDocs(
                    query(
                        collection(db, COLLECTIONS.SALES),
                        orderBy('date', 'desc'),
                        where('date', '>=', todayStart.toISOString()),
                        where('date', '<=', todayEnd.toISOString())
                    )
                ).then(snapshot => snapshot.docs.map(d => d.data() as Sale));

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
                    firestoreSalesToday,
                    firestoreCustomersAll
                ] = await Promise.all([
                    getCollectionPage<OwnerAccount>(COLLECTIONS.OWNERS, { pageSize: PAGE_SIZE, orderByField: 'id' }),
                    getCollectionPage<StoreAccount>(COLLECTIONS.STORES, { pageSize: PAGE_SIZE }),
                    getCollectionPage<Product>(COLLECTIONS.PRODUCTS, { pageSize: PAGE_SIZE, orderByField: 'id' }),
                    getCollectionPage<StockInRecord>(COLLECTIONS.STOCK_IN, { pageSize: PAGE_SIZE, orderByField: 'date', direction: 'desc' }),
                    getCollectionPage<ExpenseRecord>(COLLECTIONS.EXPENSES, { pageSize: PAGE_SIZE, orderByField: 'date', direction: 'desc' }),
                    getCollectionPage<FixedCostConfig>(COLLECTIONS.FIXED_COSTS, { pageSize: PAGE_SIZE, orderByField: 'id' }),
                    getCollectionPage<LeaveRequest>(COLLECTIONS.LEAVE_REQUESTS, { pageSize: PAGE_SIZE, orderByField: 'createdAt', direction: 'desc' }),
                    getCollectionPage<Reservation>(COLLECTIONS.RESERVATIONS, { pageSize: PAGE_SIZE, orderByField: 'id' }),
                    getCollectionPage<StockTransferRecord>(COLLECTIONS.TRANSFERS, { pageSize: PAGE_SIZE, orderByField: 'date', direction: 'desc' }),
                    getCollectionPage<Staff>(COLLECTIONS.STAFF, { pageSize: PAGE_SIZE, orderByField: 'id' }),
                    todaySalesPromise,
                    getAllFromFirestore<Customer>(COLLECTIONS.CUSTOMERS)
                ]);

                const normalizedFetchedProducts = normalizeProducts(firestoreProductsPage.data);

                if (SHOULD_SEED_DEMO) {
                    // 빈 컬렉션만 초기 시드 후 상태 설정 (기존 데이터는 절대 덮어쓰지 않음)
                    await seedIfEmpty<OwnerAccount>('owners', COLLECTIONS.OWNERS, firestoreOwners.data, users, setUsers);
                    await seedIfEmpty<StoreAccount>('stores', COLLECTIONS.STORES, firestoreStores.data, INITIAL_STORE_ACCOUNTS, setStores);
                    await seedIfEmpty<Product>('products', COLLECTIONS.PRODUCTS, normalizedFetchedProducts, INITIAL_PRODUCTS, (data) => setProducts(normalizeProducts(data)));
                    await seedIfEmpty<Sale>('sales', COLLECTIONS.SALES, firestoreSalesToday, INITIAL_SALES, setSales);
                    await seedIfEmpty<Customer>('customers', COLLECTIONS.CUSTOMERS, firestoreCustomersAll, INITIAL_CUSTOMERS, setCustomers);
                    await seedIfEmpty<StockInRecord>('stock-in history', COLLECTIONS.STOCK_IN, firestoreStockInPage.data, INITIAL_STOCK_HISTORY, setStockInHistory);
                    await seedIfEmpty<ExpenseRecord>('expenses', COLLECTIONS.EXPENSES, firestoreExpensesPage.data, INITIAL_EXPENSES, setExpenses);
                    await seedIfEmpty<FixedCostConfig>('fixed costs', COLLECTIONS.FIXED_COSTS, firestoreFixedCosts.data, INITIAL_FIXED_COSTS, setFixedCosts);
                    await seedIfEmpty<LeaveRequest>('leave requests', COLLECTIONS.LEAVE_REQUESTS, firestoreLeaveRequestsPage.data, INITIAL_LEAVE_REQUESTS, setLeaveRequests);
                    await seedIfEmpty<Reservation>('reservations', COLLECTIONS.RESERVATIONS, firestoreReservationsPage.data, INITIAL_RESERVATIONS, setReservations);
                    await seedIfEmpty<StockTransferRecord>('stock transfers', COLLECTIONS.TRANSFERS, firestoreTransfersPage.data, INITIAL_TRANSFER_HISTORY || [], setTransferHistory);
                    await seedIfEmpty<Staff>('staff', COLLECTIONS.STAFF, firestoreStaffPage.data, INITIAL_STAFF, setStaffList);
                } else {
                    // 프로덕션에서는 Firestore 값만 사용 (비어 있어도 시드하지 않음)
                    setUsers(firestoreOwners.data);
                    setStores(firestoreStores.data);
                    setProducts(normalizedFetchedProducts);
                    setSales(firestoreSalesToday.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setCustomers(firestoreCustomersAll);
                    setStockInHistory(firestoreStockInPage.data);
                    setExpenses(firestoreExpensesPage.data);
                    setFixedCosts(firestoreFixedCosts.data);
                    setLeaveRequests(firestoreLeaveRequestsPage.data);
                    setReservations(firestoreReservationsPage.data);
                    setTransferHistory(firestoreTransfersPage.data);
                    setStaffList(firestoreStaffPage.data);
                }

                console.log('✅ Initial data loaded (paged, one-time fetch)');
            } catch (error) {
                console.error('❌ Error loading/seeding data from Firestore:', error);
            }
        };

        initializeData();
    }, []);

  // 데이터 변경 시 Firestore 자동 저장
    // Removed bulk auto-save effects to avoid duplicate writes with real-time subscriptions.

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

      const isSeedProduct = (product: Product) => product.ownerId === DEFAULT_OWNER_ID;

      if (currentUser.role === 'SUPER_ADMIN') {
          // Super admin: show user-added products only, never seeded demo items
          return products.filter(p => !isSeedProduct(p));
      }

      const ownerId = currentUser.id;
      // Owner/staff: see their own products (legacy ownerless included), hide seeded demo items
      return products.filter(p => !isSeedProduct(p) && (!p.ownerId || p.ownerId === ownerId));
  }, [products, currentUser]);

  const visibleStockHistory = useMemo(() => {
      if (currentUser?.role === 'SUPER_ADMIN') return stockInHistory;
      return stockInHistory.filter(r => visibleStoreIds.includes(r.storeId));
  }, [stockInHistory, visibleStoreIds, currentUser]);

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

  const handleLoginWithState = async (id: string, password: string): Promise<boolean> => {
      // Check Users State (includes Master account)
      const user = users.find(u => u.id === id);
      if (user && user.password === password) {
          const userData: User = { id: user.id, name: user.name, role: user.role, storeId: user.storeId };
          setCurrentUser(userData);
          if (user.role === 'STORE_ADMIN') {
              setViewState('STORE_SELECT');
              setSessionRole('STAFF');
          } else if (user.role === 'SUPER_ADMIN') {
              setCurrentStoreId('ALL');
              setViewState('SUPER_ADMIN');
              setSessionRole('SUPER_ADMIN');
          }
          return true;
      }
      return false;
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

  const handleLogout = () => {
    // If we are in the App, return to Store Selection
    if (viewState === 'APP' && currentUser?.role === 'STORE_ADMIN') {
        setViewState('STORE_SELECT');
        setCurrentStoreId('');
        setSessionRole('STAFF'); // Reset session role
        setActiveTab('dashboard');
        setIsMobileMenuOpen(false);
    } else {
        // Full Logout
        setCurrentUser(null);
        setCurrentStoreId('');
        setActiveTab('dashboard');
        setIsMobileMenuOpen(false);
        setViewState('LOGIN');
    }
  };
  
  const handleFullLogout = () => {
      setCurrentUser(null);
      setCurrentStoreId('');
      setViewState('LOGIN');
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
      const newStaff: Staff = {
          id: `staff_${Date.now()}`,
          name,
          isActive: true
      };
      setStaffList([...staffList, newStaff]);
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
        const adjustInventory = options?.adjustInventory !== false;
        const saleToSave: Sale = { ...newSale, inventoryAdjusted: adjustInventory };

        setSales(prev => [saleToSave, ...prev]);
        saveToFirestore<Sale>(COLLECTIONS.SALES, saleToSave)
                        .then(() => console.log('✅ Sale saved to Firestore:', saleToSave.id))
                        .catch((err) => console.error('❌ Failed to save sale to Firestore:', err));
    
    // Add New Customer if not exists (with Owner Scope)
    if (saleToSave.customer && currentUser) {
        const custPhone = saleToSave.customer.phoneNumber;
        const existing = customers.find(c => c.phoneNumber === custPhone && c.ownerId === currentUser.id);
        
        if (!existing) {
            const newCustomer: Customer = {
                id: `C-${Date.now()}`,
                name: saleToSave.customer.name,
                phoneNumber: saleToSave.customer.phoneNumber,
                carModel: saleToSave.customer.carModel,
                vehicleNumber: saleToSave.customer.vehicleNumber,
                totalSpent: saleToSave.totalAmount,
                lastVisitDate: saleToSave.date,
                visitCount: 1,
                businessNumber: saleToSave.customer.businessNumber,
                companyName: saleToSave.customer.companyName,
                email: saleToSave.customer.email,
                ownerId: currentUser.id // Link to current Owner
            };
            setCustomers(prev => [...prev, newCustomer]);
            saveToFirestore<Customer>(COLLECTIONS.CUSTOMERS, newCustomer)
              .then(() => console.log('✅ Customer saved to Firestore:', newCustomer.id))
              .catch((err) => console.error('❌ Failed to save customer to Firestore:', err));
        } else {
            // Update existing customer stats
            let updatedCustomer: Customer | null = null;
            setCustomers(prev => prev.map(c => {
                if (c.phoneNumber === custPhone && c.ownerId === currentUser.id) {
                    const updated = {
                        ...c,
                        totalSpent: c.totalSpent + saleToSave.totalAmount,
                        visitCount: c.visitCount + 1,
                        lastVisitDate: saleToSave.date
                    } as Customer;
                    updatedCustomer = updated;
                    return updated;
                }
                return c;
            }));
            if (updatedCustomer) {
              saveToFirestore<Customer>(COLLECTIONS.CUSTOMERS, updatedCustomer)
                .then(() => console.log('✅ Customer updated in Firestore:', updatedCustomer?.id))
                .catch((err) => console.error('❌ Failed to update customer in Firestore:', err));
            }
        }
    }

        if (adjustInventory) {
            setProducts(prevProducts => {
                return prevProducts.map(prod => {
                    const soldItem = saleToSave.items.find(item => item.productId === prod.id);
                    if (soldItem) {
                        if (prod.id === '99999') return prod;
                        const currentStoreStock = prod.stockByStore[saleToSave.storeId] || 0;
                        if (currentStoreStock > 900) return prod;
                        const newStoreStock = Math.max(0, currentStoreStock - soldItem.quantity);
                        const newStockByStore = { ...prod.stockByStore, [saleToSave.storeId]: newStoreStock };
                        const newTotalStock = (Object.values(newStockByStore) as number[]).reduce((a, b) => a + b, 0);
                        return { ...prod, stockByStore: newStockByStore, stock: newTotalStock };
                    }
                    return prod;
                });
            });
        }
  };

  const handleUpdateSale = (updatedSale: Sale) => {
      // Find previous sale to compute stock deltas
      const prevSale = sales.find(s => s.id === updatedSale.id);

      // Update sale record
      setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
    saveToFirestore<Sale>(COLLECTIONS.SALES, updatedSale)
      .then(() => console.log('✅ Sale updated in Firestore:', updatedSale.id))
      .catch((err) => console.error('❌ Failed to update sale in Firestore:', err));

      // If we have a previous sale, reconcile inventory differences when inventory is tracked
      if (prevSale) {
          const storeId = updatedSale.storeId;
          const prevTracked = prevSale.inventoryAdjusted !== false;
          const newTracked = updatedSale.inventoryAdjusted !== false;

          if (prevTracked || newTracked) {
              const prevQtyMap: Record<string, number> = {};
              prevSale.items.forEach(it => { prevQtyMap[it.productId] = (prevQtyMap[it.productId] || 0) + it.quantity; });
              const newQtyMap: Record<string, number> = {};
              updatedSale.items.forEach(it => { newQtyMap[it.productId] = (newQtyMap[it.productId] || 0) + it.quantity; });

              const allProductIds = new Set<string>([...Object.keys(prevQtyMap), ...Object.keys(newQtyMap)]);

              setProducts(prevProducts => prevProducts.map(prod => {
                  if (!allProductIds.has(prod.id) || prod.id === '99999') return prod;
                  const oldQty = prevTracked ? (prevQtyMap[prod.id] || 0) : 0;
                  const newQty = newTracked ? (newQtyMap[prod.id] || 0) : 0;
                  const delta = newQty - oldQty; // positive => more sold now -> reduce stock

                  const currentStoreStock = prod.stockByStore[storeId] || 0;
                  const updatedStoreStock = Math.max(0, currentStoreStock - delta);
                  const newStockByStore = { ...prod.stockByStore, [storeId]: updatedStoreStock };
                  const newTotalStock = (Object.values(newStockByStore) as number[]).reduce((a, b) => a + b, 0);
                  return { ...prod, stockByStore: newStockByStore, stock: newTotalStock };
              }));
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
  const handleStockIn = (record: StockInRecord, sellingPrice?: number, forceProductId?: string) => {
      setStockInHistory(prev => [record, ...prev]);
    saveToFirestore<StockInRecord>(COLLECTIONS.STOCK_IN, record)
      .then(() => console.log('✅ Stock-in saved to Firestore:', record.id))
      .catch((err) => console.error('❌ Failed to save stock-in to Firestore:', err));
      // Ensure brand is added to global tireBrands list so other views (Inventory/POS) see it
      if (record.brand && record.brand.trim() !== '') {
          setTireBrands(prev => prev.includes(record.brand) ? prev : [...prev, record.brand]);
      }
      const recordOwnerId = stores.find(s => s.id === record.storeId)?.ownerId || currentUser?.id || '';
      setProducts(prev => {
        const existingProductIndex = prev.findIndex(p => {
            if (forceProductId) return p.id === forceProductId;
            if (p.specification && record.specification) return p.name === record.productName && p.specification === record.specification;
            return p.name === record.productName;
        });
        if (existingProductIndex >= 0) {
            const updatedProducts = [...prev];
            const product = updatedProducts[existingProductIndex];
            const currentStoreStock = product.stockByStore[record.storeId] || 0;
            const newStockByStore = { ...product.stockByStore, [record.storeId]: currentStoreStock + record.quantity };
            const newTotalStock = (Object.values(newStockByStore) as number[]).reduce((a, b) => a + b, 0);
            updatedProducts[existingProductIndex] = { ...product, stockByStore: newStockByStore, stock: newTotalStock, ownerId: product.ownerId || recordOwnerId };
                        const updatedProduct = { ...product, stockByStore: newStockByStore, stock: newTotalStock, ownerId: product.ownerId || recordOwnerId } as Product;
                        saveToFirestore<Product>(COLLECTIONS.PRODUCTS, updatedProduct)
                            .then(() => console.log('✅ Product stock updated in Firestore:', updatedProduct.id))
                            .catch((err) => console.error('❌ Failed to update product stock in Firestore:', err));
                        return updatedProducts;
        } else {
            const newStockByStore: Record<string, number> = {};
            stores.forEach(s => newStockByStore[s.id] = 0);
            newStockByStore[record.storeId] = record.quantity;
            const newProduct: Product = {
                id: forceProductId || `P-${Date.now()}`,
                name: record.productName,
                price: sellingPrice || 0,
                stock: record.quantity,
                stockByStore: newStockByStore,
                category: record.category,
                brand: record.brand,
                specification: record.specification,
                ownerId: recordOwnerId
            };
                        saveToFirestore<Product>(COLLECTIONS.PRODUCTS, newProduct)
                            .then(() => console.log('✅ New product saved in Firestore:', newProduct.id))
                            .catch((err) => console.error('❌ Failed to save new product in Firestore:', err));
                        return [...prev, newProduct];
        }
    });
  };

    const handleUpdateStockInRecord = (r: StockInRecord) => {
            setStockInHistory(prev => prev.map(old => old.id === r.id ? r : old));
            saveToFirestore<StockInRecord>(COLLECTIONS.STOCK_IN, r)
                .then(() => console.log('✅ Stock-in record updated in Firestore:', r.id))
                .catch((err) => console.error('❌ Failed to update stock-in record in Firestore:', err));
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
    const handleUpdateFixedCosts = (c: FixedCostConfig[]) => {
            setFixedCosts(c);
            saveBulkToFirestore<FixedCostConfig>(COLLECTIONS.FIXED_COSTS, c)
                .then(() => console.log('✅ Fixed costs saved to Firestore:', c.length))
                .catch((err) => console.error('❌ Failed to save fixed costs in Firestore:', err));
    };

    // Shift handlers (Firestore + local)
    const handleAddShift = async (shift: Shift) => {
        setShifts(prev => [...prev, shift]);
        try {
            await saveToFirestore<Shift>(COLLECTIONS.SHIFTS, shift);
        } catch (err) {
            console.error('❌ Failed to save shift in Firestore:', err);
        }
    };
    const handleUpdateShift = async (shift: Shift) => {
        setShifts(prev => prev.map(s => s.id === shift.id ? shift : s));
        try {
            await saveToFirestore<Shift>(COLLECTIONS.SHIFTS, shift);
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
                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors
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
                <div className="hidden sm:flex items-center gap-2">
                    {(sessionRole === 'STORE_ADMIN' && !managerSession) ? (
                        <button 
                            onClick={() => setViewState('STORE_SELECT')}
                            className="flex items-center gap-1 font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            title="지점 변경"
                        >
                            <StoreIcon size={14} />
                            {currentStoreId === 'ALL' ? '전체 지점 통합' : stores.find(s => s.id === currentStoreId)?.name}
                        </button>
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
                <Dashboard 
                sales={visibleSales} stores={visibleStores} 
                onNavigateToHistory={(f) => { setHistoryFilter(f); setActiveTab('history'); }}
                currentUser={effectiveUser} currentStoreId={currentStoreId}
                stockInHistory={visibleStockHistory} transferHistory={transferHistory} expenses={visibleExpenses}
                isSidebarOpen={isSidebarOpen} leaveRequests={leaveRequests}
                />
            )}
            {activeTab === 'pos' && (
                <POS 
                products={visibleProducts} stores={visibleStores} categories={categories} tireBrands={tireBrands}
                currentUser={effectiveUser} currentStoreId={currentStoreId}
                staffList={staffList}
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
                    staffList={staffList}
                    leaveRequests={leaveRequests}
                    stores={visibleStores}
                    shifts={shifts.filter(s => visibleStoreIds.includes(s.storeId))}
                    currentStoreId={currentStoreId}
                    onShiftRangeChange={(start, end) => setShiftRange({ start, end })}
                    onAddShift={handleAddShift}
                    onUpdateShift={handleUpdateShift}
                    onRemoveShift={handleRemoveShift}
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
                onUpdateSale={handleUpdateSale} onCancelSale={handleCancelSale} onQuickAddSale={handleSaleComplete} onStockIn={handleStockIn}
                categories={categories} tireBrands={tireBrands} tireModels={TIRE_MODELS}
                />
            )}
            {(activeTab === 'financials') && (
                <Financials 
                    sales={visibleSales.filter(s => currentStoreId === 'ALL' || s.storeId === currentStoreId)} 
                    stockInHistory={visibleStockHistory.filter(r => currentStoreId === 'ALL' || r.storeId === currentStoreId)}
                    onUpdateStockInRecord={handleUpdateStockInRecord}
                    expenses={visibleExpenses} onAddExpense={handleAddExpense} onUpdateExpense={handleUpdateExpense} onRemoveExpense={handleRemoveExpense}
                    fixedCosts={fixedCosts} onUpdateFixedCosts={handleUpdateFixedCosts} onNavigateToHistory={() => {}} currentUser={effectiveUser}
                    stores={visibleStores}
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
                staffList={staffList} onAddStaff={handleAddStaff} onRemoveStaff={handleRemoveStaff}
                currentStoreId={currentStoreId}
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
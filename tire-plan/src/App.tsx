import React, { useState, useMemo } from 'react';
import { LayoutDashboard, ShoppingCart, Package, FileText, Menu, X, Store as StoreIcon, LogOut, UserCircle, List, Lock, Settings as SettingsIcon, Users, Truck, PieChart, Calendar, PhoneCall, ShieldCheck } from 'lucide-react';
// 1. 진짜 물건(값)인 PaymentMethod는 그냥 가져옵니다. (type 없음!)
import { PaymentMethod } from './types';

// 2. 설계도(Type)인 친구들은 type을 붙여서 가져옵니다.
import type { Customer, Sale, Product, StockInRecord, User, UserRole, StoreAccount, Staff, ExpenseRecord, FixedCostConfig, LeaveRequest, Reservation, StaffPermissions, StockTransferRecord, SalesFilter } from './types'; 
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
import LeaveManagement from './components/LeaveManagement';
import ReservationSystem from './components/ReservationSystem';
import LoginScreen from './components/LoginScreen';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import StoreSelectionScreen from './components/StoreSelectionScreen';

// Mock Password Hash Utility (Simple Simulation)
const mockHash = (pwd: string) => btoa(pwd); // Base64 encoding for demo purposes

// Initial Stores linked to Owner IDs (Updated IDs to 25xxxx format)
const INITIAL_STORE_ACCOUNTS: StoreAccount[] = [
  { id: 'ST-1', code: '250001', name: '서울 강남 본점', region: '01', regionName: '서울', passwordHash: mockHash('1234'), isActive: true, ownerId: '250001' },
  { id: 'ST-2', code: '250001', name: '경기 수원점', region: '02', regionName: '경기', passwordHash: mockHash('1234'), isActive: true, ownerId: '250001' },
  { id: 'ST-3', code: '250001', name: '인천 송도점', region: '03', regionName: '인천', passwordHash: mockHash('1234'), isActive: true, ownerId: '250001' },
];

// Auth Database (Mock) - Owners and Master ONLY
const MOCK_AUTH_USERS: { id: string; password: string; name: string; role: UserRole; storeId?: string; phoneNumber?: string; joinDate: string }[] = [
  { id: '250001', password: '1234', name: '김대표', role: 'STORE_ADMIN', phoneNumber: '010-1234-5678', joinDate: '2025.05.01' },
  { id: '250002', password: '1234', name: '박사장', role: 'STORE_ADMIN', phoneNumber: '010-9876-5432', joinDate: '2025.05.02' },
  { id: '999999', password: '1234', name: 'Master', role: 'SUPER_ADMIN', joinDate: '2025.01.01' },
];

// Staff Database (Entities, NOT Login Users)
const INITIAL_STAFF: Staff[] = [
  { id: 'staff_1', name: '이정비', storeId: 'ST-1', isActive: true },
  { id: 'staff_2', name: '박매니저', storeId: 'ST-1', isActive: true },
  { id: 'staff_3', name: '최신입', storeId: 'ST-2', isActive: true },
];

const INITIAL_TIRE_BRANDS = ['한국', '금호', '넥센', '미쉐린', '콘티넨탈', '피렐리', '굿이어', '라우펜', '기타'];
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
        specification: '규격미정'
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
                specification: TIRE_SPECS[Math.floor(Math.random() * TIRE_SPECS.length)]
            });
        });
    });
    products.push(
        { id: '101', brand: '기타', name: '엔진오일 교환 (합성유)', price: 80000, stock: 100, category: '부품/수리', stockByStore: { 'ST-1': 50, 'ST-2': 50, 'ST-3': 0 } }, 
        { id: '102', brand: '기타', name: '브레이크 패드 교체 (전륜)', price: 120000, stock: 15, category: '부품/수리', stockByStore: { 'ST-1': 10, 'ST-2': 5, 'ST-3': 0 } },
        { id: '103', brand: '기타', name: '와이퍼 세트 (Premium)', price: 35000, stock: 50, category: '기타', stockByStore: { 'ST-1': 25, 'ST-2': 25, 'ST-3': 0 } },
        { id: '104', brand: '기타', name: '휠 밸런스 조정', price: 20000, stock: 999, category: '부품/수리', stockByStore: { 'ST-1': 999, 'ST-2': 999, 'ST-3': 999 } }
    );
    return products;
};

const INITIAL_PRODUCTS: Product[] = generateInitialProducts();

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
    return [
        {
            id: 'L-1',
            date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
            staffId: 'staff_1',
            staffName: '이정비',
            type: 'FULL',
            reason: '개인 사정',
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
        }
    ];
};

const INITIAL_SALES: Sale[] = generateMockSales();
const INITIAL_STOCK_HISTORY: StockInRecord[] = generateMockStockHistory(INITIAL_PRODUCTS);
// Link Initial Customers to Default Demo Owner '250001'
const INITIAL_CUSTOMERS: Customer[] = [
    { id: 'C1', name: '홍길동', phoneNumber: '010-1234-5678', carModel: '쏘나타 DN8', vehicleNumber: '12가3456', totalSpent: 350000, lastVisitDate: '2023-10-15', visitCount: 2, ownerId: '250001' },
    { id: 'C2', name: '김철수', phoneNumber: '010-9876-5432', carModel: '아반떼 CN7', vehicleNumber: '56다7890', totalSpent: 120000, lastVisitDate: '2023-10-20', visitCount: 1, ownerId: '250001' },
];
const INITIAL_EXPENSES: ExpenseRecord[] = generateMockExpenses();
const INITIAL_FIXED_COSTS: FixedCostConfig[] = [
    { id: 'FC1', title: '월세(본점)', amount: 2500000, day: 1, category: '고정지출' },
    { id: 'FC2', title: '인터넷/통신', amount: 55000, day: 25, category: '공과금' },
];
const INITIAL_CATEGORIES = ['타이어', '부품/수리', '기타'];
const INITIAL_LEAVE_REQUESTS = generateMockLeaveRequests();
const INITIAL_RESERVATIONS = generateMockReservations();

type Tab = 'dashboard' | 'pos' | 'reservation' | 'inventory' | 'stockIn' | 'tax' | 'history' | 'settings' | 'customers' | 'financials' | 'leave' | 'superadmin';

type ViewState = 'LOGIN' | 'STORE_SELECT' | 'APP' | 'SUPER_ADMIN';

const App: React.FC = () => {
    // App Config State
    const appTitle = 'TirePlan';
  const [viewState, setViewState] = useState<ViewState>('LOGIN');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionRole, setSessionRole] = useState<UserRole>('STAFF'); // Role for the current app session
  const [currentStoreId, setCurrentStoreId] = useState<string>(''); 
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // Sidebar & Menu State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  
  const [staffPermissions, setStaffPermissions] = useState<StaffPermissions>({
    viewInventory: true,
    viewSalesHistory: true,
    viewTaxInvoice: true,
  });

    const [stores, setStores] = useState<StoreAccount[]>(INITIAL_STORE_ACCOUNTS);
    const [tireBrands, setTireBrands] = useState<string[]>(INITIAL_TIRE_BRANDS);
  
  // Initialize Users with Join Date
  const [users, setUsers] = useState<{id: string, name: string, role: UserRole, storeId?: string, password: string, phoneNumber?: string, joinDate: string}[]>(
      MOCK_AUTH_USERS.map(u => ({...u, joinDate: u.joinDate || '2025.01.01'}))
  );
  
  const [staffList, setStaffList] = useState<Staff[]>(INITIAL_STAFF); // Manage Staff Entities
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [stockInHistory, setStockInHistory] = useState<StockInRecord[]>(INITIAL_STOCK_HISTORY);
  const [transferHistory, setTransferHistory] = useState<StockTransferRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(INITIAL_EXPENSES);
  const [fixedCosts, setFixedCosts] = useState<FixedCostConfig[]>(INITIAL_FIXED_COSTS);
  const [historyFilter, setHistoryFilter] = useState<SalesFilter>({ type: 'ALL', value: '', label: '전체 판매 내역' });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [reservations, setReservations] = useState<Reservation[]>(INITIAL_RESERVATIONS);

  // Compute effective user to pass down
  const effectiveUser = useMemo(() => {
    if (!currentUser) return null;
    return { ...currentUser, role: sessionRole };
  }, [currentUser, sessionRole]);

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

  const visibleStockHistory = useMemo(() => {
      if (currentUser?.role === 'SUPER_ADMIN') return stockInHistory;
      return stockInHistory.filter(r => visibleStoreIds.includes(r.storeId));
  }, [stockInHistory, visibleStoreIds, currentUser]);


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
      setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, password: newPass } : u));
  };

  const handleValidatePassword = (password: string): boolean => {
      const userAccount = users.find(u => u.id === currentUser?.id);
      return userAccount ? userAccount.password === password : false;
  };

  const handleSelectStore = (storeId: string, role: UserRole) => {
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

  const handleLockAdmin = () => {
      setSessionRole('STAFF');
      setActiveTab('dashboard');
  };

  // --- Super Admin Actions ---
  
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
          passwordHash: mockHash('1234'), 
          isActive: true,
          ownerId: newOwnerId 
      };

      setStores([...stores, newStore]);
      
      // Create User with joinDate
      setUsers(prev => [...prev, {
          id: newOwnerId,
          name: name,
          role: 'STORE_ADMIN',
          storeId: newStore.id, // Primary store
          password: '1234',
          phoneNumber: phoneNumber,
          joinDate: joinDate
      }]);

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
          passwordHash: mockHash('1234'),
          isActive: true,
          ownerId: ownerId
      };

      setStores(prev => [...prev, newStore]);
      
      // Init Stock
      setProducts(prev => prev.map(p => ({
          ...p,
          stockByStore: { ...p.stockByStore, [newStore.id]: 0 }
      })));
  };

  const handleResetPassword = (code: string) => {
      setUsers(prev => prev.map(u => u.id === code ? { ...u, password: '1234' } : u));
      alert('비밀번호가 1234로 초기화되었습니다.');
  };

  const handleDeleteStore = (storeId: string) => {
      setStores(prev => prev.filter(s => s.id !== storeId));
  };

  const handleDeleteOwner = (ownerId: string) => {
      setStores(prev => prev.filter(s => s.ownerId !== ownerId));
      setUsers(prev => prev.filter(u => u.id !== ownerId));
  };

  // --- Data Management Handlers --- 
    const handleAddStore = () => { };
  const handleUpdateStore = (id: string, name: string) => { setStores(stores.map(s => s.id === id ? { ...s, name } : s)); };
  const handleRemoveStore = (id: string) => { setStores(stores.filter(s => s.id !== id)); };
  
  const handleAddStaff = (name: string) => { 
      const newStaff: Staff = {
          id: `staff_${Date.now()}`,
          name,
          storeId: currentStoreId,
          isActive: true
      };
      setStaffList([...staffList, newStaff]);
  };
  const handleRemoveStaff = (id: string) => { setStaffList(staffList.filter(s => s.id !== id)); };

  const handleAddLeaveRequest = (req: LeaveRequest) => setLeaveRequests(prev => [...prev, req]);
  const handleRemoveLeaveRequest = (id: string) => setLeaveRequests(prev => prev.filter(r => r.id !== id));
  const handleAddReservation = (r: Reservation) => setReservations(prev => [...prev, r]);
  const handleUpdateReservation = (u: Reservation) => setReservations(prev => prev.map(r => r.id === u.id ? u : r));
  const handleRemoveReservation = (id: string) => setReservations(prev => prev.filter(r => r.id !== id));
  
  const handleSaleComplete = (newSale: Sale) => {
    setSales(prev => [newSale, ...prev]);
    
    // Add New Customer if not exists (with Owner Scope)
    if (newSale.customer && currentUser) {
        const custPhone = newSale.customer.phoneNumber;
        const existing = customers.find(c => c.phoneNumber === custPhone && c.ownerId === currentUser.id);
        
        if (!existing) {
            const newCustomer: Customer = {
                id: `C-${Date.now()}`,
                name: newSale.customer.name,
                phoneNumber: newSale.customer.phoneNumber,
                carModel: newSale.customer.carModel,
                vehicleNumber: newSale.customer.vehicleNumber,
                totalSpent: newSale.totalAmount,
                lastVisitDate: newSale.date,
                visitCount: 1,
                businessNumber: newSale.customer.businessNumber,
                companyName: newSale.customer.companyName,
                email: newSale.customer.email,
                ownerId: currentUser.id // Link to current Owner
            };
            setCustomers(prev => [...prev, newCustomer]);
        } else {
            // Update existing customer stats
            setCustomers(prev => prev.map(c => {
                if (c.phoneNumber === custPhone && c.ownerId === currentUser.id) {
                    return {
                        ...c,
                        totalSpent: c.totalSpent + newSale.totalAmount,
                        visitCount: c.visitCount + 1,
                        lastVisitDate: newSale.date
                    };
                }
                return c;
            }));
        }
    }

    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        const soldItem = newSale.items.find(item => item.productId === prod.id);
        if (soldItem) {
          if (prod.id === '99999') return prod;
          const currentStoreStock = prod.stockByStore[newSale.storeId] || 0;
          if (currentStoreStock > 900) return prod;
          const newStoreStock = Math.max(0, currentStoreStock - soldItem.quantity);
          const newStockByStore = { ...prod.stockByStore, [newSale.storeId]: newStoreStock };
          const newTotalStock = (Object.values(newStockByStore) as number[]).reduce((a, b) => a + b, 0);
          return { ...prod, stockByStore: newStockByStore, stock: newTotalStock };
        }
        return prod;
      });
    });
  };

  const handleUpdateSale = (updatedSale: Sale) => {
      // Find previous sale to compute stock deltas
      const prevSale = sales.find(s => s.id === updatedSale.id);

      // Update sale record
      setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));

      // If we have a previous sale, reconcile inventory differences
      if (prevSale) {
          const storeId = updatedSale.storeId;
          const prevQtyMap: Record<string, number> = {};
          prevSale.items.forEach(it => { prevQtyMap[it.productId] = (prevQtyMap[it.productId] || 0) + it.quantity; });
          const newQtyMap: Record<string, number> = {};
          updatedSale.items.forEach(it => { newQtyMap[it.productId] = (newQtyMap[it.productId] || 0) + it.quantity; });

          const allProductIds = new Set<string>([...Object.keys(prevQtyMap), ...Object.keys(newQtyMap)]);

          setProducts(prevProducts => prevProducts.map(prod => {
              if (!allProductIds.has(prod.id) || prod.id === '99999') return prod;
              const oldQty = prevQtyMap[prod.id] || 0;
              const newQty = newQtyMap[prod.id] || 0;
              const delta = newQty - oldQty; // positive => more sold now -> reduce stock

              const currentStoreStock = prod.stockByStore[storeId] || 0;
              const updatedStoreStock = Math.max(0, currentStoreStock - delta);
              const newStockByStore = { ...prod.stockByStore, [storeId]: updatedStoreStock };
              const newTotalStock = (Object.values(newStockByStore) as number[]).reduce((a, b) => a + b, 0);
              return { ...prod, stockByStore: newStockByStore, stock: newTotalStock };
          }));
      }
  };
  const handleCancelSale = (saleId: string) => { 
      const targetSale = sales.find(s => s.id === saleId);
      if (!targetSale || targetSale.isCanceled) return;
      const canceledSale = { ...targetSale, isCanceled: true, cancelDate: new Date().toISOString() };
      setSales(prev => prev.map(s => s.id === canceledSale.id ? canceledSale : s));
  };
  const handleStockIn = (record: StockInRecord, sellingPrice?: number, forceProductId?: string) => {
      setStockInHistory(prev => [record, ...prev]);
      // Ensure brand is added to global tireBrands list so other views (Inventory/POS) see it
      if (record.brand && record.brand.trim() !== '') {
          setTireBrands(prev => prev.includes(record.brand) ? prev : [...prev, record.brand]);
      }
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
            updatedProducts[existingProductIndex] = { ...product, stockByStore: newStockByStore, stock: newTotalStock };
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
                specification: record.specification
            };
            return [...prev, newProduct];
        }
    });
  };

  const handleUpdateStockInRecord = (r: StockInRecord) => setStockInHistory(prev => prev.map(old => old.id === r.id ? r : old));
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
          updated[idx] = { ...prod, stockByStore: newStockByStore, stock: newTotal };
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
  };
  const handleAddExpense = (e: ExpenseRecord) => setExpenses(prev => [e, ...prev]);
  const handleUpdateExpense = (e: ExpenseRecord) => setExpenses(prev => prev.map(old => old.id === e.id ? e : old));
  const handleRemoveExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));
  const handleUpdateFixedCosts = (c: FixedCostConfig[]) => setFixedCosts(c);
  
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
      { id: 'customers', label: '고객 관리', icon: Users, show: isAdmin, type: 'ADMIN' }, // Admin Only
      { id: 'DIVIDER_1', label: '', icon: X, show: true, type: 'DIVIDER' }, // Divider
      { id: 'inventory', label: '재고 관리', icon: Package, show: true, type: 'CORE' }, 
      { id: 'stockIn', label: '입고 관리', icon: Truck, show: true, type: 'CORE' }, 
      { id: 'financials', label: isAdmin ? '재무/결산' : '지출', icon: PieChart, show: true, type: 'CORE' }, // Dynamic Label
      { id: 'DIVIDER_2', label: '', icon: X, show: true, type: 'DIVIDER' }, // Divider
      { id: 'leave', label: '휴무 신청', icon: Calendar, show: true, type: 'CORE' },
      // Settings: Show only if isAdmin
      { id: 'settings', label: '설정', icon: SettingsIcon, show: isAdmin, type: 'ADMIN' } 
    ];
    return items.filter(item => item.show);
  }, [effectiveUser, staffPermissions]);

  const currentUserPassword = users.find(u => u.id === currentUser?.id)?.password || '';

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
            validatePassword={handleValidatePassword}
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
            {/* ... Mobile Menu Content Omitted for Brevity (Uses navItems same as desktop) ... */}
        </div>

        <aside className={`hidden md:flex ${isSidebarOpen ? 'xl:w-64 md:w-56' : 'w-20'} bg-slate-900 text-white transition-all duration-300 ease-in-out flex-col shadow-xl z-20`}>
            <div className="p-5 flex items-center justify-center md:justify-between border-b border-slate-800 h-16">
            {isSidebarOpen && (
                <div className="hidden md:flex items-center gap-2">
                <StoreIcon className="text-blue-400" size={24} />
                <h1 className="text-xl font-bold tracking-tight text-blue-400 truncate">{appTitle}</h1>
                </div>
            )}
            {!isSidebarOpen && <div className="w-full flex justify-center"><StoreIcon className="text-blue-400" size={24} /></div>}
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
                                {effectiveUser.role === 'STORE_ADMIN' ? '사장님(Owner)' : '직원 모드'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{effectiveUser.name}</p>
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
                <button className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg text-gray-600" onClick={() => setIsMobileMenuOpen(true)}><Menu size={24} /></button>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 truncate tracking-tight">{activeTab === 'history' ? '판매 내역' : navItems.find(i => i.id === activeTab)?.label}</h2>
            </div>
            <div className="flex items-center gap-4 text-xs md:text-sm text-gray-500 text-right">
                <div className="hidden sm:flex items-center gap-2">
                    <button 
                        onClick={() => setViewState('STORE_SELECT')}
                        className="flex items-center gap-1 font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                        title="지점 변경"
                    >
                        <StoreIcon size={14} />
                        {currentStoreId === 'ALL' ? '전체 지점 통합' : stores.find(s => s.id === currentStoreId)?.name}
                    </button>
                    {effectiveUser.role === 'STORE_ADMIN' && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">사장님 모드</span>}
                </div>
                <span>{new Date().toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
                products={products} stores={visibleStores} categories={categories} tireBrands={tireBrands}
                currentUser={effectiveUser} currentStoreId={currentStoreId}
                staffList={staffList.filter(s => s.storeId === currentStoreId || currentStoreId === 'ALL')} 
                customers={visibleCustomers} tireModels={TIRE_MODELS}
                onSaleComplete={handleSaleComplete} onAddCategory={(c) => setCategories([...categories, c])}
                />
            )}
            {activeTab === 'reservation' && (
                <ReservationSystem
                    reservations={reservations} onAddReservation={handleAddReservation} onUpdateReservation={handleUpdateReservation} onRemoveReservation={handleRemoveReservation}
                    products={products} currentStoreId={currentStoreId} currentUser={effectiveUser} stores={visibleStores} tireBrands={tireBrands} tireModels={TIRE_MODELS}
                />
            )}
            {activeTab === 'leave' && (
                <LeaveManagement 
                    staffList={staffList.filter(s => s.storeId === currentStoreId || currentStoreId === 'ALL')} 
                    leaveRequests={leaveRequests} onAddRequest={handleAddLeaveRequest} onRemoveRequest={handleRemoveLeaveRequest} currentUser={effectiveUser} 
                />
            )}
            {activeTab === 'stockIn' && (
                <StockIn
                    stores={visibleStores} categories={categories} tireBrands={tireBrands} products={products}
                    onStockIn={handleStockIn} currentUser={effectiveUser} stockInHistory={visibleStockHistory} currentStoreId={currentStoreId} onUpdateStockInRecord={handleUpdateStockInRecord} tireModels={TIRE_MODELS}
                />
            )}
            {(activeTab === 'inventory') && (
                <Inventory 
                products={products} stores={visibleStores} categories={categories}
                onUpdate={(p) => setProducts(products.map(old => old.id === p.id ? p : old))} 
                onAdd={(p) => setProducts([...products, p])} 
                onAddCategory={(c) => setCategories([...categories, c])}
                currentUser={effectiveUser} currentStoreId={currentStoreId} onStockTransfer={handleStockTransfer}
                />
            )}
            {(activeTab === 'tax') && 
                <TaxInvoice sales={visibleSales.filter(s => currentStoreId === 'ALL' || s.storeId === currentStoreId)} onUpdateSale={handleUpdateSale} />
            }
            {(activeTab === 'history') && (
                <SalesHistory 
                sales={visibleSales} stores={visibleStores} products={products} filter={historyFilter} 
                onBack={() => setActiveTab('dashboard')} currentUser={effectiveUser} currentStoreId={currentStoreId}
                stockInHistory={visibleStockHistory} onSwapProduct={() => {/* swap logic */}}
                onUpdateSale={handleUpdateSale} onCancelSale={handleCancelSale} onStockIn={handleStockIn}
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
                <CustomerList customers={visibleCustomers} sales={visibleSales} />
            )}
            {activeTab === 'settings' && effectiveUser.role === 'STORE_ADMIN' && (
                <Settings
                stores={visibleStores} onAddStore={handleAddStore} onUpdateStore={handleUpdateStore} onRemoveStore={handleRemoveStore}
                staffPermissions={staffPermissions} onUpdatePermissions={setStaffPermissions}
                currentAdminPassword={currentUserPassword} onUpdatePassword={handleUpdatePassword}
                staffList={staffList} onAddStaff={handleAddStaff} onRemoveStaff={handleRemoveStaff}
                currentStoreId={currentStoreId}
                />
            )}
            </div>
        </main>
        </div>
    );
  }

  return null; // Fallback
};

export default App;
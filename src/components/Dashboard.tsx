
import React, { useMemo, useState, useEffect } from 'react';
import { PaymentMethod } from '../types';
import type { Sale, Store, SalesFilter, User, StockInRecord, StockTransferRecord, ExpenseRecord, LeaveRequest } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Calendar, ChevronLeft, ChevronRight, Store as StoreIcon, Bell, ArrowRightLeft, Truck, CreditCard, Banknote, Smartphone, ArrowUpRight, ArrowDownRight, Receipt, Palmtree, Plus } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';

interface DashboardProps {
    sales: Sale[];
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
                    <span className="font-medium ml-auto">{formatCurrency(entry.value)}</span>
                </div>
            ))}
        </div>
        <div className="border-t border-gray-100 pt-2 mt-1">
                <div className="flex justify-between items-center gap-4">
                <span className="text-xs font-bold text-gray-500">일일 합계</span>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(total)}</span>
            </div>
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ sales, stores, onNavigateToHistory, currentUser, currentStoreId, stockInHistory = [], transferHistory = [], expenses = [], isSidebarOpen = true, leaveRequests = [] }) => {
  // Admin Chart Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [chartStartDate, setChartStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6); // Start from 6 days ago
    return d;
  });
  
  // Staff Board Date State
  const [boardDate, setBoardDate] = useState(new Date());

  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
      if (currentUser.role === 'STAFF' && currentStoreId) {
          return currentStoreId;
      }
      return 'ALL';
  });

  // Ensure staff stays on their store if props change
  useEffect(() => {
      if (currentUser.role === 'STAFF' && currentStoreId) {
          setSelectedStoreId(currentStoreId);
      }
  }, [currentUser, currentStoreId]);

  // Helper: Move Month (Admin)
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  // Helper: Move Day (Staff Board)
  const moveBoardDate = (days: number) => {
      const newDate = new Date(boardDate);
      newDate.setDate(newDate.getDate() + days);
      setBoardDate(newDate);
  };

  // Helper: Format Date to YYYY-MM-DD (Local)
    const pad = (value: number) => value.toString().padStart(2, '0');
    const formatDateYMD = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    const getSaleLocalDate = (sale: Sale) => formatDateYMD(new Date(sale.date));

  const boardDateStr = formatDateYMD(boardDate);

  // Check if the displayed month is the current calendar month
    const today = new Date();
    // Today's midnight (local) string for comparisons without mutating `today`
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = formatDateYMD(todayStart);
  const isCurrentMonthView = currentDate.getMonth() === today.getMonth() && 
                             currentDate.getFullYear() === today.getFullYear();

  // 1. Filter Sales based on Store Selection
  const filteredSalesByStore = useMemo(() => {
    if (selectedStoreId === 'ALL') return sales;
    return sales.filter(s => s.storeId === selectedStoreId);
  }, [sales, selectedStoreId]);

  // 2. Filter Sales based on Current Month (For Summary Cards - Admin)
  const monthlySales = useMemo(() => {
    return filteredSalesByStore.filter(s => {
        const d = new Date(s.date);
        return d.getFullYear() === currentDate.getFullYear() && 
               d.getMonth() === currentDate.getMonth();
    });
  }, [filteredSalesByStore, currentDate]);

  // Previous Month Sales (Full Month - For Calendar Daily Average)
  const prevMonthSalesFull = useMemo(() => {
      const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      return filteredSalesByStore.filter(s => {
          const d = new Date(s.date);
          return d.getFullYear() === prevDate.getFullYear() && 
                 d.getMonth() === prevDate.getMonth();
      });
  }, [filteredSalesByStore, currentDate]);

  // Previous Month Sales (Same Period / Month-to-Date Logic - For Comparison Cards)
  const prevMonthSamePeriodSales = useMemo(() => {
      const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const currentDay = today.getDate();

      return filteredSalesByStore.filter(s => {
          const d = new Date(s.date);
          const isPrevMonth = d.getFullYear() === prevDate.getFullYear() && 
                              d.getMonth() === prevDate.getMonth();
          
          if (!isPrevMonth) return false;

          // If viewing current month, only count sales up to the current day number
          if (isCurrentMonthView) {
              return d.getDate() <= currentDay;
          }
          return true;
      });
  }, [filteredSalesByStore, currentDate, isCurrentMonthView, today]);

  // Calculate average daily revenue for previous month (Using FULL month data)
  const prevMonthDailyAverage = useMemo(() => {
      const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const daysInPrevMonth = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
      const totalPrevRevenue = prevMonthSalesFull.reduce((sum, s) => sum + s.totalAmount, 0);
      return daysInPrevMonth > 0 ? totalPrevRevenue / daysInPrevMonth : 0;
  }, [prevMonthSalesFull, currentDate]);

  // 3. Calculate Totals (Based on Monthly Data - Admin)
  const totalRevenue = monthlySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  
  // Base comparison value for other cards (Same Period Logic)
  const prevTotalRevenueSamePeriod = prevMonthSamePeriodSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  const calculateGrowth = (current: number, prev: number): string => {
      if (prev === 0) return current > 0 ? "100.0" : "0.0";
      return ((current - prev) / prev * 100).toFixed(1);
  };

  // Revenue Growth
  const revenueGrowth = calculateGrowth(totalRevenue, prevTotalRevenueSamePeriod);

  // 4. Payment Method Breakdown Stats (Admin)
 
  const getPaymentStats = (salesData: Sale[]) => {
  // PaymentMethod 대신 그냥 영어 단어(문자열)를 씁니다. 이게 훨씬 안전해요!
  const stats: Record<string, number> = {
    'CARD': 0,
    'CASH': 0,
    'TRANSFER': 0,
     };

  salesData.forEach(s => {
    // 혹시 데이터에 소문자/대문자가 섞여있을까봐 안전하게 변환
    const method = s.paymentMethod ? s.paymentMethod.toUpperCase() : 'CARD';
    
    if (stats[method] !== undefined) {
      stats[method] += s.totalAmount;
    } else {
      // 혹시 'CARD', 'CASH', 'TRANSFER' 말고 다른 게 오면 CARD로 쳐줌 (안전장치)
      stats['CARD'] += s.totalAmount;
    }
  });

  return stats;
};

  const paymentStats = useMemo(() => getPaymentStats(monthlySales), [monthlySales]);
  // Comparison stats now use SAME PERIOD data
  const prevPaymentStats = useMemo(() => getPaymentStats(prevMonthSamePeriodSales), [prevMonthSamePeriodSales]);

  // 5. Prepare Chart Data (Stacked Bar Chart: Date + Payment Method - Admin)
  const salesChartData = useMemo(() => {
    const data: any[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(chartStartDate);
        d.setDate(d.getDate() + i);
        const dateKey = formatDateYMD(d);
        const displayDate = `${d.getMonth() + 1}/${d.getDate()}`;

        const daySales = filteredSalesByStore.filter(s => getSaleLocalDate(s) === dateKey);
        
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

  // 6. Store Share Data (Admin)
  const storeShareData = useMemo(() => {
    return stores.map(store => {
        const storeRevenue = monthlySales
            .filter(s => s.storeId === store.id)
            .reduce((sum, s) => sum + s.totalAmount, 0);
        return { name: store.name, value: storeRevenue };
    }).filter(d => d.value > 0);
  }, [monthlySales, stores]);

  // Chart Colors - Updated Scheme
  const CHART_COLORS = {
    CARD: '#3b82f6',    
    CASH: '#10b981',    
    TRANSFER: '#8b5cf6' 
  };

  const PIE_COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444'];

  const moveChartWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(chartStartDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setChartStartDate(newDate);
  };

  // --- Calendar Logic (Admin) ---
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
    const [calendarView, setCalendarView] = useState<'grid' | 'list'>('grid');
    const calendarList = useMemo(() => calendarDays.filter((d): d is Date => Boolean(d)), [calendarDays]);
    const formatManLabel = (amount: number) => `₩${formatNumber(Math.round(amount / 10000))}만`;

  const getDailyStats = (date: Date) => {
    const dateString = formatDateYMD(date);
        const daySales = filteredSalesByStore.filter(s => getSaleLocalDate(s) === dateString && !s.isCanceled);
    
    const revenue = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const cash = daySales.filter(s => s.paymentMethod === PaymentMethod.CASH).reduce((sum, s) => sum + s.totalAmount, 0);
    const card = daySales.filter(s => s.paymentMethod === PaymentMethod.CARD).reduce((sum, s) => sum + s.totalAmount, 0);
    const transfer = daySales.filter(s => s.paymentMethod === PaymentMethod.TRANSFER).reduce((sum, s) => sum + s.totalAmount, 0);
    
    // Calculate total tire quantity sold
    const tireQuantity = daySales.reduce((sum, s) => sum + (s.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0);
    
    return { revenue, cash, card, transfer, tireQuantity };
  };

  // Calculate total tire quantity for the entire month
  const monthlyTireQuantity = useMemo(() => {
    return monthlySales.reduce((sum, s) => sum + (s.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0);
  }, [monthlySales]);

  // --- Staff Status Board Logic (Daily) ---
  
  // 1. Daily Sales
  const dailySales = useMemo(() => {
      return filteredSalesByStore.filter(s => getSaleLocalDate(s) === boardDateStr && !s.isCanceled);
  }, [filteredSalesByStore, boardDateStr]);

  // 2. Daily Stock In (For current store) - Filter out consumption logs
  const dailyStockIns = useMemo(() => {
      return stockInHistory.filter(r => 
        r.storeId === currentStoreId && 
        r.date.startsWith(boardDateStr) &&
        !r.id.startsWith('IN-CONSUME-') // Exclude consumption logs
      );
  }, [stockInHistory, currentStoreId, boardDateStr]);

  // 3. Daily Transfers (From or To current store)
  const dailyTransfers = useMemo(() => {
      return transferHistory.filter(r => 
        (r.fromStoreId === currentStoreId || r.toStoreId === currentStoreId) && 
        r.date.startsWith(boardDateStr)
      );
  }, [transferHistory, currentStoreId, boardDateStr]);

  // 4. Daily Expenses (Simple date match)
  const dailyExpenses = useMemo(() => {
      return expenses.filter(e => e.date === boardDateStr);
  }, [expenses, boardDateStr]);

  // 5. Daily/Upcoming Leave Requests
    const upcomingLeaves = useMemo(() => {
            // For Admin Dashboard: Show all future leaves
            if (currentUser.role === 'STORE_ADMIN') {
                    return leaveRequests
                        .filter(req => {
                                const reqDateStr = (req.date && req.date.length >= 10) ? req.date.slice(0,10) : formatDateYMD(new Date(req.date));
                                return reqDateStr >= todayStr;
                        })
                        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(0, 5); // Limit to 5
            }
            // For Staff Board: Show leaves for the selected Board Date
            return leaveRequests.filter(req => req.date === boardDateStr);
    }, [leaveRequests, boardDateStr, currentUser.role]);

    // Local notices state (quick dashboard announcements). Add via + button.
    const [notices, setNotices] = useState<Array<{id:string; title:string; content:string; urgent?:boolean}>>(() => [
        { id: 'N-1', title: '동절기 타이어 재고 점검 안내', content: '이번 주말 기온 하강 예보로 윈터타이어 수요 급증이 예상됩니다. 재고 확인 바랍니다.', urgent: true },
        { id: 'N-2', title: '본사 시스템 정기 점검', content: '오는 일요일 02:00 ~ 04:00 서버 점검 예정입니다. 이용에 참고 바랍니다.' }
    ]);
    const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
    const [noticeForm, setNoticeForm] = useState({ title: '', content: '', urgent: false });

    const handleAddNotice = () => {
        if (!noticeForm.title.trim()) { alert('제목을 입력하세요.'); return; }
        const newNotice = { id: `N-${Date.now()}`, title: noticeForm.title.trim(), content: noticeForm.content.trim(), urgent: noticeForm.urgent };
        setNotices(prev => [newNotice, ...prev]);
        setNoticeForm({ title: '', content: '', urgent: false });
        setIsNoticeModalOpen(false);
    };


  // --- View Rendering ---

  // Staff View: Only Show Status Board with Date Navigation
  if (currentUser.role === 'STAFF') {
      return (
          <div className="space-y-6 animate-fade-in pb-10">
             {/* Staff Header with Date Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <StoreIcon size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">지점 현황판</h2>
                        <p className="text-sm text-gray-500">
                            {stores.find(s => s.id === currentStoreId)?.name || '지점 선택 필요'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                     <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                         <button 
                            onClick={() => moveBoardDate(-1)} 
                            className="p-2 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all"
                            title="이전 날짜"
                         >
                             <ChevronLeft size={20} />
                         </button>
                         <div className="relative">
                             <input 
                                type="date" 
                                value={boardDateStr}
                                onChange={(e) => setBoardDate(new Date(e.target.value))}
                                className="bg-transparent text-base font-bold text-gray-800 text-center px-2 focus:outline-none w-[140px] cursor-pointer"
                             />
                         </div>
                         <button 
                            onClick={() => moveBoardDate(1)} 
                            className="p-2 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all"
                            title="다음 날짜"
                         >
                             <ChevronRight size={20} />
                         </button>
                     </div>
                     
                     <button 
                        onClick={() => setBoardDate(new Date())}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                     >
                         오늘
                     </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* 1. Announcements & Leave */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Bell className="text-orange-500" size={20} /> 공지 및 휴무
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                         {/* Notices (local quick announcements) */}
                         {notices.map(n => (
                             <div key={n.id} className={`p-3 ${n.urgent ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'} rounded-lg`}>
                                 <span className={`text-xs font-bold ${n.urgent ? 'text-orange-600' : 'text-gray-500'} bg-white px-2 py-0.5 rounded border ${n.urgent ? 'border-orange-200' : 'border-gray-200'} mb-1 inline-block`}>{n.urgent ? '긴급' : '일반'}</span>
                                 <p className="text-sm font-bold text-gray-800 mt-1">{n.title}</p>
                                 <p className="text-xs text-gray-500 mt-1">{n.content}</p>
                             </div>
                         ))}

                         {/* Staff Leave for Selected Date */}
                         {upcomingLeaves.length > 0 && (
                             <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg mb-2">
                                 <h4 className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1"><Palmtree size={12}/> 금일 휴무자</h4>
                                 <div className="space-y-1">
                                     {upcomingLeaves.map(req => (
                                         <div key={req.id} className="text-sm text-gray-700 flex justify-between">
                                             <span>{req.staffName}</span>
                                             <span className="font-medium text-purple-600">
                                                {req.type === 'FULL' ? '연차' : req.type === 'HALF_AM' ? '오전반차' : '오후반차'}
                                             </span>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         )}
                    </div>
                </div>

                {/* 2. Daily Sales */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2"><DollarSign className="text-blue-600" size={20} /> 일간 판매 내역</div>
                        <span className="text-sm font-bold text-blue-600">총 {dailySales.length}건</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {dailySales.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <ShoppingBag size={32} className="opacity-20 mb-2"/>
                                <p>{boardDateStr} 판매 내역이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {dailySales.map(sale => (
                                    <div key={sale.id} className="flex justify-between items-center p-3 bg-blue-50/30 rounded-lg border border-blue-100 hover:bg-blue-50 transition-colors">
                                        <div>
                                            <div className="font-bold text-sm text-gray-800">{sale.items[0].productName}</div>
                                            <div className="text-xs text-gray-500">{sale.items.length > 1 ? `외 ${sale.items.length - 1}건` : sale.items[0].specification}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-blue-600">{formatCurrency(sale.totalAmount)}</div>
                                            <div className="text-xs text-gray-400">{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-medium">일 매출 합계</span>
                        <span className="text-xl font-bold text-gray-900">{formatCurrency(dailySales.reduce((sum, s) => sum + s.totalAmount, 0))}</span>
                    </div>
                </div>

                {/* 3. Daily Expenses */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2"><Receipt className="text-rose-600" size={20} /> 일간 지출 내역</div>
                        <span className="text-sm font-bold text-rose-600">총 {formatCurrency(dailyExpenses.reduce((a,b)=>a+b.amount,0))}</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {dailyExpenses.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Receipt size={32} className="opacity-20 mb-2"/>
                                <p>금일 지출 내역이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {dailyExpenses.map(exp => (
                                    <div key={exp.id} className="flex justify-between items-center p-3 bg-rose-50/30 rounded-lg border border-rose-100 hover:bg-rose-50 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">{exp.category}</span>
                                            </div>
                                            <div className="font-medium text-sm text-gray-800">{exp.description}</div>
                                        </div>
                                        <div className="font-bold text-rose-600">{formatCurrency(exp.amount)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Daily Stock In */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2"><Truck className="text-emerald-600" size={20} /> 일간 입고 내역</div>
                        <span className="text-sm font-bold text-emerald-600">{dailyStockIns.length}건</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {dailyStockIns.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Truck size={32} className="opacity-20 mb-2"/>
                                <p>금일 입고 내역이 없습니다.</p>
                            </div>
                        ) : (
                             <div className="space-y-2">
                                {dailyStockIns.map(record => (
                                    <div key={record.id} className="p-3 bg-emerald-50/30 rounded-lg border border-emerald-100 hover:bg-emerald-50 transition-colors">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">{record.supplier}</span>
                                            <span className="text-xs text-gray-400">ID: {record.id}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                             <div>
                                                <div className="font-bold text-sm text-gray-800">{record.productName}</div>
                                                <div className="text-xs text-gray-500">{record.specification}</div>
                                             </div>
                                             <div className="text-lg font-bold text-emerald-600">+{record.quantity}</div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        )}
                    </div>
                </div>

                {/* 5. Stock Transfers */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2"><ArrowRightLeft className="text-violet-600" size={20} /> 재고 이동 내역</div>
                        <span className="text-sm font-bold text-violet-600">{dailyTransfers.length}건</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                         {dailyTransfers.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <ArrowRightLeft size={32} className="opacity-20 mb-2"/>
                                <p>금일 재고 이동 내역이 없습니다.</p>
                            </div>
                        ) : (
                             <div className="space-y-2">
                                {dailyTransfers.map(record => {
                                    const isIncoming = record.toStoreId === currentStoreId;
                                    return (
                                        <div key={record.id} className={`p-3 rounded-lg border hover:bg-opacity-50 transition-colors ${isIncoming ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isIncoming ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {isIncoming ? '입고 (수신)' : '출고 (발신)'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {isIncoming 
                                                        ? `From: ${stores.find(s=>s.id === record.fromStoreId)?.name}` 
                                                        : `To: ${stores.find(s=>s.id === record.toStoreId)?.name}`
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                 <div className="text-sm font-bold text-gray-800">{record.productName}</div>
                                                 <div className={`text-lg font-bold ${isIncoming ? 'text-blue-600' : 'text-orange-600'}`}>
                                                     {isIncoming ? '+' : '-'}{record.quantity}
                                                 </div>
                                            </div>
                                        </div>
                                    );
                                })}
                             </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
      );
  }

    /* Notice Modal for Staff View */
    // (Inserted inside component so staff users won't see it unless modal open)
    // We'll render modal inside staff return as well; for staff view the return is above.

  // Admin View: Full Dashboard with Analytics
  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-3">
        <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap">
                <TrendingUp className="text-blue-600" />
                매출 현황 대시보드
            </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
            {/* Month Navigation */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200 w-full sm:w-auto">
                <button onClick={prevMonth} className="p-1 hover:bg-white rounded shadow-sm transition-all text-gray-600">
                    <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-bold text-gray-800 min-w-[110px] text-center">
                    {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </span>
                <button onClick={nextMonth} className="p-1 hover:bg-white rounded shadow-sm transition-all text-gray-600">
                    <ChevronRight size={20} />
                </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
                <StoreIcon size={18} className="text-gray-500" />
                <select 
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className={`bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 w-full sm:w-48 md:w-56`}
                >
                    <option value="ALL">전체 매장 통합</option>
                    {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                </select>
            </div>
        </div>
      </div>

      {/* Summary Cards - Enhanced Layout (Modified for Tablet) */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* 1. Total Revenue (Highlighted) - Comparison Updated */}
        <SummaryCard 
            title={`${currentDate.getMonth() + 1}월 총 매출`}
            value={formatManLabel(totalRevenue)} 
            icon={TrendingUp}
            color="bg-blue-600"
            textColor="text-blue-700"
            bgColor="bg-blue-50"
            isPrimary={true}
            growth={revenueGrowth}
            comparisonText={isCurrentMonthView ? `전월 동일 시점 대비 ${Math.abs(Number(revenueGrowth))}% ${Number(revenueGrowth) >= 0 ? '상승' : '하락'}` : undefined}
            onClick={() => onNavigateToHistory({ type: 'ALL', value: '', label: '전체 매출 상세' })}
            isSidebarOpen={isSidebarOpen}
        />
        
        {/* 2. Cash */}
        <SummaryCard 
            title={`${currentDate.getMonth() + 1}월 현금 매출`}
            value={formatCurrency(paymentStats.CASH)} 
            icon={Banknote} 
            color="bg-emerald-600"
            growth={calculateGrowth(paymentStats.CASH, prevPaymentStats.CASH)}
            onClick={() => onNavigateToHistory({ type: 'PAYMENT', value: PaymentMethod.CASH, label: '현금 매출 상세' })}
            isSidebarOpen={isSidebarOpen}
        />
        
        {/* 3. Card - Icon Updated to CreditCard & Color Adjusted */}
        <SummaryCard 
            title={`${currentDate.getMonth() + 1}월 카드 매출`}
            value={formatCurrency(paymentStats.CARD)} 
            icon={CreditCard} 
            color="bg-blue-600"
            growth={calculateGrowth(paymentStats.CARD, prevPaymentStats.CARD)}
            onClick={() => onNavigateToHistory({ type: 'PAYMENT', value: PaymentMethod.CARD, label: '카드 매출 상세' })}
            isSidebarOpen={isSidebarOpen}
        />
        
        {/* 4. Transfer */}
        <SummaryCard 
            title={`${currentDate.getMonth() + 1}월 계좌 이체`}
            value={formatCurrency(paymentStats.TRANSFER)} 
            icon={Smartphone} 
            color="bg-violet-600"
            growth={calculateGrowth(paymentStats.TRANSFER, prevPaymentStats.TRANSFER)}
            onClick={() => onNavigateToHistory({ type: 'PAYMENT', value: PaymentMethod.TRANSFER, label: '계좌이체 매출 상세' })}
            isSidebarOpen={isSidebarOpen}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Upcoming Leave Requests (Admin View) */}
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="flex items-center gap-2"><Palmtree className="text-purple-600" size={20} /> 다가오는 휴무</div>
                {currentUser.role === 'STORE_ADMIN' && (
                    <button onClick={() => setIsNoticeModalOpen(true)} title="공지 추가" className="ml-auto p-1 rounded bg-blue-600 text-white hover:bg-blue-700">
                        <Plus size={14} />
                    </button>
                )}
            </h3>
            <div className="space-y-3">
                {/* Show local notices first in admin panel */}
                {notices.map(n => (
                    <div key={n.id} className={`p-3 ${n.urgent ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'} rounded-lg`}>
                        <span className={`text-xs font-bold ${n.urgent ? 'text-orange-600' : 'text-gray-500'} bg-white px-2 py-0.5 rounded border ${n.urgent ? 'border-orange-200' : 'border-gray-200'} mb-1 inline-block`}>{n.urgent ? '긴급' : '일반'}</span>
                        <p className="text-sm font-bold text-gray-800 mt-1">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{n.content}</p>
                    </div>
                ))}
                {upcomingLeaves.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                        예정된 휴무가 없습니다.
                    </div>
                ) : (
                    upcomingLeaves.map(req => (
                        <div key={req.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div>
                                <div className="text-xs font-bold text-gray-500">{new Date(req.date).toLocaleDateString()}</div>
                                <div className="font-bold text-gray-800">{req.staffName}</div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-bold
                                ${req.type === 'FULL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}
                            `}>
                                {req.type === 'FULL' ? '연차' : '반차'}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Charts Section: Side by Side on Tablet (md) */}
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Sales Chart (Stacked) - Takes 2 cols on Tablet/Desktop */}
            <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-800 whitespace-nowrap">
                        주간 매출 상세 (결제수단별)
                    </h3>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 w-fit">
                        <button onClick={() => moveChartWeek('prev')} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronLeft size={20}/></button>
                        <span className="text-sm font-medium px-2 whitespace-nowrap">
                            {chartStartDate.toLocaleDateString()} ~ {new Date(new Date(chartStartDate).setDate(chartStartDate.getDate()+6)).toLocaleDateString()}
                        </span>
                        <button onClick={() => moveChartWeek('next')} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronRight size={20}/></button>
                    </div>
                </div>
                
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={salesChartData} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        onClick={(data) => {
                        if (data && data.activeLabel) {
                            const clickedItem = salesChartData.find(item => item.name === data.activeLabel);
                            if (clickedItem) {
                                onNavigateToHistory({
                                    type: 'DATE',
                                    value: clickedItem.fullDate,
                                    label: `${clickedItem.name} 매출 상세`
                                });
                            }
                        }
                        }}
                        className="cursor-pointer"
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis 
                            stroke="#9ca3af" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => value === 0 ? '0' : `₩${formatNumber(Math.round(value/10000))}만`}
                        />
                        <Tooltip 
                            content={<CustomTooltip />}
                            cursor={{fill: 'transparent'}}
                        />
                        <Legend />
                        <Bar dataKey="CARD" name="카드" stackId="a" fill={CHART_COLORS.CARD} />
                        <Bar dataKey="CASH" name="현금" stackId="a" fill={CHART_COLORS.CASH} />
                        <Bar dataKey="TRANSFER" name="이체" stackId="a" fill={CHART_COLORS.TRANSFER} radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Secondary Chart: Sales by Store - Takes 1 col on Tablet/Desktop */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 mb-1">{currentDate.getMonth() + 1}월 매장별 점유율</h3>
                <p className="text-xs text-gray-500 mb-4">총 {formatCurrency(totalRevenue)} 중 비중</p>
                {storeShareData.length > 0 ? (
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={storeShareData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                            >
                            {storeShareData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend 
                            verticalAlign="bottom" 
                            align="left" 
                            />
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-80 flex items-center justify-center text-gray-400">
                        데이터가 없습니다.
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Sales Calendar Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap">
                  <Calendar className="text-blue-600" size={20} /> 
                  {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 매출 캘린더
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">타이어 총 판매량:</span>
                <span className="text-base font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">{formatNumber(monthlyTireQuantity)}개</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {prevMonthDailyAverage > 0 && (
                    <span className="text-[10px] sm:text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 font-medium whitespace-nowrap">
                        전월 일 평균 {formatCurrency(Math.round(prevMonthDailyAverage))} 초과 달성일 강조
                    </span>
                )}
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
                    <button 
                        onClick={() => setCalendarView('grid')}
                        className={`px-2 py-1 text-xs font-bold rounded-md ${calendarView === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}
                    >달력</button>
                    <button 
                        onClick={() => setCalendarView('list')}
                        className={`px-2 py-1 text-xs font-bold rounded-md ${calendarView === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}
                    >목록</button>
                </div>
            </div>
        </div>
        <div className="p-4 md:p-6">
            {calendarView === 'grid' ? (
                <>
                    <div className="grid grid-cols-7 mb-2">
                        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                            <div key={day} className={`text-center text-xs md:text-sm font-medium py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                                {day}
                            </div>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 md:gap-2">
                        {calendarDays.map((date, index) => {
                            if (!date) return <div key={`empty-${index}`} className="min-h-[80px] md:h-28 bg-gray-50/50 rounded-lg"></div>;
                            
                            const { revenue, cash, card, transfer, tireQuantity } = getDailyStats(date);
                            const isToday = new Date().toDateString() === date.toDateString();
                            const isSunday = date.getDay() === 0;
                            const isSaturday = date.getDay() === 6;
                            const dateString = formatDateYMD(date);

                            const isHighRevenue = prevMonthDailyAverage > 0 && revenue > prevMonthDailyAverage;
                            
                            return (
                                <div 
                                    key={date.toISOString()} 
                                    onClick={() => onNavigateToHistory({ 
                                        type: 'DATE', 
                                        value: dateString, 
                                        label: `${date.getMonth()+1}월 ${date.getDate()}일 매출 상세` 
                                    })}
                                    className={`min-h-[80px] md:h-28 rounded-lg border p-1 md:p-2 flex flex-col justify-between transition-all cursor-pointer
                                        ${isToday ? 'border-blue-500 ring-1 ring-blue-200 bg-blue-50' : 
                                          isHighRevenue ? 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-300 hover:shadow-md' : 
                                          'border-gray-100 hover:border-blue-300 bg-white hover:shadow-md hover:-translate-y-1'}
                                    `}
                                >
                                    <span className={`text-[11px] md:text-sm font-medium 
                                        ${isSunday ? 'text-red-500' : isSaturday ? 'text-blue-500' : 'text-gray-700'}
                                    `}>
                                        {date.getDate()}
                                    </span>
                                    {(revenue > 0 || tireQuantity > 0) && (
                                        <div className="text-right flex flex-col items-end gap-0.5 mt-1 w-full">
                                            {tireQuantity > 0 && (
                                                <div className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap mb-1">
                                                    타이어 {tireQuantity}개
                                                </div>
                                            )}
                                            <div className={`font-bold text-[13px] leading-tight tracking-tight truncate max-w-full ${isHighRevenue ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                {formatCurrency(revenue)}
                                            </div>
                                            <div className="flex flex-col items-end text-[9px] text-gray-500 font-medium leading-snug mt-1 gap-0.5 w-full">
                                                {card > 0 && (
                                                    <span className="flex items-center gap-1 text-blue-500 truncate max-w-full">
                                                        <CreditCard size={12} /> {formatCurrency(Math.round(card/10000))}만
                                                    </span>
                                                )}
                                                {cash > 0 && (
                                                    <span className="flex items-center gap-1 text-emerald-600 truncate max-w-full">
                                                        <Banknote size={12} /> {formatCurrency(Math.round(cash/10000))}만
                                                    </span>
                                                )}
                                                {transfer > 0 && (
                                                    <span className="flex items-center gap-1 text-violet-600 truncate max-w-full">
                                                        <Smartphone size={12} /> {formatCurrency(Math.round(transfer/10000))}만
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="flex flex-col gap-2">
                    {calendarList.map(date => {
                        const { revenue, cash, card, transfer, tireQuantity } = getDailyStats(date);
                        const isToday = new Date().toDateString() === date.toDateString();
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const isHighRevenue = prevMonthDailyAverage > 0 && revenue > prevMonthDailyAverage;
                        const dateString = formatDateYMD(date);
                        const dayLabel = ['일','월','화','수','목','금','토'][date.getDay()];

                        return (
                            <button
                                key={date.toISOString()}
                                onClick={() => onNavigateToHistory({ type: 'DATE', value: dateString, label: `${date.getMonth()+1}월 ${date.getDate()}일 매출 상세` })}
                                className={`flex items-center justify-between w-full text-left rounded-xl border px-3 py-2 transition-all ${
                                    isToday ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : isHighRevenue ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-sm font-bold ${isWeekend ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-800'}`}>
                                        <span>{date.getDate()}</span>
                                        <span className="text-[10px] font-medium text-gray-500">{dayLabel}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[13px] font-bold truncate max-w-[140px] ${isHighRevenue ? 'text-emerald-700' : 'text-slate-800'}`}>{formatCurrency(revenue)}</span>
                                        <div className="flex flex-wrap gap-1 text-[10px] text-gray-500 mt-0.5">
                                            {card > 0 && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full flex items-center gap-1 truncate max-w-[140px]"><CreditCard size={12} /> {formatCurrency(Math.round(card/10000))}만</span>}
                                            {cash > 0 && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full flex items-center gap-1 truncate max-w-[140px]"><Banknote size={12} /> {formatCurrency(Math.round(cash/10000))}만</span>}
                                            {transfer > 0 && <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full flex items-center gap-1 truncate max-w-[140px]"><Smartphone size={12} /> {formatCurrency(Math.round(transfer/10000))}만</span>}
                                            {tireQuantity > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px] font-bold truncate max-w-[140px]">타이어 {tireQuantity}개</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[11px] text-gray-500 font-medium whitespace-nowrap">{date.toLocaleDateString()}</div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
      </div>
      {/* Notice Modal (shared for admin) */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">공지 추가</h3>
                    <button onClick={() => setIsNoticeModalOpen(false)} className="text-gray-400 hover:text-gray-600">닫기</button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">제목</label>
                        <input type="text" value={noticeForm.title} onChange={(e) => setNoticeForm({...noticeForm, title: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">내용</label>
                        <textarea value={noticeForm.content} onChange={(e) => setNoticeForm({...noticeForm, content: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" rows={4} />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={noticeForm.urgent} onChange={(e) => setNoticeForm({...noticeForm, urgent: e.target.checked})} />
                            <span className="text-xs">긴급(상단 표시)</span>
                        </label>
                        <div className="flex-1" />
                        <button onClick={() => setIsNoticeModalOpen(false)} className="px-3 py-2 border rounded-lg">취소</button>
                        <button onClick={handleAddNotice} className="px-3 py-2 bg-blue-600 text-white rounded-lg">저장</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value, icon: Icon, color, growth, isPrimary = false, onClick, comparisonText, isSidebarOpen = true }: any) => (
    <div 
        onClick={onClick}
        className={`
            relative overflow-hidden rounded-xl shadow-sm border transition-all cursor-pointer hover:scale-[1.02] hover:shadow-md
            ${isPrimary ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-600' : 'bg-white border-gray-100 hover:border-blue-200'}
            p-4 sm:p-5 ${isSidebarOpen ? 'md:p-3 xl:p-5' : ''}
        `}
    >
        <div className="flex justify-between items-start mb-4 md:mb-2 gap-3">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                     {/* Tablet View (md & lg): Show small inline icon ONLY if sidebar is OPEN. If closed, hide it (rely on large icon). Revert to normal on xl. */}
                     <Icon className={`hidden ${isSidebarOpen ? 'md:block xl:hidden' : ''} w-3.5 h-3.5 flex-shrink-0 ${isPrimary ? 'text-blue-200' : color.replace('bg-', 'text-')}`} />
                     <p className={`text-sm leading-tight ${isSidebarOpen ? 'md:text-xs xl:text-sm' : ''} font-medium whitespace-normal sm:whitespace-nowrap ${isPrimary ? 'text-blue-100' : 'text-gray-500'}`}>{title}</p>
                </div>
                <h4 className={`font-bold tracking-tight whitespace-normal break-words sm:whitespace-nowrap ${isPrimary ? 'text-lg sm:text-xl' : 'text-lg sm:text-xl text-gray-900'} ${isSidebarOpen ? 'md:text-lg xl:text-xl' : ''}`}>{value}</h4>
            </div>
            {/* Tablet View (md & lg): Show large icon ONLY if sidebar is CLOSED. If open, hide it to save space. Show on xl. */}
            <div className={`ml-2 ${isSidebarOpen ? 'md:hidden xl:block' : ''} lg:block p-3 lg:p-2 rounded-xl shadow-sm flex-shrink-0 ${isPrimary ? 'bg-white/20 text-white' : `${color.replace('bg-', 'bg-').replace('600', '50')} ${color.replace('bg-', 'text-')}`}`}>
                <Icon size={28} className="lg:w-7 lg:h-7" />
            </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs whitespace-normal sm:whitespace-nowrap flex-wrap">
            {comparisonText ? (
                 <span className={`${isPrimary ? 'text-blue-100' : 'text-gray-500'} font-medium ${isSidebarOpen ? 'md:text-[10px] xl:text-xs' : ''} lg:text-xs truncate`}>
                    {comparisonText}
                 </span>
            ) : (
                <>
                    <div className={`flex items-center px-1.5 py-0.5 rounded font-bold ${
                        Number(growth) >= 0 
                            ? (isPrimary ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700') 
                            : (isPrimary ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700')
                    }`}>
                        {Number(growth) >= 0 ? <ArrowUpRight size={12} className="mr-0.5"/> : <ArrowDownRight size={12} className="mr-0.5"/>}
                        {Math.abs(Number(growth))}%
                    </div>
                    <span className={isPrimary ? 'text-blue-100' : 'text-gray-400'}>전월 대비</span>
                </>
            )}
        </div>
    </div>
);

export default Dashboard;

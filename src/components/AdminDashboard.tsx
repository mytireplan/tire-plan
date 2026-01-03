import React, { useState, useMemo, useEffect } from 'react';
import type { Sale, Store, Staff, LeaveRequest } from '../types';
import { PaymentMethod } from '../types';
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  DollarSign, 
  Settings, 
  Truck, 
  Calendar as CalendarIcon,
  BarChart3,
  Bell,
  MoreVertical,
  CreditCard,
  Banknote,
  Wallet,
  UserX,
  Clock,
  Plus,
  X as XIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { formatCurrency, formatNumber } from '../utils/format';

interface AdminDashboardProps {
  sales: Sale[];
  stores: Store[];
  staffList: Staff[];
  leaveRequests: LeaveRequest[];
  currentUser: any;
  onNavigateToLeaveSchedule?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

// --- UI 헬퍼 컴포넌트 ---
const SectionWrapper = ({ title, children, defaultOpen = true }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6 transition-all">
      <div 
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 border-b border-slate-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <div className="w-1 h-5 bg-blue-600 rounded-full" />
          {title}
        </h2>
        {isOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
      </div>
      <div className={`transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100 p-6' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        {children}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subValue, icon: Icon, color, onClick, detailContent }: any) => {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div 
        onClick={() => {
          setShowDetail(!showDetail);
          if(onClick) onClick();
        }}
        className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
            <Icon size={24} className={color.replace('bg-', 'text-')} />
          </div>
          <MoreVertical size={16} className="text-slate-300 group-hover:text-slate-600" />
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
          {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
          <span className="text-xs font-semibold text-blue-600 group-hover:underline">상세보기</span>
          <ChevronDown size={14} className={`text-blue-600 transition-transform ${showDetail ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      {showDetail && detailContent && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 animate-in fade-in slide-in-from-top-2">
          {detailContent}
        </div>
      )}
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ sales, stores, staffList, leaveRequests, currentUser, onNavigateToLeaveSchedule }) => {
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL');
  const [chartType, setChartType] = useState<'revenue' | 'tires' | 'maint'>('revenue');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [announcements, setAnnouncements] = useState([
    { id: '1', tag: "중요", title: "1월 설 연휴 휴무 안내", date: "2026.01.03" },
    { id: '2', tag: "이벤트", title: "엔진오일 교환 20% 할인 프로모션 시작", date: "2026.01.02" },
    { id: '3', tag: "업데이트", title: "시스템 정기 점검 안내 (01:00 ~ 03:00)", date: "2025.12.31" },
  ]);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({ tag: '이벤트', title: '', content: '' });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // --- 데이터 계산 ---
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = new Date(s.date);
      const sameMonth = saleDate.getFullYear() === year && saleDate.getMonth() === month;
      const sameStore = selectedStoreId === 'ALL' || s.storeId === selectedStoreId;
      return sameMonth && sameStore && !s.isCanceled;
    });
  }, [sales, year, month, selectedStoreId]);

  // 매출 계산
  const revenueData = useMemo(() => {
    const total = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const breakdown = [
      { 
        type: "카드매출", 
        value: filteredSales.filter(s => s.paymentMethod === PaymentMethod.CARD).reduce((sum, s) => sum + s.totalAmount, 0),
        icon: <CreditCard className="w-4 h-4" /> 
      },
      { 
        type: "이체매출", 
        value: filteredSales.filter(s => s.paymentMethod === PaymentMethod.TRANSFER).reduce((sum, s) => sum + s.totalAmount, 0),
        icon: <Banknote className="w-4 h-4" /> 
      },
      { 
        type: "현금매출", 
        value: filteredSales.filter(s => s.paymentMethod === PaymentMethod.CASH).reduce((sum, s) => sum + s.totalAmount, 0),
        icon: <Wallet className="w-4 h-4" /> 
      },
    ];
    return { total, breakdown };
  }, [filteredSales]);

  // 타이어 판매 계산 (타이어만 필터링)
  const tireSalesData = useMemo(() => {
    // 타이어만 필터링 (productName에 '타이어' 포함)
    const total = filteredSales.reduce((sum, s) => {
      const tireQty = s.items?.reduce((itemSum, item) => {
        const isTire = item.productName?.includes('타이어');
        return itemSum + (isTire ? item.quantity : 0);
      }, 0) || 0;
      return sum + tireQty;
    }, 0);
    
    // 브랜드별 집계 (타이어만)
    const brandMap = new Map<string, number>();
    filteredSales.forEach(s => {
      s.items?.forEach(item => {
        const isTire = item.productName?.includes('타이어');
        if (isTire) {
          const brand = item.brand || '기타';
          brandMap.set(brand, (brandMap.get(brand) || 0) + item.quantity);
        }
      });
    });

    const suppliers = Array.from(brandMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { total, suppliers };
  }, [filteredSales]);

  // 정비 데이터 계산 (간단히 품목 수로 계산)
  const maintenanceData = useMemo(() => {
    const items: { name: string; count: number; revenue: number }[] = [];
    const itemMap = new Map<string, { count: number; revenue: number }>();

    filteredSales.forEach(s => {
      s.items?.forEach(item => {
        if (!itemMap.has(item.productName)) {
          itemMap.set(item.productName, { count: 0, revenue: 0 });
        }
        const existing = itemMap.get(item.productName)!;
        itemMap.set(item.productName, {
          count: existing.count + item.quantity,
          revenue: existing.revenue + (item.price * item.quantity)
        });
      });
    });

    itemMap.forEach((data, name) => {
      items.push({ name, ...data });
    });

    items.sort((a, b) => b.revenue - a.revenue);

    return {
      totalCount: items.reduce((sum, item) => sum + item.count, 0),
      totalRevenue: items.reduce((sum, item) => sum + item.revenue, 0),
      items: items.slice(0, 4)
    };
  }, [filteredSales]);

  // 매장별 성과 비교
  const storePerformanceData = useMemo(() => {
    return stores.map(store => {
      const storeSales = filteredSales.filter(s => s.storeId === store.id);
      // 매출: 실제 금액 (천 단위로 표시하기 위해 1000으로 나눔)
      const revenueTotal = storeSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const revenue = Math.round(revenueTotal / 1000); // 천 단위 (차트에서 1 = 천원)
      
      // 타이어 판매 개수 (타이어만 필터링)
      const tires = storeSales.reduce((sum, s) => {
        const tireQty = s.items?.reduce((itemSum, item) => {
          const isTire = item.productName?.includes('타이어');
          return itemSum + (isTire ? item.quantity : 0);
        }, 0) || 0;
        return sum + tireQty;
      }, 0);
      
      // 정비 건수 (타이어가 아닌 상품 항목 수)
      const maint = storeSales.reduce((sum, s) => {
        const maintCount = s.items?.filter(item => !item.productName?.includes('타이어')).length || 0;
        return sum + maintCount;
      }, 0);
      
      return { name: store.name, revenue, tires, maint };
    });
  }, [filteredSales, stores]);

  // 캘린더 계산
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const startDay = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  // 일별 매출 및 타이어 판매 (타이어만 필터링)
  const dailySalesMap = useMemo(() => {
    const map = new Map<number, { revenue: number; count: number; tires: number }>();
    filteredSales.forEach(s => {
      const day = new Date(s.date).getDate();
      const existing = map.get(day) || { revenue: 0, count: 0, tires: 0 };
      // 타이어만 계산
      const tireQty = s.items?.reduce((sum, item) => {
        const isTire = item.productName?.includes('타이어');
        return sum + (isTire ? item.quantity : 0);
      }, 0) || 0;
      map.set(day, {
        revenue: existing.revenue + s.totalAmount,
        count: existing.count + 1,
        tires: existing.tires + tireQty
      });
    });
    return map;
  }, [filteredSales]);

  // 다가오는 휴무 (7일 이내)
  const upcomingLeaves = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return leaveRequests
      .filter(lr => {
        if (lr.status !== 'APPROVED') return false;
        const startDate = new Date(lr.startDate);
        return startDate >= today && startDate <= nextWeek;
      })
      .slice(0, 3);
  }, [leaveRequests]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">DASHBOARD <span className="text-blue-600">PRO</span></h1>
          <p className="text-slate-500 text-sm">실시간 매출 및 운영 현황을 확인하세요.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* 매장 선택 */}
          <select 
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium shadow-sm outline-none focus:ring-2 ring-blue-500 h-10"
          >
            <option value="ALL">전체 매장</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* 월별 이동 네비게이션 */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm h-10">
            <button 
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-500"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-3 flex items-center gap-2 min-w-[120px] justify-center">
              <CalendarIcon size={14} className="text-blue-600" />
              <span className="text-sm font-bold text-slate-700">
                {year}년 {String(month + 1).padStart(2, '0')}월
              </span>
            </div>
            <button 
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-500"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. 매출 캘린더 (접었다 폈다) */}
        <SectionWrapper title={`${month + 1}월 매출 현황 (캘린더)`} defaultOpen={false}>
          <div className="grid grid-cols-7 gap-1 min-h-[400px]">
            {['일','월','화','수','목','금','토'].map(d => (
              <div key={d} className="text-center py-2 text-xs font-bold text-slate-400 border-b border-slate-100">{d}</div>
            ))}
            
            {/* 공백 채우기 (시작 요일 전까지) */}
            {Array.from({length: startDay}).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] bg-slate-50/30 border border-transparent" />
            ))}

            {/* 실제 날짜 Grid */}
            {Array.from({length: daysInMonth}).map((_, i) => {
              const day = i + 1;
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              const dayData = dailySalesMap.get(day);
              
              return (
                <div 
                  key={day} 
                  onClick={() => {
                    if (dayData) {
                      // 날짜 클릭 시 판매내역 탭으로 이동하고 해당 날짜의 판매 필터링
                      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      window.dispatchEvent(new CustomEvent('navigateToDailyHistory', { detail: { date: dateString } }));
                    }
                  }}
                  className={`min-h-[80px] p-2 border border-slate-50 transition-colors group ${dayData ? 'hover:bg-blue-50 cursor-pointer' : ''} ${isToday ? 'bg-blue-50/50' : ''}`}
                >
                  <span className={`text-xs font-medium ${isToday ? 'text-blue-600 font-bold' : 'text-slate-400'} group-hover:text-blue-600`}>
                    {day}
                  </span>
                  {dayData && (
                    <div className="mt-1 space-y-1">
                      <div className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-bold truncate">
                        {formatCurrency(dayData.revenue)}
                      </div>
                      <div className="text-[9px] bg-green-100 text-green-700 px-1 rounded font-bold truncate">
                        타이어 {dayData.tires}개
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionWrapper>

        {/* 2. 카드 섹션 (접었다 폈다) */}
        <SectionWrapper title={`${month + 1}월 주요 지표 요약`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 월별 총 매출 카드 */}
            <StatCard 
              title="월별 총 매출"
              value={formatCurrency(revenueData.total)}
              subValue={`총 ${filteredSales.length}건`}
              icon={DollarSign}
              color="bg-blue-500"
              detailContent={
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 mb-2">결제 수단별 상세</p>
                  {revenueData.breakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        {item.icon}
                        <span>{item.type}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="mt-2 h-2 w-full bg-slate-200 rounded-full flex overflow-hidden">
                    {revenueData.breakdown.map((item, idx) => (
                      <div 
                        key={idx}
                        className={`h-full ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-emerald-500' : 'bg-orange-500'}`} 
                        style={{width: `${revenueData.total > 0 ? (item.value / revenueData.total * 100) : 0}%`}} 
                      />
                    ))}
                  </div>
                </div>
              }
            />

            {/* 월별 타이어 판매 수량 카드 */}
            <StatCard 
              title="총 타이어 판매량"
              value={`${formatNumber(tireSalesData.total)} 개`}
              subValue={`총 ${tireSalesData.suppliers.length}개 브랜드`}
              icon={Truck}
              color="bg-emerald-500"
              detailContent={
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 mb-2">브랜드별 판매 순위</p>
                  {tireSalesData.suppliers.slice(0, 4).map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                          {idx + 1}
                        </span>
                        <span className="text-sm text-slate-600">{s.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{s.count} 개</span>
                    </div>
                  ))}
                </div>
              }
            />

            {/* 월별 정비 수량 및 매출 카드 */}
            <StatCard 
              title="정비 수량 및 매출"
              value={`${maintenanceData.totalCount} 건`}
              subValue={formatCurrency(maintenanceData.totalRevenue)}
              icon={Settings}
              color="bg-orange-500"
              detailContent={
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 mb-2">항목별 정비 실적</p>
                  <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                    {maintenanceData.items.map((item, idx) => (
                      <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">{item.name}</span>
                          <span className="text-xs text-blue-600 font-bold">{item.count} 건</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400">합계 매출</span>
                          <span className="text-[10px] text-slate-600">{formatCurrency(item.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              }
            />

          </div>
        </SectionWrapper>

        {/* 3. 그래프 섹션 - 매장별 점유율 및 비교 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="text-blue-600" size={20} />
                매장별 성과 비교
              </h2>
              <div className="flex flex-col gap-2 self-start">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {[
                    { id: 'revenue', label: '매출' },
                    { id: 'tires', label: '타이어' },
                    { id: 'maint', label: '정비' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setChartType(t.id as any)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${chartType === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {chartType === 'revenue' && (
                  <p className="text-[11px] text-slate-500 font-medium">※ 매출은 천 단위로 표시됩니다 (1 = ₩1,000)</p>
                )}
                {chartType === 'tires' && (
                  <p className="text-[11px] text-slate-500 font-medium">※ 타이어 개수 (개)</p>
                )}
                {chartType === 'maint' && (
                  <p className="text-[11px] text-slate-500 font-medium">※ 정비 항목 수 (개)</p>
                )}
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storePerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  />
                  <Bar 
                    dataKey={chartType} 
                    fill={chartType === 'revenue' ? '#3b82f6' : chartType === 'tires' ? '#10b981' : '#f59e0b'} 
                    radius={[6, 6, 0, 0]} 
                    barSize={40} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <div className="w-1 h-5 bg-emerald-500 rounded-full" />
              매장별 점유율
            </h2>
            <div className="flex-1 min-h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={storePerformanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey={chartType}
                  >
                    {storePerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</p>
                <p className="text-xl font-black text-slate-800">
                  {storePerformanceData.reduce((acc, curr) => acc + (curr[chartType] || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {storePerformanceData.map((item, idx) => {
                const total = storePerformanceData.reduce((acc, curr) => acc + (curr[chartType] || 0), 0);
                const percentage = total > 0 ? Math.round(((item[chartType] || 0) / total) * 100) : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[idx]}} />
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. 공지사항 & 직원 휴무 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* 공지사항 (좌측 3개분할) */}
          <div className="lg:col-span-3 bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Bell size={20} className="text-blue-400" />
                공지사항 및 알림
              </h2>
              <div className="flex gap-2">
                <button className="text-xs text-slate-400 hover:text-white">전체보기</button>
                <button 
                  onClick={() => setShowAddAnnouncement(true)}
                  className="text-xs text-slate-400 hover:text-blue-400 hover:bg-white/10 px-2 py-1 rounded-md transition-all flex items-center gap-1"
                >
                  <Plus size={14} /> 추가
                </button>
              </div>
            </div>
            <div className="space-y-3 relative z-10">
              {announcements.map((n, i) => (
                <div 
                  key={n.id} 
                  onClick={() => setSelectedAnnouncement(n)}
                  className="flex items-center justify-between p-3 bg-white bg-opacity-5 hover:bg-opacity-10 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${n.tag === '중요' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                      {n.tag}
                    </span>
                    <span className="text-sm font-medium text-slate-200">{n.title}</span>
                  </div>
                  <span className="text-xs text-slate-500">{n.date}</span>
                </div>
              ))}
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-600 rounded-full blur-[80px] opacity-20" />
          </div>

          {/* 직원 휴무 일정 (우측 2개분할) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserX size={20} className="text-red-500" />
                직원 휴무 일정
              </h2>
              <div className="bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded-full font-bold">이번주 {upcomingLeaves.length}명</div>
            </div>
            <div className="space-y-3">
              {upcomingLeaves.length > 0 ? upcomingLeaves.map((leave, i) => {
                const staff = staffList.find(s => s.id === leave.staffId);
                const store = stores.find(s => s.id === staff?.storeId);
                const startDate = new Date(leave.startDate);
                const endDate = new Date(leave.endDate);
                const dateStr = startDate.toLocaleDateString() === endDate.toLocaleDateString() 
                  ? `${startDate.getMonth() + 1}.${String(startDate.getDate()).padStart(2, '0')}`
                  : `${startDate.getMonth() + 1}.${String(startDate.getDate()).padStart(2, '0')} ~ ${endDate.getMonth() + 1}.${String(endDate.getDate()).padStart(2, '0')}`;

                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-red-50 group transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm group-hover:border-red-200">
                        <Clock size={14} className="text-slate-400 group-hover:text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{staff?.name || '직원'}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{store?.name || ''} · {leave.reason || '휴가'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-600 group-hover:text-red-600">{dateStr}</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  예정된 휴무가 없습니다.
                </div>
              )}
            </div>
            {/* 휴무 일정 등록 버튼 */}
            <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-center">
              <button 
                onClick={() => {
                  if (onNavigateToLeaveSchedule) {
                    onNavigateToLeaveSchedule();
                  }
                }}
                className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                <Plus size={14} /> 휴무 일정 등록
              </button>
            </div>
          </div>

        </div>

      </main>
      
      {/* 공지사항 추가 모달 */}
      {showAddAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">공지사항 추가</h3>
              <button 
                onClick={() => setShowAddAnnouncement(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XIcon size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-600 block mb-1">태그</label>
                <select 
                  value={newAnnouncement.tag}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, tag: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option>중요</option>
                  <option>이벤트</option>
                  <option>업데이트</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-600 block mb-1">제목</label>
                <input 
                  type="text"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                  placeholder="제목을 입력하세요"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-600 block mb-1">내용</label>
                <textarea 
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                  placeholder="내용을 입력하세요"
                  rows={4}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button 
                  onClick={() => setShowAddAnnouncement(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50"
                >
                  취소
                </button>
                <button 
                  onClick={() => {
                    if (newAnnouncement.title.trim()) {
                      const today = new Date();
                      const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
                      setAnnouncements([
                        { 
                          id: String(announcements.length + 1),
                          tag: newAnnouncement.tag, 
                          title: newAnnouncement.title, 
                          date: dateStr,
                          content: newAnnouncement.content
                        },
                        ...announcements
                      ]);
                      setNewAnnouncement({ tag: '이벤트', title: '', content: '' });
                      setShowAddAnnouncement(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 공지사항 상세 모달 */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-xl max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${selectedAnnouncement.tag === '중요' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                {selectedAnnouncement.tag}
              </span>
              <button 
                onClick={() => setSelectedAnnouncement(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XIcon size={20} />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-2">{selectedAnnouncement.title}</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedAnnouncement.date}</p>
            
            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              {selectedAnnouncement.content || '상세 내용이 없습니다.'}
            </p>

            <button 
              onClick={() => setSelectedAnnouncement(null)}
              className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200"
            >
              닫기
            </button>
          </div>
        </div>
      )}
      
      <footer className="max-w-7xl mx-auto mt-12 mb-8 text-center text-slate-400 text-xs font-medium">
        © 2026 Tire & Auto Dashboard Pro. All rights reserved.
      </footer>
    </div>
  );
};

export default AdminDashboard;

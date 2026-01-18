
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Sale, StockInRecord, ExpenseRecord, FixedCostConfig, SalesFilter, User, Store } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Trash2, Image as ImageIcon, X, CheckCircle2, AlertTriangle, Calculator, Table, CreditCard, PieChart as PieChartIcon, ChevronLeft, ChevronRight, Store as StoreIcon, Settings as SettingsIcon } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';

interface FinancialsProps {
  sales: Sale[];
  stockInHistory: StockInRecord[];
  onUpdateStockInRecord: (record: StockInRecord) => void;
  expenses: ExpenseRecord[];
  onAddExpense: (expense: ExpenseRecord) => void;
  onUpdateExpense: (expense: ExpenseRecord) => void;
  onRemoveExpense: (id: string) => void;
  fixedCosts: FixedCostConfig[];
  onUpdateFixedCosts: (costs: FixedCostConfig[]) => void;
  onNavigateToHistory: (filter: SalesFilter) => void;
  currentUser: User;
  stores: Store[];
  currentStoreId: string;
}

const EXPENSE_CATEGORIES = [
    '식비', '교통/유류비', '공과금', '폐타이어처리비', '인건비', '회식비', '소모품비', '임대료', '기타'
];

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#64748b'];
const RADIAN = Math.PI / 180;

const Financials: React.FC<FinancialsProps> = ({ 
    sales, stockInHistory, onUpdateStockInRecord, expenses, onAddExpense, onRemoveExpense, fixedCosts, onUpdateFixedCosts, onNavigateToHistory, currentUser, stores, currentStoreId
}) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedStoreId, setSelectedStoreId] = useState<string>(currentStoreId); // Store Filter - initialize from prop
    
    const [showFixedCostModal, setShowFixedCostModal] = useState(false);
    const [showBatchCostModal, setShowBatchCostModal] = useState(false); // Batch Entry Modal
    
    const tableRef = useRef<HTMLDivElement>(null);
    const isAdmin = currentUser.role === 'STORE_ADMIN';

    // Table Filter & Sort State
    const [tableCategoryFilter, setTableCategoryFilter] = useState<string>('ALL');
    const [tableSortOrder] = useState<'desc' | 'asc'>('desc');

    const dateToLocalString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Expense Form State
    const [expenseForm, setExpenseForm] = useState({
        date: dateToLocalString(new Date()),
        category: EXPENSE_CATEGORIES[0],
        description: '',
        amount: '',
        receiptImage: null as string | null
    });

    // Helper: Month Navigation
    const handleMonthChange = (delta: number) => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + delta, 1);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        setSelectedMonth(`${y}-${m}`);
    };

    // --- Filtered Data (by Store) ---
    const filteredSales = useMemo(() => {
        if (selectedStoreId === 'ALL') return sales;
        return sales.filter(s => s.storeId === selectedStoreId);
    }, [sales, selectedStoreId]);

    const filteredStockHistory = useMemo(() => {
        if (selectedStoreId === 'ALL') return stockInHistory;
        return stockInHistory.filter(r => r.storeId === selectedStoreId);
    }, [stockInHistory, selectedStoreId]);

    // Only treat real inbound purchases as cost-eligible (exclude 판매소진/소진로그, zero-qty)
    const costEligibleStockHistory = useMemo(() => {
        return filteredStockHistory.filter(r => {
            const isConsumption = r.consumedAtSaleId || r.supplier === '판매소진' || r.id?.startsWith('IN-CONSUME-');
            const qty = r.receivedQuantity ?? r.quantity ?? 0;
            return !isConsumption && qty > 0;
        });
    }, [filteredStockHistory]);

    const filteredExpenses = useMemo(() => {
        if (selectedStoreId === 'ALL') return expenses;
        return expenses.filter(e => !e.storeId || e.storeId === selectedStoreId);
    }, [expenses, selectedStoreId]);

    // --- Data Aggregation Logic ---

    // 1. Unsettled Stock (Cost = 0) Analysis
    const unsettledStockItems = useMemo(() => {
        if (!isAdmin) return [];
        return costEligibleStockHistory.filter(r => r.date.startsWith(selectedMonth) && (r.purchasePrice === 0 || r.purchasePrice === undefined));
    }, [costEligibleStockHistory, selectedMonth, isAdmin]);

    // 2. Revenue
    const monthlyRevenue = useMemo(() => {
        return filteredSales
            .filter(s => s.date.startsWith(selectedMonth))
            .reduce((sum, s) => sum + s.totalAmount, 0);
    }, [filteredSales, selectedMonth]);

    // 3. Expenses Calculation
    const calculateStats = (monthStr: string) => {
         // Stock Purchases (Only count entered prices)
            const confirmedStockCost = isAdmin ? costEligibleStockHistory
                .filter(r => r.date.startsWith(monthStr))
                .reduce((sum, r) => {
                     const qty = r.receivedQuantity ?? r.quantity ?? 0;
                     return sum + ((r.purchasePrice || 0) * qty);
                }, 0) : 0;
        
        // Variable Expenses
        const variableCost = filteredExpenses
            .filter(e => e.date.startsWith(monthStr) && !e.isFixed)
            .reduce((sum, e) => sum + e.amount, 0);
        
        // Fixed Costs (Filter by store)
        const filteredFixedCosts = selectedStoreId === 'ALL' 
            ? fixedCosts 
            : fixedCosts.filter(fc => (fc.storeId || 'ALL') === selectedStoreId);
        const fixedCost = isAdmin ? filteredFixedCosts.reduce((sum, fc) => sum + fc.amount, 0) : 0;

        return {
            total: confirmedStockCost + variableCost + fixedCost,
            stock: confirmedStockCost,
            variable: variableCost,
            fixed: fixedCost
        };
    };

    const currentStats = useMemo(() => calculateStats(selectedMonth), [selectedMonth, filteredStockHistory, filteredExpenses, fixedCosts, isAdmin]);
    
    // 4. Net Profit (Provisional)
    const netProfit = monthlyRevenue - currentStats.total;

    // --- Unified List Data Generation ---
    // Merges Expenses + Stock Records into one list for the table
    const unifiedFinancialRecords = useMemo(() => {
        const records: any[] = [];

        // 1. General Expenses
        filteredExpenses.filter(e => e.date.startsWith(selectedMonth) && !e.isFixed).forEach(e => {
            records.push({
                id: e.id,
                date: e.date,
                type: 'EXPENSE',
                category: e.category,
                description: e.description,
                amount: e.amount,
                raw: e
            });
        });

        // 2. Stock Records (Admin Only)
        if (isAdmin) {
            costEligibleStockHistory.filter(r => r.date.startsWith(selectedMonth)).forEach(r => {
                const qty = r.receivedQuantity ?? r.quantity ?? 0;
                const amount = (r.purchasePrice || 0) * qty;
                records.push({
                    id: r.id,
                    date: r.date,
                    type: 'STOCK',
                    category: '매입원가',
                    description: `${r.productName} (${qty}개) - ${r.supplier}`,
                    amount: amount,
                    isUnsettled: r.purchasePrice === 0 || r.purchasePrice === undefined,
                    raw: r
                });
            });
        }

        // Fixed Costs (Filter by store) with store label
        if (isAdmin) {
             const filteredFixedCostsForList = selectedStoreId === 'ALL'
                 ? fixedCosts
                 : fixedCosts.filter(fc => (fc.storeId || 'ALL') === selectedStoreId);
             filteredFixedCostsForList.forEach(fc => {
                 const storeName = stores.find(s => s.id === fc.storeId)?.name || (fc.storeId || '지점 미지정');
                 records.push({
                     id: fc.id,
                     date: `${selectedMonth}-${String(fc.day).padStart(2, '0')}`,
                     type: 'FIXED',
                     category: fc.category,
                     description: `${storeName} | ${fc.title} (고정지출)`,
                     amount: fc.amount,
                     raw: fc
                 });
             });
        }

        // Filter
        let filtered = records;
        if (tableCategoryFilter !== 'ALL') {
            filtered = records.filter(r => r.category === tableCategoryFilter);
        }

        // Sort
        return filtered.sort((a, b) => {
            if (tableSortOrder === 'desc') return b.amount - a.amount;
            return a.amount - b.amount;
        });
    }, [filteredExpenses, costEligibleStockHistory, selectedMonth, isAdmin, tableCategoryFilter, tableSortOrder, fixedCosts, stores]);

    // Chart Data Generation
    const expenseChartData = useMemo(() => {
        const data: Record<string, number> = {};
        unifiedFinancialRecords.forEach(r => {
            // Ignore Unsettled for Chart to avoid confusion or keep it as 0
            if (r.amount > 0) {
                const key = r.category;
                data[key] = (data[key] || 0) + r.amount;
            }
        });
        
        return Object.entries(data)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [unifiedFinancialRecords]);


    // --- Handlers ---
    // use shared format helpers

    const handleAmountChange = (value: string) => {
        const rawValue = value.replace(/[^0-9]/g, '');
        const sanitizedValue = rawValue === '' ? '' : Number(rawValue).toString();
        setExpenseForm(prev => ({ ...prev, amount: sanitizedValue }));
    };

    const handleAddExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseForm.amount || !expenseForm.description) return;

        const newExpense: ExpenseRecord = {
            id: `EXP-${Date.now()}`,
            date: expenseForm.date,
            category: expenseForm.category,
            description: expenseForm.description,
            amount: Number(expenseForm.amount),
            receiptImage: expenseForm.receiptImage || undefined,
            isFixed: false,
            // Use selected store ID if available, otherwise default to first store or current user's store
            storeId: selectedStoreId !== 'ALL' ? selectedStoreId : (currentUser.role === 'STAFF' && currentUser.storeId ? currentUser.storeId : stores[0]?.id)
        };

        onAddExpense(newExpense);
        setExpenseForm(prev => ({ ...prev, description: '', amount: '', receiptImage: null }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => setExpenseForm(prev => ({ ...prev, receiptImage: ev.target?.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="#0f172a" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold">
                <tspan x={x} dy="-0.2em">{name}</tspan>
                <tspan x={x} dy="1.2em" className="font-medium text-slate-500">{`${((percent ?? 0) * 100).toFixed(0)}%`}</tspan>
            </text>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 break-keep">
                        <TrendingUp className="text-blue-600" />
                        {isAdmin ? '재무/결산 리포트' : '지출 내역'}
                    </h2>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto md:justify-end">
                    {/* Store Selector (Admin Only) */}
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 min-w-[180px] w-full md:w-auto">
                            <StoreIcon size={16} className="text-gray-500"/>
                            <select 
                                value={selectedStoreId} 
                                onChange={(e) => setSelectedStoreId(e.target.value)}
                                className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer min-w-0 w-full"
                            >
                                <option value="ALL">전체 지점 통합</option>
                                {stores.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200 min-w-[170px] w-full md:w-auto justify-between">
                        <button 
                            onClick={() => handleMonthChange(-1)}
                            className="p-1 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        <input 
                            type="month" 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer text-center px-1 min-w-0"
                        />

                        <button 
                            onClick={() => handleMonthChange(1)}
                            className="p-1 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">
                    {isAdmin && (
                        <>
                            <button 
                                onClick={() => setShowBatchCostModal(true)} 
                                className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all whitespace-nowrap ${unsettledStockItems.length > 0 ? 'bg-orange-500 text-white hover:bg-orange-600 animate-pulse' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                                <Calculator size={18} />
                                {unsettledStockItems.length > 0 ? `원가 일괄 입력 (${unsettledStockItems.length}건)` : '원가 일괄 입력'}
                            </button>
                            <button onClick={() => setShowFixedCostModal(true)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 whitespace-nowrap">
                                <SettingsIcon size={18} /> 고정지출
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* 1. Summary Cards (Admin Only) */}
            {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Revenue */}
                    <div onClick={() => onNavigateToHistory({ type: 'ALL', value: '', label: '전체 매출 상세' })} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:scale-[1.02] transition-transform hover:shadow-md group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2 relative z-10">
                            <h3 className="text-sm font-bold text-gray-500 uppercase group-hover:text-blue-600 transition-colors">총 매출 (Revenue)</h3>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={20}/></div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors relative z-10">{formatCurrency(monthlyRevenue)}</p>
                        <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-50 rounded-tl-full opacity-50"></div>
                    </div>
                    
                    {/* Expenses */}
                    <div onClick={() => tableRef.current?.scrollIntoView({behavior:'smooth'})} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:scale-[1.02] transition-transform hover:shadow-md group">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-gray-500 uppercase group-hover:text-rose-600 transition-colors">총 지출 (Expense)</h3>
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><TrendingDown size={20}/></div>
                        </div>
                        <p className="text-3xl font-bold text-rose-600">{formatCurrency(currentStats.total)}</p>
                        {unsettledStockItems.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded w-fit">
                                <AlertTriangle size={12}/> 미입력 원가 {unsettledStockItems.length}건 제외됨
                            </div>
                        )}
                    </div>

                    {/* Net Profit */}
                    <div className={`bg-white p-6 rounded-xl shadow-sm border ${netProfit >= 0 ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-gray-500 uppercase">순수익 (Net Profit)</h3>
                            <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                <DollarSign size={20}/>
                            </div>
                        </div>
                        <p className={`text-4xl font-bold ${netProfit >= 0 ? 'text-[#10B981]' : 'text-rose-600'}`}>
                            {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
                        </p>
                        {unsettledStockItems.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">* 원가 미입력으로 인한 잠정 수익입니다.</p>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left: Quick Expense Entry */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <CreditCard size={18} className="text-blue-600"/> 간편 지출 등록
                    </h3>
                    <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
                        <input 
                            type="date"
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-gray-50"
                            value={expenseForm.date}
                            onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                            required
                        />
                        <select 
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white"
                            value={expenseForm.category}
                            onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                        >
                            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input 
                            type="text" 
                            placeholder="지출 내용 (예: 회식)"
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                            required
                        />
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="0"
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm font-bold text-right pr-8"
                                value={formatNumber(expenseForm.amount)}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                required
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">원</span>
                        </div>
                        {/* Simple Image Upload */}
                        <div className="border border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:bg-gray-50 relative">
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload}/>
                            {expenseForm.receiptImage ? <span className="text-xs text-green-600 font-bold flex items-center justify-center gap-1"><CheckCircle2 size={12}/> 영수증 첨부됨</span> : <span className="text-xs text-gray-400 flex items-center justify-center gap-1"><ImageIcon size={12}/> 영수증 사진 첨부</span>}
                        </div>
                        <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-md">
                            지출 등록
                        </button>
                    </form>
                </div>

                {/* Right: Expense Analysis Chart (Restored) */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full min-h-[400px]">
                    <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <PieChartIcon size={18} className="text-blue-600"/> 
                        {selectedMonth} 지출 분석
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">카테고리별 지출 비중 (매입원가 포함)</p>
                    
                    {expenseChartData.length > 0 ? (
                        <div className="flex-1 w-full h-full min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expenseChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                        labelLine={false}
                                        label={renderPieLabel}
                                    >
                                        {expenseChartData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <PieChartIcon size={48} className="opacity-20 mb-4" />
                            <p>분석할 데이터가 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom: Unified Expense Table (Full Width) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col" ref={tableRef}>
                 <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800">통합 지출 리스트</h3>
                        {unsettledStockItems.length > 0 && (
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                {unsettledStockItems.length}건 미정산
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                         <select 
                            className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium cursor-pointer"
                            value={tableCategoryFilter}
                            onChange={(e) => setTableCategoryFilter(e.target.value)}
                        >
                            <option value="ALL">전체 보기</option>
                            {isAdmin && <option value="매입원가">매입원가 (Stock)</option>}
                            {isAdmin && <option value="고정지출">고정지출</option>}
                            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                 </div>

                 <div className="flex-1 overflow-x-auto min-h-[400px]">
                    <table className="w-full min-w-[640px] text-sm text-left relative">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-3 w-[72px] text-center">날짜</th>
                                <th className="px-3 py-3 w-[96px]">구분</th>
                                <th className="px-3 py-3">내용 / 거래처</th>
                                <th className="px-3 py-3 w-[110px] text-right sticky right-[60px] bg-gray-50">금액</th>
                                <th className="px-3 py-3 w-[60px] text-right sticky right-0 bg-gray-50">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                             {unifiedFinancialRecords.length === 0 ? (
                                 <tr><td colSpan={5} className="text-center py-10 text-gray-400">데이터가 없습니다.</td></tr>
                             ) : (
                                 unifiedFinancialRecords.map((record, _idx) => (
                                     <tr key={`${record.type}-${record.id}`} className={`hover:bg-gray-50 transition-colors ${record.isUnsettled ? 'bg-orange-50/60' : ''}`}>
                                         <td className="px-3 py-2 text-gray-500 font-mono whitespace-nowrap text-center">{record.date.slice(5)}</td>
                                         <td className="px-3 py-2 whitespace-nowrap">
                                             <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                                                 record.type === 'STOCK' 
                                                    ? (record.isUnsettled ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200')
                                                    : record.type === 'FIXED'
                                                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                                                    : 'bg-white text-gray-600 border-gray-200'
                                             }`}>
                                                 {record.category}
                                             </span>
                                         </td>
                                         <td className="px-3 py-2 text-gray-800 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]" title={record.description}>
                                             {record.description}
                                             {record.isUnsettled && <span className="ml-2 text-[10px] text-red-500 font-bold">⚠️ 단가 미입력</span>}
                                         </td>
                                         <td className={`px-3 py-2 text-right font-bold whitespace-nowrap sticky right-[60px] bg-white ${record.isUnsettled ? 'text-red-400' : 'text-gray-900'}`}>
                                             {formatCurrency(record.amount)}
                                         </td>
                                         <td className="px-3 py-2 text-right sticky right-0 bg-white">
                                             {record.type === 'EXPENSE' && (
                                                 <button onClick={() => { if(confirm('삭제하시겠습니까?')) onRemoveExpense(record.id); }} className="text-gray-300 hover:text-red-500">
                                                     <Trash2 size={14} />
                                                 </button>
                                             )}
                                         </td>
                                     </tr>
                                 ))
                             )}
                        </tbody>
                    </table>
                 </div>
            </div>

            {/* Batch Cost Entry Modal */}
            {showBatchCostModal && isAdmin && (
                <BatchCostEntryModal 
                    stockRecords={costEligibleStockHistory} 
                    onUpdateRecord={onUpdateStockInRecord} 
                    onClose={() => setShowBatchCostModal(false)}
                    currentMonth={selectedMonth}
                />
            )}

            {/* Fixed Cost Modal (Reused) */}
            {showFixedCostModal && isAdmin && (
                <FixedCostModal 
                    fixedCosts={fixedCosts} 
                    onClose={() => setShowFixedCostModal(false)}
                    onSave={onUpdateFixedCosts}
                    selectedStoreId={selectedStoreId}
                    fallbackStoreId={stores[0]?.id || ''}
                    currentUser={currentUser}
                    stores={stores}
                />
            )}
        </div>
    );
};

// Batch Cost Entry Modal (Excel Style)
const BatchCostEntryModal = ({ stockRecords, onUpdateRecord, onClose, currentMonth }: { stockRecords: StockInRecord[], onUpdateRecord: (r: StockInRecord) => void, onClose: () => void, currentMonth: string }) => {
    const [filterSupplier, setFilterSupplier] = useState('ALL');
    const [localRecords, setLocalRecords] = useState<StockInRecord[]>([]);

    useEffect(() => {
        // Filter by month first
        const records = stockRecords
            .filter(r => r.date.startsWith(currentMonth))
            .filter(r => {
                const isConsumption = r.consumedAtSaleId || r.supplier === '판매소진' || r.id?.startsWith('IN-CONSUME-');
                const qty = r.receivedQuantity ?? r.quantity ?? 0;
                return !isConsumption && qty > 0;
            });
        // Sort by Date then Supplier
        records.sort((a, b) => a.date.localeCompare(b.date) || a.supplier.localeCompare(b.supplier));
        setLocalRecords(records);
    }, [stockRecords, currentMonth]);

    const filteredRecords = useMemo(() => {
        if (filterSupplier === 'ALL') return localRecords;
        return localRecords.filter(r => r.supplier === filterSupplier);
    }, [localRecords, filterSupplier]);

    const uniqueSuppliers = useMemo(() => Array.from(new Set(localRecords.map(r => r.supplier))), [localRecords]);

    const handlePriceChange = (id: string, val: string) => {
        const raw = val.replace(/[^0-9]/g, '');
        const num = Number(raw);
        // Optimistic UI update
        setLocalRecords(prev => prev.map(r => r.id === id ? { ...r, purchasePrice: num } : r));
    };

    const handleBlur = (id: string) => {
        const record = localRecords.find(r => r.id === id);
        if (record) onUpdateRecord(record);
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Move focus to next input
            const nextInput = document.getElementById(`batch-input-${index + 1}`);
            if (nextInput) (nextInput as HTMLInputElement).focus();
            else (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50 shrink-0 rounded-t-2xl">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Table className="text-blue-600" /> 매입원가 일괄 입력
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">거래처 명세서를 보고 단가만 빠르게 입력하세요. (Enter키로 이동)</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                </div>

                <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-4 shrink-0">
                    <span className="text-sm font-bold text-gray-700">거래처 필터:</span>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <button 
                            onClick={() => setFilterSupplier('ALL')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filterSupplier === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            전체 ({localRecords.length})
                        </button>
                        {uniqueSuppliers.map(s => (
                            <button 
                                key={s}
                                onClick={() => setFilterSupplier(s)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filterSupplier === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-gray-50 p-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-500 font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 w-[100px]">날짜</th>
                                    <th className="px-4 py-3 w-[120px]">거래처</th>
                                    <th className="px-4 py-3">상품명 (규격)</th>
                                    <th className="px-4 py-3 w-[80px] text-center">수량</th>
                                    <th className="px-4 py-3 w-[150px] text-right bg-blue-50/50 border-l border-blue-100">매입단가 (입력)</th>
                                    <th className="px-4 py-3 w-[120px] text-right">합계</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRecords.map((record, idx) => (
                                    <tr key={record.id} className={`hover:bg-blue-50 transition-colors ${record.purchasePrice === 0 ? 'bg-orange-50/30' : ''}`}>
                                        <td className="px-4 py-2 font-mono text-gray-600">{record.date.slice(5)}</td>
                                        <td className="px-4 py-2 text-gray-800 font-medium truncate max-w-[120px]">{record.supplier}</td>
                                        <td className="px-4 py-2">
                                            <div className="font-bold text-gray-800">{record.productName}</div>
                                            <div className="text-xs text-blue-600">{record.specification}</div>
                                        </td>
                                        <td className="px-4 py-2 text-center font-bold">{record.receivedQuantity ?? record.quantity ?? 0}</td>
                                        <td className="px-4 py-2 text-right bg-blue-50/30 border-l border-blue-100">
                                            <input 
                                                id={`batch-input-${idx}`}
                                                type="text" 
                                                className={`w-full text-right font-bold bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-1 py-1 ${record.purchasePrice === 0 ? 'text-red-500 placeholder-red-300' : 'text-blue-700'}`}
                                                placeholder="0"
                                                value={record.purchasePrice ? formatNumber(record.purchasePrice) : ''}
                                                onChange={(e) => handlePriceChange(record.id, e.target.value)}
                                                onBlur={() => handleBlur(record.id)}
                                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                                autoComplete="off"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-right font-medium text-gray-600">
                                            {formatCurrency((record.purchasePrice || 0) * (record.receivedQuantity ?? record.quantity ?? 0))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div className="p-4 bg-white border-t border-gray-100 flex justify-end shrink-0 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg transition-colors">
                        입력 완료 (닫기)
                    </button>
                </div>
            </div>
        </div>
    );
};

// Fixed Cost Modal with Store Filter
const FixedCostModal = ({ fixedCosts, onClose, onSave, selectedStoreId, fallbackStoreId, currentUser, stores }: { fixedCosts: FixedCostConfig[], onClose: () => void, onSave: (costs: FixedCostConfig[]) => void, selectedStoreId: string, fallbackStoreId: string, currentUser: User, stores: Store[] }) => {
    // Filter costs by selectedStoreId to show only relevant costs
    const filteredInitialCosts = selectedStoreId === 'ALL' 
        ? fixedCosts 
        : fixedCosts.filter(fc => (fc.storeId || 'ALL') === selectedStoreId);
    
    const [localCosts, setLocalCosts] = useState<FixedCostConfig[]>(filteredInitialCosts);
    const [newCost, setNewCost] = useState({ title: '', amount: '', day: '', category: '고정지출' });
    const computeInitialStoreId = () => selectedStoreId !== 'ALL' ? selectedStoreId : (fallbackStoreId || stores[0]?.id || '');
    const [newCostStoreId, setNewCostStoreId] = useState<string>(computeInitialStoreId());

    useEffect(() => {
        setNewCostStoreId(computeInitialStoreId());
    }, [selectedStoreId, fallbackStoreId, stores]);

    const handleAdd = () => {
        if (!newCost.title || !newCost.amount) return;
        const resolvedStoreId = newCostStoreId || (selectedStoreId !== 'ALL' ? selectedStoreId : fallbackStoreId);
        const newCostItem: FixedCostConfig = {
            id: `FC-${Date.now()}`,
            title: newCost.title,
            amount: Number(newCost.amount),
            day: Number(newCost.day),
            category: newCost.category
        };
        if (resolvedStoreId) {
            newCostItem.storeId = resolvedStoreId;
        }
        // Set ownerId from currentUser
        newCostItem.ownerId = currentUser.id;
        setLocalCosts([...localCosts, newCostItem]);
        setNewCost({ title: '', amount: '', day: '', category: '고정지출' });
    };

    const handleRemove = (id: string) => {
        setLocalCosts(localCosts.filter(c => c.id !== id));
    };

    const handleSave = () => {
        // Get the final costs list to save
        // If selectedStoreId is 'ALL', we need to preserve costs from other stores
        // If selectedStoreId is specific, onSave will handle the update via App.tsx
        onSave(localCosts);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <SettingsIcon size={20} className="text-blue-600"/> 고정 지출 설정
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="space-y-3 mb-6">
                        {localCosts.map(cost => {
                            const storeName = stores.find(s => s.id === cost.storeId)?.name || (cost.storeId || '지점 미지정');
                            return (
                            <div key={cost.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <div>
                                    <div className="font-bold text-gray-800">{cost.title}</div>
                                    <div className="text-xs text-gray-500">{storeName} | 매월 {cost.day}일 | {cost.category}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-900">{formatCurrency(cost.amount)}</span>
                                    <button onClick={() => handleRemove(cost.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );})}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="font-bold text-sm text-gray-700 mb-3">새 항목 추가</h4>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <input type="text" placeholder="항목명 (예: 월세)" className="p-2 border rounded-lg text-sm" value={newCost.title} onChange={(e) => setNewCost({...newCost, title: e.target.value})} />
                            <input type="number" placeholder="금액" className="p-2 border rounded-lg text-sm" value={newCost.amount} onChange={(e) => setNewCost({...newCost, amount: e.target.value})} />
                            <input type="number" placeholder="결제일" min="1" max="31" className="w-full p-2 border rounded-lg text-sm" value={newCost.day} onChange={(e) => setNewCost({...newCost, day: e.target.value})} />
                            <select className="p-2 border rounded-lg text-sm bg-white" value={newCost.category} onChange={(e) => setNewCost({...newCost, category: e.target.value})}>
                                <option value="고정지출">고정지출</option>
                                <option value="공과금">공과금</option>
                                <option value="인건비">인건비</option>
                                <option value="임대료">임대료</option>
                            </select>
                            <select className="p-2 border rounded-lg text-sm bg-white col-span-2" value={newCostStoreId} onChange={(e) => setNewCostStoreId(e.target.value)}>
                                {!newCostStoreId && <option value="">지점을 선택하세요</option>}
                                {stores.map(store => (
                                    <option key={store.id} value={store.id}>{store.name}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={handleAdd} disabled={!newCost.title || !newCost.amount || !newCostStoreId} className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-100 disabled:opacity-50">+ 추가하기</button>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-white flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50">취소</button>
                    <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg">저장 완료</button>
                </div>
            </div>
        </div>
    );
};

export default Financials;
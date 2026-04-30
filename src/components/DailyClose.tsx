import React, { useState, useMemo, useCallback } from 'react';
import type { Sale, Store, Product, User, SalesItem } from '../types';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Save, CheckCircle, Store as StoreIcon } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';

interface DailyCloseProps {
    sales: Sale[];
    stores: Store[];
    products: Product[];
    currentUser: User;
    currentStoreId: string;
    onUpdateSale: (sale: Sale) => void;
}

const TIRE_CATEGORIES = ['타이어', '중고타이어'];
const REPAIR_CATEGORIES = ['브레이크패드', '오일필터', '엔진오일', '에어크리너'];

const DailyClose: React.FC<DailyCloseProps> = ({
    sales, stores, products, currentUser, currentStoreId, onUpdateSale
}) => {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedStoreFilter, setSelectedStoreFilter] = useState(
        currentStoreId && currentStoreId !== 'ALL' ? currentStoreId : 'ALL'
    );
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
    const [costEdits, setCostEdits] = useState<Record<string, Record<number, string>>>({});
    const [savedSaleIds, setSavedSaleIds] = useState<Set<string>>(new Set());

    const productMap = useMemo(() => {
        const map = new Map<string, Product>();
        products.forEach(p => map.set(p.id, p));
        return map;
    }, [products]);

    const classifyItem = useCallback((item: SalesItem): 'tire' | 'repair' | 'labor' => {
        if (item.productId === '99999' || item.productId?.startsWith('RENTAL-')) return 'labor';
        const product = productMap.get(item.productId);
        const cat = product?.category || '기타';
        if (TIRE_CATEGORIES.includes(cat)) return 'tire';
        if (REPAIR_CATEGORIES.includes(cat)) return 'repair';
        return 'labor';
    }, [productMap]);

    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            if (s.isCanceled) return false;
            return s.date.startsWith(selectedMonth) && (selectedStoreFilter === 'ALL' || s.storeId === selectedStoreFilter);
        });
    }, [sales, selectedMonth, selectedStoreFilter]);

    const datesInMonth = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) =>
            `${selectedMonth}-${String(i + 1).padStart(2, '0')}`
        );
    }, [selectedMonth]);

    const getDailyStats = useCallback((dateStr: string) => {
        const daySales = filteredSales.filter(s => s.date.startsWith(dateStr));
        let revenue = 0, cost = 0, tireQty = 0, repairQty = 0, laborQty = 0;
        daySales.forEach(s => {
            revenue += s.totalAmount;
            s.items.forEach(item => {
                cost += (item.purchasePrice || 0) * item.quantity;
                const cls = classifyItem(item);
                if (cls === 'tire') tireQty += item.quantity;
                else if (cls === 'repair') repairQty += item.quantity;
                else laborQty += item.quantity;
            });
        });
        return {
            dateStr, salesCount: daySales.length, revenue, cost,
            profit: revenue - cost, tireQty, repairQty, laborQty,
            hasCostData: daySales.some(s => s.items.some(i => (i.purchasePrice || 0) > 0))
        };
    }, [filteredSales, classifyItem]);

    const dailyStats = useMemo(() =>
        datesInMonth.map(d => getDailyStats(d)).filter(d => d.salesCount > 0),
        [datesInMonth, getDailyStats]);

    const monthlyTotals = useMemo(() =>
        dailyStats.reduce((acc, d) => ({
            revenue: acc.revenue + d.revenue, cost: acc.cost + d.cost,
            profit: acc.profit + d.profit, tireQty: acc.tireQty + d.tireQty,
            repairQty: acc.repairQty + d.repairQty, laborQty: acc.laborQty + d.laborQty,
        }), { revenue: 0, cost: 0, profit: 0, tireQty: 0, repairQty: 0, laborQty: 0 }),
        [dailyStats]);

    const handleMonthChange = (delta: number) => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const newDate = new Date(year, month - 1 + delta, 1);
        setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
        setExpandedDate(null); setExpandedSaleId(null);
    };

    const getCostEditValue = (saleId: string, itemIdx: number, item: SalesItem): string => {
        if (costEdits[saleId]?.[itemIdx] !== undefined) return costEdits[saleId][itemIdx];
        return item.purchasePrice ? formatNumber(String(item.purchasePrice)) : '';
    };

    const handleCostChange = (saleId: string, itemIdx: number, value: string) => {
        const raw = value.replace(/[^0-9]/g, '');
        setCostEdits(prev => ({ ...prev, [saleId]: { ...(prev[saleId] || {}), [itemIdx]: raw === '' ? '' : Number(raw).toLocaleString() } }));
        setSavedSaleIds(prev => { const s = new Set(prev); s.delete(saleId); return s; });
    };

    const handleSaveSale = (sale: Sale) => {
        const edits = costEdits[sale.id] || {};
        const updatedItems = sale.items.map((item, idx) => {
            if (edits[idx] !== undefined) {
                const raw = edits[idx].replace(/[^0-9]/g, '');
                return { ...item, purchasePrice: raw === '' ? 0 : Number(raw) };
            }
            return item;
        });
        onUpdateSale({ ...sale, items: updatedItems });
        setSavedSaleIds(prev => new Set(prev).add(sale.id));
    };

    const hasPendingEdits = (saleId: string) =>
        !!costEdits[saleId] && Object.keys(costEdits[saleId]).length > 0 && !savedSaleIds.has(saleId);

    const getDaySales = (dateStr: string) => filteredSales.filter(s => s.date.startsWith(dateStr));
    const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div className="flex flex-col h-full min-h-0 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-4 py-4 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between shrink-0">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                        <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-white rounded-lg transition-colors"><ChevronLeft size={18} /></button>
                        <span className="font-bold text-gray-800 min-w-[110px] text-center">{selectedMonth.replace('-', '년 ')}월</span>
                        <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-white rounded-lg transition-colors"><ChevronRight size={18} /></button>
                    </div>
                    {currentUser.role === 'SUPER_ADMIN' && (
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                            <StoreIcon size={16} className="text-gray-500" />
                            <select value={selectedStoreFilter} onChange={e => setSelectedStoreFilter(e.target.value)} className="text-sm font-bold text-gray-700 bg-transparent outline-none">
                                <option value="ALL">전체 지점</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    💡 날짜를 클릭하면 판매 건별 원가를 입력할 수 있습니다
                </div>
            </div>

            <div className="px-4 py-4 grid grid-cols-3 md:grid-cols-6 gap-3 shrink-0">
                {[
                    { label: '월 매출', value: formatCurrency(monthlyTotals.revenue), color: 'text-blue-600' },
                    { label: '월 원가', value: formatCurrency(monthlyTotals.cost), color: 'text-gray-700' },
                    { label: '월 수익', value: formatCurrency(monthlyTotals.profit), color: monthlyTotals.profit >= 0 ? 'text-emerald-600' : 'text-red-500' },
                    { label: '타이어', value: `${monthlyTotals.tireQty}개`, color: 'text-orange-600' },
                    { label: '정비작업', value: `${monthlyTotals.repairQty}건`, color: 'text-violet-600' },
                    { label: '공임', value: `${monthlyTotals.laborQty}건`, color: 'text-slate-600' },
                ].map(card => (
                    <div key={card.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-500 font-medium mb-1">{card.label}</p>
                        <p className={`text-base font-bold ${card.color} truncate`}>{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3 min-h-0">
                {dailyStats.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <Calendar size={40} className="mx-auto mb-3 opacity-20" />
                        <p>{selectedMonth.replace('-', '년 ')}월 판매 내역이 없습니다.</p>
                    </div>
                ) : dailyStats.map(stat => {
                    const isExpanded = expandedDate === stat.dateStr;
                    const [y, m, d] = stat.dateStr.split('-');
                    const weekday = WEEKDAYS[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
                    const profitMargin = stat.revenue > 0 && stat.cost > 0 ? ((stat.profit / stat.revenue) * 100).toFixed(1) : null;
                    return (
                        <div key={stat.dateStr} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <button className="w-full px-4 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                                onClick={() => setExpandedDate(isExpanded ? null : stat.dateStr)}>
                                <div className="w-12 shrink-0 text-center">
                                    <div className="text-lg font-bold text-gray-800">{m}/{d}</div>
                                    <div className={`text-xs font-medium ${weekday === '일' ? 'text-red-500' : weekday === '토' ? 'text-blue-500' : 'text-gray-400'}`}>({weekday})</div>
                                </div>
                                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-1">
                                    <div>
                                        <div className="text-xs text-gray-400">매출</div>
                                        <div className="font-bold text-blue-600 text-sm">{formatCurrency(stat.revenue)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400">수익 {profitMargin && <span className="text-gray-300">({profitMargin}%)</span>}</div>
                                        <div className={`font-bold text-sm ${stat.cost > 0 ? (stat.profit >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-gray-300'}`}>
                                            {stat.cost > 0 ? formatCurrency(stat.profit) : '원가 미입력'}
                                        </div>
                                    </div>
                                    <div className="hidden md:block">
                                        <div className="text-xs text-gray-400">타이어</div>
                                        <div className="font-bold text-orange-600 text-sm">{stat.tireQty > 0 ? `${stat.tireQty}개` : '-'}</div>
                                    </div>
                                    <div className="hidden md:block">
                                        <div className="text-xs text-gray-400">정비작업</div>
                                        <div className="font-bold text-violet-600 text-sm">{stat.repairQty > 0 ? `${stat.repairQty}건` : '-'}</div>
                                    </div>
                                    <div className="hidden md:block">
                                        <div className="text-xs text-gray-400">공임</div>
                                        <div className="font-bold text-slate-600 text-sm">{stat.laborQty > 0 ? `${stat.laborQty}건` : '-'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {stat.hasCostData && <span className="hidden sm:inline text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">원가입력</span>}
                                    <span className="text-xs text-gray-400">{stat.salesCount}건</span>
                                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-gray-100 divide-y divide-gray-100">
                                    {getDaySales(stat.dateStr).map(sale => {
                                        const isSaleExpanded = expandedSaleId === sale.id;
                                        const pending = hasPendingEdits(sale.id);
                                        const saved = savedSaleIds.has(sale.id);
                                        return (
                                            <div key={sale.id} className="bg-gray-50/50">
                                                <button className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
                                                    onClick={() => setExpandedSaleId(isSaleExpanded ? null : sale.id)}>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-bold text-gray-700">
                                                                {new Date(sale.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span className="text-sm text-gray-600">{sale.staffName}</span>
                                                            {sale.vehicleNumber && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">{sale.vehicleNumber}</span>}
                                                            <span className="text-sm font-bold text-blue-600">{formatCurrency(sale.totalAmount)}</span>
                                                            {pending && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">저장 대기</span>}
                                                            {saved && !pending && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5"><CheckCircle size={10} /> 저장됨</span>}
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5 truncate">{sale.items.map(i => i.productName).join(' · ')}</div>
                                                    </div>
                                                    {isSaleExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                                                </button>

                                                {isSaleExpanded && (
                                                    <div className="px-5 pb-4 space-y-2">
                                                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">항목별 원가 입력 (개당)</p>
                                                        {sale.items.map((item, idx) => {
                                                            const cls = classifyItem(item);
                                                            const clsLabel = cls === 'tire' ? '타이어' : cls === 'repair' ? '정비' : '공임';
                                                            const clsColor = cls === 'tire' ? 'bg-orange-100 text-orange-700' : cls === 'repair' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600';
                                                            const costVal = getCostEditValue(sale.id, idx, item);
                                                            const costNum = costVal ? Number(costVal.replace(/,/g, '')) : 0;
                                                            const totalCost = costNum * item.quantity;
                                                            const totalRevenue = item.priceAtSale * item.quantity;
                                                            const itemProfit = totalRevenue - totalCost;
                                                            return (
                                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white rounded-lg p-3 border border-gray-100">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${clsColor}`}>{clsLabel}</span>
                                                                            <span className="text-sm font-medium text-gray-800">{item.productName}</span>
                                                                            {item.specification && <span className="text-xs text-blue-600">{item.specification}</span>}
                                                                            <span className="text-xs text-gray-400">× {item.quantity}</span>
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mt-0.5 flex gap-3 flex-wrap">
                                                                            <span>판매: {formatCurrency(totalRevenue)}</span>
                                                                            {totalCost > 0 && (
                                                                                <>
                                                                                    <span>원가: {formatCurrency(totalCost)}</span>
                                                                                    <span className={itemProfit >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>수익: {formatCurrency(itemProfit)}</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <span className="text-xs text-gray-400 whitespace-nowrap">원가 (개당)</span>
                                                                        <input type="text" inputMode="numeric"
                                                                            className="w-28 p-2 border border-gray-300 rounded-lg text-sm text-right font-bold focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                                                                            value={costVal} placeholder="0"
                                                                            onChange={e => handleCostChange(sale.id, idx, e.target.value)} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                        {sale.items.some((_item, idx) => {
                                                            const v = getCostEditValue(sale.id, idx, _item);
                                                            return v && Number(v.replace(/,/g, '')) > 0;
                                                        }) && (
                                                            <div className="flex justify-between items-center bg-blue-50 rounded-lg px-4 py-2 border border-blue-100 text-sm">
                                                                <span className="font-medium text-gray-600">이 건 수익</span>
                                                                <span className="font-bold text-blue-700">
                                                                    {formatCurrency(sale.totalAmount - sale.items.reduce((sum, item, idx) => {
                                                                        const v = getCostEditValue(sale.id, idx, item);
                                                                        return sum + (v ? Number(v.replace(/,/g, '')) : (item.purchasePrice || 0)) * item.quantity;
                                                                    }, 0))}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <button onClick={() => handleSaveSale(sale)}
                                                            className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${saved && !pending ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'}`}>
                                                            {saved && !pending ? <><CheckCircle size={16} /> 저장 완료</> : <><Save size={16} /> 원가 저장</>}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DailyClose;

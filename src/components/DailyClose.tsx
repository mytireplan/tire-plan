import React, { useState, useMemo, useCallback } from 'react';
import type { Sale, Store, Product, User, StockInRecord, DailyReport, DailyReportInventoryFlowEntry, DailyReportItem, DailyReportStaff, DailyReportStockInEntry } from '../types';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Save, CheckCircle, Upload } from 'lucide-react';
import { formatCurrency } from '../utils/format';

type ItemClass = 'tire' | 'repair' | 'labor';
type EditMode = 'discount' | 'direct';
type ItemEdit = { mode: EditMode; discountRate: string; directCost: string };
// saleId -> itemIndex -> ItemEdit
type SaleCostEdits = Record<string, Record<number, ItemEdit>>;

interface DailyCloseProps {
    sales: Sale[];
    stores: Store[];
    products: Product[];
    dailyReports: DailyReport[];
    stockInHistory: StockInRecord[];
    currentUser: User;
    currentStoreId: string;
    onUpdateSale: (sale: Sale) => void;
    onSaveReport: (report: DailyReport) => void;
}

const TIRE_CATEGORIES = ['타이어', '중고타이어'];
const REPAIR_CATEGORIES = ['브레이크패드', '오일필터', '엔진오일', '에어크리너'];

const DailyClose: React.FC<DailyCloseProps> = ({
    sales, stores, products, dailyReports, stockInHistory, currentUser, currentStoreId, onUpdateSale, onSaveReport
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
    const [costEdits, setCostEdits] = useState<SaleCostEdits>({});
    const [savedSaleIds, setSavedSaleIds] = useState<Set<string>>(new Set());
    const [reportedDates, setReportedDates] = useState<Set<string>>(new Set());

    const productMap = useMemo(() => {
        const map = new Map<string, Product>();
        products.forEach(p => map.set(p.id, p));
        return map;
    }, [products]);

    const getItemClass = useCallback((productId: string, category: string): ItemClass => {
        if (productId === '99999' || productId?.startsWith('RENTAL-')) return 'labor';
        if (TIRE_CATEGORIES.includes(category)) return 'tire';
        if (REPAIR_CATEGORIES.includes(category)) return 'repair';
        return 'labor';
    }, []);

    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            if (s.isCanceled) return false;
            return s.date.startsWith(selectedMonth) &&
                (selectedStoreFilter === 'ALL' || s.storeId === selectedStoreFilter);
        });
    }, [sales, selectedMonth, selectedStoreFilter]);

    const datesInMonth = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) =>
            `${selectedMonth}-${String(i + 1).padStart(2, '0')}`
        );
    }, [selectedMonth]);

    const getDaySales = useCallback((dateStr: string) =>
        filteredSales.filter(s => s.date.startsWith(dateStr))
            .sort((a, b) => a.date.localeCompare(b.date)),
        [filteredSales]);

    const getDailyStats = useCallback((dateStr: string) => {
        const daySales = getDaySales(dateStr);
        if (daySales.length === 0) return null;
        let revenue = 0, cost = 0, tireQty = 0, repairQty = 0, laborQty = 0;
        daySales.forEach(s => {
            revenue += s.totalAmount;
            s.items.forEach(item => {
                cost += (item.purchasePrice || 0) * item.quantity;
                const product = productMap.get(item.productId);
                const cls = getItemClass(item.productId, product?.category || '기타');
                if (cls === 'tire') tireQty += item.quantity;
                else if (cls === 'repair') repairQty += item.quantity;
                else laborQty += item.quantity;
            });
        });
        return { dateStr, salesCount: daySales.length, revenue, cost, profit: revenue - cost, tireQty, repairQty, laborQty };
    }, [getDaySales, productMap, getItemClass]);

    const dailyStats = useMemo(() =>
        datesInMonth.map(d => getDailyStats(d)).filter(Boolean) as NonNullable<ReturnType<typeof getDailyStats>>[],
        [datesInMonth, getDailyStats]);

    const monthlyTotals = useMemo(() =>
        dailyStats.reduce((acc, d) => ({
            revenue: acc.revenue + d.revenue,
            cost: acc.cost + d.cost,
            profit: acc.profit + d.profit,
            tireQty: acc.tireQty + d.tireQty,
            repairQty: acc.repairQty + d.repairQty,
            laborQty: acc.laborQty + d.laborQty,
        }), { revenue: 0, cost: 0, profit: 0, tireQty: 0, repairQty: 0, laborQty: 0 }),
        [dailyStats]);

    const handleMonthChange = (delta: number) => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const newDate = new Date(year, month - 1 + delta, 1);
        setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
        setExpandedDate(null);
        setExpandedSaleId(null);
    };

    const initEditsForSale = useCallback((sale: Sale) => {
        if (costEdits[sale.id]) return;
        const entries: Record<number, ItemEdit> = {};
        sale.items.forEach((item, idx) => {
            const product = productMap.get(item.productId);
            const factoryPrice = product?.factoryPrice || 0;
            const savedCost = item.purchasePrice || 0;
            const mode: EditMode = factoryPrice > 0 ? 'discount' : 'direct';
            let discountRate = '';
            if (factoryPrice > 0 && savedCost > 0) {
                const rate = Math.round((1 - savedCost / factoryPrice) * 100);
                if (rate >= 0 && rate < 100) discountRate = String(rate);
            }
            entries[idx] = {
                mode,
                discountRate,
                directCost: savedCost > 0 ? savedCost.toLocaleString() : '',
            };
        });
        setCostEdits(prev => ({ ...prev, [sale.id]: entries }));
    }, [costEdits, productMap]);

    const setItemEditMode = (saleId: string, itemIdx: number, mode: EditMode) => {
        setCostEdits(prev => ({
            ...prev,
            [saleId]: {
                ...(prev[saleId] || {}),
                [itemIdx]: { ...(prev[saleId]?.[itemIdx] || { discountRate: '', directCost: '' }), mode },
            }
        }));
        setSavedSaleIds(prev => { const s = new Set(prev); s.delete(saleId); return s; });
    };

    const updateItemEdit = (saleId: string, itemIdx: number, field: 'discountRate' | 'directCost', value: string) => {
        const raw = value.replace(/[^0-9.]/g, '');
        const formatted = field === 'directCost' && raw !== '' ? Number(raw).toLocaleString() : raw;
        setCostEdits(prev => ({
            ...prev,
            [saleId]: {
                ...(prev[saleId] || {}),
                [itemIdx]: {
                    ...(prev[saleId]?.[itemIdx] || { mode: 'direct' as EditMode, discountRate: '', directCost: '' }),
                    [field]: formatted,
                }
            }
        }));
        setSavedSaleIds(prev => { const s = new Set(prev); s.delete(saleId); return s; });
    };

    const getItemEffectiveCost = useCallback((saleId: string, itemIdx: number, factoryPrice: number, savedCost: number): number => {
        const edit = costEdits[saleId]?.[itemIdx];
        if (!edit) return savedCost;
        if (edit.mode === 'discount') {
            const rate = parseFloat(edit.discountRate);
            if (isNaN(rate) || !factoryPrice) return savedCost;
            return Math.round(factoryPrice * (1 - rate / 100));
        } else {
            const val = parseInt(edit.directCost.replace(/,/g, ''), 10);
            return isNaN(val) ? 0 : val;
        }
    }, [costEdits]);

    const handleSaveSale = (sale: Sale) => {
        const updatedItems = sale.items.map((item, idx) => {
            const product = productMap.get(item.productId);
            const factoryPrice = product?.factoryPrice || 0;
            const cost = getItemEffectiveCost(sale.id, idx, factoryPrice, item.purchasePrice || 0);
            return { ...item, purchasePrice: cost };
        });
        onUpdateSale({ ...sale, items: updatedItems });
        setSavedSaleIds(prev => new Set(prev).add(sale.id));
    };

    const buildDailyReport = useCallback((dateStr: string): DailyReport => {
        const daySales = getDaySales(dateStr);
        const storeId = selectedStoreFilter !== 'ALL'
            ? selectedStoreFilter
            : (daySales[0]?.storeId || currentStoreId);
        const store = stores.find(s => s.id === storeId);
        const storeName = store?.name || '전체 지점';

        const itemMap = new Map<string, DailyReportItem>();
        const staffMap = new Map<string, DailyReportStaff>();
        let totalRevenue = 0, totalCost = 0;
        let tireQty = 0, repairQty = 0, laborQty = 0;

        daySales.forEach(sale => {
            totalRevenue += sale.totalAmount;
            const staffName = sale.staffName || '미지정';
            if (!staffMap.has(staffName)) {
                staffMap.set(staffName, {
                    staffName, salesCount: 0, revenue: 0, cost: 0, profit: 0,
                    tireQty: 0, repairQty: 0, laborQty: 0,
                });
            }
            const staffEntry = staffMap.get(staffName)!;
            staffEntry.salesCount += 1;
            staffEntry.revenue += sale.totalAmount;

            sale.items.forEach((item, idx) => {
                const product = productMap.get(item.productId);
                const category = product?.category || '기타';
                const itemClass = getItemClass(item.productId, category);
                const fp = product?.factoryPrice || 0;
                const cost = getItemEffectiveCost(sale.id, idx, fp, item.purchasePrice || 0);
                const revenue = item.priceAtSale * item.quantity;
                const itemCostTotal = cost * item.quantity;
                const profit = revenue - itemCostTotal;

                totalCost += itemCostTotal;
                staffEntry.cost += itemCostTotal;

                if (itemClass === 'tire') { tireQty += item.quantity; staffEntry.tireQty += item.quantity; }
                else if (itemClass === 'repair') { repairQty += item.quantity; staffEntry.repairQty += item.quantity; }
                else { laborQty += item.quantity; staffEntry.laborQty += item.quantity; }

                const key = item.productId + '-' + (item.specification || '');
                if (itemMap.has(key)) {
                    const row = itemMap.get(key)!;
                    row.qty += item.quantity;
                    row.revenue += revenue;
                    row.cost += itemCostTotal;
                    row.profit += profit;
                } else {
                    itemMap.set(key, {
                        productName: item.productName,
                        specification: item.specification || '',
                        category,
                        itemClass,
                        qty: item.quantity,
                        revenue,
                        cost: itemCostTotal,
                        profit,
                    });
                }
            });
            staffEntry.profit = staffEntry.revenue - staffEntry.cost;
        });

        type ItemClass = 'tire' | 'repair' | 'labor';
        const ORDER: ItemClass[] = ['tire', 'repair', 'labor'];
        const items = Array.from(itemMap.values()).sort(
            (a, b) => ORDER.indexOf(a.itemClass) - ORDER.indexOf(b.itemClass)
        );
        const staffStats = Array.from(staffMap.values()).sort((a, b) => b.revenue - a.revenue);
        const profit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 && totalCost > 0 ? (profit / totalRevenue) * 100 : 0;

        const normalizeCategory = (category?: string) => (category || '기타').trim() || '기타';
        const getPreviousDateStr = (baseDateStr: string) => {
            const [yy, mm, dd] = baseDateStr.split('-').map(Number);
            const dt = new Date(yy, mm - 1, dd);
            dt.setDate(dt.getDate() - 1);
            return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        };
        const getCurrentStockByStore = (product: Product) => {
            if (storeId && storeId !== 'ALL') {
                return Number(product.stockByStore?.[storeId] || 0);
            }
            return Number(product.stock || 0);
        };
        const dayStockIns: DailyReportStockInEntry[] = stockInHistory
            .filter(record => !record.consumedAtSaleId && record.date.startsWith(dateStr) && (storeId === 'ALL' || record.storeId === storeId))
            .map(record => ({
                id: record.id,
                supplier: record.supplier,
                productName: record.productName,
                specification: record.specification,
                category: record.category,
                quantity: record.receivedQuantity ?? record.quantity ?? 0,
            }));
        const soldByCategory = new Map<string, number>();
        daySales.forEach(sale => {
            sale.items.forEach(item => {
                const product = productMap.get(item.productId);
                const category = normalizeCategory(product?.category);
                soldByCategory.set(category, (soldByCategory.get(category) || 0) + item.quantity);
            });
        });
        const stockInByCategory = new Map<string, number>();
        dayStockIns.forEach(record => {
            const category = normalizeCategory(record.category);
            stockInByCategory.set(category, (stockInByCategory.get(category) || 0) + (record.quantity || 0));
        });
        const currentStockByCategory = new Map<string, number>();
        products.forEach(product => {
            const qty = getCurrentStockByStore(product);
            if (qty === 0) return;
            const category = normalizeCategory(product.category);
            currentStockByCategory.set(category, (currentStockByCategory.get(category) || 0) + qty);
        });
        const previousDateStr = getPreviousDateStr(dateStr);
        const previousReport = dailyReports.find(report =>
            report.storeId === storeId && report.dateStr === previousDateStr
        );
        const previousStockByCategory = new Map<string, number>();
        previousReport?.inventoryFlowEntries?.forEach(entry => {
            previousStockByCategory.set(normalizeCategory(entry.category), Number(entry.currentStock || 0));
        });
        const allInventoryCategories = new Set<string>([
            ...Array.from(currentStockByCategory.keys()),
            ...Array.from(stockInByCategory.keys()),
            ...Array.from(soldByCategory.keys()),
            ...Array.from(previousStockByCategory.keys()),
        ]);
        const categoryPriority = (category: string) => {
            if (category === '타이어') return 0;
            if (category === '중고타이어') return 1;
            if (category === '기타') return 99;
            return 10;
        };
        const inventoryFlowEntries: DailyReportInventoryFlowEntry[] = Array.from(allInventoryCategories)
            .map(category => {
                const stockInQty = stockInByCategory.get(category) || 0;
                const soldQty = soldByCategory.get(category) || 0;
                const hasPreviousBaseline = previousStockByCategory.has(category);
                const fallbackCurrentStock = currentStockByCategory.get(category) || 0;
                const previousStock = hasPreviousBaseline
                    ? (previousStockByCategory.get(category) || 0)
                    : (fallbackCurrentStock - stockInQty + soldQty);
                const currentStock = hasPreviousBaseline
                    ? (previousStock + stockInQty - soldQty)
                    : fallbackCurrentStock;
                return { category, previousStock, stockInQty, soldQty, currentStock };
            })
            .sort((a, b) => {
                const pa = categoryPriority(a.category);
                const pb = categoryPriority(b.category);
                if (pa !== pb) return pa - pb;
                return a.category.localeCompare(b.category, 'ko');
            });

        return {
            id: storeId + '-' + dateStr,
            storeId,
            storeName,
            ownerId: currentUser.id,
            dateStr,
            createdAt: new Date().toISOString(),
            createdBy: currentUser.name,
            revenue: totalRevenue,
            cost: totalCost,
            profit,
            margin,
            tireQty,
            repairQty,
            laborQty,
            salesCount: daySales.length,
            items,
            staffStats,
            stockInRecords: dayStockIns,
            inventoryFlowEntries,
        };
    }, [getDaySales, selectedStoreFilter, currentStoreId, stores, productMap, getItemClass, getItemEffectiveCost, dailyReports, stockInHistory, products, currentUser]);

    const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div className="flex flex-col h-full min-h-0 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap gap-3 items-center justify-between shrink-0">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                        <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-white rounded-lg transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-bold text-gray-800 min-w-[100px] text-center text-sm">
                            {selectedMonth.replace('-', '년 ')}월
                        </span>
                        <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-white rounded-lg transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    {currentUser.role === 'SUPER_ADMIN' && (
                        <select
                            value={selectedStoreFilter}
                            onChange={e => setSelectedStoreFilter(e.target.value)}
                            className="text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none"
                        >
                            <option value="ALL">전체 지점</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    )}
                </div>
                <p className="text-xs text-gray-400">날짜 클릭 → 판매건 클릭 → 항목별 원가 입력 후 저장</p>
            </div>

            <div className="px-4 py-3 grid grid-cols-3 md:grid-cols-6 gap-2 shrink-0">
                {[
                    { label: '월 매출', value: formatCurrency(monthlyTotals.revenue), color: 'text-blue-600' },
                    { label: '월 원가', value: formatCurrency(monthlyTotals.cost), color: 'text-gray-700' },
                    { label: '월 수익', value: formatCurrency(monthlyTotals.profit), color: monthlyTotals.profit >= 0 ? 'text-emerald-600' : 'text-red-500' },
                    { label: '타이어', value: `${monthlyTotals.tireQty}개`, color: 'text-orange-600' },
                    { label: '정비', value: `${monthlyTotals.repairQty}건`, color: 'text-violet-600' },
                    { label: '공임', value: `${monthlyTotals.laborQty}건`, color: 'text-slate-500' },
                ].map(c => (
                    <div key={c.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                        <p className="text-[11px] text-gray-400 mb-0.5">{c.label}</p>
                        <p className={`text-sm font-bold ${c.color} truncate`}>{c.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2 min-h-0">
                {dailyStats.length === 0 ? (
                    <div className="text-center py-20 text-gray-300">
                        <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">{selectedMonth.replace('-', '년 ')}월 판매 내역이 없습니다.</p>
                    </div>
                ) : dailyStats.map(stat => {
                    const isDateExpanded = expandedDate === stat.dateStr;
                    const [y, m, d] = stat.dateStr.split('-');
                    const weekday = WEEKDAYS[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
                    const hasCost = stat.cost > 0;
                    const daySales = getDaySales(stat.dateStr);

                    return (
                        <div key={stat.dateStr} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <button
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                                onClick={() => setExpandedDate(isDateExpanded ? null : stat.dateStr)}
                            >
                                <div className="w-11 shrink-0 text-center">
                                    <div className="text-base font-bold text-gray-800">{m}/{d}</div>
                                    <div className={`text-[11px] font-medium ${weekday === '일' ? 'text-red-400' : weekday === '토' ? 'text-blue-400' : 'text-gray-400'}`}>
                                        ({weekday})
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-x-4">
                                    <div>
                                        <div className="text-[11px] text-gray-400">매출</div>
                                        <div className="font-bold text-blue-600 text-sm">{formatCurrency(stat.revenue)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] text-gray-400">수익</div>
                                        <div className={`font-bold text-sm ${hasCost ? (stat.profit >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-gray-300'}`}>
                                            {hasCost ? formatCurrency(stat.profit) : '미마감'}
                                        </div>
                                    </div>
                                    <div className="hidden md:block">
                                        <div className="text-[11px] text-gray-400">타이어 / 정비 / 공임</div>
                                        <div className="text-sm font-medium">
                                            {stat.tireQty > 0 && <span className="text-orange-500 mr-1">{stat.tireQty}개</span>}
                                            {stat.repairQty > 0 && <span className="text-violet-500 mr-1">{stat.repairQty}건</span>}
                                            {stat.laborQty > 0 && <span className="text-slate-400">{stat.laborQty}공임</span>}
                                        </div>
                                    </div>
                                    <div className="hidden md:block">
                                        <div className="text-[11px] text-gray-400">판매건수</div>
                                        <div className="text-sm font-medium text-gray-600">{stat.salesCount}건</div>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    {isDateExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                </div>
                            </button>

                            {isDateExpanded && (
                                <div className="border-t border-gray-100">
                                    <div className="divide-y divide-gray-100">
                                    {daySales.map(sale => {
                                        const isSaleExpanded = expandedSaleId === sale.id;
                                        const isSaved = savedSaleIds.has(sale.id);
                                        const saleTime = new Date(sale.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

                                        const saleCost = sale.items.reduce((sum, item, idx) => {
                                            const product = productMap.get(item.productId);
                                            const fp = product?.factoryPrice || 0;
                                            return sum + getItemEffectiveCost(sale.id, idx, fp, item.purchasePrice || 0) * item.quantity;
                                        }, 0);
                                        const saleProfit = sale.totalAmount - saleCost;
                                        const hasSaleCost = sale.items.some(i => (i.purchasePrice || 0) > 0);

                                        return (
                                            <div key={sale.id} className="bg-white">
                                                <button
                                                    className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                                                    onClick={() => {
                                                        if (!isSaleExpanded) initEditsForSale(sale);
                                                        setExpandedSaleId(isSaleExpanded ? null : sale.id);
                                                    }}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-bold text-gray-700">{saleTime}</span>
                                                            <span className="text-sm text-gray-500">{sale.staffName}</span>
                                                            {sale.vehicleNumber && (
                                                                <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded font-medium">
                                                                    {sale.vehicleNumber}
                                                                </span>
                                                            )}
                                                            <span className="font-bold text-blue-600 text-sm">{formatCurrency(sale.totalAmount)}</span>
                                                            {isSaved && (
                                                                <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                                                                    <CheckCircle size={10} /> 저장됨
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5 flex gap-3 flex-wrap">
                                                            <span>{sale.items.map(i => i.productName).join(' · ')}</span>
                                                            {hasSaleCost && (
                                                                <span className={saleProfit >= 0 ? 'text-emerald-500 font-medium' : 'text-red-400 font-medium'}>
                                                                    수익 {formatCurrency(saleProfit)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0">
                                                        {isSaleExpanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                                                    </div>
                                                </button>

                                                {isSaleExpanded && (
                                                    <div className="px-5 pb-4 space-y-2 bg-gray-50/60">
                                                        <p className="text-[11px] font-bold text-gray-400 pt-2 pb-1">항목별 원가 입력</p>
                                                        {sale.items.map((item, idx) => {
                                                            const product = productMap.get(item.productId);
                                                            const category = product?.category || '기타';
                                                            const itemClass = getItemClass(item.productId, category);
                                                            const factoryPrice = product?.factoryPrice || 0;

                                                            const edit = costEdits[sale.id]?.[idx] || {
                                                                mode: (factoryPrice > 0 ? 'discount' : 'direct') as EditMode,
                                                                discountRate: '',
                                                                directCost: item.purchasePrice ? item.purchasePrice.toLocaleString() : '',
                                                            };

                                                            const effectiveCost = getItemEffectiveCost(sale.id, idx, factoryPrice, item.purchasePrice || 0);
                                                            const totalItemRevenue = item.priceAtSale * item.quantity;
                                                            const totalItemCost = effectiveCost * item.quantity;
                                                            const itemProfit = totalItemRevenue - totalItemCost;

                                                            const clsColor = itemClass === 'tire'
                                                                ? 'bg-orange-100 text-orange-600'
                                                                : itemClass === 'repair'
                                                                    ? 'bg-violet-100 text-violet-600'
                                                                    : 'bg-slate-100 text-slate-500';
                                                            const clsLabel = itemClass === 'tire' ? '타이어' : itemClass === 'repair' ? '정비' : '공임';

                                                            return (
                                                                <div key={idx} className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${clsColor}`}>{clsLabel}</span>
                                                                            <span className="text-sm font-semibold text-gray-800">{item.productName}</span>
                                                                            {item.specification && <span className="text-xs text-blue-500">{item.specification}</span>}
                                                                            <span className="text-xs text-gray-400">× {item.quantity}</span>
                                                                        </div>
                                                                        <div className="flex gap-3 text-xs flex-wrap text-gray-500">
                                                                            <span>판매가 <strong className="text-gray-700">{formatCurrency(totalItemRevenue)}</strong></span>
                                                                            {factoryPrice > 0 && (
                                                                                <span className="text-gray-400">공장도가 <strong>{formatCurrency(factoryPrice)}</strong>/개</span>
                                                                            )}
                                                                            {effectiveCost > 0 && (
                                                                                <>
                                                                                    <span>원가 <strong>{formatCurrency(totalItemCost)}</strong></span>
                                                                                    <span className={itemProfit >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                                                                                        수익 {formatCurrency(itemProfit)}
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
                                                                            <button
                                                                                onClick={() => setItemEditMode(sale.id, idx, 'discount')}
                                                                                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${edit.mode === 'discount' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                                                            >
                                                                                할인율
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setItemEditMode(sale.id, idx, 'direct')}
                                                                                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${edit.mode === 'direct' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                                                            >
                                                                                직접입력
                                                                            </button>
                                                                        </div>

                                                                        {edit.mode === 'discount' ? (
                                                                            <div className="flex items-center gap-1">
                                                                                <input
                                                                                    type="text"
                                                                                    inputMode="decimal"
                                                                                    className="w-14 p-2 border border-gray-300 rounded-lg text-sm text-right font-bold focus:ring-2 focus:ring-blue-400 outline-none"
                                                                                    value={edit.discountRate}
                                                                                    placeholder="0"
                                                                                    onChange={e => updateItemEdit(sale.id, idx, 'discountRate', e.target.value)}
                                                                                />
                                                                                <span className="text-sm text-gray-500">%</span>
                                                                                {edit.discountRate && factoryPrice > 0 && (
                                                                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                                                                        → {formatCurrency(Math.round(factoryPrice * (1 - parseFloat(edit.discountRate) / 100)))}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center gap-1">
                                                                                <input
                                                                                    type="text"
                                                                                    inputMode="numeric"
                                                                                    className="w-28 p-2 border border-gray-300 rounded-lg text-sm text-right font-bold focus:ring-2 focus:ring-blue-400 outline-none"
                                                                                    value={edit.directCost}
                                                                                    placeholder="0"
                                                                                    onChange={e => updateItemEdit(sale.id, idx, 'directCost', e.target.value)}
                                                                                />
                                                                                <span className="text-xs text-gray-400">/개</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 mt-2">
                                                            <div className="flex gap-4 text-sm">
                                                                <div>
                                                                    <div className="text-[11px] text-gray-400">매출</div>
                                                                    <div className="font-bold text-blue-600">{formatCurrency(sale.totalAmount)}</div>
                                                                </div>
                                                                {saleCost > 0 && (
                                                                    <>
                                                                        <div>
                                                                            <div className="text-[11px] text-gray-400">원가</div>
                                                                            <div className="font-bold text-gray-700">{formatCurrency(saleCost)}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[11px] text-gray-400">수익</div>
                                                                            <div className={`font-bold ${saleProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                                {formatCurrency(saleProfit)}
                                                                            </div>
                                                                        </div>
                                                                        {sale.totalAmount > 0 && (
                                                                            <div>
                                                                                <div className="text-[11px] text-gray-400">마진율</div>
                                                                                <div className="font-bold text-gray-600">
                                                                                    {((saleProfit / sale.totalAmount) * 100).toFixed(1)}%
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => handleSaveSale(sale)}
                                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${isSaved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'}`}
                                                            >
                                                                {isSaved ? <><CheckCircle size={15} /> 저장됨</> : <><Save size={15} /> 원가 저장</>}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    </div>
                                    <div className="px-4 py-3 bg-emerald-50/70 border-t border-emerald-100 flex items-center justify-between gap-3">
                                        <p className="text-xs text-emerald-700">원가 저장 후 보고서를 올리면 게시판에 공유됩니다.</p>
                                        <button
                                            onClick={() => {
                                                const r = buildDailyReport(stat.dateStr);
                                                onSaveReport(r);
                                                setReportedDates(prev => new Set(prev).add(stat.dateStr));
                                            }}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors shrink-0 ${
                                                reportedDates.has(stat.dateStr)
                                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                            }`}
                                        >
                                            {reportedDates.has(stat.dateStr)
                                                ? <><CheckCircle size={15} /> 보고서 올림</>
                                                : <><Upload size={15} /> 보고서 올리기</>}
                                        </button>
                                    </div>
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

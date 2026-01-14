import React, { useMemo, useState, useEffect } from 'react';
import type { Sale, SalesFilter, Store, User, StockInRecord, Product, SalesItem, Shift, Staff } from '../types';
import { PaymentMethod } from '../types';
import { ArrowLeft, CreditCard, MapPin, ChevronLeft, ChevronRight, X, ShoppingBag, User as UserIcon, BadgeCheck, Lock, Search, Edit3, Save, Banknote, Smartphone, AlertTriangle, Tag, Trash2, Plus, Minus, Truck, Calendar } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesHistoryProps {
  sales: Sale[];
  stores: Store[];
  products: Product[];
  filter: SalesFilter;
  onBack: () => void;
  currentUser: User;
  currentStoreId: string;
  stockInHistory: StockInRecord[];
  onSwapProduct: (saleId: string, originalItemId: string, newProduct: Product) => void;
  onUpdateSale: (sale: Sale) => void;
  onCancelSale: (saleId: string) => void;
  onDeleteSale: (saleId: string) => void;
    onQuickAddSale: (sale: Sale, options?: { adjustInventory?: boolean }) => void;
  onStockIn: (record: StockInRecord, sellingPrice?: number, forceProductId?: string) => void;
  categories: string[];
  tireBrands: string[];
  tireModels: Record<string, string[]>;
  shifts: Shift[];
  staffList: Staff[];
}

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'staff';

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, stores, products, filter, onBack, currentUser, currentStoreId, stockInHistory, onSwapProduct, onUpdateSale, onCancelSale, onDeleteSale, onQuickAddSale, onStockIn, categories, tireBrands, tireModels, shifts, staffList }) => {
  
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [activePaymentMethod, setActivePaymentMethod] = useState<string>('ALL');
  const [activeStoreId, setActiveStoreId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState(''); // Vehicle or Phone
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelTargetSale, setCancelTargetSale] = useState<Sale | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
      const toLocalInputValue = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      const [quickAddForm, setQuickAddForm] = useState<{
          datetime: string;
          paymentMethod: PaymentMethod;
          paymentDetails?: { method1: PaymentMethod; amount1: number; method2?: PaymentMethod; amount2?: number };
          staffName: string;
          storeId: string;
          customerName: string;
          customerPhone: string;
          memo: string;
          inventoryAdjust: boolean;
          items: SalesItem[];
      }>({
          datetime: toLocalInputValue(new Date()),
            paymentMethod: PaymentMethod.CARD,
            staffName: '',
            storeId: currentStoreId && currentStoreId !== 'ALL' ? currentStoreId : (stores[0]?.id || ''),
          customerName: '',
          customerPhone: '',
          memo: '',
          inventoryAdjust: true,
          items: []
    });    // Inline memo editing removed (not used)

  // Swap/Add Item Modal State
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{
      saleId?: string, 
      itemId?: string, 
      isEditMode?: boolean, 
      itemIndex?: number,
      isAdding?: boolean, // New flag for adding item
      isQuickAddCart?: boolean // New flag for quick-add cart
  } | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [swapSearchBrand, setSwapSearchBrand] = useState<string>('ALL');

  // Sales Detail Edit State
  const [editFormData, setEditFormData] = useState<Sale | null>(null);
  const [activeEditField, setActiveEditField] = useState<string | null>(null); // 'customer.name', 'item-0-qty'
  const [lockedTotalAmount, setLockedTotalAmount] = useState<number>(0);

  // --- Insufficient Stock State ---
  const [insufficientStockProduct, setInsuffcientStockProduct] = useState<Product | null>(null);
  const [isStockWarningOpen, setIsStockWarningOpen] = useState(false);

  // --- Inline Edit State for List ---
  const [inlineEditPurchasePriceSaleId, setInlineEditPurchasePriceSaleId] = useState<string | null>(null);
  const [inlineEditMemoSaleId, setInlineEditMemoSaleId] = useState<string | null>(null);
  const [inlineEditMemo, setInlineEditMemo] = useState<string>('');
  const [inlineEditPurchasePrice, setInlineEditPurchasePrice] = useState<Record<string, string>>({});

  // --- Immediate Stock In State ---
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [stockInForm, setStockInForm] = useState({
      supplier: '',
      category: '타이어',
      brand: tireBrands[0] || '기타',
      productName: '',
      specification: '',
      quantity: 1,
      factoryPrice: 0,
      sellingPrice: 0  // 판매가격 추가
  });

    const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'STORE_ADMIN';

  useEffect(() => {
    if (filter.type === 'DATE' && filter.value) {
        setCurrentDate(new Date(filter.value));
        setViewMode('daily');
    } else if (filter.type === 'PAYMENT') {
        setActivePaymentMethod(filter.value);
        setActiveStoreId('ALL');
        setViewMode('monthly'); 
        setCurrentDate(new Date());
    }
  }, [filter]);

  useEffect(() => {
      if (currentUser.role === 'STAFF' && currentStoreId) {
          setActiveStoreId(currentStoreId);
      }
  }, [currentUser, currentStoreId]);

  useEffect(() => {
      if (selectedSale) {
          setEditFormData(JSON.parse(JSON.stringify(selectedSale)));
          setLockedTotalAmount(selectedSale.totalAmount);
          setActiveEditField(null);
          setHasUnsavedChanges(false);
          setShowCloseConfirm(false);
      } else {
          setEditFormData(null);
          setShowCancelConfirm(false);
      }
  }, [selectedSale]);

  // Auto-update staff when date or store changes in quick add form
  useEffect(() => {
      if (!shifts || !staffList) return;
      
      const selectedDate = quickAddForm.datetime ? new Date(quickAddForm.datetime).toISOString().split('T')[0] : null;
      const selectedStoreId = quickAddForm.storeId;
      
      if (!selectedDate || !selectedStoreId) return;
      
      const matchingShifts = shifts.filter(shift => {
          if (!shift.start) return false;
          const shiftDate = shift.start.split('T')[0];
          return shiftDate === selectedDate && shift.storeId === selectedStoreId;
      });
      
      const staffIds = Array.from(new Set(matchingShifts.map(s => s.staffId)));
      const availableStaff = staffList.filter(staff => staffIds.includes(staff.id));
      
      // Auto-select if only one staff member
      if (availableStaff.length === 1) {
          setQuickAddForm(prev => ({ ...prev, staffName: availableStaff[0].name }));
      } else if (availableStaff.length === 0 || !availableStaff.find(s => s.name === quickAddForm.staffName)) {
          // Reset if current staff is not available
          setQuickAddForm(prev => ({ ...prev, staffName: '' }));
      }
  }, [quickAddForm.datetime, quickAddForm.storeId, shifts, staffList]);

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'daily') newDate.setDate(newDate.getDate() - 1);
    if (viewMode === 'weekly') newDate.setDate(newDate.getDate() - 7);
    if (viewMode === 'monthly' || viewMode === 'staff') newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'daily') newDate.setDate(newDate.getDate() + 1);
    if (viewMode === 'weekly') newDate.setDate(newDate.getDate() + 7);
    if (viewMode === 'monthly' || viewMode === 'staff') newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const getDateRange = () => {
      const start = new Date(currentDate);
      const end = new Date(currentDate);

      if (viewMode === 'daily') {
          start.setHours(0,0,0,0);
          end.setHours(23,59,59,999);
      } else if (viewMode === 'weekly') {
          const day = start.getDay();
          start.setDate(start.getDate() - day);
          start.setHours(0,0,0,0);
          end.setDate(start.getDate() + 6);
          end.setHours(23,59,59,999);
      } else {
          start.setDate(1);
          start.setHours(0,0,0,0);
          end.setMonth(end.getMonth() + 1);
          end.setDate(0);
          end.setHours(23,59,59,999);
      }
      return { start, end };
  };

  const { start: filterStart, end: filterEnd } = getDateRange();

  // Mini Calendar Helper
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

  const handleDateSelect = (date: Date) => {
      setCurrentDate(date);
      setIsCalendarOpen(false);
  };

  const handleCalendarPrev = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleCalendarNext = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getLatestCost = (productName: string, spec?: string) => {
    if (!stockInHistory || stockInHistory.length === 0) return 0;
    const matches = stockInHistory.filter(r => {
        const nameMatch = r.productName.trim() === productName.trim();
        const specMatch = spec ? (r.specification || '').trim() === (spec || '').trim() : true;
        return nameMatch && specMatch && (r.purchasePrice || 0) > 0;
    });
    matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return matches[0]?.purchasePrice || 0;
  };

  const getItemCost = (item: SalesItem) => {
    const manualCost = item.purchasePrice ?? 0;
    if (manualCost > 0) return manualCost;
    return getLatestCost(item.productName, item.specification);
  };

  const normalizeCategory = (category?: string) => category === '부품/수리' ? '기타' : (category || '기타');

  const isTireItem = (item: SalesItem) => {
    const product = products.find(p => p.id === item.productId);
    const category = normalizeCategory(product?.category);
    if (category === '타이어') return true;
    return category === '기타' && item.specification ? /\d{3}\/\d{2}/.test(item.specification) : false;
  };

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      if (saleDate < filterStart || saleDate > filterEnd) return false;
      if (activePaymentMethod !== 'ALL' && sale.paymentMethod !== activePaymentMethod) return false;
      if (activeStoreId !== 'ALL' && sale.storeId !== activeStoreId) return false;
      
      if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const vehicle = sale.vehicleNumber?.toLowerCase() || '';
          const phone = sale.customer?.phoneNumber || '';
          
          // Search in product names and specifications
          const matchesProduct = sale.items?.some(item => {
              const productName = item.productName?.toLowerCase() || '';
              const specification = item.specification?.toLowerCase() || '';
              // Normalize specification for number-only search (245/45R18 -> 2454518)
              const normalizedSpec = specification.replace(/[\/R]/g, '');
              const normalizedTerm = term.replace(/[\/R]/g, '');
              
              return productName.includes(term) || 
                     specification.includes(term) || 
                     normalizedSpec.includes(normalizedTerm);
          });
          
          if (!vehicle.includes(term) && !phone.includes(term) && !matchesProduct) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, filterStart, filterEnd, activePaymentMethod, activeStoreId, searchTerm]);

  const salesWithMetrics = useMemo(() => {
    return filteredSales.map(sale => {
        let totalCost = 0;
        sale.items.forEach(item => {
            const cost = getItemCost(item);
            totalCost += (cost * item.quantity);
        });
        const margin = sale.totalAmount - totalCost;
        return {
            ...sale,
            metrics: {
                totalCost,
                margin,
                marginRate: sale.totalAmount > 0 ? (margin / sale.totalAmount) * 100 : 0
            }
        };
    });
  }, [filteredSales, stockInHistory]);

  const aggregates = useMemo(() => {
    return salesWithMetrics.reduce((acc, curr) => ({
        revenue: acc.revenue + (curr.isCanceled ? 0 : curr.totalAmount),
        cost: acc.cost + (curr.isCanceled ? 0 : curr.metrics.totalCost),
        margin: acc.margin + (curr.isCanceled ? 0 : curr.metrics.margin)
    }), { revenue: 0, cost: 0, margin: 0 });
  }, [salesWithMetrics]);

    const periodTireAndPayment = useMemo(() => {
        let tireCount = 0;
        let totalPayment = 0;
        filteredSales.forEach(sale => {
                if (sale.isCanceled) return;
                totalPayment += sale.totalAmount;
                sale.items.forEach(item => {
                        if (isTireItem(item)) tireCount += item.quantity;
                });
        });
        return { tireCount, totalPayment };
    }, [filteredSales, products]);

    // const totalAmount = aggregates.revenue; (unused)

  const staffStats = useMemo(() => {
    if (viewMode !== 'staff' || !(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'STORE_ADMIN')) return [];
    
    const stats: Record<string, { name: string, count: number, total: number }> = {};
    filteredSales.filter(s => !s.isCanceled).forEach(sale => {
        const name = sale.staffName || '미지정';
        if (!stats[name]) {
            stats[name] = { name, count: 0, total: 0 };
        }
        stats[name].count += 1;
        stats[name].total += sale.totalAmount;
    });
    return Object.values(stats).sort((a, b) => b.total - a.total);
  }, [filteredSales, viewMode, currentUser.role]);

  const staffChartData = useMemo(() => {
      return staffStats.map(stat => ({
          name: stat.name,
          amount: stat.total,
          count: stat.count
      }));
  }, [staffStats]);

  const dateLabel = useMemo(() => {
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth() + 1;
      const d = currentDate.getDate();
      if (viewMode === 'daily') return `${y}. ${m}. ${d}`;
      if (viewMode === 'monthly' || viewMode === 'staff') return `${y}년 ${m}월`;
      const start = new Date(filterStart);
      const end = new Date(filterEnd);
      return `${start.getMonth()+1}.${start.getDate()} ~ ${end.getMonth()+1}.${end.getDate()}`;
  }, [currentDate, viewMode, filterStart, filterEnd]);

  const getPaymentLabel = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CARD: return '카드';
      case PaymentMethod.CASH: return '현금';
      case PaymentMethod.TRANSFER: return '이체';
      default: return method;
    }
  };

    const getDefaultQuickDateTime = () => {
            const base = new Date(currentDate);
            const now = new Date();
            base.setHours(now.getHours(), now.getMinutes(), 0, 0);
          return toLocalInputValue(base);
    };

    const openQuickAddForCurrentDate = () => {
            const defaultStore = activeStoreId !== 'ALL' ? activeStoreId : (currentStoreId !== 'ALL' ? currentStoreId : (stores[0]?.id || ''));
            setQuickAddForm(prev => ({
                    ...prev,
                    datetime: getDefaultQuickDateTime(),
                    storeId: defaultStore,
                    staffName: prev.staffName || currentUser.name,
                    items: []
            }));
            setIsQuickAddOpen(true);
    };

  
  const getPaymentIcon = (method: PaymentMethod) => {
      switch (method) {
          case PaymentMethod.CARD: return <CreditCard size={14} />;
          case PaymentMethod.CASH: return <Banknote size={14} />;
          case PaymentMethod.TRANSFER: return <Smartphone size={14} />;
          default: return <CreditCard size={14} />;
      }
  };


  // --- Display Priority Logic ---
  const getPrimaryItem = (sale: Sale) => {
    const itemsWithCat = sale.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        let category = normalizeCategory(product?.category);
        if (category === '기타' && item.specification && /\d{3}\/\d{2}/.test(item.specification)) {
            category = '타이어';
        }
        return { ...item, category };
    });

    const tires = itemsWithCat.filter(i => i.category === '타이어');
    if (tires.length > 0) return tires[0];

    const nonTires = itemsWithCat.filter(i => i.category !== '타이어');
    if (nonTires.length > 0) return nonTires[0];

    return itemsWithCat[0] || sale.items[0];
  };

  // Swap / Select / Add Product Handlers
  const openSwapModal = (saleId: string, itemId: string, isEditMode = false, itemIndex = -1) => {
      setSwapTarget({ saleId, itemId, isEditMode, itemIndex, isAdding: false });
      setIsSwapModalOpen(true);
      setProductSearchTerm('');
      setSwapSearchBrand('ALL');
  };

  const openAddModal = (saleId: string) => {
      setSwapTarget({ saleId, isEditMode: true, isAdding: true });
      setIsSwapModalOpen(true);
      setProductSearchTerm('');
      setSwapSearchBrand('ALL');
  };

  // Add rental product to quick add cart
  const addRentalProductToQuickAdd = (rentalType: 'online' | 'offline') => {
      const rentalItem: SalesItem = {
          productId: `rental-${rentalType}`,
          productName: rentalType === 'online' ? '온라인 렌탈' : '오프라인 렌탈',
          specification: '',
          quantity: 1,
          priceAtSale: 0
      };
      
      setQuickAddForm(prev => ({
          ...prev,
          items: [...prev.items, rentalItem]
      }));
  };

  const handleInstantStockIn = () => {
    const { productName, quantity, supplier } = stockInForm as any;
      if (!productName.trim() || quantity <= 0) {
          alert('상품명과 수량을 입력해주세요.');
          return;
      }
      if (!supplier.trim()) {
          alert('거래처를 입력해주세요.');
          return;
      }
      if (stockInForm.category === '타이어' && !stockInForm.specification.trim()) {
          alert('타이어는 규격(사이즈)을 반드시 입력해야 합니다.');
          return;
      }
            const consumptionQty = stockInForm.quantity;
      
      const record: StockInRecord = {
          id: `IN-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          storeId: selectedSale ? selectedSale.storeId : (swapTarget?.isQuickAddCart ? quickAddForm.storeId : currentStoreId),
          productId: undefined,
          supplier: stockInForm.supplier || '자체입고',
          category: stockInForm.category,
          brand: stockInForm.brand,
          productName: stockInForm.productName.trim(),
          specification: stockInForm.specification.trim(),
                    quantity: 0, // 즉시 판매용 입고는 재고 목록에 잔량 0으로 남김
                    receivedQuantity: consumptionQty,
                    consumedAtSaleId: selectedSale?.id,
          factoryPrice: stockInForm.factoryPrice,
          purchasePrice: 0
      };

      // Check if product already exists to reuse ID, or generate a deterministic new ID
      const normalize = (v?: string) => (v || '').toLowerCase().replace(/\s+/g, '');
      const existingProduct = products.find(p => {
          const nameMatch = normalize(p.name) === normalize(record.productName);
          const specMatch = normalize(p.specification) === normalize(record.specification);
          return p.specification || record.specification ? (nameMatch && specMatch) : nameMatch;
      });
      
    const targetProductId = existingProduct ? existingProduct.id : `P-NEW-${Date.now()}`;
    record.productId = targetProductId;

      // 1. Execute Stock In (DB update) with specific ID
      onStockIn(record, 0, targetProductId);

      // 2. Construct temporary Product object for the sales form
      const proxyProduct: Product = {
          id: targetProductId,
          name: record.productName,
          price: 0, // Price is 0 initially, will be calculated by fixed logic
          stock: consumptionQty, // 실제 입고된 수량 사용
          stockByStore: { [record.storeId]: consumptionQty },
          category: record.category,
          brand: record.brand,
          specification: record.specification
      };

      // 3. Add/replace in Sale List with correct quantity
      const replaceOrAppendItem = () => {
          if (selectedSale && editFormData) {
              let newItems = [...editFormData.items];

              // If we opened via 상품명(재고연동) 교체, replace that row; otherwise append
              const hasReplaceIndex = swapTarget?.isEditMode && typeof swapTarget.itemIndex === 'number' && swapTarget.itemIndex >= 0 && !swapTarget.isAdding;
              if (hasReplaceIndex && swapTarget?.itemIndex !== undefined) {
                  newItems[swapTarget.itemIndex] = {
                      productId: proxyProduct.id,
                      productName: proxyProduct.name,
                      brand: proxyProduct.brand,
                      specification: proxyProduct.specification,
                      quantity: consumptionQty,
                      priceAtSale: proxyProduct.price
                  } as SalesItem;
              } else {
                  newItems.push({
                      productId: proxyProduct.id,
                      productName: proxyProduct.name,
                      brand: proxyProduct.brand,
                      specification: proxyProduct.specification,
                      quantity: consumptionQty,
                      priceAtSale: proxyProduct.price
                  });
              }

              newItems = recalculateUnitPrices(newItems, getLockedBudget());
              setEditFormData({ ...editFormData, items: newItems });
              setHasUnsavedChanges(true);
          }
      };

      replaceOrAppendItem();

      if (insufficientStockProduct) {
          // We have swapTarget set from the warning popup
          if (swapTarget?.isEditMode && editFormData) {
              let newItems = [...editFormData.items];
              
              if (swapTarget.isAdding) {
                  newItems.push({
                      productId: proxyProduct.id,
                      productName: proxyProduct.name,
                      brand: proxyProduct.brand,
                      specification: proxyProduct.specification,
                      quantity: consumptionQty,
                      priceAtSale: proxyProduct.price
                  });
              }
              
              newItems = recalculateUnitPrices(newItems, getLockedBudget());
              setEditFormData({ ...editFormData, items: newItems });
              setHasUnsavedChanges(true);
          } else if (swapTarget?.isQuickAddCart) {
              // Quick-add cart case
              let newItems = [...quickAddForm.items];
              newItems.push({
                  productId: proxyProduct.id,
                  productName: proxyProduct.name,
                  brand: proxyProduct.brand,
                  specification: proxyProduct.specification,
                  quantity: consumptionQty,
                  priceAtSale: proxyProduct.price
              });
              setQuickAddForm(prev => ({ ...prev, items: newItems }));
          }
      } else {
          // Normal flow without insufficient stock warning
          if (swapTarget?.isQuickAddCart) {
              // Quick-add cart
              let newItems = [...quickAddForm.items];
              newItems.push({
                  productId: proxyProduct.id,
                  productName: proxyProduct.name,
                  brand: proxyProduct.brand,
                  specification: proxyProduct.specification,
                  quantity: consumptionQty,
                  priceAtSale: proxyProduct.price
              });
              setQuickAddForm(prev => ({ ...prev, items: newItems }));
          } else if (swapTarget?.isEditMode && editFormData) {
              if (swapTarget.isAdding) {
                  // 추가 모드에서는 기존 로직대로 append
                  let newItems = [...editFormData.items];
                  newItems.push({
                      productId: proxyProduct.id,
                      productName: proxyProduct.name,
                      brand: proxyProduct.brand,
                      specification: proxyProduct.specification,
                      quantity: consumptionQty,
                      priceAtSale: proxyProduct.price
                  });
                  newItems = recalculateUnitPrices(newItems, getLockedBudget());
                  setEditFormData({ ...editFormData, items: newItems });
                  setHasUnsavedChanges(true);
              } // 교체 모드는 replaceOrAppendItem에서 처리
          } else {
              // Fallback to executeSwap
              executeSwap({ ...proxyProduct, _swapQuantity: consumptionQty });
          }
      }

      // Ensure the last-added item in the edit form OR quick-add cart has the stocked quantity
      if (swapTarget?.isQuickAddCart) {
          // No need for safety check in quick-add since we just added it to items
      } else if (editFormData && insufficientStockProduct) {
          // Already handled above with recalculateUnitPrices
      } else if (editFormData) {
          setEditFormData(prev => {
              if (!prev) return prev;
              const items = Array.isArray(prev.items) ? [...prev.items] : [];
              if (items.length === 0) return prev;
              const lastIdx = items.length - 1;
              items[lastIdx] = { ...items[lastIdx], quantity: consumptionQty };
              return { ...prev, items };
          });
      }

      // 닫기 및 원래 판매 상세로 복귀
      setIsStockInModalOpen(false);
      setIsSwapModalOpen(false);
      setSwapTarget(null);
      // Reset states
      setInsuffcientStockProduct(null);
      setIsStockWarningOpen(false);
      
      // Reset form
      setStockInForm({
          supplier: '',
          category: '타이어',
          brand: tireBrands[0] || '기타',
          productName: '',
          specification: '',
          quantity: 1,
          factoryPrice: 0,
          sellingPrice: 0
      });
      setQuickAddForm(prev => ({ ...prev, inventoryAdjust: true }));
  };

  // --- Unit Price Redistribution Logic ---
  const recalculateUnitPrices = (currentItems: SalesItem[], fixedTotal: number): SalesItem[] => {
        if (currentItems.length === 0) return currentItems;
        
        // Single item case: Must equal fixedTotal
        if (currentItems.length === 1) {
            const item = currentItems[0];
            const newItemPrice = Math.floor(fixedTotal / item.quantity); // Handle quantity > 1
            return [{ ...item, priceAtSale: newItemPrice }];
        }

        let totalWeight = currentItems.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);

        if (totalWeight === 0) {
             // If weights are 0 (e.g. fresh items), distribute evenly
             const splitPrice = Math.floor(fixedTotal / currentItems.length);
             return currentItems.map((item, idx) => ({
                 ...item,
                 priceAtSale: idx === 0 ? splitPrice + (fixedTotal - (splitPrice * currentItems.length)) : splitPrice
             }));
        }

        const factor = fixedTotal / totalWeight;

        const newItems = currentItems.map((item) => {
            let newUnitPrice = Math.floor(item.priceAtSale * factor);
            return { ...item, priceAtSale: newUnitPrice };
        });

        let newActualTotal = newItems.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);
        let remainder = fixedTotal - newActualTotal;
        
        if (remainder !== 0) {
            const bestCandidate = newItems.findIndex(i => i.quantity === 1);
            if (bestCandidate !== -1) {
                newItems[bestCandidate].priceAtSale += remainder;
            } else {
                const firstItem = newItems[0];
                // Try to distribute remainder to first item
                if (firstItem.quantity > 0) {
                     const priceIncrease = Math.floor(remainder / firstItem.quantity);
                     newItems[0].priceAtSale += priceIncrease;
                }
            }
        }
        
        return newItems;
  };

      // Preferred budget for recalculations; falls back to sale totals if lock is unset
      const getLockedBudget = () => lockedTotalAmount || selectedSale?.totalAmount || editFormData?.totalAmount || 0;

    // Accepts optional _swapQuantity for new item
        const executeSwap = (product: Product & { _swapQuantity?: number }) => {
      if (!swapTarget) return;

      // 재고 검증: 신규 상품 추가 모드에서만 체크
      const requestedQty = product._swapQuantity || 1;
            const isNonStockCategory = (product.category === '기타');
            const hasInsufficientStock = swapTarget.isAdding && product.stock === 0 && !isNonStockCategory;
      
            if (hasInsufficientStock && product.id !== '99999') {
          // Show stock warning popup
          setInsuffcientStockProduct(product);
          setIsStockWarningOpen(true);
          return; // Don't proceed with adding until user confirms
      }

      if (swapTarget.isQuickAddCart) {
          // Add to quick-add cart
          let newItems = [...quickAddForm.items];
          newItems.push({
              productId: product.id,
              productName: product.name,
              brand: product.brand,
              specification: product.specification,
              quantity: requestedQty,
              priceAtSale: product.price
          });
          setQuickAddForm(prev => ({ ...prev, items: newItems }));
          setIsSwapModalOpen(false);
          setSwapTarget(null);
      } else if (swapTarget.isEditMode && editFormData) {
          let newItems = [...editFormData.items];
          
          if (swapTarget.isAdding) {
              newItems.push({
                  productId: product.id,
                  productName: product.name,
                  brand: product.brand,
                  specification: product.specification,
                  quantity: requestedQty,
                  priceAtSale: product.price
              });
          } else {
              const idx = swapTarget.itemIndex!;
              if (newItems[idx]) {
                  newItems[idx] = {
                      ...newItems[idx],
                      productId: product.id,
                      productName: product.name,
                      brand: product.brand,
                      specification: product.specification,
                      priceAtSale: product.price 
                  };
              }
          }
          
          newItems = recalculateUnitPrices(newItems, getLockedBudget());

          setEditFormData({ ...editFormData, items: newItems });
          setHasUnsavedChanges(true);
          setIsSwapModalOpen(false);
          setSwapTarget(null);
      } else if (swapTarget.itemId && swapTarget.saleId) {
          onSwapProduct(swapTarget.saleId, swapTarget.itemId, product);
          setIsSwapModalOpen(false);
          setSwapTarget(null);
          if (selectedSale && selectedSale.id === swapTarget.saleId) {
             setSelectedSale(null);
          }
      }
  };

  // --- Click-to-Edit Logic ---
  const handleEditChange = (field: string, value: any, itemIndex?: number) => {
      if (!editFormData) return;
      if (!selectedSale?.isCanceled) {
          setHasUnsavedChanges(true);
      }

      if (itemIndex !== undefined) {
          let newItems = [...editFormData.items];
          
          if (field === 'quantity') {
              const newQty = Number(value);
              if (newQty >= 0) {
                   newItems[itemIndex] = { ...newItems[itemIndex], quantity: newQty };
                   // Recalculate on Quantity Change - Distribute lock
                   newItems = recalculateUnitPrices(newItems, getLockedBudget());
              }
          } else if (field === 'priceAtSale') {
               // Manual Price override
               // CRITICAL: If only 1 item, price CANNOT change because it must equal Locked Total.
               if (newItems.length === 1) {
                   // Force reversion to current value (effectively disabled)
                   // UI should already disable this, but safety check here.
                   return; 
               }

               const newUnitPrice = Number(value);
               const targetItem = newItems[itemIndex];
               const targetCost = newUnitPrice * targetItem.quantity;
               
               // Calculate Remaining Budget for ALL OTHER items
               const budget = getLockedBudget();
               const remainingBudget = budget - targetCost;
               const otherItemsIndices = newItems.map((_, i) => i).filter(i => i !== itemIndex);

               if (otherItemsIndices.length === 0) {
                   // Should be caught by length===1 check above, but fallback:
                   newItems[itemIndex] = { ...targetItem, priceAtSale: newUnitPrice };
                   // If we allow editing single item, we break the "Fixed Total" rule.
                   // The prompt requirement says: Total is FIXED. 
                   // So single item price is strictly Total / Qty.
                   const fixedPrice = Math.floor(budget / targetItem.quantity);
                   newItems[itemIndex].priceAtSale = fixedPrice;
               } else {
                   // Distribute remainingBudget among other items
                   newItems[itemIndex] = { ...targetItem, priceAtSale: newUnitPrice };

                   const currentWeightOfOthers = otherItemsIndices.reduce((sum, idx) => {
                       return sum + (newItems[idx].priceAtSale * newItems[idx].quantity);
                   }, 0);

                   if (currentWeightOfOthers === 0) {
                        // Edge case: Others are 0. Just add to the first other item
                        const firstOther = otherItemsIndices[0];
                        const qty = newItems[firstOther].quantity;
                        if (qty > 0) {
                            newItems[firstOther].priceAtSale = Math.floor(remainingBudget / qty);
                        }
                   } else {
                        const factor = remainingBudget / currentWeightOfOthers;
                        otherItemsIndices.forEach(idx => {
                            const item = newItems[idx];
                            // Prevent prices from going negative if possible, or just apply math
                            const adjustedPrice = Math.floor(item.priceAtSale * factor);
                            newItems[idx] = { ...item, priceAtSale: adjustedPrice };
                        });
                   }

                   // Fix Rounding Drift to ensure exact Total Match
                   const currentTotal = newItems.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);
                   const drift = budget - currentTotal;

                   if (drift !== 0) {
                       // Add drift to the first available 'other' item
                       const absorbIdx = otherItemsIndices[0];
                       if (absorbIdx !== undefined) {
                            const absorbItem = newItems[absorbIdx];
                            if (absorbItem.quantity > 0) {
                                newItems[absorbIdx].priceAtSale += Math.floor(drift / absorbItem.quantity);
                            }
                       }
                   }
               }
          } else {
              newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
          }
          setEditFormData({ ...editFormData, items: newItems });
      } else if (field.startsWith('customer.')) {
          const custField = field.split('.')[1];
          const baseCustomer = editFormData.customer || { name: '', phoneNumber: '' };
          setEditFormData({
              ...editFormData,
              customer: {
                  ...baseCustomer,
                  [custField]: value
              }
          });
      } else {
          setEditFormData({ ...editFormData, [field]: value });
      }
  };

  // Auto-hyphenation for phone number
  const handlePhoneChange = (val: string) => {
      const raw = val.replace(/[^0-9]/g, '');
      let formatted = raw;
      if (raw.length > 3 && raw.length <= 7) {
          formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
      } else if (raw.length > 7) {
          formatted = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
      }
      handleEditChange('customer.phoneNumber', formatted);
  };

  const removeItem = (index: number) => {
      if (!editFormData) return;
      let newItems = editFormData.items.filter((_, i) => i !== index);
      // Recalculate on Remove
    newItems = recalculateUnitPrices(newItems, getLockedBudget());
      setEditFormData({ ...editFormData, items: newItems });
      setHasUnsavedChanges(true);
  };

  const renderEditableField = (
      id: string, 
      value: string | number, 
      onChange: (val: string) => void, 
      type: 'text' | 'number' = 'text',
      labelClass = ''
  ) => {
      const isEditing = activeEditField === id;

      if (selectedSale?.isCanceled) {
          return <span className={labelClass}>{value}</span>;
      }

      if (isEditing) {
          return (
              <input 
                  autoFocus
                  type={type}
                  className="w-full border border-blue-500 rounded p-1 text-sm bg-white"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onBlur={() => setActiveEditField(null)}
                  onKeyDown={(e) => {
                      if(e.key === 'Enter') setActiveEditField(null);
                  }}
              />
          );
      }

      const displayValue = (type === 'number')
          ? (typeof value === 'number' ? formatNumber(value) : (value !== '' ? formatNumber(Number(value)) : ''))
          : value;

      return (
          <div 
            onClick={() => setActiveEditField(id)}
            className={`cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 border border-transparent hover:border-gray-200 transition-colors ${labelClass}`}
            title="클릭하여 수정"
          >
              {displayValue !== '' && displayValue !== undefined && displayValue !== null ? displayValue : <span className="text-gray-300 italic">입력...</span>}
          </div>
      );
  };

  const saveDetailEdit = () => {
      if (editFormData && onUpdateSale) {
          // Recalculate unit prices to respect the locked total before saving
          const budget = getLockedBudget();
          const normalizedItems = recalculateUnitPrices(editFormData.items, budget || editFormData.totalAmount);
          const calculatedTotal = normalizedItems.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);
          const targetTotal = budget || calculatedTotal;

          const updatedSale = { 
              ...editFormData, 
              items: normalizedItems,
              totalAmount: targetTotal,
              isEdited: true // Mark as modified
          };
          
          onUpdateSale(updatedSale);
          setSelectedSale(null); // Close modal on save
          setEditFormData(null);
          setActiveEditField(null);
          setHasUnsavedChanges(false);
      }
  };

  const requestCloseDetail = () => {
      if (hasUnsavedChanges && !selectedSale?.isCanceled) {
          setShowCloseConfirm(true);
      } else {
          setSelectedSale(null);
      }
  };

  const discardChangesAndClose = () => {
      setHasUnsavedChanges(false);
      setSelectedSale(null);
      setShowCloseConfirm(false);
  };

  const confirmCancelSale = () => {
      if (cancelTargetSale && onCancelSale) {
          onCancelSale(cancelTargetSale.id);
          setCancelTargetSale(null);
          setShowCancelConfirm(false);
          setSelectedSale(null);
      } else {
          console.error("Cancel failed: Sale or onCancelSale handler missing", cancelTargetSale, onCancelSale);
      }
  };

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    products.forEach(p => {
        if (p.brand && p.brand !== '기타' && p.id !== '99999') {
            brands.add(p.brand);
        }
    });
    return Array.from(brands).sort();
  }, [products]);

  const filteredSearchProducts = useMemo(() => {
    const term = productSearchTerm.trim().toLowerCase();
    const numericTerm = term.replace(/\D/g, ''); // Extract numbers only

    return products.filter(p => {
        if (p.id === '99999') return false;
        
        // Brand Filter
        if (swapSearchBrand !== 'ALL' && p.brand !== swapSearchBrand) return false;
        
        // Search Filter
        if (!term) return true;

        const nameMatch = p.name.toLowerCase().includes(term);
        const specMatch = p.specification?.toLowerCase().includes(term);
        
        // Enhanced Numeric Match for Specs (e.g. 2454518 -> 245/45R18)
        let numericSpecMatch = false;
        if (!nameMatch && !specMatch && numericTerm.length >= 3 && p.specification) {
            const productNumericSpec = p.specification.toLowerCase().replace(/\D/g, '');
            if (productNumericSpec.includes(numericTerm)) {
                numericSpecMatch = true;
            }
        }
        
        return nameMatch || specMatch || numericSpecMatch;
    });
  }, [products, productSearchTerm, swapSearchBrand]);

  // Filter staff who worked on the selected date and store
  const availableStaffForQuickAdd = useMemo(() => {
      if (!quickAddForm.datetime || !quickAddForm.storeId || !shifts || !staffList) return [];
      
      const selectedDate = new Date(quickAddForm.datetime).toISOString().split('T')[0];
      const selectedStoreId = quickAddForm.storeId;
      
      // Find shifts for the selected date and store
      const matchingShifts = shifts.filter(shift => {
          if (!shift.start) return false;
          const shiftDate = shift.start.split('T')[0];
          return shiftDate === selectedDate && shift.storeId === selectedStoreId;
      });
      
      // Get unique staff IDs from matching shifts
      const staffIds = Array.from(new Set(matchingShifts.map(s => s.staffId)));
      
      // Return staff objects
      return staffList.filter(staff => staffIds.includes(staff.id));
  }, [quickAddForm.datetime, quickAddForm.storeId, shifts, staffList]);

  const submitQuickAdd = () => {
      if (!quickAddForm.items || quickAddForm.items.length === 0) {
          alert('상품을 추가해주세요.');
          return;
      }

      const storeId = quickAddForm.storeId && quickAddForm.storeId !== 'ALL'
        ? quickAddForm.storeId
        : (currentStoreId !== 'ALL' ? currentStoreId : (stores[0]?.id || ''));
      if (!storeId) {
          alert('지점을 선택해주세요.');
          return;
      }

      // Calculate total amount from items
      const totalAmount = quickAddForm.items.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);

      const isoString = quickAddForm.datetime ? new Date(quickAddForm.datetime).toISOString() : new Date().toISOString();
      const customer = (quickAddForm.customerName || quickAddForm.customerPhone) ? {
          name: quickAddForm.customerName,
          phoneNumber: quickAddForm.customerPhone
      } : undefined;

      const quickSale: Sale = {
          id: `Q-${Date.now()}`,
          date: isoString,
          storeId,
          totalAmount,
          paymentMethod: quickAddForm.paymentMethod,
          paymentDetails: quickAddForm.paymentDetails,
          items: quickAddForm.items,
          staffName: quickAddForm.staffName || currentUser.name,
          customer,
          memo: quickAddForm.memo,
          isEdited: false,
          isCanceled: false,
          inventoryAdjusted: quickAddForm.inventoryAdjust
      };

      onQuickAddSale(quickSale, { adjustInventory: quickAddForm.inventoryAdjust });
      setIsQuickAddOpen(false);
  };

  const isStoreSelected = activeStoreId !== 'ALL';

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-4">
      {/* ... (Previous code remains unchanged) ... */}
      
      {/* Header Area & Charts/Tables Logic Omitted for Brevity - Keeping same as before */}
      {/* The main changes are in the Modal parts below */}

      {/* Header Area */}
      <div className="flex flex-col bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        {/* ... Header Controls ... */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-4 gap-3">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"><ArrowLeft size={24} /></button>
                <h2 className="text-lg md:text-xl font-bold text-gray-800 truncate">
                    {viewMode === 'staff' ? '직원별 성과 분석' : '판매 내역 조회'}
                </h2>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-200">
                    <button onClick={handlePrev} className="p-1 hover:bg-white rounded-full transition-all shadow-sm"><ChevronLeft size={20} /></button>
                    <span className="text-base md:text-lg font-bold text-gray-800 min-w-[160px] text-center">{dateLabel}</span>
                    <button onClick={handleNext} className="p-1 hover:bg-white rounded-full transition-all shadow-sm"><ChevronRight size={20} /></button>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg items-center">
                    {(['daily', 'weekly', 'monthly', 'staff'] as const)
                        .filter(mode => mode !== 'staff' || (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'STORE_ADMIN'))
                        .map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {mode === 'daily' ? '일간' : mode === 'weekly' ? '주간' : mode === 'monthly' ? '월간' : '직원별'}
                        </button>
                    ))}
                    
                    <button
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className="ml-2 p-2 text-gray-600 hover:bg-white hover:text-blue-600 rounded-md transition-all"
                        title="날짜 선택"
                    >
                        <Calendar size={18} />
                    </button>
                </div>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
                {viewMode !== 'staff' && (
                    <div className="bg-blue-50 px-4 py-2.5 rounded-lg border border-blue-200 text-sm text-blue-700 font-semibold flex items-center gap-3">
                        <span>타이어 {periodTireAndPayment.tireCount.toLocaleString()}개</span>
                        <span className="text-blue-300">•</span>
                        <span>총 결제 {formatCurrency(periodTireAndPayment.totalPayment)}</span>
                    </div>
                )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                 <div className="relative w-full sm:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="차량번호/전화번호/상품명/규격(예:2454518)" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1 sm:flex-none sm:w-40">
                        <select value={activePaymentMethod} onChange={(e) => setActivePaymentMethod(e.target.value)} className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-9 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm">
                            <option value="ALL">모든 결제</option>
                            <option value={PaymentMethod.CARD}>카드</option>
                            <option value={PaymentMethod.CASH}>현금</option>
                            <option value={PaymentMethod.TRANSFER}>계좌이체</option>
                        </select>
                        <CreditCard size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                    <div className="relative flex-1 sm:flex-none sm:w-40">
                        <select 
                            value={activeStoreId} 
                            onChange={(e) => setActiveStoreId(e.target.value)}
                            disabled={currentUser.role === 'STAFF'} 
                            className={`w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-9 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm ${currentUser.role === 'STAFF' ? 'bg-gray-100' : ''}`}
                        >
                            <option value="ALL">전체 매장</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                </div>
                
                <button 
                    onClick={openQuickAddForCurrentDate}
                    className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-blue-700 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                    <Plus size={16}/> 판매추가
                </button>
            </div>
        </div>
      </div>
      
      {/* Sales List or Staff Chart Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
         {viewMode === 'staff' ? (
                 (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'STORE_ADMIN') ? (
                 <div className="p-4 md:p-6">
                    {/* Staff Stats Content */}
                    {staffStats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <UserIcon size={48} className="opacity-20 mb-4" />
                            <p>해당 기간의 판매 실적이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                             <div className="h-64 w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={staffChartData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 12}} />
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                             </div>
                        </div>
                    )}
                 </div>
             ) : (
                 <div className="flex flex-col items-center justify-center h-full text-gray-400 p-10">
                     <Lock size={48} className="mb-4 text-gray-300" />
                     <h3 className="text-lg font-bold text-gray-600">접근 권한이 없습니다</h3>
                 </div>
             )
         ) : (
            <>
                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden">
                    {salesWithMetrics.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 space-y-3">
                            <ShoppingBag size={32} className="opacity-20" />
                            <div className="text-center text-sm leading-relaxed">
                                <p>해당 날짜에 등록된 판매 내역이 없습니다.</p>
                                <p>지금 바로 판매 내역을 추가할 수 있습니다.</p>
                            </div>
                            <button onClick={openQuickAddForCurrentDate} className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm shadow-sm hover:bg-blue-700 flex items-center gap-2">
                                <Plus size={14}/> 판매 내역 추가
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {salesWithMetrics.map((sale) => {
                                const displayItem = getPrimaryItem(sale);
                                const timeLabel = new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const paymentIcon = getPaymentIcon(sale.paymentMethod);

                                return (
                                    <button
                                        key={sale.id}
                                        onClick={() => setSelectedSale(sale)}
                                        className={`w-full text-left p-4 active:bg-gray-50 transition-colors ${sale.isCanceled ? 'bg-gray-50' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-extrabold text-gray-900">{timeLabel}</span>
                                                {sale.isCanceled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">취소</span>}
                                                {!sale.isCanceled && sale.isEdited && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">수정됨</span>}
                                            </div>
                                            <div className="flex items-center gap-2 text-right">
                                                <span className={`font-bold text-sm ${sale.isCanceled ? 'text-red-400 line-through' : 'text-gray-900'}`}>{formatCurrency(sale.totalAmount)}</span>
                                                <span className="text-gray-400">{paymentIcon}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className={`text-sm font-bold ${sale.isCanceled ? 'text-red-400 line-through' : 'text-blue-600'}`}>{displayItem.specification}</span>
                                            <span className={`text-sm ${sale.isCanceled ? 'text-red-400 line-through' : 'text-gray-800'} truncate`}>
                                                {displayItem.brand} {displayItem.productName}
                                                {sale.items.length > 1 && <span className="text-gray-400 text-xs ml-1">외 {sale.items.length - 1}건</span>}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                            <span className="truncate">{isStoreSelected ? sale.staffName : `${stores.find(s => s.id === sale.storeId)?.name || ''} / ${sale.staffName}`}</span>
                                            {sale.memo && <span className="truncate max-w-[40%]" title={sale.memo}>{sale.memo}</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-between items-center">
                        <div className="text-[11px] font-bold text-gray-500">합계</div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500">총 매출</div>
                            <div className="text-lg font-bold text-blue-600">{formatCurrency(aggregates.revenue)}</div>
                        </div>
                    </div>
                </div>

                {/* Sales List Table */}
                <div className="hidden md:flex flex-col">
                    <div className="overflow-x-auto bg-white">
                        <table className="w-full text-sm text-left table-fixed">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-center w-[100px]">시간</th>
                                    <th className="px-4 py-3 text-left">규격 / 브랜드 / 모델</th>
                                    <th className="px-4 py-3 text-center w-[80px]">수량</th>
                                    <th className="px-4 py-3 text-right w-[120px]">결제 금액</th>
                                    {isAdmin && <th className="px-4 py-3 text-right w-[120px]">매입가</th>}
                                    {isAdmin && <th className="px-4 py-3 text-right w-[120px]">마진</th>}
                                    <th className="px-4 py-3 text-left w-[140px]">
                                        {isStoreSelected ? '담당자' : '지점 / 담당자'}
                                    </th>
                                    <th className="px-4 py-3 text-left w-[180px]">메모</th>
                                    {isAdmin && <th className="px-4 py-3 text-center w-[60px]">삭제</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {salesWithMetrics.length === 0 ? (
                                    <tr><td colSpan={isAdmin ? 9 : 6} className="px-6 py-12 text-center text-gray-500 space-y-3">
                                        <p className="text-sm">해당 날짜에 등록된 판매 내역이 없습니다. 지금 바로 판매 내역을 추가할 수 있습니다.</p>
                                        <div className="flex justify-center">
                                            <button onClick={openQuickAddForCurrentDate} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm shadow-sm hover:bg-blue-700 flex items-center gap-2">
                                                <Plus size={14}/> 판매 내역 추가
                                            </button>
                                        </div>
                                    </td></tr>
                                ) : (
                                    salesWithMetrics.map((sale) => {
                                        const displayItem = getPrimaryItem(sale);
                                        return (
                                        <tr key={sale.id} className={`hover:bg-blue-50 transition-colors ${sale.isCanceled ? 'bg-gray-50' : ''}`}>
                                            <td className="px-4 py-3 text-center text-gray-500 font-medium whitespace-nowrap text-xs truncate">
                                                {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                {sale.isEdited && !sale.isCanceled && (
                                                    <span className="block text-[9px] text-blue-500 font-bold mt-0.5">(수정됨)</span>
                                                )}
                                            </td>
                                            <td 
                                                onClick={() => setSelectedSale(sale)} 
                                                className="px-4 py-3 whitespace-nowrap overflow-hidden cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {sale.isCanceled && (
                                                        <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold border border-red-200">취소됨</span>
                                                    )}
                                                    {sale.items[0].productId === '99999' && !sale.isCanceled && !displayItem.specification && !displayItem.brand && (
                                                        <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-bold border border-orange-200 animate-pulse">⚠️ 우선결제</span>
                                                    )}
                                                    <span className={`text-sm font-bold truncate ${sale.isCanceled ? 'text-red-400 line-through' : 'text-blue-600'}`}>
                                                        {displayItem.specification}
                                                    </span>
                                                    <span className={`font-medium truncate ${sale.isCanceled ? 'text-red-400 line-through' : 'text-gray-800'}`}>
                                                        {displayItem.brand} {displayItem.productName}
                                                        {sale.items.length > 1 && <span className="text-gray-400 text-xs ml-1">외 {sale.items.length - 1}건</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-800 font-bold whitespace-nowrap">
                                                {(() => {
                                                    const tireQty = sale.items.reduce((sum, item) => sum + (isTireItem(item) ? (item.quantity || 0) : 0), 0);
                                                    return tireQty > 0 ? `${tireQty}개` : '-';
                                                })()}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className={`font-bold ${sale.isCanceled ? 'text-red-400 line-through' : 'text-gray-900'}`}>
                                                        {formatCurrency(sale.totalAmount)}
                                                    </span>
                                                    <span className="text-gray-400">{getPaymentIcon(sale.paymentMethod)}</span>
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <td 
                                                    className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (sale.isCanceled) return;
                                                        setInlineEditPurchasePriceSaleId(sale.id);
                                                        if (!inlineEditPurchasePrice[sale.id]) {
                                                            const firstItemCost = sale.items[0]?.purchasePrice || 0;
                                                            setInlineEditPurchasePrice({ ...inlineEditPurchasePrice, [sale.id]: firstItemCost ? formatNumber(firstItemCost) : '' });
                                                        }
                                                    }}
                                                >
                                                    {sale.isCanceled ? '-' : (
                                                        inlineEditPurchasePriceSaleId === sale.id ? (
                                                            <input 
                                                                type="text"
                                                                inputMode="numeric"
                                                                autoFocus
                                                                className="w-24 px-2 py-1 text-xs border border-blue-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                                value={inlineEditPurchasePrice[sale.id] || ''}
                                                                placeholder="0"
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                                    setInlineEditPurchasePrice({ ...inlineEditPurchasePrice, [sale.id]: val ? formatNumber(val) : '' });
                                                                }}
                                                                onBlur={() => {
                                                                    const rawVal = (inlineEditPurchasePrice[sale.id] || '').replace(/[^0-9]/g, '');
                                                                    const numVal = Number(rawVal) || 0;
                                                                    // Update first item's purchase price
                                                                    const updatedItems = [...sale.items];
                                                                    updatedItems[0] = { ...updatedItems[0], purchasePrice: numVal };
                                                                    onUpdateSale({ ...sale, items: updatedItems, isEdited: true });
                                                                    setInlineEditPurchasePriceSaleId(null);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') e.currentTarget.blur();
                                                                    if (e.key === 'Escape') { setInlineEditPurchasePriceSaleId(null); }
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="cursor-pointer hover:text-blue-600">{formatCurrency(sale.metrics.totalCost)}</span>
                                                        )
                                                    )}
                                                </td>
                                            )}
                                            {isAdmin && (
                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    {sale.isCanceled ? '-' : (
                                                        <div className="flex flex-col items-end">
                                                            <span className={`font-bold text-sm ${sale.metrics.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(sale.metrics.margin)}</span>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-left text-sm text-gray-600 whitespace-nowrap truncate">
                                                {isStoreSelected ? sale.staffName : <>{stores.find(s => s.id === sale.storeId)?.name} <span className="text-gray-400">({sale.staffName})</span></>}
                                            </td>
                                            <td className="px-4 py-3 text-left whitespace-nowrap overflow-hidden">
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        className="flex-1 min-w-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (sale.isCanceled) return;
                                                            setInlineEditMemoSaleId(sale.id);
                                                            setInlineEditMemo(sale.memo || '');
                                                        }}
                                                    >
                                                        {sale.isCanceled ? (
                                                            <div className="truncate text-xs text-gray-500" title={sale.memo}>{sale.memo}</div>
                                                        ) : (
                                                            inlineEditMemoSaleId === sale.id ? (
                                                                <input 
                                                                    type="text"
                                                                    autoFocus
                                                                    className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                                    value={inlineEditMemo}
                                                                    placeholder="메모 입력"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => setInlineEditMemo(e.target.value)}
                                                                    onBlur={() => {
                                                                        onUpdateSale({ ...sale, memo: inlineEditMemo, isEdited: true });
                                                                        setInlineEditMemoSaleId(null);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') e.currentTarget.blur();
                                                                        if (e.key === 'Escape') { setInlineEditMemoSaleId(null); }
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="truncate text-xs text-gray-500 cursor-pointer hover:text-blue-600" title={sale.memo}>{sale.memo || '메모 추가'}</div>
                                                            )
                                                        )}
                                                    </div>
                                                    {!sale.isCanceled && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setCancelTargetSale(sale);
                                                                setShowCancelConfirm(true);
                                                            }}
                                                            className="px-2 py-1 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                                            title="결제 취소"
                                                        >
                                                            결제취소
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <button
                                                        disabled={!sale.isCanceled}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSaleToDelete(sale.id);
                                                            setShowDeleteConfirm(true);
                                                        }}
                                                        className={`p-2 rounded-lg transition-colors ${
                                                            sale.isCanceled
                                                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                                                                : 'text-gray-200 cursor-not-allowed opacity-50'
                                                        }`}
                                                        title={sale.isCanceled ? '판매 내역 삭제' : '취소된 건만 삭제 가능합니다'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Summary Footer */}
                    <div className="bg-gray-50 border-t border-gray-200 p-4 sticky bottom-0 z-20 flex justify-between items-center shadow-md">
                        <div className="text-xs font-bold text-gray-500 uppercase">{viewMode === 'daily' ? `${currentDate.toLocaleDateString()} 합계` : '조회 기간 합계'}</div>
                        <div className="flex gap-6 text-sm">
                             <div className="text-right">
                                 <span className="text-xs text-gray-500 block">총 매출</span>
                                 <span className="font-bold text-blue-600 text-lg">{formatCurrency(aggregates.revenue)}</span>
                             </div>
                             {isAdmin && (
                                 <div className="text-right">
                                    <span className="text-xs text-gray-500 block">총 마진</span>
                                    <span className={`font-bold text-lg ${aggregates.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(aggregates.margin)}
                                    </span>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            </>
         )}
      </div>

      {/* Quick Add Modal */}
      {isQuickAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                      <div>
                          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                              <ShoppingBag size={20} className="text-blue-600"/> 
                              판매 추가
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">선택한 날짜에 판매 내역 추가</p>
                      </div>
                      <button onClick={() => setIsQuickAddOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                          <X size={20}/>
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="space-y-4">
                          <div className="space-y-2">
                              <label className="text-sm font-bold text-gray-700">판매 날짜/시간</label>
                              <input 
                                type="datetime-local"
                                value={quickAddForm.datetime}
                                onChange={e => setQuickAddForm(prev => ({ ...prev, datetime: e.target.value }))}
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="text-sm font-bold text-gray-700">결제 수단</label>
                                  <select 
                                    value={quickAddForm.paymentMethod}
                                    onChange={e => {
                                      const method = e.target.value as PaymentMethod;
                                      setQuickAddForm(prev => ({
                                        ...prev, 
                                        paymentMethod: method,
                                        paymentDetails: method === PaymentMethod.COMPLEX ? {
                                          method1: PaymentMethod.CARD,
                                          amount1: 0,
                                          method2: PaymentMethod.CASH,
                                          amount2: 0
                                        } : undefined
                                      }));
                                    }}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                  >
                                    <option value={PaymentMethod.CARD}>카드</option>
                                    <option value={PaymentMethod.CASH}>현금</option>
                                    <option value={PaymentMethod.TRANSFER}>이체</option>
                                    <option value={PaymentMethod.COMPLEX}>복합결제</option>
                                  </select>
                              </div>

                              {/* Complex Payment Details */}
                              {quickAddForm.paymentMethod === PaymentMethod.COMPLEX && quickAddForm.paymentDetails && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                                  <h4 className="font-bold text-blue-900 text-xs">복합결제 상세</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-blue-700">결제 수단 1</label>
                                      <select
                                        value={quickAddForm.paymentDetails.method1}
                                        onChange={e => setQuickAddForm(prev => ({
                                          ...prev,
                                          paymentDetails: prev.paymentDetails ? { ...prev.paymentDetails, method1: e.target.value as PaymentMethod } : undefined
                                        }))}
                                        className="w-full p-1.5 border border-blue-300 rounded text-xs bg-white focus:border-blue-500"
                                      >
                                        <option value={PaymentMethod.CARD}>카드</option>
                                        <option value={PaymentMethod.CASH}>현금</option>
                                        <option value={PaymentMethod.TRANSFER}>이체</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-blue-700">금액 1</label>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={quickAddForm.paymentDetails.amount1 > 0 ? formatNumber(quickAddForm.paymentDetails.amount1) : ''}
                                        onChange={(e) => {
                                          const amount = Number(e.target.value.replace(/[^0-9]/g, '') || '0');
                                          setQuickAddForm(prev => ({
                                            ...prev,
                                            paymentDetails: prev.paymentDetails ? { ...prev.paymentDetails, amount1: amount } : undefined
                                          }));
                                        }}
                                        className="w-full p-1.5 border border-blue-300 rounded text-xs font-bold"
                                        placeholder="0"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-blue-700">결제 수단 2</label>
                                      <select
                                        value={quickAddForm.paymentDetails.method2 || PaymentMethod.CASH}
                                        onChange={e => setQuickAddForm(prev => ({
                                          ...prev,
                                          paymentDetails: prev.paymentDetails ? { ...prev.paymentDetails, method2: e.target.value as PaymentMethod } : undefined
                                        }))}
                                        className="w-full p-1.5 border border-blue-300 rounded text-xs bg-white focus:border-blue-500"
                                      >
                                        <option value={PaymentMethod.CARD}>카드</option>
                                        <option value={PaymentMethod.CASH}>현금</option>
                                        <option value={PaymentMethod.TRANSFER}>이체</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-blue-700">금액 2</label>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={quickAddForm.paymentDetails.amount2 && quickAddForm.paymentDetails.amount2 > 0 ? formatNumber(quickAddForm.paymentDetails.amount2) : ''}
                                        onChange={(e) => {
                                          const amount = Number(e.target.value.replace(/[^0-9]/g, '') || '0');
                                          setQuickAddForm(prev => ({
                                            ...prev,
                                            paymentDetails: prev.paymentDetails ? { ...prev.paymentDetails, amount2: amount } : undefined
                                          }));
                                        }}
                                        className="w-full p-1.5 border border-blue-300 rounded text-xs font-bold"
                                        placeholder="0"
                                      />
                                    </div>
                                  </div>
                                  <div className="text-xs text-blue-700 font-bold bg-white p-1.5 rounded text-center">
                                    합계: {formatCurrency((quickAddForm.paymentDetails.amount1 || 0) + (quickAddForm.paymentDetails.amount2 || 0))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="space-y-2">
                                  <label className="text-sm font-bold text-gray-700">담당자</label>
                                  {availableStaffForQuickAdd.length === 0 ? (
                                      <div className="w-full p-2.5 border border-amber-300 bg-amber-50 rounded-lg text-sm text-amber-700">
                                          해당 날짜/매장에 근무한 직원이 없습니다
                                      </div>
                                  ) : availableStaffForQuickAdd.length === 1 ? (
                                      <div className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm font-bold text-gray-700">
                                          {availableStaffForQuickAdd[0].name}
                                      </div>
                                  ) : (
                                      <select
                                        value={quickAddForm.staffName}
                                        onChange={e => setQuickAddForm(prev => ({ ...prev, staffName: e.target.value }))}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                      >
                                        <option value="">선택하세요</option>
                                        {availableStaffForQuickAdd.map(staff => (
                                            <option key={staff.id} value={staff.name}>{staff.name}</option>
                                        ))}
                                      </select>
                                  )}
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="text-sm font-bold text-gray-700">지점</label>
                              {currentUser.role === 'STAFF' ? (
                                  <div className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm font-bold text-gray-700">
                                      {stores.find(s => s.id === quickAddForm.storeId)?.name || '지점 미선택'}
                                  </div>
                              ) : (
                                  <select 
                                    value={quickAddForm.storeId}
                                    onChange={e => setQuickAddForm(prev => ({ ...prev, storeId: e.target.value }))}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                  >
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                              )}
                          </div>
                      </div>

                      <div className="border-t border-gray-200 pt-6">
                          <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingBag size={16}/> 현재 구매 상품</h4>
                                  <div className="text-sm text-gray-500">합계: {formatCurrency(quickAddForm.items.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0))}</div>
                              </div>

                              {quickAddForm.items.length === 0 ? (
                                  <div className="text-center py-8 text-gray-400 text-sm">상품이 추가되지 않았습니다.</div>
                              ) : (
                                  <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                                      {quickAddForm.items.map((item, idx) => (
                                          <div key={idx} className="flex items-start justify-between gap-3 bg-white p-3 rounded-lg border border-gray-100">
                                              <div className="flex-1 min-w-0">
                                                  <div className="text-xs font-bold text-blue-600">{item.specification}</div>
                                                  <div className="text-sm font-bold text-gray-800">{item.brand} {item.productName}</div>
                                                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                                                      <div className="space-y-1">
                                                          <label className="block text-gray-500 font-bold">수량</label>
                                                          <input
                                                              type="number"
                                                              min="1"
                                                              value={item.quantity}
                                                              onChange={(e) => {
                                                                  const newQty = Math.max(1, Number(e.target.value) || 1);
                                                                  setQuickAddForm(prev => ({
                                                                      ...prev,
                                                                      items: prev.items.map((it, i) => i === idx ? { ...it, quantity: newQty } : it)
                                                                  }));
                                                              }}
                                                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                          />
                                                      </div>
                                                      <div className="space-y-1">
                                                          <label className="block text-gray-500 font-bold">단가</label>
                                                          <input
                                                              type="text"
                                                              inputMode="numeric"
                                                              value={item.priceAtSale > 0 ? formatNumber(item.priceAtSale) : ''}
                                                              onChange={(e) => {
                                                                  const raw = e.target.value.replace(/[^0-9]/g, '');
                                                                  const newPrice = raw === '' ? 0 : Number(raw);
                                                                  setQuickAddForm(prev => ({
                                                                      ...prev,
                                                                      items: prev.items.map((it, i) => i === idx ? { ...it, priceAtSale: newPrice } : it)
                                                                  }));
                                                              }}
                                                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                              placeholder="0"
                                                          />
                                                      </div>
                                                      <div className="space-y-1">
                                                          <label className="block text-gray-500 font-bold">합계</label>
                                                          <div className="px-2 py-1 bg-blue-50 rounded text-sm font-bold text-blue-600">
                                                              {formatCurrency(item.priceAtSale * item.quantity)}
                                                          </div>
                                                      </div>
                                                  </div>
                                                                                                    {item.productId?.startsWith('rental-') && (
                                                                                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                                                                            <div className="space-y-1">
                                                                                                                <label className="block text-gray-500 font-bold">사이즈 / 렌탈 종류</label>
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    value={item.specification || ''}
                                                                                                                    onChange={(e) => {
                                                                                                                        const spec = e.target.value;
                                                                                                                        setQuickAddForm(prev => ({
                                                                                                                            ...prev,
                                                                                                                            items: prev.items.map((it, i) => i === idx ? { ...it, specification: spec } : it)
                                                                                                                        }));
                                                                                                                    }}
                                                                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                                                                                    placeholder="예: 245/45R18 또는 장기렌탈/단기렌탈"
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div className="space-y-1">
                                                                                                                <label className="block text-gray-500 font-bold">메모 (선택)</label>
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    value={item.brand || ''}
                                                                                                                    onChange={(e) => {
                                                                                                                        const memo = e.target.value;
                                                                                                                        setQuickAddForm(prev => ({
                                                                                                                            ...prev,
                                                                                                                            items: prev.items.map((it, i) => i === idx ? { ...it, brand: memo } : it)
                                                                                                                        }));
                                                                                                                    }}
                                                                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                                                                                    placeholder="렌탈 옵션/비고"
                                                                                                                />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}
                                              </div>
                                              <button
                                                  onClick={() => setQuickAddForm(prev => ({
                                                      ...prev,
                                                      items: prev.items.filter((_, i) => i !== idx)
                                                  }))}
                                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 mt-1"
                                                  title="삭제"
                                              >
                                                  <Trash2 size={16} />
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              )}

                              {/* Add Item Button */}
                              <button 
                                onClick={() => {
                                    setSwapTarget({ isQuickAddCart: true, isAdding: true });
                                    setIsSwapModalOpen(true);
                                    setProductSearchTerm('');
                                    setSwapSearchBrand('ALL');
                                }}
                                className="w-full mt-3 py-2 border border-dashed border-blue-300 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                              >
                                  <Plus size={16} /> 상품/서비스 추가
                              </button>

                              {/* Rental Product Buttons */}
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                  <button
                                      onClick={() => addRentalProductToQuickAdd('online')}
                                      className="py-2 bg-green-50 border border-green-300 text-green-700 rounded-lg text-sm font-bold hover:bg-green-100 transition-colors"
                                  >
                                      온라인렌탈
                                  </button>
                                  <button
                                      onClick={() => addRentalProductToQuickAdd('offline')}
                                      className="py-2 bg-purple-50 border border-purple-300 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-100 transition-colors"
                                  >
                                      오프라인렌탈
                                  </button>
                              </div>

                              {/* Quick Stock In Button */}
                              <button 
                                onClick={() => {
                                  setSwapTarget({ isQuickAddCart: true, isAdding: true });
                                  setIsStockInModalOpen(true);
                                }}
                                className="w-full py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                              >
                                  <Truck size={16}/> + 신규 상품 등록 (바로 추가)
                              </button>
                          </div>
                      </div>

                      <div className="border-t border-gray-200 pt-6">
                          <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <label className="text-sm font-bold text-gray-700">고객명 (선택)</label>
                                      <input type="text" value={quickAddForm.customerName} onChange={e => setQuickAddForm(prev => ({ ...prev, customerName: e.target.value }))} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-sm font-bold text-gray-700">연락처 (선택)</label>
                                      <input type="text" value={quickAddForm.customerPhone} onChange={e => setQuickAddForm(prev => ({ ...prev, customerPhone: e.target.value }))} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="010-1234-5678" />
                                  </div>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-bold text-gray-700">관리자 메모</label>
                                  <input type="text" value={quickAddForm.memo} onChange={e => setQuickAddForm(prev => ({ ...prev, memo: e.target.value }))} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="특이사항 기록" />
                              </div>
                          </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                              <input 
                                id="quick-inventory-adjust"
                                type="checkbox"
                                checked={quickAddForm.inventoryAdjust}
                                onChange={e => setQuickAddForm(prev => ({ ...prev, inventoryAdjust: e.target.checked }))}
                                className="mt-1"
                              />
                              <div className="space-y-1">
                                  <label htmlFor="quick-inventory-adjust" className="font-bold text-gray-800 text-sm cursor-pointer">이 판매로 현재 재고를 차감합니다</label>
                                  <p className="text-xs text-gray-600">기본값은 차감입니다. 선택한 날짜와 관계없이 현재 재고에서 차감되며, 이미 다른 방법으로 재고를 처리했다면 체크 해제하세요.</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2 shrink-0">
                      <button onClick={() => setIsQuickAddOpen(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-white transition-colors">취소</button>
                      <button onClick={submitQuickAdd} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition-colors">저장</button>
                  </div>
              </div>
          </div>
      )}

      {/* Detail Edit Modal */}
      {selectedSale && editFormData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                      <div>
                          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                              <ShoppingBag size={20} className="text-blue-600"/> 
                              판매 상세 (수정)
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">주문번호: {selectedSale.id}</p>
                              {selectedSale.isEdited && <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">수정됨</span>}
                          </div>
                      </div>
                      <button onClick={requestCloseDetail} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {selectedSale.isCanceled && (
                          <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                              <AlertTriangle size={32} className="text-red-500 mx-auto mb-2"/>
                              <h3 className="font-bold text-red-600">결제 취소된 내역입니다.</h3>
                              <p className="text-xs text-gray-500">취소일시: {selectedSale.cancelDate ? new Date(selectedSale.cancelDate).toLocaleString() : '-'}</p>
                          </div>
                      )}

                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                          <div>
                              <div className="text-xs text-blue-500 font-bold uppercase mb-0.5">결제 완료 금액 (변경 불가)</div>
                              <div className={`text-2xl font-bold ${selectedSale.isCanceled ? 'text-red-500 line-through' : 'text-blue-700'}`}>
                                  {formatCurrency(lockedTotalAmount)}
                              </div>
                              <div className="text-[10px] text-blue-600 mt-0.5 font-semibold">상품/수량 변경 시 단가가 자동 조정됩니다.</div>
                          </div>
                         <div className="text-right">
                             <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold bg-white shadow-sm mb-1 ${selectedSale.paymentMethod === PaymentMethod.CARD ? 'text-blue-600' : selectedSale.paymentMethod === PaymentMethod.CASH ? 'text-emerald-600' : 'text-violet-600'}`}>
                                {getPaymentLabel(selectedSale.paymentMethod)}
                             </div>
                             <div className="text-xs text-gray-500 mb-1">{new Date(selectedSale.date).toLocaleString()}</div>
                             <div className="text-xs text-emerald-700 font-bold flex items-center justify-end gap-1">
                                <BadgeCheck size={12}/> {editFormData.staffName || '-'}
                             </div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-sm">
                          <span className="text-gray-600 font-medium">재고 반영 상태</span>
                          <span className={`font-bold ${selectedSale.inventoryAdjusted === false ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {selectedSale.inventoryAdjusted === false ? '미반영' : '반영됨'}
                          </span>
                      </div>
                      
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <h4 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingBag size={16}/> 구매 상품</h4>
                          </div>
                          <div className="space-y-2">
                              {editFormData.items.map((item, idx) => (
                              <div key={idx} className={`flex flex-col p-2.5 rounded-lg border ${item.productId === '99999' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-start">
                                      <div className="flex-1 sm:mr-4 w-full">
                                          <div className="space-y-1">
                                              <label className="text-[10px] text-gray-500 font-bold">상품명 (재고 연동)</label>
                                              <button 
                                                disabled={selectedSale.isCanceled}
                                                onClick={() => openSwapModal(selectedSale.id, item.productId, true, idx)}
                                                className={`w-full text-left bg-white border border-gray-200 rounded p-2 text-sm font-bold text-gray-700 hover:border-blue-300 hover:bg-blue-50 flex justify-between items-center ${selectedSale.isCanceled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                              >
                                                  <span className="truncate">{item.specification ? `[${item.specification}] ` : ''}{item.productName}</span>
                                                  <Search size={14} className="flex-shrink-0 text-gray-400" />
                                              </button>
                                          </div>
                                      </div>
                                      
                                      <div className="w-full sm:w-auto text-right">
                                          <div className="flex sm:flex-col gap-2 sm:gap-1 sm:items-end items-center justify-between sm:justify-end">
                                              <div className="flex items-center gap-1 sm:justify-end justify-between w-full sm:w-auto">
                                                  <span className="text-xs text-gray-500">단가</span>
                                                  {editFormData.items.length === 1 ? (
                                                      <span className="text-sm font-bold text-right w-20 text-gray-400 cursor-not-allowed" title="단일 상품은 총액과 동일해야 합니다">
                                                          {formatNumber(item.priceAtSale)}
                                                      </span>
                                                  ) : (
                                                      renderEditableField(
                                                          `item-${idx}-price`, 
                                                          item.priceAtSale, 
                                                          (val) => handleEditChange('priceAtSale', Number(val), idx), 
                                                          'number', 
                                                          'text-sm font-bold text-right w-24'
                                                      )
                                                  )}
                                              </div>
                                              <div className="flex items-center gap-2 justify-end h-8 sm:mt-1 w-full sm:w-auto">
                                                  <span className="text-xs text-gray-500">수량</span>
                                                  {activeEditField === `item-${idx}-qty` && !selectedSale.isCanceled ? (
                                                       <div className="flex items-center border border-blue-500 rounded bg-white">
                                                          <button 
                                                              onMouseDown={(e) => e.preventDefault()}
                                                              onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  const newQty = Math.max(1, item.quantity - 1);
                                                                  handleEditChange('quantity', newQty, idx);
                                                              }}
                                                              className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                                                          >
                                                              <Minus size={12}/>
                                                          </button>
                                                          <input 
                                                              autoFocus
                                                              type="number"
                                                              className="w-8 text-center text-sm p-1 outline-none appearance-none font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                              value={item.quantity}
                                                              onChange={(e) => handleEditChange('quantity', Number(e.target.value), idx)}
                                                              onBlur={() => setActiveEditField(null)}
                                                              onKeyDown={(e) => {
                                                                  if(e.key === 'Enter') setActiveEditField(null);
                                                              }}
                                                          />
                                                          <button 
                                                              onMouseDown={(e) => e.preventDefault()}
                                                              onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  const newQty = item.quantity + 1;
                                                                  handleEditChange('quantity', newQty, idx);
                                                              }}
                                                              className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                                                          >
                                                              <Plus size={12}/>
                                                          </button>
                                                       </div>
                                                  ) : (
                                                       <div 
                                                          onClick={() => !selectedSale.isCanceled && isTireItem(item) && setActiveEditField(`item-${idx}-qty`)}
                                                          className={`cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-1 border border-transparent hover:border-gray-200 transition-colors text-sm font-medium text-right ${selectedSale.isCanceled || !isTireItem(item) ? 'cursor-default' : ''}`}
                                                          title={isTireItem(item) ? "클릭하여 수정" : ""}
                                                       >
                                                           {isTireItem(item) ? item.quantity : '-'}
                                                       </div>
                                                  )}
                                              </div>
                                          </div>

                                          {isAdmin && (
                                              <div className="flex items-center gap-2 justify-end sm:mt-2 w-full sm:w-auto">
                                                  <span className="text-xs text-gray-500">매입가</span>
                                                  {renderEditableField(
                                                      `item-${idx}-purchasePrice`,
                                                      item.purchasePrice ?? '',
                                                      (val) => handleEditChange('purchasePrice', Number(val) || 0, idx),
                                                      'number',
                                                      'text-sm font-bold text-right w-24 text-emerald-700'
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  {/* Remove Item Button */}
                                  {!selectedSale.isCanceled && (
                                    <div className="mt-2 text-right">
                                        <button onClick={() => removeItem(idx)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 ml-auto">
                                            <Trash2 size={12} /> 삭제
                                        </button>
                                    </div>
                                  )}
                                                                    <div className="mt-2 text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                                                                            <Lock size={12}/> 결제 금액 고정 • 수량/상품 변경 시 단가 자동 조정
                                                                    </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Add Item Button */}
                          {!selectedSale.isCanceled && (
                              <button 
                                onClick={() => openAddModal(selectedSale.id)}
                                className="w-full mt-2 py-1.5 border border-dashed border-blue-300 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                              >
                                  <Plus size={16} /> 상품/서비스 추가
                              </button>
                          )}
                      </div>
                      
                      <div>
                          <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Edit3 size={16}/> 관리자 메모</h4>
                          {selectedSale.isCanceled ? (
                              <div className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">{editFormData.memo}</div>
                          ) : (
                              <textarea 
                                  className="w-full p-2.5 bg-yellow-50 border border-yellow-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-shadow"
                                  rows={2}
                                  placeholder="판매 관련 특이사항 기록"
                                  value={editFormData.memo || ''}
                                  onChange={(e) => handleEditChange('memo', e.target.value)}
                              />
                          )}
                      </div>

                      <div>
                          <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><UserIcon size={16}/> 고객 및 차량 정보</h4>
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1.5">
                                <div className="flex justify-between items-center min-h-[24px]">
                                    <span className="text-sm text-gray-500 w-20">고객명</span>
                                    <div className="flex-1 text-right">
                                        {renderEditableField('customer.name', editFormData.customer?.name || '', (val) => handleEditChange('customer.name', val), 'text', 'text-sm font-medium')}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center min-h-[24px]">
                                    <span className="text-sm text-gray-500 w-20">연락처</span>
                                    <div className="flex-1 text-right">
                                        {renderEditableField('customer.phoneNumber', editFormData.customer?.phoneNumber || '', handlePhoneChange, 'text', 'text-sm font-medium')}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center min-h-[24px]">
                                    <span className="text-sm text-gray-500 w-20">차량번호</span>
                                    <div className="flex-1 text-right">
                                        {renderEditableField('vehicleNumber', editFormData.vehicleNumber || '', (val) => handleEditChange('vehicleNumber', val), 'text', 'text-sm font-bold text-blue-600')}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center min-h-[24px]">
                                    <span className="text-sm text-gray-500 w-20">키로수</span>
                                    <div className="flex-1 text-right">
                                        {renderEditableField('customer.carModel', editFormData.customer?.carModel || '', (val) => handleEditChange('customer.carModel', val), 'text', 'text-sm font-medium')}
                                    </div>
                                </div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                        <button 
                            onClick={requestCloseDetail}
                            className="px-4 py-3 bg-white border border-gray-300 rounded-xl font-bold hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                            <X size={18}/> 취소
                        </button>
                        <button 
                            disabled={selectedSale.isCanceled}
                            onClick={saveDetailEdit}
                            className={`flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors shadow-md ${selectedSale.isCanceled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Save size={18} /> 변경사항 저장
                        </button>
                  </div>
              </div>
          </div>
      )}

      {showCloseConfirm && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
                  <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
                      <AlertTriangle size={18} className="text-amber-500" />
                      변경사항을 저장하지 않고 닫을까요?
                  </div>
                  <p className="text-sm text-gray-600">저장하지 않으면 수정 내용이 모두 사라집니다.</p>
                  <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowCloseConfirm(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-bold hover:bg-gray-50">계속 수정</button>
                      <button onClick={discardChangesAndClose} className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700">닫기</button>
                  </div>
              </div>
          </div>
      )}

      {showCancelConfirm && cancelTargetSale && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
                  <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
                      <AlertTriangle size={20} className="text-red-500" /> 결제 취소 확인
                  </div>
                  <p className="text-sm text-gray-600">정말 결제를 취소하시겠습니까?<br/>이 작업은 되돌릴 수 없습니다.</p>
                  <div className="flex gap-2 justify-end">
                      <button 
                          onClick={() => { 
                              setShowCancelConfirm(false); 
                              setCancelTargetSale(null);
                          }} 
                          className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-bold hover:bg-gray-50"
                      >
                          취소
                      </button>
                      <button 
                          onClick={confirmCancelSale} 
                          className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
                      >
                          결제 취소
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && saleToDelete && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
                  <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
                      <Trash2 size={18} className="text-red-500" /> 판매 내역 삭제
                  </div>
                  <p className="text-sm text-gray-600">취소된 판매 내역을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
                  <div className="flex gap-2 justify-end">
                      <button onClick={() => { setShowDeleteConfirm(false); setSaleToDelete(null); }} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-bold hover:bg-gray-50">취소</button>
                      <button 
                          onClick={() => { 
                              onDeleteSale(saleToDelete); 
                              setShowDeleteConfirm(false); 
                              setSaleToDelete(null); 
                          }} 
                          className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
                      >
                          삭제
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Insufficient Stock Warning Popup */}
      {isStockWarningOpen && insufficientStockProduct && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                  <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                          <AlertTriangle size={24} className="text-amber-500" />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-gray-800">재고가 없습니다</h3>
                          <p className="text-sm text-gray-600 mt-1">{insufficientStockProduct.brand} {insufficientStockProduct.name}</p>
                      </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                          <span className="font-bold text-amber-900">{insufficientStockProduct.specification}</span> 상품을 입고하시겠습니까?
                      </p>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                      <button
                          onClick={() => {
                              setIsStockWarningOpen(false);
                              setInsuffcientStockProduct(null);
                          }}
                          className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                      >
                          취소
                      </button>
                      <button
                          onClick={() => {
                              // Open stock-in modal with product info pre-filled
                              setStockInForm(prev => ({
                                  ...prev,
                                  productName: insufficientStockProduct.name,
                                  specification: insufficientStockProduct.specification || '',
                                  brand: insufficientStockProduct.brand || '기타',
                                  category: insufficientStockProduct.category,
                                  quantity: 1
                              }));
                              setIsStockInModalOpen(true);
                              setIsStockWarningOpen(false);
                              // Keep the product for later use
                          }}
                          className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                      >
                          입고하기
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Swap/Add Modal */}
      {isSwapModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-0 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                        <h3 className="font-bold text-lg text-gray-800">
                            {swapTarget?.isQuickAddCart ? '상품/서비스 추가' : (swapTarget?.isAdding ? '상품/서비스 추가' : (swapTarget?.isEditMode ? '상품 변경' : '정식 상품으로 변경'))}
                        </h3>
                        <button onClick={() => setIsSwapModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    </div>
                    
                    <div className="p-4 bg-white space-y-3 shrink-0">
                         {/* Show "New Product" button for both ADDING and SWAPPING */}
                         <button 
                            onClick={() => setIsStockInModalOpen(true)}
                            className="w-full py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 shadow-sm mb-2"
                        >
                            <Truck size={18}/> + 신규 상품 등록 {swapTarget?.isQuickAddCart ? '(바로 추가)' : '(바로 입고)'}
                        </button>

                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Tag size={12}/> 브랜드 필터</label>
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                <button onClick={() => setSwapSearchBrand('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${swapSearchBrand === 'ALL' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>전체</button>
                                {uniqueBrands.map(brand => (
                                    <button key={brand} onClick={() => setSwapSearchBrand(brand)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${swapSearchBrand === brand ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{brand}</button>
                                ))}
                            </div>
                         </div>
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="상품명 또는 규격 검색 (예: 2454518, HP71)" 
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                                value={productSearchTerm}
                                onChange={(e) => setProductSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 pt-0">
                        <div className="space-y-2">
                            {filteredSearchProducts.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 text-sm flex flex-col items-center"><Search size={32} className="opacity-20 mb-2" />검색 결과가 없습니다.</div>
                            ) : (
                                filteredSearchProducts.map(product => (
                                    <div key={product.id} onClick={() => executeSwap(product)} className="p-3 border border-gray-200 rounded-xl bg-white hover:border-blue-300 hover:shadow-sm cursor-pointer flex justify-between items-center group transition-all">
                                        <div>
                                            <div className="text-xs font-bold text-blue-600">{product.specification}</div>
                                            <div className="font-bold text-gray-800 text-sm group-hover:text-blue-600">{product.brand} {product.name}</div>
                                            <div className="text-xs text-gray-500 mt-1">단가: {formatCurrency(product.price)}</div>
                                        </div>
                                        <div className="text-right">
                                            {product.category === '기타' ? (
                                                <div className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700`}>재고: -</div>
                                            ) : (
                                                <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>재고: {product.stock > 900 ? '∞' : product.stock}</div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
           </div>
      )}

      {/* Instant Stock In Modal (Nested) */}
      {isStockInModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
               <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                             <Truck size={18} className="text-blue-600"/> 신규 입고 등록
                        </h3>
                        <button onClick={() => setIsStockInModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    </div>
                    
                    <div className="p-5 space-y-3">
                         {/* Order: Category -> Spec -> Brand -> Model */}
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">카테고리</label>
                            <select 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                                value={stockInForm.category}
                                onChange={e => setStockInForm({...stockInForm, category: e.target.value})}
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>

                         <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">규격 (Size)</label>
                             <input 
                                type="text" 
                                placeholder="예: 245/45R18"
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                value={stockInForm.specification}
                                onChange={e => {
                                    let val = e.target.value;
                                    if (/^\d{7}$/.test(val)) val = `${val.slice(0, 3)}/${val.slice(3, 5)}R${val.slice(5, 7)}`;
                                    setStockInForm({...stockInForm, specification: val})
                                }}
                            />
                         </div>

                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">브랜드</label>
                            <select 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                                value={stockInForm.brand}
                                onChange={e => setStockInForm({...stockInForm, brand: e.target.value})}
                            >
                                {tireBrands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                         </div>
                         
                         <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">모델명</label>
                             <input 
                                type="text" 
                                list="stockin-model-list"
                                placeholder="모델명 검색/입력"
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                value={stockInForm.productName}
                                onChange={e => setStockInForm({...stockInForm, productName: e.target.value})}
                            />
                            <datalist id="stockin-model-list">
                                {tireModels[stockInForm.brand]?.map(model => (
                                    <option key={model} value={model} />
                                ))}
                            </datalist>
                         </div>
                         
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">거래처 <span className="text-red-500">*필수</span></label>
                            <input 
                                type="text" 
                                placeholder="거래처명"
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                value={stockInForm.supplier}
                                onChange={e => setStockInForm({...stockInForm, supplier: e.target.value})}
                                required
                            />
                         </div>

                         <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">입고 수량</label>
                                 <input 
                                    type="number" 
                                    min="1"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                    value={stockInForm.quantity}
                                    onChange={e => setStockInForm({...stockInForm, quantity: Number(e.target.value)})}
                                />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">공장도가</label>
                                 <input 
                                    type="number" 
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-right"
                                    placeholder="0"
                                    value={stockInForm.factoryPrice || ''}
                                    onChange={e => setStockInForm({...stockInForm, factoryPrice: Number(e.target.value)})}
                                />
                             </div>
                         </div>

                         <div className="pt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            * [입고 완료] 시 재고가 즉시 증가하며, 판매 리스트에 자동 추가됩니다.
                         </div>

                         <button 
                            onClick={handleInstantStockIn}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
                        >
                            입고 완료 및 추가
                        </button>
                    </div>
               </div>
          </div>
      )}

      {/* Calendar Overlay Modal */}
      {isCalendarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsCalendarOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={handleCalendarPrev}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-xl font-bold text-gray-800">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </h3>
              <button 
                onClick={handleCalendarNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="text-center text-sm font-bold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date, idx) => (
                <button
                  key={idx}
                  onClick={() => date && handleDateSelect(date)}
                  disabled={!date}
                  className={`h-12 rounded-lg text-sm font-medium transition-all ${
                    !date ? 'invisible' :
                    date.toDateString() === currentDate.toDateString() 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                      : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                  }`}
                >
                  {date?.getDate()}
                </button>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsCalendarOpen(false)}
              className="w-full mt-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
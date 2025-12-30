import React, { useMemo, useState, useEffect } from 'react';
import type { Sale, SalesFilter, Store, User, StockInRecord, Product, SalesItem } from '../types';
import { PaymentMethod } from '../types';
import { ArrowLeft, CreditCard, MapPin, ChevronLeft, ChevronRight, X, ShoppingBag, User as UserIcon, Lock, Search, Edit3, Save, Banknote, Smartphone, AlertTriangle, Tag, Trash2, Plus, Minus, Truck } from 'lucide-react';
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
    onQuickAddSale: (sale: Sale, options?: { adjustInventory?: boolean }) => void;
  onStockIn: (record: StockInRecord, sellingPrice?: number, forceProductId?: string) => void;
  categories: string[];
  tireBrands: string[];
  tireModels: Record<string, string[]>;
}

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'staff';

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, stores, products, filter, onBack, currentUser, currentStoreId, stockInHistory, onSwapProduct, onUpdateSale, onCancelSale, onQuickAddSale, onStockIn, categories, tireBrands, tireModels }) => {
  
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [activePaymentMethod, setActivePaymentMethod] = useState<string>('ALL');
  const [activeStoreId, setActiveStoreId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState(''); // Vehicle or Phone

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [quickSearchBrand, setQuickSearchBrand] = useState<string>('ALL');
    const [quickSearchTerm, setQuickSearchTerm] = useState('');
    const [quickSelectedProductId, setQuickSelectedProductId] = useState<string>('');
      const toLocalInputValue = (date: Date) => {
          const offsetMs = date.getTimezoneOffset() * 60000;
          const local = new Date(date.getTime() - offsetMs);
          return local.toISOString().slice(0,16);
      };

      const [quickAddForm, setQuickAddForm] = useState<{
          datetime: string;
          paymentMethod: PaymentMethod;
          staffName: string;
          storeId: string;
          quantity: number;
          totalAmount: number;
          customerName: string;
          customerPhone: string;
          memo: string;
          inventoryAdjust: boolean;
      }>({
          datetime: toLocalInputValue(new Date()),
            paymentMethod: PaymentMethod.CARD,
            staffName: '',
            storeId: currentStoreId && currentStoreId !== 'ALL' ? currentStoreId : (stores[0]?.id || ''),
            quantity: 1,
            totalAmount: 0,
            customerName: '',
            customerPhone: '',
            memo: '',
            inventoryAdjust: false
    });
  
    // Inline memo editing removed (not used)

  // Swap/Add Item Modal State
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{
      saleId: string, 
      itemId?: string, 
      isEditMode?: boolean, 
      itemIndex?: number,
      isAdding?: boolean // New flag for adding item
  } | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [swapSearchBrand, setSwapSearchBrand] = useState<string>('ALL');

  // Sales Detail Edit State
  const [editFormData, setEditFormData] = useState<Sale | null>(null);
  const [activeEditField, setActiveEditField] = useState<string | null>(null); // 'customer.name', 'item-0-qty'
  const [lockedTotalAmount, setLockedTotalAmount] = useState<number>(0);

  // --- Immediate Stock In State ---
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [stockInForm, setStockInForm] = useState({
      supplier: '',
      category: '타이어',
      brand: tireBrands[0] || '기타',
      productName: '',
      specification: '',
      quantity: 1,
      factoryPrice: 0
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
          setShowCancelConfirm(false);
      } else {
          setEditFormData(null);
      }
  }, [selectedSale]);

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
          if (!vehicle.includes(term) && !phone.includes(term)) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, filterStart, filterEnd, activePaymentMethod, activeStoreId, searchTerm]);

  const salesWithMetrics = useMemo(() => {
    return filteredSales.map(sale => {
        let totalCost = 0;
        sale.items.forEach(item => {
            const cost = getLatestCost(item.productName, item.specification);
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
                    staffName: prev.staffName || currentUser.name
            }));
            setQuickSelectedProductId('');
            setQuickSearchTerm('');
            setQuickSearchBrand('ALL');
            setIsQuickAddOpen(true);
    };

    const handleQuickNumberChange = (field: 'quantity' | 'totalAmount', val: string) => {
            const raw = val.replace(/[^0-9]/g, '');
            const num = raw === '' ? 0 : Number(raw);
            setQuickAddForm(prev => ({ ...prev, [field]: num }));
    };
  
  const getPaymentIcon = (method: PaymentMethod) => {
      switch (method) {
          case PaymentMethod.CARD: return <CreditCard size={14} />;
          case PaymentMethod.CASH: return <Banknote size={14} />;
          case PaymentMethod.TRANSFER: return <Smartphone size={14} />;
          default: return <CreditCard size={14} />;
      }
  };

  const normalizeCategory = (category?: string) => category === '부품/수리' ? '기타' : (category || '기타');

 

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

  const handleInstantStockIn = () => {
    const { productName, quantity } = stockInForm as any;
      if (!productName.trim() || quantity <= 0) {
          alert('상품명과 수량을 입력해주세요.');
          return;
      }
            const consumptionQty = stockInForm.quantity;
      
      const record: StockInRecord = {
          id: `IN-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          storeId: selectedSale ? selectedSale.storeId : currentStoreId,
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
          stock: record.quantity,
          stockByStore: { [record.storeId]: record.quantity },
          category: record.category,
          brand: record.brand,
          specification: record.specification
      };

      // 3. Add to Sale List with correct quantity
      executeSwap({ ...proxyProduct, _swapQuantity: consumptionQty });

      // Ensure the last-added item in the edit form has the stocked quantity (safety in case of race)
      setEditFormData(prev => {
          if (!prev) return prev;
          const items = Array.isArray(prev.items) ? [...prev.items] : [];
          if (items.length === 0) return prev;
          const lastIdx = items.length - 1;
          items[lastIdx] = { ...items[lastIdx], quantity: consumptionQty };
          return { ...prev, items };
      });

      setIsStockInModalOpen(false);
      // Reset form
      setStockInForm({
          supplier: '',
          category: '타이어',
          brand: tireBrands[0] || '기타',
          productName: '',
          specification: '',
          quantity: 1,
          factoryPrice: 0
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

    // Accepts optional _swapQuantity for new item
    const executeSwap = (product: Product & { _swapQuantity?: number }) => {
      if (!swapTarget) return;

      if (swapTarget.isEditMode && editFormData) {
          let newItems = [...editFormData.items];
          
          if (swapTarget.isAdding) {
              newItems.push({
                  productId: product.id,
                  productName: product.name,
                  brand: product.brand,
                  specification: product.specification,
                  quantity: product._swapQuantity || 1,
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
          
          newItems = recalculateUnitPrices(newItems, lockedTotalAmount);

          setEditFormData({ ...editFormData, items: newItems });
          setHasUnsavedChanges(true);
          setIsSwapModalOpen(false);
          setSwapTarget(null);
      } else if (swapTarget.itemId) {
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
                   newItems = recalculateUnitPrices(newItems, lockedTotalAmount);
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
               const remainingBudget = lockedTotalAmount - targetCost;
               const otherItemsIndices = newItems.map((_, i) => i).filter(i => i !== itemIndex);

               if (otherItemsIndices.length === 0) {
                   // Should be caught by length===1 check above, but fallback:
                   newItems[itemIndex] = { ...targetItem, priceAtSale: newUnitPrice };
                   // If we allow editing single item, we break the "Fixed Total" rule.
                   // The prompt requirement says: Total is FIXED. 
                   // So single item price is strictly Total / Qty.
                   const fixedPrice = Math.floor(lockedTotalAmount / targetItem.quantity);
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
                   const drift = lockedTotalAmount - currentTotal;

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
      newItems = recalculateUnitPrices(newItems, lockedTotalAmount);
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
          // Verify totals: Re-sum the items
          const calculatedTotal = editFormData.items.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);
          
          // Update totalAmount and mark as Edited
          const updatedSale = { 
              ...editFormData, 
              totalAmount: calculatedTotal,
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
      if (selectedSale && onCancelSale) {
          // Process cancellation logic FIRST
          onCancelSale(selectedSale.id);
          // THEN close the modal to ensure smooth UX
          setSelectedSale(null); 
      } else {
          console.error("Cancel failed: Sale or onCancelSale handler missing", selectedSale, onCancelSale);
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

    const quickSelectedProduct = useMemo(() => {
            return products.find(p => p.id === quickSelectedProductId) || null;
    }, [products, quickSelectedProductId]);

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

  const quickFilteredProducts = useMemo(() => {
      const term = quickSearchTerm.trim().toLowerCase();
      const numericTerm = term.replace(/\D/g, '');

      return products.filter(p => {
          if (p.id === '99999') return false;
          if (quickSearchBrand !== 'ALL' && p.brand !== quickSearchBrand) return false;
          if (!term) return true;

          const nameMatch = p.name.toLowerCase().includes(term);
          const specMatch = p.specification?.toLowerCase().includes(term);
          let numericSpecMatch = false;
          if (!nameMatch && !specMatch && numericTerm.length >= 3 && p.specification) {
              const productNumericSpec = p.specification.toLowerCase().replace(/\D/g, '');
              if (productNumericSpec.includes(numericTerm)) numericSpecMatch = true;
          }
          return nameMatch || specMatch || numericSpecMatch;
      });
  }, [products, quickSearchTerm, quickSearchBrand]);

  const quickUnitPrice = useMemo(() => {
      return quickAddForm.quantity > 0 ? Math.round(quickAddForm.totalAmount / quickAddForm.quantity) : 0;
  }, [quickAddForm.quantity, quickAddForm.totalAmount]);

  const submitQuickAdd = () => {
      const targetProduct = quickSelectedProduct;
      if (!targetProduct) {
          alert('상품을 선택해주세요.');
          return;
      }
      if (!quickAddForm.quantity || quickAddForm.quantity <= 0) {
          alert('수량을 입력해주세요.');
          return;
      }
      if (!quickAddForm.totalAmount || quickAddForm.totalAmount <= 0) {
          alert('총 결제 금액을 입력해주세요.');
          return;
      }

      const storeId = quickAddForm.storeId && quickAddForm.storeId !== 'ALL'
        ? quickAddForm.storeId
        : (currentStoreId !== 'ALL' ? currentStoreId : (stores[0]?.id || ''));
      if (!storeId) {
          alert('지점을 선택해주세요.');
          return;
      }

      const isoString = quickAddForm.datetime ? new Date(quickAddForm.datetime).toISOString() : new Date().toISOString();
      const unitPrice = quickUnitPrice;
      const customer = (quickAddForm.customerName || quickAddForm.customerPhone) ? {
          name: quickAddForm.customerName,
          phoneNumber: quickAddForm.customerPhone
      } : undefined;

      const quickSale: Sale = {
          id: `Q-${Date.now()}`,
          date: isoString,
          storeId,
          totalAmount: quickAddForm.totalAmount,
          paymentMethod: quickAddForm.paymentMethod,
          items: [{
              productId: targetProduct.id,
              productName: targetProduct.name,
              specification: targetProduct.specification,
              brand: targetProduct.brand,
              quantity: quickAddForm.quantity,
              priceAtSale: unitPrice
          }],
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
            <div className="flex items-center gap-3 w-full md:w-auto">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"><ArrowLeft size={24} /></button>
                <h2 className="text-lg md:text-xl font-bold text-gray-800 truncate">
                    {viewMode === 'staff' ? '직원별 성과 분석' : '판매 내역 조회'}
                </h2>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto no-scrollbar">
                {(['daily', 'weekly', 'monthly', 'staff'] as const)
                    .filter(mode => mode !== 'staff' || (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'STORE_ADMIN'))
                    .map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {mode === 'daily' ? '일간' : mode === 'weekly' ? '주간' : mode === 'monthly' ? '월간' : '직원별'}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 w-full lg:w-auto justify-between lg:justify-start">
                <button onClick={handlePrev} className="p-1 hover:bg-white rounded-full transition-all shadow-sm"><ChevronLeft size={20} /></button>
                <span className="text-base md:text-lg font-bold text-gray-800 min-w-[140px] text-center">{dateLabel}</span>
                <button onClick={handleNext} className="p-1 hover:bg-white rounded-full transition-all shadow-sm"><ChevronRight size={20} /></button>
            </div>
            <div className="grid grid-cols-1 md:flex items-center gap-3 w-full lg:w-auto">
                 <div className="relative w-full md:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="차량번호 또는 전화번호 뒷자리" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                 <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                        <select value={activePaymentMethod} onChange={(e) => setActivePaymentMethod(e.target.value)} className="w-full md:w-auto appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-9 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm">
                            <option value="ALL">모든 결제</option>
                            <option value={PaymentMethod.CARD}>카드</option>
                            <option value={PaymentMethod.CASH}>현금</option>
                            <option value={PaymentMethod.TRANSFER}>계좌이체</option>
                        </select>
                        <CreditCard size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                    <div className="relative w-full md:w-auto">
                        <select 
                            value={activeStoreId} 
                            onChange={(e) => setActiveStoreId(e.target.value)}
                            disabled={currentUser.role === 'STAFF'} 
                            className={`w-full md:w-auto appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-9 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm ${currentUser.role === 'STAFF' ? 'bg-gray-100' : ''}`}
                        >
                            <option value="ALL">전체 매장</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                 </div>
            <button 
                onClick={openQuickAddForCurrentDate}
                className="w-full lg:w-auto bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm hover:bg-blue-700 flex items-center justify-center gap-2"
            >
                <Plus size={16}/> 이 날짜에 판매 추가
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
                                    <th className="px-4 py-3 text-right w-[120px]">결제 금액</th>
                                    {isAdmin && <th className="px-4 py-3 text-right w-[120px]">매입가</th>}
                                    {isAdmin && <th className="px-4 py-3 text-right w-[120px]">마진</th>}
                                    <th className="px-4 py-3 text-left w-[140px]">
                                        {isStoreSelected ? '담당자' : '지점 / 담당자'}
                                    </th>
                                    <th className="px-4 py-3 text-left w-[180px]">메모</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {salesWithMetrics.length === 0 ? (
                                    <tr><td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-500 space-y-3">
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
                                        <tr key={sale.id} onClick={() => setSelectedSale(sale)} className={`hover:bg-blue-50 cursor-pointer transition-colors ${sale.isCanceled ? 'bg-gray-50' : ''}`}>
                                            <td className="px-4 py-3 text-center text-gray-500 font-medium whitespace-nowrap text-xs truncate">
                                                {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                {sale.isEdited && !sale.isCanceled && (
                                                    <span className="block text-[9px] text-blue-500 font-bold mt-0.5">(수정됨)</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap overflow-hidden">
                                                <div className="flex items-center gap-2">
                                                    {sale.isCanceled && (
                                                        <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold border border-red-200">취소됨</span>
                                                    )}
                                                    {sale.items[0].productId === '99999' && !sale.isCanceled && (
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
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className={`font-bold ${sale.isCanceled ? 'text-red-400 line-through' : 'text-gray-900'}`}>
                                                        {formatCurrency(sale.totalAmount)}
                                                    </span>
                                                    <span className="text-gray-400">{getPaymentIcon(sale.paymentMethod)}</span>
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                                                    {sale.isCanceled ? '-' : formatCurrency(sale.metrics.totalCost)}
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
                                                <div className="truncate text-xs text-gray-500" title={sale.memo}>{sale.memo}</div>
                                            </td>
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
              <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div className="space-y-1">
                          <div className="text-xs font-bold text-blue-600 uppercase">빠른 판매 등록</div>
                          <h3 className="font-bold text-lg text-gray-800">선택한 날짜에 판매 추가</h3>
                      </div>
                      <button onClick={() => setIsQuickAddOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>

                  <div className="p-5 space-y-4 overflow-y-auto">
                      <div className="grid md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-600">판매 날짜/시간</label>
                              <input 
                                type="datetime-local"
                                value={quickAddForm.datetime}
                                onChange={e => setQuickAddForm(prev => ({ ...prev, datetime: e.target.value }))}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-600">결제 수단</label>
                              <select 
                                value={quickAddForm.paymentMethod}
                                onChange={e => setQuickAddForm(prev => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value={PaymentMethod.CARD}>카드</option>
                                <option value={PaymentMethod.CASH}>현금</option>
                                <option value={PaymentMethod.TRANSFER}>이체</option>
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-600">담당자</label>
                              <input 
                                type="text"
                                value={quickAddForm.staffName}
                                onChange={e => setQuickAddForm(prev => ({ ...prev, staffName: e.target.value }))}
                                placeholder={currentUser.name}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                              />
                          </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-600">지점</label>
                              {currentUser.role === 'STAFF' ? (
                                  <div className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-bold text-gray-700">
                                      {stores.find(s => s.id === quickAddForm.storeId)?.name || '지점 미선택'}
                                  </div>
                              ) : (
                                  <select 
                                    value={quickAddForm.storeId}
                                    onChange={e => setQuickAddForm(prev => ({ ...prev, storeId: e.target.value }))}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                              )}
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-600">수량</label>
                              <input 
                                type="text"
                                inputMode="numeric"
                                value={quickAddForm.quantity ? formatNumber(quickAddForm.quantity) : ''}
                                onChange={e => handleQuickNumberChange('quantity', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="0"
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-600">총 결제 금액</label>
                              <input 
                                type="text"
                                inputMode="numeric"
                                value={quickAddForm.totalAmount ? formatNumber(quickAddForm.totalAmount) : ''}
                                onChange={e => handleQuickNumberChange('totalAmount', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="0"
                              />
                              <div className="text-[11px] text-blue-600 font-semibold">단가 자동 계산: {formatCurrency(quickUnitPrice)}</div>
                          </div>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
                          <div className="flex items-center justify-between">
                              <div className="text-sm font-bold text-gray-800 flex items-center gap-2"><ShoppingBag size={16}/> 구매 상품 (필수)</div>
                              <div className="flex gap-2">
                                  <button onClick={() => setQuickSearchBrand('ALL')} className={`px-3 py-1 text-xs rounded-lg font-bold border ${quickSearchBrand === 'ALL' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>전체</button>
                                  {uniqueBrands.map(brand => (
                                      <button key={brand} onClick={() => setQuickSearchBrand(brand)} className={`px-3 py-1 text-xs rounded-lg font-bold border ${quickSearchBrand === brand ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>{brand}</button>
                                  ))}
                              </div>
                          </div>
                          <div className="relative">
                              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input 
                                type="text"
                                value={quickSearchTerm}
                                onChange={e => setQuickSearchTerm(e.target.value)}
                                placeholder="규격/브랜드/모델 검색"
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                          </div>
                          <div className="max-h-52 overflow-y-auto space-y-2">
                              {quickFilteredProducts.length === 0 ? (
                                  <div className="text-center text-sm text-gray-400 py-6">검색 결과가 없습니다.</div>
                              ) : (
                                  quickFilteredProducts.map(p => {
                                      const isSelected = quickSelectedProductId === p.id;
                                      return (
                                          <button 
                                            key={p.id}
                                            onClick={() => setQuickSelectedProductId(p.id)}
                                            className={`w-full text-left p-3 rounded-lg border ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-white'} flex items-center justify-between`}
                                          >
                                              <div>
                                                  <div className="text-xs font-bold text-blue-600">{p.specification}</div>
                                                  <div className="text-sm font-bold text-gray-800">{p.brand} {p.name}</div>
                                              </div>
                                              <div className="text-right text-xs text-gray-500">
                                                  재고: {p.stock > 900 ? '∞' : p.stock}
                                              </div>
                                          </button>
                                      );
                                  })
                              )}
                          </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-600">고객명 (선택)</label>
                              <input type="text" value={quickAddForm.customerName} onChange={e => setQuickAddForm(prev => ({ ...prev, customerName: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-600">연락처 (선택)</label>
                              <input type="text" value={quickAddForm.customerPhone} onChange={e => setQuickAddForm(prev => ({ ...prev, customerPhone: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="010-1234-5678" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-600">관리자 메모</label>
                              <input type="text" value={quickAddForm.memo} onChange={e => setQuickAddForm(prev => ({ ...prev, memo: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="특이사항 기록" />
                          </div>
                      </div>

                      <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-3">
                          <input 
                            id="quick-inventory-adjust"
                            type="checkbox"
                            checked={quickAddForm.inventoryAdjust}
                            onChange={e => setQuickAddForm(prev => ({ ...prev, inventoryAdjust: e.target.checked }))}
                            className="mt-1"
                          />
                          <div className="space-y-1">
                              <label htmlFor="quick-inventory-adjust" className="font-bold text-gray-800 text-sm">이 판매로 재고를 차감합니다</label>
                              <p className="text-xs text-gray-500">기본값은 미차감입니다. 체크 시 현재 재고에서 해당 수량이 차감되며, 과거 보정 입력 시 주의하세요.</p>
                          </div>
                      </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                      <button onClick={() => setIsQuickAddOpen(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-bold hover:bg-white">닫기</button>
                      <button onClick={submitQuickAdd} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow">저장 후 리스트 반영</button>
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
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {selectedSale.isCanceled && (
                          <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                              <AlertTriangle size={32} className="text-red-500 mx-auto mb-2"/>
                              <h3 className="font-bold text-red-600">결제 취소된 내역입니다.</h3>
                              <p className="text-xs text-gray-500">취소일시: {selectedSale.cancelDate ? new Date(selectedSale.cancelDate).toLocaleString() : '-'}</p>
                          </div>
                      )}

                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                          <div>
                              <div className="text-xs text-blue-500 font-bold uppercase mb-1">결제 완료 금액 (변경 불가)</div>
                              <div className={`text-2xl font-bold ${selectedSale.isCanceled ? 'text-red-500 line-through' : 'text-blue-700'}`}>
                                  {formatCurrency(lockedTotalAmount)}
                              </div>
                              <div className="text-[10px] text-blue-600 mt-1 font-semibold">상품/수량 변경 시 단가가 자동 조정됩니다.</div>
                          </div>
                         <div className="text-right">
                             <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold bg-white shadow-sm mb-1 ${selectedSale.paymentMethod === PaymentMethod.CARD ? 'text-blue-600' : selectedSale.paymentMethod === PaymentMethod.CASH ? 'text-emerald-600' : 'text-violet-600'}`}>
                                {getPaymentLabel(selectedSale.paymentMethod)}
                             </div>
                             <div className="text-xs text-gray-500">{new Date(selectedSale.date).toLocaleString()}</div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm">
                          <span className="text-gray-600 font-medium">재고 반영 상태</span>
                          <span className={`font-bold ${selectedSale.inventoryAdjusted === false ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {selectedSale.inventoryAdjusted === false ? '미반영' : '반영됨'}
                          </span>
                      </div>
                      
                      <div>
                          <div className="flex justify-between items-center mb-3">
                              <h4 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingBag size={16}/> 구매 상품</h4>
                          </div>
                          <div className="space-y-3">
                              {editFormData.items.map((item, idx) => (
                              <div key={idx} className={`flex flex-col p-3 rounded-lg border ${item.productId === '99999' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
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
                                                          onClick={() => !selectedSale.isCanceled && setActiveEditField(`item-${idx}-qty`)}
                                                          className={`cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-1 border border-transparent hover:border-gray-200 transition-colors text-sm font-medium text-right ${selectedSale.isCanceled ? 'cursor-default' : ''}`}
                                                          title="클릭하여 수정"
                                                       >
                                                           {item.quantity}
                                                       </div>
                                                  )}
                                              </div>
                                          </div>
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
                                className="w-full mt-3 py-2 border border-dashed border-blue-300 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                              >
                                  <Plus size={16} /> 상품/서비스 추가
                              </button>
                          )}
                      </div>
                      
                      <div>
                          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><UserIcon size={16}/> 고객 및 차량 정보</h4>
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                                <div className="flex justify-between items-center min-h-[28px]">
                                    <span className="text-sm text-gray-500 w-20">고객명</span>
                                    <div className="flex-1 text-right">
                                        {renderEditableField('customer.name', editFormData.customer?.name || '', (val) => handleEditChange('customer.name', val), 'text', 'text-sm font-medium')}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center min-h-[28px]">
                                    <span className="text-sm text-gray-500 w-20">연락처</span>
                                    <div className="flex-1 text-right">
                                        {renderEditableField('customer.phoneNumber', editFormData.customer?.phoneNumber || '', handlePhoneChange, 'text', 'text-sm font-medium')}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center min-h-[28px]">
                                    <span className="text-sm text-gray-500 w-20">차량번호</span>
                                    <div className="flex-1 text-right">
                                        {renderEditableField('vehicleNumber', editFormData.vehicleNumber || '', (val) => handleEditChange('vehicleNumber', val), 'text', 'text-sm font-bold text-blue-600')}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center min-h-[28px]">
                                    <span className="text-sm text-gray-500 w-20">차종</span>
                                    <div className="flex-1 text-right">
                                        {renderEditableField('customer.carModel', editFormData.customer?.carModel || '', (val) => handleEditChange('customer.carModel', val), 'text', 'text-sm font-medium')}
                                    </div>
                                </div>
                          </div>
                      </div>

                      <div>
                          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Edit3 size={16}/> 관리자 메모</h4>
                          {selectedSale.isCanceled ? (
                              <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">{editFormData.memo}</div>
                          ) : (
                              <textarea 
                                  className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-shadow"
                                  rows={3}
                                  placeholder="판매 관련 특이사항 기록"
                                  value={editFormData.memo || ''}
                                  onChange={(e) => handleEditChange('memo', e.target.value)}
                              />
                          )}
                      </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                        {!selectedSale.isCanceled && (
                            <button 
                                type="button"
                                onClick={() => setShowCancelConfirm(true)}
                                className="px-4 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 flex items-center gap-2 transition-colors"
                            >
                                <Trash2 size={18}/> 결제 취소
                            </button>
                        )}
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

      {showCancelConfirm && selectedSale && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
                  <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
                      <Trash2 size={18} className="text-red-500" /> 결제 전체 취소
                  </div>
                  <p className="text-sm text-gray-600">해당 판매 건을 모두 취소하시겠습니까?</p>
                  <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowCancelConfirm(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-bold hover:bg-gray-50">닫기</button>
                      <button onClick={() => { setShowCancelConfirm(false); confirmCancelSale(); }} className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700">취소 진행</button>
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
                            {swapTarget?.isAdding ? '상품/서비스 추가' : (swapTarget?.isEditMode ? '상품 변경' : '정식 상품으로 변경')}
                        </h3>
                        <button onClick={() => setIsSwapModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    </div>
                    
                    <div className="p-4 bg-white space-y-3 shrink-0">
                         {/* Show "New Product" button for both ADDING and SWAPPING */}
                         <button 
                            onClick={() => setIsStockInModalOpen(true)}
                            className="w-full py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 shadow-sm mb-2"
                        >
                            <Truck size={18}/> + 신규 상품 등록 (바로 입고)
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
                                            <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>재고: {product.stock > 900 ? '∞' : product.stock}</div>
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
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">거래처 (선택)</label>
                            <input 
                                type="text" 
                                placeholder="거래처명"
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                value={stockInForm.supplier}
                                onChange={e => setStockInForm({...stockInForm, supplier: e.target.value})}
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
    </div>
  );
};

export default SalesHistory;
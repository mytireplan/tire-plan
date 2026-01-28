
import React, { useState, useEffect, useMemo } from 'react';
import type { StockInRecord, Store, Product, User } from '../types';
import { Truck, Calendar, Save, AlertCircle, FileUp, Split, Filter, Tag, Store as StoreIcon, Eye, X, Search, Trash2 } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';

interface StockInProps {
    stores: Store[];
    categories: string[];
    tireBrands: string[];
    products: Product[];
    onStockIn: (record: StockInRecord, sellingPrice?: number) => void;
    currentUser: User;
    stockInHistory: StockInRecord[];
    currentStoreId: string;
    onUpdateStockInRecord: (record: StockInRecord) => void;
    onDeleteStockInRecord: (id: string) => void;
    tireModels: Record<string, string[]>;
}

const StockIn: React.FC<StockInProps> = ({ stores, categories, tireBrands, products, onStockIn, currentUser, stockInHistory, currentStoreId, onUpdateStockInRecord, onDeleteStockInRecord, tireModels: _unusedTireModels }) => {
    const isAdminView = currentUser.role === 'STORE_ADMIN' || currentUser.role === 'SUPER_ADMIN';
    const dateToLocalString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    // --- Form State ---
    const [formData, setFormData] = useState({
        date: dateToLocalString(new Date()),
        storeId: (currentStoreId && currentStoreId !== 'ALL') ? currentStoreId : (stores[0]?.id || ''),
        supplier: '',
        category: '타이어',
        brand: tireBrands[0] || '기타',
        productName: '',
        specification: '',
        quantity: 0,
        factoryPrice: 0
    });
    const [isNewProduct, setIsNewProduct] = useState(false);

    // --- Input Strings for Comma Formatting ---
    const [inputs, setInputs] = useState({
        quantity: '',
        factoryPrice: ''
    });

    // --- Stock In Confirmation Modal State ---
    const [confirmationData, setConfirmationData] = useState<StockInRecord | null>(null);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // --- Verification & History State ---
    const getLocalYearMonth = (): string => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };
    const [selectedMonth, setSelectedMonth] = useState(getLocalYearMonth()); // YYYY-MM
    const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
    // 매장별 입고 데이터 분리: 현재 사용자의 매장으로 자동 설정
    const getInitialStoreFilter = (): string => {
        if (currentUser.role === 'STAFF' && currentStoreId) {
            return currentStoreId;
        }
        if (currentUser.role === 'STORE_ADMIN' && currentStoreId && currentStoreId !== 'ALL') {
            return currentStoreId;
        }
        return 'ALL';
    };
    const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>(getInitialStoreFilter);

    const [verificationImage, setVerificationImage] = useState<string | null>(null);
    const [isComparing, setIsComparing] = useState(false);

    // Lookup for previously entered factory prices by (name + spec)
    const factoryPriceLookup = useMemo(() => {
        const map = new Map<string, number>();
        stockInHistory.forEach(r => {
            if (!r.productName || !r.specification || !r.factoryPrice) return;
            const key = `${r.productName.trim().toLowerCase()}|${r.specification.trim().toLowerCase()}`;
            map.set(key, r.factoryPrice);
        });
        return map;
    }, [stockInHistory]);

    // Update storeId if currentStoreId changes (e.g. on login) or stores load
    useEffect(() => {
        if (currentUser.role === 'STAFF' && currentStoreId) {
            setFormData(prev => ({ ...prev, storeId: currentStoreId }));
            setSelectedStoreFilter(currentStoreId);
        } else if (currentUser.role === 'STORE_ADMIN') {
            // Fix: Ensure a valid store is selected if currently 'ALL' or empty
            setFormData(prev => {
                if ((prev.storeId === 'ALL' || !prev.storeId) && stores.length > 0) {
                    return { ...prev, storeId: stores[0].id };
                }
                return prev;
            });
            // STORE_ADMIN은 자신의 매장만 볼 수 있게
            if (currentStoreId && currentStoreId !== 'ALL') {
                setSelectedStoreFilter(currentStoreId);
            }
        }
    }, [currentStoreId, currentUser, stores]);

    const normalizeName = (str?: string) => (str || '').toLowerCase().replace(/\s+/g, '');
    const normalizeSpec = (str?: string) => (str || '').toLowerCase().replace(/[^0-9]/g, '');

    // Check if product exists when name/spec changes
    useEffect(() => {
        if (!formData.productName) {
            setIsNewProduct(false);
            return;
        }

        const existing = products.find(p => {
            const nameMatch = normalizeName(p.name) === normalizeName(formData.productName);
            if (p.category === '타이어') {
                const specMatch = normalizeSpec(p.specification) === normalizeSpec(formData.specification);
                return nameMatch && specMatch;
            }
            return nameMatch;
        });

        setIsNewProduct(!existing);
    }, [formData.productName, formData.specification, products]);

    // Autofill factory price when model + spec matches previous entry
    useEffect(() => {
        const name = formData.productName.trim();
        const spec = formData.specification.trim();
        if (!name || !spec) return;

        const key = `${name.toLowerCase()}|${spec.toLowerCase()}`;
        const storedPrice = factoryPriceLookup.get(key);
        if (!storedPrice) return;

        // Only auto-fill when user hasn't typed a price yet
        const currentRaw = inputs.factoryPrice.replace(/[^0-9]/g, '');
        if (currentRaw) return;

        const formatted = formatNumber(String(storedPrice));
        setInputs(prev => ({ ...prev, factoryPrice: formatted }));
        setFormData(prev => ({ ...prev, factoryPrice: storedPrice }));
    }, [formData.productName, formData.specification, factoryPriceLookup, inputs.factoryPrice]);



    const handleNumberChange = (field: keyof typeof inputs, value: string) => {
        // Remove non-digits
        const rawValue = value.replace(/[^0-9]/g, '');
        const numValue = Number(rawValue);
        
        setInputs(prev => ({ ...prev, [field]: rawValue === '' ? '' : formatNumber(rawValue) }));
        setFormData(prev => ({ ...prev, [field]: numValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Trim strings before submission
        const trimmedName = formData.productName.trim();
        const trimmedSpec = formData.specification.trim();

        if (!trimmedName || formData.quantity <= 0) {
            alert('상품명과 수량을 올바르게 입력해주세요.');
            return;
        }

        // 타이어는 규격 필수
        if (formData.category === '타이어' && !trimmedSpec) {
            alert('타이어는 규격(사이즈)을 반드시 입력해야 합니다.');
            return;
        }

        // Safety check: If storeId is still empty or ALL (should be fixed by useEffect, but just in case)
        const finalStoreId = formData.storeId === 'ALL' || !formData.storeId ? stores[0]?.id : formData.storeId;

        const matchedProduct = products.find(p => {
            const nameMatch = normalizeName(p.name) === normalizeName(trimmedName);
            const specMatch = normalizeSpec(p.specification) === normalizeSpec(trimmedSpec);
            return p.specification || trimmedSpec ? (nameMatch && specMatch) : nameMatch;
        });
        const record: StockInRecord = {
            id: `IN-${Date.now()}`,
            date: formData.date,
            storeId: finalStoreId,
            productId: matchedProduct?.id,
            supplier: formData.supplier.trim(),
            category: formData.category,
            brand: formData.brand,
            productName: trimmedName,
            specification: trimmedSpec,
            quantity: formData.quantity,
            factoryPrice: formData.factoryPrice, // Use Factory Price
            purchasePrice: 0 // Initialize purchase price to 0 for later admin entry
        };

        // Show confirmation modal instead of directly processing
        setConfirmationData(record);
        setIsConfirmationOpen(true);
    };

    const handleConfirmStockIn = async () => {
        if (!confirmationData || isProcessing) return;

        setIsProcessing(true);
        try {
            // Pass 0 as selling price since input is removed. 
            // New products will have price 0 until updated in Inventory.
            await Promise.resolve(onStockIn(confirmationData, 0));
            
            setFormData(prev => ({
                ...prev,
                productName: '',
                specification: '',
                quantity: 0,
                factoryPrice: 0
            }));
            setInputs({ quantity: '', factoryPrice: '' });
            setIsConfirmationOpen(false);
            setConfirmationData(null);
            alert('입고 처리가 완료되었습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdatePurchasePrice = (record: StockInRecord, val: string) => {
        const rawValue = val.replace(/[^0-9]/g, '');
        const numValue = Number(rawValue);
        // 매입가가 입력되면 factoryPrice도 설정되지 않았다면 그대로 저장
        // 이미 factoryPrice가 있다면, 매입가만 변경 (할인율은 자동 계산됨)
        onUpdateStockInRecord({ ...record, purchasePrice: numValue });
    };

    const handleUpdateDiscountRate = (record: StockInRecord, val: string) => {
        const cleaned = val.replace(/[^0-9.]/g, '');
        if (!cleaned) return;

        const percent = Number(cleaned);
        if (Number.isNaN(percent)) return;

        const boundedPercent = Math.min(Math.max(percent, 0), 100);
        
        // factoryPrice가 있으면 매입가 계산, 없으면 현재 factoryPrice 유지
        if (record.factoryPrice && record.factoryPrice > 0) {
            const newPurchasePrice = Math.round(record.factoryPrice * (1 - boundedPercent / 100));
            onUpdateStockInRecord({ ...record, purchasePrice: newPurchasePrice });
        }
    };

    const handleUpdateQuantity = (record: StockInRecord, val: number) => {
        // Don't allow editing consumed records (from sales)
        if (record.consumedAtSaleId) {
            alert('판매로 소진된 입고 내역은 수정할 수 없습니다.');
            return;
        }
        const newQty = Math.max(0, val);
        onUpdateStockInRecord({ 
            ...record, 
            quantity: newQty,
            receivedQuantity: newQty 
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const imageUrl = URL.createObjectURL(file);
            setVerificationImage(imageUrl);
            setIsComparing(true); // Auto open comparison when uploaded
        }
    };

    // --- Derived Data ---

    // 1. Autocomplete Data
    const uniqueSuppliers = useMemo(() => 
        Array.from(new Set(stockInHistory.map(r => r.supplier).filter(s => s && s.trim() !== '' && s !== '판매소진')))
    , [stockInHistory]);

    const sortedProductNames = useMemo(() => {
        // Only names that have been used/registered (history + catalog)
        const historyNames = stockInHistory
            .map(r => r.productName?.trim())
            .filter((name): name is string => !!name);

        const productNames = products
            .map(p => p.name?.trim())
            .filter((name): name is string => !!name);

        return Array.from(new Set([...historyNames, ...productNames]));
    }, [stockInHistory, products]);

    const uniqueSpecs = useMemo(() => 
        Array.from(new Set(products.map(p => p.specification).filter(Boolean) as string[]))
    , [products]);

    // 2. Filtered History by Month, Supplier, and Store
    const filteredHistory = useMemo(() => {
        return stockInHistory.filter(record => {
            const matchesMonth = record.date.startsWith(selectedMonth);
            const matchesSupplier = selectedSupplier === 'ALL' || record.supplier === selectedSupplier;
            const matchesStore = selectedStoreFilter === 'ALL' || record.storeId === selectedStoreFilter;
            // Hide only auto-generated consumption logs; show sales-origin instant stock-ins
            const isConsumptionLog = record.id?.startsWith('IN-CONSUME-') || record.supplier === '판매소진';
            return matchesMonth && matchesSupplier && matchesStore && !isConsumptionLog;
        });
    }, [stockInHistory, selectedMonth, selectedSupplier, selectedStoreFilter]);

    // 3. Monthly Totals
    const monthlyTotals = useMemo(() => {
        return filteredHistory.reduce((acc, curr) => {
            const qty = curr.receivedQuantity ?? curr.quantity;
            return {
                qty: acc.qty + qty,
                cost: acc.cost + (curr.purchasePrice || 0) * qty
            };
        }, { qty: 0, cost: 0 });
    }, [filteredHistory]);

    // Calculation of Discount Rate Badge
    const getDiscountPercent = (factoryPrice: number, purchasePrice: number) => {
        if (!factoryPrice || !purchasePrice) return '';
        const discount = ((factoryPrice - purchasePrice) / factoryPrice) * 100;
        if (discount < 0) return '0.0';
        return discount.toFixed(1);
    };

    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-full gap-4 lg:overflow-hidden">
             {/* Left Panel: Input Form */}
            <div className="w-full lg:w-[340px] flex flex-col gap-4 flex-shrink-0 min-h-0 lg:overflow-y-auto pb-10 border-b lg:border-b-0 lg:border-r border-gray-200 pr-0 lg:pr-2">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                        <Truck className="text-blue-600" size={20} />
                        <h2 className="text-lg font-bold text-gray-800">입고 등록</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">입고 정보</label>
                            <div className="flex flex-col gap-2 mb-2">
                                <input 
                                    type="date" 
                                    required
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                />
                                {currentUser.role === 'STORE_ADMIN' ? (
                                    <select 
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                        value={formData.storeId}
                                        onChange={e => setFormData({...formData, storeId: e.target.value})}
                                    >
                                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                ) : (
                                    <div className="w-full p-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 font-bold flex items-center">
                                        {stores.find(s => s.id === currentStoreId)?.name || '지점 미선택'}
                                    </div>
                                )}
                            </div>
                            <input 
                                type="text" 
                                list="supplier-list"
                                placeholder="거래처명 (예: 넥센물류)"
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                value={formData.supplier}
                                onChange={e => setFormData({...formData, supplier: e.target.value})}
                            />
                            <datalist id="supplier-list">{uniqueSuppliers.map(s => <option key={s} value={s} />)}</datalist>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase">상품 정보</label>
                            
                            {/* NEW ORDER: Category -> Spec -> Brand -> Model */}
                            
                            {/* 1. Category */}
                            <select 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            {/* 2. Specification (Priority) */}
                            <div className="w-full">
                                <label className="block text-xs font-medium text-gray-500 mb-1">규격 (Size)</label>
                                <input 
                                    type="text" 
                                    list="product-specs"
                                    placeholder="예: 245/45R18 (2454518 입력가능)"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold text-blue-800"
                                    value={formData.specification}
                                    onChange={e => {
                                        let val = e.target.value;
                                        // Check if val is purely numeric and length 7 (e.g. 2454518)
                                        if (/^\d{7}$/.test(val)) {
                                            // Attempt to find a match in existing uniqueSpecs
                                            const found = uniqueSpecs.find(s => s.replace(/\D/g, '') === val);
                                            if (found) {
                                                val = found;
                                            } else {
                                                    // Fallback formatting
                                                    val = `${val.slice(0, 3)}/${val.slice(3, 5)}R${val.slice(5, 7)}`;
                                            }
                                        }
                                        setFormData({...formData, specification: val});
                                    }}
                                />
                                <datalist id="product-specs">{uniqueSpecs.map(spec => <option key={spec} value={spec} />)}</datalist>
                            </div>

                            {/* 3. Brand */}
                            <div className="w-full">
                                <label className="block text-xs font-medium text-gray-500 mb-1">브랜드</label>
                                <select 
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                    value={formData.brand}
                                    onChange={e => setFormData({...formData, brand: e.target.value})}
                                >
                                    {tireBrands.map(b => <option key={b} value={b}>{b}</option>)}
                                    <option value="기타">기타</option>
                                </select>
                            </div>

                            {/* 4. Model Name */}
                            <div className="w-full">
                                <label className="block text-xs font-medium text-gray-500 mb-1">모델명</label>
                                <input 
                                    type="text" 
                                    required
                                    list="product-names"
                                    placeholder="모델명 검색/입력"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                    value={formData.productName}
                                    onChange={e => setFormData({...formData, productName: e.target.value})}
                                />
                                <datalist id="product-names">
                                    {sortedProductNames.map(name => <option key={name} value={name} />)}
                                </datalist>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                             <div className="flex flex-col gap-2">
                                {/* Factory Price Input */}
                                <div className="w-full">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                        <Tag size={12}/> 공장도가 (정가)
                                    </label>
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        placeholder="0"
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                        value={inputs.factoryPrice}
                                        onChange={e => handleNumberChange('factoryPrice', e.target.value)}
                                    />
                                </div>

                                <div className="w-full">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">수량</label>
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        required
                                        placeholder="0"
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold"
                                        value={inputs.quantity}
                                        onChange={e => handleNumberChange('quantity', e.target.value)}
                                    />
                                </div>
                             </div>

                            {isNewProduct && (
                                <div className="animate-fade-in mt-2 bg-blue-50 p-2 rounded text-xs text-blue-700 flex gap-1">
                                    <AlertCircle size={14} /> 신규 상품으로 자동 등록됩니다. (판매가는 재고관리에서 설정해주세요)
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit"
                            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-md mt-2"
                        >
                            <Save size={18} />
                            입고 처리
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Panel: History & Verification */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-auto lg:h-full min-h-[500px] relative">
                
                {/* Header Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 shrink-0 z-20 relative">
                     <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                        <h3 className="font-bold text-gray-800 whitespace-nowrap mr-2">입고 내역 조회</h3>
                        
                        {/* Month Filter */}
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                            <Calendar size={16} className="text-gray-500" />
                            <input 
                                type="month" 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="text-sm font-bold text-gray-700 outline-none bg-transparent cursor-pointer"
                            />
                        </div>

                        {/* Store Filter (Admin Only) */}
                        {isAdminView && (
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                <StoreIcon size={16} className="text-gray-500" />
                                {currentUser.role === 'SUPER_ADMIN' ? (
                                    <select
                                        value={selectedStoreFilter}
                                        onChange={(e) => setSelectedStoreFilter(e.target.value)}
                                        className="text-sm font-bold text-gray-700 outline-none bg-transparent cursor-pointer appearance-none pr-4"
                                    >
                                        <option value="ALL">전체 지점</option>
                                        {stores.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="text-sm font-bold text-gray-700">
                                        {stores.find(s => s.id === selectedStoreFilter)?.name || selectedStoreFilter}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Supplier Filter */}
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                            <Filter size={16} className="text-gray-500" />
                            <select
                                value={selectedSupplier}
                                onChange={(e) => setSelectedSupplier(e.target.value)}
                                className="text-sm font-bold text-gray-700 outline-none bg-transparent cursor-pointer appearance-none pr-4"
                            >
                                <option value="ALL">전체 거래처</option>
                                {uniqueSuppliers.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                     </div>

                     <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <input 
                            type="file" 
                            id="verification-upload" 
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                        
                        {/* Compare Toggle Button */}
                        {verificationImage && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsComparing(!isComparing)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                        isComparing 
                                        ? 'bg-blue-600 text-white shadow-blue-200' 
                                        : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50'
                                    }`}
                                >
                                    {isComparing ? <Split size={14} /> : <Eye size={14} />}
                                    {isComparing ? '비교 모드 끄기' : '비교 모드 켜기'}
                                </button>
                                <button 
                                    onClick={() => {
                                        setVerificationImage(null);
                                        setIsComparing(false);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                     </div>
                </div>

                {/* Split View Content */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative">
                    
                    {/* Left Side of Split: System List */}
                    <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 min-h-[300px] ${isComparing ? 'lg:border-r lg:border-gray-200' : ''}`}>
                        {/* Table Container with Sticky Bottom Scroll */}
                        <div className="flex-1 overflow-auto bg-white relative">
                            <table className="min-w-full text-sm text-left border-collapse relative">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap bg-gray-50">날짜</th>
                                        <th className="px-4 py-3 whitespace-nowrap bg-gray-50">거래처</th>
                                        <th className="px-4 py-3 whitespace-nowrap bg-gray-50">상품</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap bg-gray-50">입고수량</th>
                                        {isAdminView && (
                                            <>
                                                <th className="px-4 py-3 whitespace-nowrap bg-gray-50 text-right">공장도가</th>
                                                <th className="px-4 py-3 whitespace-nowrap bg-gray-50 text-center">매입가 · 할인율(%)</th>
                                                <th className="px-4 py-3 whitespace-nowrap bg-gray-50 text-right">총 매입가</th>
                                                <th className="px-4 py-3 whitespace-nowrap bg-gray-50 text-center">관리</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={isAdminView ? 8 : 4} className="px-6 py-12 text-center text-gray-400">
                                                <Search size={32} className="mx-auto mb-2 opacity-20" />
                                                {selectedMonth} 내역이 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredHistory.map(record => (
                                            <tr key={record.id} className="hover:bg-blue-50 transition-colors group">
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap align-middle">
                                                    {record.date.slice(5)}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap align-middle max-w-[120px] truncate">
                                                    {record.supplier}
                                                </td>
                                                <td className="px-4 py-3 align-middle whitespace-nowrap">
                                                    <div className="text-gray-900 font-medium truncate max-w-[160px]" title={record.productName}>{record.productName}</div>
                                                    <div className="text-xs text-gray-500">{record.specification}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                                                    {isAdminView && !record.consumedAtSaleId ? (
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            className="w-16 p-1 text-sm border border-gray-300 rounded text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold bg-blue-50 focus:bg-white text-blue-600"
                                                            value={record.receivedQuantity ?? record.quantity}
                                                            onChange={(e) => handleUpdateQuantity(record, Number(e.target.value))}
                                                            title="입고 수량 수정"
                                                        />
                                                    ) : (
                                                        <span className="font-bold text-blue-600">+{record.receivedQuantity ?? record.quantity}</span>
                                                    )}
                                                </td>
                                                {isAdminView && (
                                                    <>
                                                        <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap align-middle">
                                                            {formatCurrency(record.factoryPrice || 0)}
                                                        </td>
                                                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <input 
                                                                    type="text" 
                                                                    inputMode="numeric"
                                                                    className="w-20 p-1 text-xs border border-gray-300 rounded text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold bg-gray-50 focus:bg-white"
                                                                    value={record.purchasePrice ? formatNumber(record.purchasePrice) : ''}
                                                                    placeholder="0"
                                                                    onChange={(e) => handleUpdatePurchasePrice(record, e.target.value)}
                                                                    title="매입가 입력 (factoryPrice 있으면 할인율에서 자동 계산)"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    className={`w-16 p-1 text-[11px] border rounded text-center font-bold focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                                                                        record.factoryPrice && record.factoryPrice > 0 
                                                                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                                            : 'bg-gray-50 text-gray-500 border-gray-200'
                                                                    }`}
                                                                    value={getDiscountPercent(record.factoryPrice || 0, record.purchasePrice || 0)}
                                                                    placeholder="%"
                                                                    onChange={(e) => handleUpdateDiscountRate(record, e.target.value)}
                                                                    title={record.factoryPrice && record.factoryPrice > 0 ? "할인율 입력 시 매입가가 자동 계산됩니다" : "공장도가가 필요합니다"}
                                                                    disabled={!record.factoryPrice || record.factoryPrice <= 0}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-800 whitespace-nowrap align-middle">
                                                            {formatCurrency((record.purchasePrice || 0) * (record.receivedQuantity ?? record.quantity))}
                                                        </td>
                                                        <td className="px-4 py-3 text-center whitespace-nowrap align-middle">
                                                            <button
                                                                onClick={() => {
                                                                    const confirmed = window.confirm('이 입고 내역을 삭제하시겠습니까? 재고는 자동으로 조정되지 않습니다.');
                                                                    if (!confirmed) return;
                                                                    onDeleteStockInRecord(record.id);
                                                                }}
                                                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                title="입고 내역 삭제"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Monthly Footer Summary */}
                        <div className="p-4 bg-slate-50 border-t border-gray-200 flex justify-between items-center shrink-0 z-20">
                            <span className="text-xs font-bold text-gray-500 uppercase">{selectedMonth} 합계</span>
                            <div className="text-right">
                                <div className="text-sm text-gray-700">총 입고 수량: <span className="font-bold text-blue-600">{monthlyTotals.qty}개</span></div>
                                {isAdminView && (
                                    <div className="text-sm text-rose-600">총 매입: <span className="font-bold">{formatCurrency(monthlyTotals.cost)}</span></div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side of Split: Verification Image */}
                    {isComparing && verificationImage && (
                        <div className="flex-1 bg-gray-100 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-200 animate-slide-in-right min-h-[300px]">
                            <div className="p-2 bg-white border-b border-gray-200 flex justify-between items-center shrink-0">
                                <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                    <FileUp size={12} /> 업로드된 마감자료
                                </span>
                            </div>
                            <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-slate-200/50 min-h-0">
                                <img 
                                    src={verificationImage} 
                                    alt="Verification Document" 
                                    className="max-w-full shadow-lg rounded border border-gray-300" 
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Floating Upload Button - Moved Up to bottom-24 */}
                {!verificationImage && (
                    <label 
                        htmlFor="verification-upload"
                        className="absolute bottom-24 right-6 h-14 w-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-transform hover:scale-105 z-30 cursor-pointer"
                        title="마감자료 업로드"
                    >
                        <FileUp size={24} />
                    </label>
                )}
            </div>

            {/* Stock In Confirmation Modal */}
            {isConfirmationOpen && confirmationData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-6 animate-scale-in">
                        <div className="flex items-start gap-3">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <AlertCircle size={24} className="text-blue-600"/>
                                    입고 내용 확인
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">아래 내용이 맞는지 확인 후 진행해주세요</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setIsConfirmationOpen(false);
                                    setConfirmationData(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 p-1"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        <div className="space-y-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                            {/* Date */}
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <span className="text-sm font-semibold text-gray-600">입고 날짜</span>
                                <span className="text-sm font-bold text-gray-800">{confirmationData.date}</span>
                            </div>

                            {/* Store */}
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <span className="text-sm font-semibold text-gray-600">매장</span>
                                <span className="text-sm font-bold text-gray-800">{stores.find(s => s.id === confirmationData.storeId)?.name || '알 수 없음'}</span>
                            </div>

                            {/* Supplier */}
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <span className="text-sm font-semibold text-gray-600">입고처</span>
                                <span className="text-sm font-bold text-gray-800">{confirmationData.supplier || '-'}</span>
                            </div>

                            {/* Category & Brand */}
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <span className="text-sm font-semibold text-gray-600">카테고리</span>
                                <span className="text-sm font-bold text-gray-800">{confirmationData.category} / {confirmationData.brand}</span>
                            </div>

                            {/* Product Name */}
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <span className="text-sm font-semibold text-gray-600">상품명</span>
                                <span className="text-sm font-bold text-gray-800 text-right max-w-xs">{confirmationData.productName}</span>
                            </div>

                            {/* Specification */}
                            {confirmationData.specification && (
                                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                    <span className="text-sm font-semibold text-gray-600">규격</span>
                                    <span className="text-sm font-bold text-gray-800">{confirmationData.specification}</span>
                                </div>
                            )}

                            {/* Quantity */}
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <span className="text-sm font-semibold text-gray-600">수량</span>
                                <span className="text-sm font-bold text-blue-600">{formatNumber(confirmationData.quantity)} 개</span>
                            </div>

                            {/* Factory Price */}
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-600">원가</span>
                                <span className="text-sm font-bold text-blue-600">{formatCurrency(confirmationData.factoryPrice)}</span>
                            </div>

                            {/* Total */}
                            <div className="flex justify-between items-center pt-2 border-t-2 border-blue-200 mt-2">
                                <span className="text-sm font-bold text-gray-700">합계</span>
                                <span className="text-lg font-bold text-blue-700">{formatCurrency(confirmationData.quantity * (confirmationData.factoryPrice || 0))}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setIsConfirmationOpen(false);
                                    setConfirmationData(null);
                                }}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirmStockIn}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        처리 중...
                                    </>
                                ) : (
                                    '입고 처리'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockIn;

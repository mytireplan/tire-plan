
import React, { useState, useEffect, useMemo } from 'react';
import type { StockInRecord, Store, Product, User } from '../types';
import { Truck, Calendar, Save, AlertCircle, FileUp, Split, Filter, Tag, Store as StoreIcon, Eye, X, Search } from 'lucide-react';
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
    tireModels: Record<string, string[]>;
}

const StockIn: React.FC<StockInProps> = ({ stores, categories, tireBrands, products, onStockIn, currentUser, stockInHistory, currentStoreId, onUpdateStockInRecord, tireModels: _unusedTireModels }) => {
    // --- Form State ---
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
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

    // --- Verification & History State ---
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
    const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('ALL'); // New Store Filter

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
        } else if (currentUser.role === 'STORE_ADMIN') {
            // Fix: Ensure a valid store is selected if currently 'ALL' or empty
            setFormData(prev => {
                if ((prev.storeId === 'ALL' || !prev.storeId) && stores.length > 0) {
                    return { ...prev, storeId: stores[0].id };
                }
                return prev;
            });
        }
    }, [currentStoreId, currentUser, stores]);

    // Check if product exists when name/spec changes
    useEffect(() => {
        if (!formData.productName) {
            setIsNewProduct(false);
            return;
        }

        const normalize = (str: string | undefined) => (str || '').trim().toLowerCase();
        
        const existing = products.find(p => {
            const nameMatch = normalize(p.name) === normalize(formData.productName);
            if (p.category === '타이어') {
                const specMatch = normalize(p.specification) === normalize(formData.specification);
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

        // Safety check: If storeId is still empty or ALL (should be fixed by useEffect, but just in case)
        const finalStoreId = formData.storeId === 'ALL' || !formData.storeId ? stores[0]?.id : formData.storeId;

        const record: StockInRecord = {
            id: `IN-${Date.now()}`,
            date: formData.date,
            storeId: finalStoreId,
            supplier: formData.supplier.trim(),
            category: formData.category,
            brand: formData.brand,
            productName: trimmedName,
            specification: trimmedSpec,
            quantity: formData.quantity,
            factoryPrice: formData.factoryPrice, // Use Factory Price
            purchasePrice: 0 // Initialize purchase price to 0 for later admin entry
        };

        // Pass 0 as selling price since input is removed. 
        // New products will have price 0 until updated in Inventory.
        onStockIn(record, 0);
        
        setFormData(prev => ({
            ...prev,
            productName: '',
            specification: '',
            quantity: 0,
            factoryPrice: 0
        }));
        setInputs({ quantity: '', factoryPrice: '' });
        alert('입고 처리가 완료되었습니다.');
    };

    const handleUpdatePurchasePrice = (record: StockInRecord, val: string) => {
        const rawValue = val.replace(/[^0-9]/g, '');
        const numValue = Number(rawValue);
        onUpdateStockInRecord({ ...record, purchasePrice: numValue });
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
        Array.from(new Set(stockInHistory.map(r => r.supplier).filter(s => s && s.trim() !== '')))
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
            return matchesMonth && matchesSupplier && matchesStore;
        });
    }, [stockInHistory, selectedMonth, selectedSupplier, selectedStoreFilter]);

    // 3. Monthly Totals
    const monthlyTotals = useMemo(() => {
        return filteredHistory.reduce((acc, curr) => ({
            qty: acc.qty + curr.quantity,
            cost: acc.cost + (curr.purchasePrice || 0) * curr.quantity
        }), { qty: 0, cost: 0 });
    }, [filteredHistory]);

    // Calculation of Discount Rate Badge
    const getDiscountBadge = (factoryPrice: number, purchasePrice: number) => {
        if (!factoryPrice || !purchasePrice) return null;
        const discount = ((factoryPrice - purchasePrice) / factoryPrice) * 100;
        if (discount <= 0) return null;

        return (
            <div className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100 text-center whitespace-nowrap">
                {discount.toFixed(1)}%
            </div>
        );
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
                        {currentUser.role === 'STORE_ADMIN' && (
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                <StoreIcon size={16} className="text-gray-500" />
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
                                        {currentUser.role === 'STORE_ADMIN' && (
                                            <>
                                                <th className="px-4 py-3 whitespace-nowrap bg-gray-50 text-right">공장도가</th>
                                                <th className="px-4 py-3 whitespace-nowrap bg-gray-50 text-center">매입가(입력)</th>
                                                <th className="px-4 py-3 whitespace-nowrap bg-gray-50 text-right">총 매입가</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={currentUser.role === 'STORE_ADMIN' ? 7 : 4} className="px-6 py-12 text-center text-gray-400">
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
                                                <td className="px-4 py-3 text-center font-bold text-blue-600 align-middle whitespace-nowrap">
                                                    +{record.quantity}
                                                </td>
                                                {currentUser.role === 'STORE_ADMIN' && (
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
                                                                />
                                                                {getDiscountBadge(record.factoryPrice || 0, record.purchasePrice || 0)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-800 whitespace-nowrap align-middle">
                                                            {formatCurrency((record.purchasePrice || 0) * record.quantity)}
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
                                {currentUser.role === 'STORE_ADMIN' && (
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
        </div>
    );
};

export default StockIn;

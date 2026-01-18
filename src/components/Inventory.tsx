
import React, { useState, useMemo } from 'react';
import type { Product, Store, User } from '../types';
import { Search, Plus, Edit2, Save, X, AlertTriangle, MapPin, ArrowRightLeft, Disc, Trash2 } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';
import { saveToFirestore, deleteFromFirestore, COLLECTIONS } from '../utils/firestore';

interface InventoryProps {
  products: Product[];
  stores: Store[];
  categories: string[];
    tireBrands: string[];
  onUpdate: (product: Product) => void;
  onAdd: (product: Product) => void;
    onDelete: (productId: string) => void;
  onAddCategory: (category: string) => void;
  currentUser: User;
  currentStoreId: string;
  onStockTransfer: (productId: string, fromStoreId: string, toStoreId: string, quantity: number) => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, stores, categories, tireBrands, onUpdate, onAdd, onDelete, onAddCategory, currentUser, currentStoreId, onStockTransfer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
    const normalizeCategory = (category?: string) => category === '부품/수리' ? '기타' : (category || '기타');
  
  // Low Stock Logic
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(3);
    const [hideZeroStock, setHideZeroStock] = useState(false);
  
  // Category Management State
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Transfer State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
      productId: '',
      fromStoreId: '',
      toStoreId: '',
      quantity: 1
  });

  const ownerIdForProduct = useMemo(() => {
      if (currentUser.role === 'SUPER_ADMIN') {
          const owner = stores.find(s => s.id === currentStoreId)?.ownerId;
          return owner || currentUser.id || '';
      }
      return currentUser.id;
  }, [currentUser, stores, currentStoreId]);

  // Calculate Total Tire Stock for the current view context
    const totalTireStock = useMemo(() => {
        return products.reduce((sum, p) => {
                const category = normalizeCategory(p.category);
                const totalStock = p.stock || 0;
                const isService = category !== '타이어' || totalStock > 900;
                if (isService) return sum;

                const stockByStore = p.stockByStore || {};
                const viewStock = (currentStoreId === 'ALL' || !currentStoreId)
                    ? totalStock
                    : (stockByStore[currentStoreId] || 0);

                return sum + (viewStock || 0);
        }, 0);
    }, [products, currentStoreId]);

  const currentStoreName = useMemo(() => {
    if (currentStoreId === 'ALL' || !currentStoreId) return '전체 매장';
    return stores.find(s => s.id === currentStoreId)?.name || '해당 지점';
  }, [currentStoreId, stores]);

        const uniqueBrands = useMemo(() => {
            const fromProducts = products
                .map(p => p.brand?.trim())
                .filter((b): b is string => !!b && b.length > 0);
            const base = tireBrands || [];
            const all = [...base, ...fromProducts, '기타'];
            return Array.from(new Set(all));
        }, [products, tireBrands]);

    const ownerScopedProducts = useMemo(() => {
        // SUPER_ADMIN with ALL: show everything
        if (currentUser.role === 'SUPER_ADMIN' && (currentStoreId === 'ALL' || !currentStoreId)) return products;

        // Show products matching current owner (allow empty ownerId for products without owner)
        return products.filter(p => !p.ownerId || p.ownerId === ownerIdForProduct);
    }, [products, currentUser, currentStoreId, ownerIdForProduct]);

    const filteredProducts = ownerScopedProducts
        .map(p => ({ ...p, category: normalizeCategory(p.category), stockByStore: p.stockByStore || {} }))
        .filter(p => {
    const lowerTerm = (searchTerm || '').toLowerCase();
    // Create a version of the search term with only numbers for flexible spec matching (e.g. "2454518")
    const numericSearchTerm = lowerTerm.replace(/\D/g, '');

    const normalizedName = (p.name || '').toLowerCase();
    const normalizedCategory = (p.category || '').toLowerCase();
    const matchesNameOrCategory = normalizedName.includes(lowerTerm) || 
                                  normalizedCategory.includes(lowerTerm);
    
    let matchesSpec = false;
    if (p.specification) {
        const lowerSpec = p.specification.toLowerCase();
        // 1. Standard exact match (e.g. user types "245/45" or "R18")
        if (lowerSpec.includes(lowerTerm)) {
            matchesSpec = true;
        } 
        // 2. Flexible numeric match (e.g. user types "2454518" for "245/45R18")
        else if (numericSearchTerm.length > 0) {
             const numericSpec = lowerSpec.replace(/\D/g, ''); // Remove /, R, Z, etc. from product spec
             if (numericSpec.includes(numericSearchTerm)) {
                 matchesSpec = true;
             }
        }
    }

        // 검색어가 없으면 모든 항목 표시, 있으면 검색 결과만 표시
        const matchesSearch = !lowerTerm || matchesNameOrCategory || matchesSpec;

        const totalStock = p.stock ?? 0;
        const viewStock = currentStoreId === 'ALL' || !currentStoreId ? totalStock : (p.stockByStore[currentStoreId] || 0);

    // Logic: Service items (category '기타' or high sentinel stock) are never "low stock"
        const isServiceItem = p.category === '기타' || totalStock > 900;
        const isLowStock = !isServiceItem && viewStock <= lowStockThreshold;
    
        // 기타 항목은 hideZeroStock 필터 무시 (수량 상관없이 표시)
        if (hideZeroStock && viewStock === 0 && p.category !== '기타') return false;
    if (filterLowStock && !isLowStock) return false;
    
    return matchesSearch;
  });

const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingProduct.name || editingProduct.price === undefined) return;

  // 타이어는 규격(사이즈) 필수
  if ((editingProduct.category || categories[0]) === '타이어') {
      const spec = (editingProduct.specification || '').trim();
      if (!spec) {
          alert('타이어는 규격(사이즈)을 반드시 입력해야 합니다.');
          return;
      }
  }

  // Calculate total stock from store inputs
    const rawStockByStore: Record<string, number> = editingProduct.stockByStore || {};
    const stockByStore: Record<string, number> = {};
    stores.forEach(s => {
        const val = rawStockByStore[s.id];
        stockByStore[s.id] = Number.isFinite(val) ? Number(val) : 0;
    });
    const totalStock = (Object.values(stockByStore) as number[]).reduce((a, b) => a + b, 0);

    const price = Number(editingProduct.price ?? 0);
    const specification = editingProduct.specification ?? '';

  const productToSave: Product = {
    id: editingProduct.id || Date.now().toString(),
    name: editingProduct.name,
        price,
    stock: totalStock,
    stockByStore: stockByStore,
    category: editingProduct.category || categories[0],
        specification,
        brand: (editingProduct.brand || '기타')?.trim(),
        // 반드시 ownerId 설정 (새 항목은 항상 현재 사용자 소유)
        ownerId: editingProduct.id ? (editingProduct.ownerId || ownerIdForProduct) : ownerIdForProduct
  };

  try {
    // 🔥 Firestore에 저장 (products 컬렉션)
    await saveToFirestore<Product>(COLLECTIONS.PRODUCTS, productToSave);
    console.log('✅ Firestore 저장 완료:', productToSave.id);
  } catch (error) {
    console.error('❌ Firestore 저장 중 오류:', error);
    alert('Firebase 저장 중 오류가 발생했어요. 콘솔을 확인해주세요.');
  }

  // 기존 로컬 상태 업데이트는 그대로 유지
  if (editingProduct.id) {
    onUpdate(productToSave);
  } else {
    onAdd(productToSave);
  }
  setIsModalOpen(false);
  setEditingProduct({});
};

  const handleAddCategorySubmit = () => {
    if (newCategoryName.trim()) {
        onAddCategory(newCategoryName.trim());
        setNewCategoryName('');
        setShowCategoryInput(false);
    }
  };

  const openEdit = (product: Product) => {
      setEditingProduct(JSON.parse(JSON.stringify(product))); // Deep copy
      setIsModalOpen(true);
  };

  const openAdd = () => {
      const initialStockByStore: Record<string, number> = {};
      stores.forEach(s => initialStockByStore[s.id] = 0);
      // Keep brand empty so the datalist shows all options instead of filtering to '기타'
      setEditingProduct({ category: categories[0], stock: 0, stockByStore: initialStockByStore, ownerId: ownerIdForProduct, brand: '' });
      setIsModalOpen(true);
  };

  const openTransfer = (product: Product) => {
      // Default From: Current Store (if staff) or First Store
      const defaultFrom = currentUser.role === 'STAFF' ? currentStoreId : stores[0]?.id;
      const defaultTo = stores.find(s => s.id !== defaultFrom)?.id || '';
      
      setTransferData({
          productId: product.id,
          fromStoreId: defaultFrom || '',
          toStoreId: defaultTo,
          quantity: 1
      });
      setTransferModalOpen(true);
  };

  const submitTransfer = () => {
      if (transferData.fromStoreId === transferData.toStoreId) {
          alert('출고 지점과 입고 지점이 같습니다.');
          return;
      }
      onStockTransfer(transferData.productId, transferData.fromStoreId, transferData.toStoreId, transferData.quantity);
      setTransferModalOpen(false);
  };

  const handleDeleteProduct = async (product: Product) => {
      if (currentUser.role === 'STAFF') return;
      const confirmed = window.confirm(`'${product.name}' 상품을 삭제하시겠습니까? 삭제해도 기존 매출 기록은 유지됩니다.`);
      if (!confirmed) return;

      try {
          await deleteFromFirestore(COLLECTIONS.PRODUCTS, product.id);
          onDelete(product.id);
      } catch (error) {
          console.error('❌ Firestore 삭제 중 오류:', error);
          alert('상품 삭제 중 오류가 발생했어요. 콘솔을 확인해주세요.');
      }
  };

  const handleStoreStockChange = (storeId: string, val: number) => {
      // 사장/슈퍼어드민은 직접 조정 가능, 직원은 불가
      if (currentUser.role === 'STAFF') return;

      setEditingProduct(prev => ({
          ...prev,
          stockByStore: {
              ...prev.stockByStore,
              [storeId]: val
          }
      }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="타이어 모델명, 사이즈(예: 2454518) 검색" 
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => {
                        let val = e.target.value;
                        // Auto format only if 7 digit number and looks like spec
                        if (/^\d{7}$/.test(val)) {
                            val = `${val.slice(0, 3)}/${val.slice(3, 5)}R${val.slice(5, 7)}`;
                        }
                        setSearchTerm(val);
                    }}
                />
            </div>
            
            {/* Total Tire Stock Badge */}
            <div className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-md border border-slate-700">
                <Disc size={18} className="text-blue-400" />
                <span className="text-sm font-bold">
                    {currentStoreName} 타이어 총 재고: <span className="text-blue-400 text-lg ml-1">{formatNumber(totalTireStock)}</span>개
                </span>
            </div>

            {/* Low Stock Config & Filter */}
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                     <div className="flex items-center pl-2 pr-2 gap-2 border-r border-gray-300 mr-1">
                            <span className="text-xs text-gray-500 whitespace-nowrap font-medium">기준:</span>
                            <input 
                                type="number" 
                                min="1" 
                                max="100"
                                value={lowStockThreshold}
                                onChange={(e) => setLowStockThreshold(Math.max(1, Number(e.target.value)))}
                                className="w-12 bg-white border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:border-blue-500 text-center"
                            />
                            <span className="text-xs text-gray-500 whitespace-nowrap">개 이하시 부족</span>
                </div>
                <button
                    onClick={() => setFilterLowStock(!filterLowStock)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        filterLowStock 
                        ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    <AlertTriangle size={14} />
                    <span className="hidden sm:inline">부족 알림</span>
                </button>
                <button
                    onClick={() => setHideZeroStock(!hideZeroStock)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        hideZeroStock 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    <span className="hidden sm:inline">재고 0 숨기기</span>
                </button>
            </div>
        </div>

        <button 
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 w-full sm:w-auto justify-center"
        >
            <Plus size={18} />
            <span className="font-medium">신규 등록</span>
        </button>
      </div>

      {/* Table Header (Desktop Only) */}
      <div className="hidden md:grid grid-cols-12 bg-gray-50 px-6 py-3 text-xs font-bold text-gray-500 border-b border-gray-100">
        <div className="col-span-3">상품 정보</div>
        <div className="col-span-2">카테고리</div>
        <div className="col-span-2">공장도가/단가</div>
        <div className="col-span-4">지점별 재고</div>
        <div className="col-span-1 text-right">관리</div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto p-2 md:p-0">
        {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Search size={48} className="opacity-20 mb-4" />
                <p>검색 결과가 없습니다.</p>
            </div>
        ) : (
            filteredProducts.map(product => {
                const category = normalizeCategory(product.category);
                const totalStock = product.stock || 0;
                const viewStock = currentStoreId === 'ALL' || !currentStoreId ? totalStock : (product.stockByStore[currentStoreId] || 0);
                const isService = category === '기타' || totalStock > 900;
                const isLowStock = !isService && viewStock <= lowStockThreshold;

                return (
                    <div 
                        key={product.id} 
                        className={`relative flex flex-col md:grid md:grid-cols-12 md:items-center px-4 md:px-6 py-4 border-b border-gray-100 transition-colors hover:bg-gray-50 gap-2 md:gap-0 rounded-lg md:rounded-none bg-white shadow-sm md:shadow-none mb-2 md:mb-0
                            ${isLowStock ? 'bg-rose-50/50 hover:bg-rose-50 border border-rose-100' : 'border border-gray-100 md:border-0'}
                        `}
                    >
                        {/* Mobile: Edit Button Positioned Absolute */}
                        <div className="md:hidden absolute top-2 right-2 flex gap-1">
                            <button 
                                onClick={() => openEdit(product)}
                                className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg"
                                title="수정"
                            >
                                <Edit2 size={16} />
                            </button>
                            {currentUser.role !== 'STAFF' && (
                                <button 
                                    onClick={() => handleDeleteProduct(product)}
                                    className="p-2 text-gray-400 hover:text-rose-600 bg-gray-50 rounded-lg"
                                    title="삭제"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        {/* Name & Spec */}
                        <div className="md:col-span-3 pr-2">
                            <div className="flex items-start justify-between md:justify-start md:items-center gap-2">
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                                     {isLowStock && <div className="flex items-center gap-1 text-rose-500 text-xs font-bold"><AlertTriangle size={12} />재고부족</div>}
                                     <div className="font-bold text-gray-900 text-lg md:text-sm leading-tight" title={product.name}>{product.name}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                {product.brand && product.brand !== '기타' && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">{product.brand}</span>
                                )}
                                {product.specification && <div className="text-sm md:text-xs text-blue-600 font-bold">{product.specification}</div>}
                            </div>
                        </div>
                        
                        {/* Category */}
                        <div className="md:col-span-2 text-sm text-gray-600 flex items-center gap-2 md:block">
                            <span className="md:hidden text-xs text-gray-400">카테고리:</span>
                            <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">{category}</span>
                        </div>

                        {/* Price */}
                        <div className="md:col-span-2 text-sm font-medium text-gray-900 flex flex-col gap-0.5">
                             <div className="flex items-center gap-2">
                                 <span className="md:hidden text-xs text-gray-400">공장도가:</span>
                                 <span className="text-gray-600">{formatCurrency(product.factoryPrice || 0)}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                 <span className="md:hidden text-xs text-gray-400">판매단가:</span>
                                 <span className="font-bold">{formatCurrency(product.price)}</span>
                             </div>
                        </div>

                        {/* Stock by Store */}
                        <div className="md:col-span-4 flex gap-2 flex-wrap mt-2 md:mt-0 items-center">
                            {stores.map(store => {
                                const stock = product.stockByStore[store.id] || 0;
                                const isStoreLow = !isService && stock <= lowStockThreshold; 
                                return (
                                    <div key={store.id} className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${
                                        isStoreLow 
                                            ? 'bg-white border-rose-200 text-rose-700' 
                                            : 'bg-white border-gray-200 text-gray-600'
                                    }`}>
                                        <MapPin size={10} className={isStoreLow ? 'text-rose-500' : 'text-gray-400'} />
                                        <span>{store.name.split(' ')[1] || store.name}:</span>
                                        <span className="font-bold">{isService ? '-' : stock}</span>
                                    </div>
                                );
                            })}
                            {/* Transfer Button */}
                            {!isService && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); openTransfer(product); }} 
                                    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 flex items-center gap-1"
                                    title="지점간 재고 이동"
                                >
                                    <ArrowRightLeft size={10} /> 이동
                                </button>
                            )}
                        </div>

                        {/* Actions (Desktop) */}
                        <div className="hidden md:flex md:col-span-1 justify-end gap-1">
                            <button 
                                onClick={() => openEdit(product)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="수정"
                            >
                                <Edit2 size={16} />
                            </button>
                            {currentUser.role !== 'STAFF' && (
                                <button 
                                    onClick={() => handleDeleteProduct(product)}
                                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="삭제"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">
                        {editingProduct.id ? '상품 정보 및 재고 관리' : '신규 상품 등록'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">상품명</label>
                        <input 
                            required
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editingProduct.name || ''}
                            onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                            placeholder="예: Hankook Ventus S1"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">규격 / 사양</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={editingProduct.specification || ''}
                                onChange={e => {
                                    let val = e.target.value;
                                    if (/^\d{7}$/.test(val)) {
                                        val = `${val.slice(0, 3)}/${val.slice(3, 5)}R${val.slice(5, 7)}`;
                                    }
                                    setEditingProduct({...editingProduct, specification: val});
                                }}
                                placeholder="예: 245/45R18"
                                required={editingProduct.category === '타이어'}
                                title={editingProduct.category === '타이어' ? '타이어는 규격(사이즈) 필수' : undefined}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">공장도가 (₩)</label>
                            <input 
                                required
                                type="number" 
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={editingProduct.price ?? ''}
                                onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">브랜드</label>
                        <input
                            list="brand-list"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="브랜드 선택 또는 입력"
                            value={editingProduct.brand || ''}
                            onChange={e => setEditingProduct({...editingProduct, brand: e.target.value})}
                        />
                        <datalist id="brand-list">
                            {uniqueBrands.map(b => (
                                <option key={b} value={b} />
                            ))}
                        </datalist>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                        <div className="flex gap-2">
                            {!showCategoryInput ? (
                                <>
                                    <select 
                                        className="flex-1 p-2 border border-gray-300 rounded-lg outline-none"
                                        value={editingProduct.category}
                                        onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <button 
                                        type="button"
                                        onClick={() => setShowCategoryInput(true)}
                                        className="px-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-200"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <input 
                                        type="text"
                                        className="flex-1 p-2 border border-blue-300 rounded-lg outline-none ring-2 ring-blue-100"
                                        placeholder="새 카테고리명"
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        autoFocus
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleAddCategorySubmit}
                                        className="px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        추가
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setShowCategoryInput(false)}
                                        className="px-3 text-gray-500 hover:text-gray-700"
                                    >
                                        취소
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <MapPin size={16} className="text-gray-500"/>
                            지점별 재고 관리 
                            {currentUser.role === 'STAFF' ? (
                                <span className="text-xs text-red-500 font-normal">(직원은 수정 불가)</span>
                            ) : null}
                        </label>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                            {stores.map(store => (
                                <div key={store.id} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">{store.name}</span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button"
                                            disabled={currentUser.role === 'STAFF'}
                                            onClick={() => {
                                                const current = editingProduct.stockByStore?.[store.id] || 0;
                                                handleStoreStockChange(store.id, Math.max(0, current - 1));
                                            }}
                                            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            -
                                        </button>
                                        <input 
                                            type="number" 
                                            disabled={currentUser.role === 'STAFF'}
                                            className="w-16 text-center p-1 border border-gray-300 rounded disabled:bg-gray-100"
                                            value={editingProduct.stockByStore?.[store.id] || 0}
                                            onChange={e => handleStoreStockChange(store.id, Number(e.target.value))}
                                        />
                                        <button 
                                            type="button"
                                            disabled={currentUser.role === 'STAFF'}
                                            onClick={() => {
                                                const current = editingProduct.stockByStore?.[store.id] || 0;
                                                handleStoreStockChange(store.id, current + 1);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium"
                        >
                            취소
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                        >
                            <Save size={18} />
                            저장하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><ArrowRightLeft size={20} className="text-blue-600"/> 재고 이동</h3>
                    <button onClick={() => setTransferModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">보내는 지점</label>
                        <select 
                            value={transferData.fromStoreId}
                            disabled={currentUser.role === 'STAFF'}
                            onChange={e => setTransferData({...transferData, fromStoreId: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 disabled:text-gray-500"
                        >
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-center text-gray-400"><ArrowRightLeft className="rotate-90"/></div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">받는 지점</label>
                        <select 
                            value={transferData.toStoreId}
                            onChange={e => setTransferData({...transferData, toStoreId: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {stores.map(s => (
                                <option key={s.id} value={s.id} disabled={s.id === transferData.fromStoreId}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">이동 수량</label>
                        <input 
                            type="number" 
                            min="1"
                            value={transferData.quantity}
                            onChange={e => setTransferData({...transferData, quantity: Number(e.target.value)})}
                            className="w-full p-2 border border-gray-300 rounded-lg font-bold text-center focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                        * 재고 수량만 이동되며, 최초 매입(지출) 기록은 보내는 지점에 유지됩니다.
                    </p>
                    <button 
                        onClick={submitTransfer}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                        확인 및 이동
                    </button>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default Inventory;


import React, { useState, useEffect, useMemo } from 'react';
import type { Product, CartItem, Sale, Store, User, Customer, Staff } from '../types';
import { formatCurrency } from '../utils/format';
import { PaymentMethod } from '../types';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, ShoppingCart, User as UserIcon, Pencil, X, ChevronLeft, MapPin, AlertTriangle } from 'lucide-react';

interface POSProps {
  products: Product[];
  stores: Store[];
  categories: string[];
  tireBrands?: string[];
  currentUser: User;
  currentStoreId: string;
  staffList: Staff[]; // Use Staff entities 
  customers: Customer[];
  onSaleComplete: (sale: Sale) => void;
    // onAddProduct: (product: Product) => void; // No longer used for immediate sale stock-in
  onAddCategory: (category: string) => void;
  tireModels: Record<string, string[]>;
}

interface CustomerForm {
    name: string;
    phoneNumber: string;
    carModel: string;
    agreedToPrivacy: boolean;
    requestTaxInvoice: boolean;
    businessNumber: string;
    companyName: string;
    email: string;
}

interface CheckoutForm {
    staffId: string;
    vehicleNumber: string;
}

interface CartItemRowProps {
    item: CartItem;
    onRemove: (cartItemId: string) => void;
    onUpdateQuantity: (cartItemId: string, delta: number) => void;
    onUpdatePrice: (cartItemId: string, newPrice: number) => void;
    priceEditId: string | null;
    onSetPriceEditId: (cartItemId: string | null) => void;
    onUpdateMemo: (cartItemId: string, memo: string) => void;
    onUpdateName: (cartItemId: string, name: string) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ 
    item, 
    onRemove, 
    onUpdateQuantity, 
    onUpdatePrice, 
    priceEditId, 
    onSetPriceEditId,
    onUpdateMemo,
    onUpdateName
}) => {
    // Check if discounted
    const isDiscounted = item.originalPrice !== undefined && item.price < item.originalPrice;
    const isTempProduct = item.id === '99999';

    // Local state for formatted price input
    const [localPrice, setLocalPrice] = useState('');

    useEffect(() => {
        if (priceEditId === item.cartItemId) {
            // If price is 0 (e.g. dummy product), show empty string to allow typing immediately without deleting '0'
            setLocalPrice(item.price === 0 ? '' : item.price.toLocaleString());
        }
    }, [priceEditId, item.cartItemId, item.price]);

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        if (raw === '') {
            setLocalPrice('');
            return;
        }
        const num = Number(raw);
        setLocalPrice(num.toLocaleString());
    };

    const commitPrice = () => {
        const finalPrice = localPrice === '' ? 0 : Number(localPrice.replace(/[^0-9]/g, ''));
        onUpdatePrice(item.cartItemId, finalPrice);
    };
    
    return (
      <div className={`flex flex-col p-3 rounded-lg border gap-2 group ${isTempProduct ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                  <div className="mb-1">
                      <div className="flex items-center gap-2 mb-1">
                           {/* Move stock display above price */}
                           <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                               isTempProduct ? 'bg-orange-100 text-orange-700' : (item.stock || 0) <= 0 && (item.stock || 0) < 900 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                           }`}>
                               {isTempProduct ? '우선결제(가매출)' : (item.stock || 0) > 900 ? '서비스' : `재고 ${(item.stock || 0)}개`}
                           </span>
                           {/* Category placed above product name */}
                           <span className="text-xs font-semibold text-gray-400 block text-left">{item.category}</span>
                      </div>
                  </div>
                  {isTempProduct ? (
                      <input 
                          type="text" 
                          className="font-bold text-gray-800 text-sm leading-tight text-left truncate w-full pr-2 border-b border-orange-300 bg-orange-50 focus:bg-white focus:outline-none focus:border-blue-500 rounded px-1 -mx-1 py-0.5"
                          value={item.name}
                          onChange={(e) => onUpdateName(item.cartItemId, e.target.value)}
                          placeholder="상품명 입력"
                      />
                  ) : (
                      <h4 className="font-medium text-gray-800 leading-tight text-left truncate w-full pr-2" title={item.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                  )}
                  
                  <div className="flex gap-2 mt-1">
                      {item.brand && <span className="text-[10px] bg-white border px-1 rounded text-gray-500">{item.brand}</span>}
                      {item.specification && <span className="text-xs text-blue-600">{item.specification}</span>}
                  </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">

                  <button 
                      onClick={() => onRemove(item.cartItemId)}
                      className="text-gray-400 hover:text-red-500 p-1"
                  >
                      <Trash2 size={16} />
                  </button>
              </div>
          </div>
          
          <div className="flex items-center justify-between mt-1">
              <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1.5">
                      {/* Original Price with Strikethrough (Only if discounted) */}
                      {isDiscounted && (
                              <span className="text-xs text-gray-400 line-through decoration-gray-400">
                              {formatCurrency((item.originalPrice || 0) * item.quantity)}
                          </span>
                      )}
                      
                      {/* Current Price (Total) */}
                      {priceEditId === item.cartItemId ? (
                          <input 
                              autoFocus
                              type="text" 
                              className="w-24 text-sm p-1 border border-blue-500 rounded outline-none text-right font-bold"
                              value={localPrice}
                              onChange={handlePriceChange}
                              onBlur={commitPrice}
                              placeholder="0"
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                  if(e.key === 'Enter') {
                                      commitPrice();
                                      e.currentTarget.blur();
                                  }
                              }}
                          />
                      ) : (
                          <div 
                              onClick={() => onSetPriceEditId(item.cartItemId)}
                              className={`text-sm font-bold px-1 rounded cursor-pointer flex items-center gap-1 ${isDiscounted ? 'text-blue-600' : 'text-gray-700'} hover:bg-gray-200`}
                              title="단가 수정하려면 클릭"
                          >
                              {formatCurrency(item.price * item.quantity)}
                              <Pencil size={10} className="text-gray-400 opacity-0 group-hover:opacity-100" />
                          </div>
                      )}
                  </div>
              </div>

              <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-0.5">
                  <button 
                      onClick={() => onUpdateQuantity(item.cartItemId, -1)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600"
                  >
                      <Minus size={14} />
                  </button>
                  <span className="font-bold text-gray-800 w-4 text-center text-sm">{item.quantity}</span>
                  <button 
                      onClick={() => onUpdateQuantity(item.cartItemId, 1)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600"
                  >
                      <Plus size={14} />
                  </button>
              </div>
          </div>
          
          {/* Memo Input for Dummy/Unstocked Product */}
          {isTempProduct && (
              <div className="mt-2">
                  <label className="text-[10px] font-bold text-orange-600 mb-1 block">메모 (선택사항)</label>
                  <input 
                      type="text" 
                      className="w-full p-2 text-xs border border-orange-200 rounded bg-white focus:bg-white focus:border-orange-400 outline-none placeholder-gray-400 text-gray-800 font-medium shadow-sm"
                      placeholder="예: 한국타이어 235/55R19 2본 (퀵)"
                      value={item.memo || ''}
                      onChange={(e) => onUpdateMemo(item.cartItemId, e.target.value)}
                  />
                  <div className="text-[10px] text-orange-400 mt-1 flex items-center gap-1">
                      <AlertTriangle size={10} /> 나중에 정식 상품으로 매칭 가능합니다.
                  </div>
              </div>
          )}
      </div>
    );
};

const POS: React.FC<POSProps> = ({ products, stores, categories, tireBrands = [], currentUser, currentStoreId, staffList, customers, onSaleComplete }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [forceShowBrandTabs, setForceShowBrandTabs] = useState(false);
  
  // Admin Selection State
  const [adminSelectedStoreId, setAdminSelectedStoreId] = useState<string>(stores[0]?.id || '');

  // Logic: If Admin, use selected store. If Staff, strictly use currentStoreId.
  const activeStoreId = currentUser.role === 'STAFF' ? currentStoreId : adminSelectedStoreId;

  useEffect(() => {
      if(currentUser.role === 'STORE_ADMIN' && !adminSelectedStoreId && stores.length > 0) {
          setAdminSelectedStoreId(stores[0].id);
      }
  }, [currentUser, stores, adminSelectedStoreId]);
  
  const [isProcessing, setIsProcessing] = useState(false);

  
  // Customer Search Modal State
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  
  // Discount Modal State

  
  // Checkout Modal State
  const [confirmation, setConfirmation] = useState<{ isOpen: boolean; method: PaymentMethod | null }>({
    isOpen: false,
    method: null
  });

  // Checkout Form Data (Vehicle, Staff, Customer)
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>({
      staffId: '', // Default to empty, force selection
      vehicleNumber: ''
  });

  const [customerForm, setCustomerForm] = useState<CustomerForm>({
      name: '',
      phoneNumber: '',
      carModel: '',
      agreedToPrivacy: false,
      requestTaxInvoice: false,
      businessNumber: '',
      companyName: '',
      email: ''
  });

  const [priceEditId, setPriceEditId] = useState<string | null>(null);

  // Set default staff if list has items and only one option
  useEffect(() => {
      if (confirmation.isOpen && staffList.length === 1) {
          setCheckoutForm(prev => ({ ...prev, staffId: staffList[0].id }));
      }
  }, [confirmation.isOpen, staffList]);

  // Customer Search Logic
  const filteredCustomers = useMemo(() => {
      if (!customerSearchTerm) return [];
      return customers.filter(c => 
          c.phoneNumber.includes(customerSearchTerm) || 
          c.vehicleNumber?.includes(customerSearchTerm) ||
          c.name.includes(customerSearchTerm)
      );
  }, [customers, customerSearchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
      setCustomerForm({
          name: customer.name,
          phoneNumber: customer.phoneNumber,
          carModel: customer.carModel || '',
          agreedToPrivacy: true, // Assume returning customer agreed
          requestTaxInvoice: false,
          // Auto-fill business info if available
          businessNumber: customer.businessNumber || '',
          companyName: customer.companyName || '',
          email: customer.email || ''
      });
      setCheckoutForm(prev => ({
          ...prev,
          vehicleNumber: customer.vehicleNumber || ''
      }));
      setIsCustomerSearchOpen(false);
      setCustomerSearchTerm('');
  };

  const clearSelectedCustomer = () => {
      setCustomerForm({ 
          name: '', phoneNumber: '', carModel: '', agreedToPrivacy: false, requestTaxInvoice: false,
          businessNumber: '', companyName: '', email: ''
      });
      setCheckoutForm(prev => ({ ...prev, vehicleNumber: '' }));
  };

  const showBrandTabs = useMemo(() => {
      return (forceShowBrandTabs || searchTerm.length > 0 || selectedCategory === '타이어');
  }, [forceShowBrandTabs, searchTerm, selectedCategory]);

  const filteredProducts = useMemo(() => {
      const lowerSearch = searchTerm.toLowerCase().trim();
      // Create numeric only version for spec search (e.g. '2355519')
      const numericSearch = lowerSearch.replace(/\D/g, '');

      let result = products.filter(p => {
        if (p.id === '99999') return false; // Hide dummy product from list

        const nameMatch = p.name.toLowerCase().includes(lowerSearch);
        const brandMatch = p.brand?.toLowerCase().includes(lowerSearch);
        
        let specMatch = false;
        if (p.specification) {
            const lowerSpec = p.specification.toLowerCase();
            // Standard text match
            if (lowerSpec.includes(lowerSearch)) specMatch = true;
            
            // Enhanced Numeric Match: if user types "2355519", match against "2355519" (stripped from 235/55R19)
            // Only trigger if user input has reasonable length to avoid false positives with short numbers
            if (!specMatch && numericSearch.length >= 3) {
                const numericSpec = lowerSpec.replace(/\D/g, '');
                if (numericSpec.includes(numericSearch)) specMatch = true;
            }
        }
        
        const matchesSearch = nameMatch || specMatch || brandMatch;
        
        if (selectedCategory === 'All' && !searchTerm && p.category === '타이어') {
            return false;
        }

        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesBrand = selectedBrand === 'All' || p.brand === selectedBrand;
        
        return matchesSearch && matchesCategory && matchesBrand;
      });

      const brandOrder = tireBrands.reduce((acc, brand, idx) => {
          acc[brand] = idx;
          return acc;
      }, {} as Record<string, number>);

      result.sort((a, b) => {
          if (tireBrands.length > 0) {
              const brandA = a.brand || '기타';
              const brandB = b.brand || '기타';
              const orderA = brandOrder[brandA] ?? 99;
              const orderB = brandOrder[brandB] ?? 99;
              if (orderA !== orderB) return orderA - orderB;
          }
          return a.name.localeCompare(b.name);
      });
      return result;
  }, [products, searchTerm, selectedCategory, selectedBrand, tireBrands]);

  const getStock = (product: Product) => product.stockByStore[activeStoreId] || 0;

    const addToCart = (product: Product, overridePrice?: number, overrideName?: string, isImmediateNewProduct?: boolean) => {
        // If this is a new product being immediately sold (입고와 동시에 판매), treat its stock as 0
        const currentStock = isImmediateNewProduct ? 0 : (product.stockByStore[activeStoreId] || 0);
        // Service items (stock > 900) or Dummy items (99999) always allow add
        const isSpecialItem = product.id === '99999' || currentStock > 900;
        if (currentStock <= 0 && !isSpecialItem && !isImmediateNewProduct) return;

        setCart(prev => {
            // Group standard products, but never group Priority Payment (99999)
            if (product.id !== '99999') {
                const existing = prev.find(item => item.id === product.id);
                if (existing) {
                        if (!isSpecialItem && existing.quantity >= currentStock && !isImmediateNewProduct) return prev;
                        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
                }
            }

            const priceToUse = overridePrice !== undefined ? overridePrice : product.price;
            const nameToUse = overrideName || product.name;
            // Generate a unique cart item ID
            const newCartItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            return [...prev, {
                    ...product,
                    cartItemId: newCartItemId,
                    name: nameToUse,
                    price: priceToUse,
                    quantity: 1,
                    originalPrice: priceToUse
            }];
        });
    };

  // --- Emergency / Temp Product Logic (Inline Version) ---
  const addDummyProduct = () => {
      const dummyProduct = products.find(p => p.id === '99999');
      if (dummyProduct) {
          // Add to cart with price 0 (forcing user to input)
          addToCart(dummyProduct, 0);
          // Note: We can't set focus immediately because we don't know the new ID yet easily here without refactoring.
          // But user can click to edit.
      } else {
          alert('임시 상품 데이터(ID:99999)가 없습니다. 시스템 관리자에게 문의하세요.');
      }
  };

  const updateMemo = (cartItemId: string, memo: string) => {
      setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, memo } : item));
  };
  
  const updateName = (cartItemId: string, name: string) => {
      setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, name } : item));
  };
  // ------------------------------------



  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null; 
        if (!item.isManual && item.stock < 900 && item.id !== '99999') {
            const product = products.find(p => p.id === item.id);
            if (product && newQty > getStock(product)) return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const updatePrice = (cartItemId: string, newPrice: number) => {
      setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, price: newPrice } : item));
      setPriceEditId(null);
  };

    // Discount modal logic removed



  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);


  const requestCheckout = (method: PaymentMethod) => {
    if (cart.length === 0) return;
    setConfirmation({ isOpen: true, method });
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '');
      let formatted = raw;
      
      if (raw.length > 3 && raw.length <= 7) {
          formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
      } else if (raw.length > 7) {
          formatted = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
      }
      
      setCustomerForm(prev => ({ ...prev, phoneNumber: formatted }));
  };

  const processCheckout = () => {
    if (!confirmation.method) return;
    
    // Ensure Staff is selected
    if (!checkoutForm.staffId) {
        alert('담당 직원을 선택해주세요.');
        return;
    }

    // Validate Privacy Agreement if customer data is entered
    if ((customerForm.name || customerForm.phoneNumber) && !customerForm.agreedToPrivacy) {
        alert('고객 정보를 입력한 경우, 개인정보 수집 및 이용에 동의해야 합니다.');
        return;
    }

    // Validate Tax Invoice Info if requested
    if (customerForm.requestTaxInvoice) {
        if (!customerForm.businessNumber || !customerForm.companyName || !customerForm.email) {
            alert('세금계산서 발행을 위한 필수 정보(사업자번호, 상호, 이메일)를 입력해주세요.');
            return;
        }
    }

    const method = confirmation.method;
    // Get Staff Name
    const salesStaff = staffList.find(s => s.id === checkoutForm.staffId);
    
    setConfirmation({ isOpen: false, method: null });
    setIsProcessing(true);

    // Aggregate memos from cart items
    // If it's the dummy item, just use the memo. If normal item, prepend name.
    const itemMemos = cart
        .filter(item => item.memo && item.memo.trim() !== '')
        .map(item => item.id === '99999' ? item.memo : `[${item.name}]: ${item.memo}`)
        .join(', ');

    setTimeout(() => {
      const newSale: Sale = {
        id: `S-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        storeId: activeStoreId,
        totalAmount: cartTotal,
        paymentMethod: method,
        staffName: salesStaff ? salesStaff.name : '미지정', // Save selected staff name
        vehicleNumber: checkoutForm.vehicleNumber, // Save vehicle number
        memo: itemMemos, // Save aggregated memo
        isTaxInvoiceRequested: customerForm.requestTaxInvoice,
        customer: (customerForm.name || checkoutForm.vehicleNumber) ? {
            name: customerForm.name || '방문고객',
            phoneNumber: customerForm.phoneNumber,
            carModel: customerForm.carModel,
            vehicleNumber: checkoutForm.vehicleNumber, // Include vehicle number in customer info
            businessNumber: customerForm.businessNumber,
            companyName: customerForm.companyName,
            email: customerForm.email
        } : undefined,
        items: cart.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          priceAtSale: item.price,
          specification: item.specification,
          brand: item.brand
        }))
      };

    // If any cart item is a new product being sold immediately, do NOT increase its stock in inventory
    // (Assume parent App handles inventory update; here, we just avoid calling onAddProduct for immediate sale)
    onSaleComplete(newSale);
      
      // Reset All Forms
      setCart([]);
      setCustomerForm({ 
          name: '', phoneNumber: '', carModel: '', agreedToPrivacy: false, requestTaxInvoice: false,
          businessNumber: '', companyName: '', email: ''
      });
      setCheckoutForm({ staffId: '', vehicleNumber: '' });
      setIsProcessing(false);
      alert('결제가 완료되었습니다!');
    }, 800);
  };



  const currentStoreName = stores.find(s => s.id === activeStoreId)?.name || '매장 미선택';

  const getPaymentMethodName = (method: PaymentMethod | null) => {
      if (method === PaymentMethod.CARD) return '신용/체크카드';
      if (method === PaymentMethod.CASH) return '현금';
      if (method === PaymentMethod.TRANSFER) return '계좌이체';
      return '';
  };

  // Get models for selected brand


  return (
    <>
        <div className="flex flex-col lg:flex-row h-auto lg:h-full gap-6 relative">
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[50vh] lg:min-h-0">
            {/* ... Existing Product Grid & Search (Unchanged) ... */}
            <div className="p-4 border-b border-gray-100 space-y-4 sticky top-0 bg-white z-10">
                 {/* Search Bar & Admin Store Selector */}
                 <div className="flex flex-col md:flex-row gap-2">
                     <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500" size={20} />
                        <input 
                            type="text" 
                            placeholder="상품명, 규격 (예: 245/45 또는 2454518)" 
                            className="w-full pl-10 pr-4 py-3 bg-blue-50 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-medium placeholder-blue-300"
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
                    
                    {/* Admin Store Selector */}
                    {currentUser.role === 'STORE_ADMIN' && (
                        <div className="relative w-full md:w-48">
                             <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                             <select
                                value={adminSelectedStoreId}
                                onChange={(e) => {
                                    setAdminSelectedStoreId(e.target.value);
                                    setCart([]); // Clear cart on store switch to avoid confusion
                                }}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-bold"
                             >
                                 {stores.map(store => (
                                     <option key={store.id} value={store.id}>{store.name}</option>
                                 ))}
                             </select>
                        </div>
                    )}
                 </div>
                
                {/* Brand Tabs or Category Pills */}
                {showBrandTabs ? (
                     <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar animate-fade-in items-center">
                        <button 
                            onClick={() => {
                                setForceShowBrandTabs(false);
                                setSelectedCategory('All');
                                setSelectedBrand('All');
                            }} 
                            className="flex-shrink-0 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 flex items-center justify-center"
                            title="전체 상품으로"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setSelectedBrand('All')} className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors border ${selectedBrand === 'All' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>전체 브랜드</button>
                        {tireBrands.map(brand => (
                            <button key={brand} onClick={() => setSelectedBrand(brand)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${selectedBrand === brand ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{brand}</button>
                        ))}
                    </div>
                ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <button onClick={() => setSelectedCategory('All')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'All' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>전체</button>
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat}</button>
                        ))}
                    </div>
                )}
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-[400px] pb-32 lg:pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {/* Emergency (Priority) Payment Button - Direct Add */}
                    <button onClick={addDummyProduct} className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 transition-colors min-h-[11rem] gap-2 group">
                        <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
                        <span className="font-bold text-orange-700 text-sm">우선결제</span>
                        <span className="text-xs text-orange-500">가매출 잡기 (즉시 추가)</span>
                    </button>

                    {filteredProducts.map(product => {
                        const stock = getStock(product);
                        const isService = stock > 900;
                        const isLowStock = !isService && stock < 10;
                        return (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                disabled={stock <= 0 && !isService}
                                className={`group flex flex-col justify-between items-start p-4 rounded-xl border bg-white transition-all shadow-sm h-full min-h-[11rem] relative text-left
                                    ${stock <= 0 && !isService ? 'opacity-50 cursor-not-allowed border-gray-200' : 'hover:border-blue-500 hover:shadow-md cursor-pointer border-gray-100'}`}
                            >
                                {product.brand && product.brand !== '기타' && (
                                    <span className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 z-10">
                                        {product.brand}
                                    </span>
                                )}
                                
                                <div className="w-full mt-1">
                                    <div className="text-xs md:text-sm font-semibold text-gray-400 mb-1 text-left">{product.category}</div>
                                    <h4 className="font-bold text-base md:text-lg text-gray-800 w-full text-left mb-2 pr-6 truncate" title={product.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h4>
                                    {product.specification && (
                                         <div className="text-left">
                                            <span className="text-sm text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded inline-block">{product.specification}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="w-full mt-4 pt-3 border-t border-gray-50 flex flex-col items-end gap-0.5">
                                                <span className={`text-[10px] md:text-xs font-medium px-2 py-0.5 rounded-full ${isLowStock ? 'bg-[#EF4444] text-white' : 'bg-green-100 text-green-700'}`}>
                                                    {isService ? '서비스' : `재고 ${stock}개`}
                                                </span>
                                                <span className="text-lg md:text-xl font-bold text-gray-900">{formatCurrency(product.price)}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Desktop Cart Side Panel */}
        <div className="hidden lg:flex lg:w-[38%] xl:w-[30%] bg-white rounded-xl shadow-xl border border-gray-100 flex-col h-full flex-shrink-0">
            <div className="p-5 border-b border-gray-100 bg-slate-50 rounded-t-xl sticky top-0 z-10">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><ShoppingCart size={20} /> 견적 / 결제</h3>
                <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-blue-600 text-sm">{currentStoreName}</span>
                        {customerForm.name ? (
                             <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">
                                <UserIcon size={12} /> {customerForm.name}
                                <button onClick={clearSelectedCustomer} className="ml-1 hover:text-red-500"><X size={12}/></button>
                             </div>
                        ) : (
                            <button 
                                className="flex items-center gap-1 text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                                onClick={() => setIsCustomerSearchOpen(true)}
                            >
                                <Search size={12} /> 고객 검색
                            </button>
                        )}
                    </div>
                    <span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 py-10">
                        <ShoppingCart size={48} className="opacity-20" />
                        <p>상품을 선택하면 여기에 표시됩니다.</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <CartItemRow 
                            key={item.cartItemId} 
                            item={item} 
                            onRemove={removeFromCart} 
                            onUpdateQuantity={updateQuantity} 
                            onUpdatePrice={updatePrice} 
                            priceEditId={priceEditId} 
                            onSetPriceEditId={setPriceEditId} 
                            // onOpenDiscount removed
                            onUpdateMemo={updateMemo}
                            onUpdateName={updateName}
                        />
                    ))
                )}
            </div>
            <div className="p-5 border-t border-gray-100 bg-slate-50 rounded-b-xl">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">총 결제 금액</span>
                    <span className="text-[32px] font-bold text-blue-600">{formatCurrency(cartTotal)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <PaymentButton icon={CreditCard} label="카드" onClick={() => requestCheckout(PaymentMethod.CARD)} disabled={cart.length === 0 || isProcessing} color="bg-blue-600 hover:bg-blue-700" />
                    <PaymentButton icon={Banknote} label="현금" onClick={() => requestCheckout(PaymentMethod.CASH)} disabled={cart.length === 0 || isProcessing} color="bg-emerald-600 hover:bg-emerald-700" />
                    <PaymentButton icon={Smartphone} label="이체" onClick={() => requestCheckout(PaymentMethod.TRANSFER)} disabled={cart.length === 0 || isProcessing} color="bg-violet-600 hover:bg-violet-700" />
                </div>
            </div>
        </div>

        {/* ... Mobile Cart Logic (Same structure) ... */}
        </div>

        {/* --- Modals --- */}
        
        {/* Customer Search Modal (Unchanged) */}
        {isCustomerSearchOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                     <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg text-gray-800">고객 검색</h3>
                        <button onClick={() => { setIsCustomerSearchOpen(false); setCustomerSearchTerm(''); }} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    </div>
                    <div className="p-4">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="전화번호 뒷자리, 이름, 차량번호" 
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={customerSearchTerm}
                                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {filteredCustomers.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    {customerSearchTerm ? '검색 결과가 없습니다.' : '검색어를 입력하세요.'}
                                </div>
                            ) : (
                                filteredCustomers.map(customer => (
                                    <button 
                                        key={customer.id} 
                                        onClick={() => handleSelectCustomer(customer)}
                                        className="w-full text-left p-3 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors flex justify-between items-center group"
                                    >
                                        <div>
                                            <div className="font-bold text-gray-800">{customer.name}</div>
                                            <div className="text-xs text-gray-500">{customer.phoneNumber} | {customer.vehicleNumber}</div>
                                        </div>
                                        <div className="text-blue-600 opacity-0 group-hover:opacity-100 text-sm font-bold">선택</div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Discount Modal (Unchanged) */}
        
        {/* Checkout Confirmation Modal */}
        {confirmation.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <CreditCard size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">결제 확인</h3>
                        <p className="text-gray-500 mb-6">
                            총 결제금액: <span className="text-blue-600 font-bold text-lg">{formatCurrency(cartTotal)}</span>
                            <br/>
                            <span className="text-sm bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">{getPaymentMethodName(confirmation.method)}</span>
                        </p>
                        
                        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-3 border border-gray-100">
                             {/* Sales Staff Selection - Use Staff List */}
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">담당 직원 (필수)</label>
                                <select 
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500"
                                    value={checkoutForm.staffId}
                                    onChange={(e) => setCheckoutForm({...checkoutForm, staffId: e.target.value})}
                                >
                                    <option value="">직원 선택</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                             </div>

                             {/* Customer Information Section */}
                             <div>
                                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">고객 정보 (선택)</label>
                                 <div className="space-y-2">
                                     <input 
                                        type="text" 
                                        placeholder="고객명 (예: 홍길동)"
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                        value={customerForm.name}
                                        onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                                     />
                                     <input 
                                        type="tel" 
                                        placeholder="연락처 (숫자만 입력)"
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                        value={customerForm.phoneNumber} // Enable formatting in view
                                        onChange={handlePhoneNumberChange}
                                     />
                                     <div className="flex gap-2">
                                          <input 
                                            type="text" 
                                            placeholder="차량번호"
                                            className="w-1/2 p-2 border border-gray-300 rounded-lg text-sm"
                                            value={checkoutForm.vehicleNumber}
                                            onChange={(e) => setCheckoutForm({...checkoutForm, vehicleNumber: e.target.value})}
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="차종"
                                            className="w-1/2 p-2 border border-gray-300 rounded-lg text-sm"
                                            value={customerForm.carModel}
                                            onChange={(e) => setCustomerForm({...customerForm, carModel: e.target.value})}
                                        />
                                     </div>
                                 </div>
                             </div>

                             {/* Privacy Agreement Checkbox */}
                             {(customerForm.name || customerForm.phoneNumber) && (
                                 <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                                     <input 
                                        type="checkbox" 
                                        id="privacy-agree" 
                                        className="mt-1"
                                        checked={customerForm.agreedToPrivacy}
                                        onChange={(e) => setCustomerForm({...customerForm, agreedToPrivacy: e.target.checked})}
                                     />
                                     <label htmlFor="privacy-agree" className="text-xs text-gray-600 leading-tight">
                                         <span className="font-bold text-blue-600">[필수]</span> 개인정보 수집 및 이용에 동의합니다.
                                         (고객관리, 정비이력 조회 목적)
                                     </label>
                                 </div>
                             )}

                             {/* Tax Invoice Request */}
                             <div className="pt-2 border-t border-gray-200">
                                 <div className="flex items-center gap-2 mb-2">
                                    <input 
                                        type="checkbox" 
                                        id="tax-invoice-req" 
                                        checked={customerForm.requestTaxInvoice}
                                        onChange={(e) => setCustomerForm({...customerForm, requestTaxInvoice: e.target.checked})}
                                    />
                                    <label htmlFor="tax-invoice-req" className="text-sm font-bold text-gray-700">세금계산서 발행 요청</label>
                                 </div>
                                 
                                 {customerForm.requestTaxInvoice && (
                                     <div className="space-y-2 animate-fade-in pl-1">
                                         <input 
                                            type="text" 
                                            placeholder="사업자번호"
                                            className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                                            value={customerForm.businessNumber}
                                            onChange={(e) => setCustomerForm({...customerForm, businessNumber: e.target.value})}
                                         />
                                         <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="상호(법인명)"
                                                className="w-1/2 p-2 border border-gray-300 rounded-lg text-xs"
                                                value={customerForm.companyName}
                                                onChange={(e) => setCustomerForm({...customerForm, companyName: e.target.value})}
                                            />
                                            <input 
                                                type="email" 
                                                placeholder="이메일"
                                                className="w-1/2 p-2 border border-gray-300 rounded-lg text-xs"
                                                value={customerForm.email}
                                                onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                                            />
                                         </div>
                                     </div>
                                 )}
                             </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmation({ isOpen: false, method: null })}
                                className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                            >
                                취소
                            </button>
                            <button 
                                onClick={processCheckout}
                                disabled={isProcessing}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                            >
                                {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                결제 완료
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

// Payment Button Component
const PaymentButton = ({ icon: Icon, label, onClick, disabled, color }: any) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`flex flex-col items-center justify-center p-4 rounded-xl text-white font-bold transition-all shadow-md active:scale-95 ${color} ${disabled ? 'opacity-50 cursor-not-allowed shadow-none' : 'hover:shadow-lg'}`}
    >
        <Icon size={24} className="mb-1" />
        <span className="text-sm">{label}</span>
    </button>
);

export default POS;

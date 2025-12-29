
import React, { useState, useEffect, useMemo } from 'react';
import type { Product, CartItem, Sale, Store, User, Customer, Staff, Shift } from '../types';
import { formatCurrency } from '../utils/format';
import { PaymentMethod } from '../types';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, ShoppingCart, User as UserIcon, Pencil, X, ChevronLeft, MapPin, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';

interface POSProps {
  products: Product[];
  stores: Store[];
  categories: string[];
  tireBrands?: string[];
  currentUser: User;
  currentStoreId: string;
  staffList: Staff[]; // Use Staff entities 
    shifts: Shift[];
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
    discount: number;
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

const normalizeCategory = (category: string) => category === '부품/수리' ? '기타' : category;
const normalizeProductCategory = (product: Product): Product => ({ ...product, category: normalizeCategory(product.category) });

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
    const isService = item.category === '기타' || (item.stock || 0) > 900;

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
                               isTempProduct ? 'bg-orange-100 text-orange-700' : (item.stock || 0) <= 0 && !isService ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                           }`}>
                               {isTempProduct ? '우선결제(가매출)' : isService ? '재고 - 개' : `재고 ${(item.stock || 0)}개`}
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

const POS: React.FC<POSProps> = ({ products, stores, categories, tireBrands = [], currentUser, currentStoreId, staffList, shifts, customers, onSaleComplete }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
      const [selectedCategory, setSelectedCategory] = useState<string | null>('기타');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
    const [forceShowBrandTabs, setForceShowBrandTabs] = useState(false);
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
        const normalizedCategories = useMemo(() => {
                const uniq = Array.from(new Set(categories.map(normalizeCategory)));
                // Surface '기타' first for initial view clarity
                if (uniq.includes('기타')) {
                        return ['기타', ...uniq.filter(c => c !== '기타')];
                }
                return uniq;
        }, [categories]);


  useEffect(() => {
          if (selectedCategory && !normalizedCategories.includes(selectedCategory)) {
              setSelectedCategory(normalizedCategories[0] || null);
          }
  }, [selectedCategory, normalizedCategories]);
  
  // Admin Selection State
  const [adminSelectedStoreId, setAdminSelectedStoreId] = useState<string>(stores[0]?.id || '');

    // 🔥 상품은 단발 조회 결과를 그대로 사용 (실시간 풀 리스트 구독 제거)
        const [fireProducts, setFireProducts] = useState<Product[]>(products.map(normalizeProductCategory));

    useEffect(() => {
        setFireProducts(products.map(normalizeProductCategory));
    }, [products]);

  // Logic: If Admin, use selected store. If Staff, strictly use currentStoreId.
  const activeStoreId = currentUser.role === 'STAFF' ? currentStoreId : adminSelectedStoreId;

  const isoToLocalDate = (iso: string) => {
      const d = new Date(iso);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
  };

  const todayKey = useMemo(() => {
      const now = new Date();
      const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return local.toISOString().slice(0, 10);
  }, []);

  const scheduledStaffIds = useMemo(() => {
      return new Set(
          shifts
              .filter(s => s.storeId === activeStoreId && isoToLocalDate(s.start) === todayKey)
              .map(s => s.staffId)
      );
  }, [shifts, activeStoreId, todayKey]);

  const scheduledStaff = useMemo(() => {
      const list = staffList.filter(s => scheduledStaffIds.has(s.id));
      return list;
  }, [staffList, scheduledStaffIds]);

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
      vehicleNumber: '',
      discount: 0
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
    const [mobilePriceEditId, setMobilePriceEditId] = useState<string | null>(null);
    const [mobilePriceValue, setMobilePriceValue] = useState('');

  // Set default staff if only one scheduled staff is available
  useEffect(() => {
      if (confirmation.isOpen && scheduledStaff.length === 1) {
          setCheckoutForm(prev => ({ ...prev, staffId: scheduledStaff[0].id }));
      }
  }, [confirmation.isOpen, scheduledStaff]);

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

      let result = fireProducts.filter(p => {
        if (p.id === '99999') return false; // Hide dummy product from list

        const nameMatch = p.name.toLowerCase().includes(lowerSearch);
        const brandMatch = p.brand?.toLowerCase().includes(lowerSearch);
        
        let specMatch = false;
        if (p.specification) {
            const lowerSpec = p.specification.toLowerCase();
            if (lowerSpec.includes(lowerSearch)) specMatch = true;
            
            if (!specMatch && numericSearch.length >= 3) {
                const numericSpec = lowerSpec.replace(/\D/g, '');
                if (numericSpec.includes(numericSearch)) specMatch = true;
            }
        }
        
        const matchesSearch = nameMatch || specMatch || brandMatch;
        
        const matchesCategory = !selectedCategory || p.category === selectedCategory;
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
  }, [fireProducts, searchTerm, selectedCategory, selectedBrand, tireBrands]);

  const getStock = (product: Product) => product.stockByStore[activeStoreId] || 0;

    const addToCart = (product: Product, overridePrice?: number, overrideName?: string, isImmediateNewProduct?: boolean, quantity: number = 1) => {
        // If this is a new product being immediately sold (입고와 동시에 판매), treat its stock as 0
        const currentStock = isImmediateNewProduct ? 0 : (product.stockByStore[activeStoreId] || 0);
        const isServiceItem = product.category === '기타' || currentStock > 900;
        // Service items or Dummy items (99999) always allow add
        const isSpecialItem = product.id === '99999' || isServiceItem;
        const qtyToAdd = Math.max(1, quantity);
        if (currentStock <= 0 && !isSpecialItem && !isImmediateNewProduct) return;

        setCart(prev => {
            // Group standard products, but never group Priority Payment (99999)
            if (product.id !== '99999') {
                const existing = prev.find(item => item.id === product.id);
                if (existing) {
                        const desiredQty = existing.quantity + qtyToAdd;
                        if (!isSpecialItem && !isImmediateNewProduct && desiredQty > currentStock) return prev;
                        return prev.map(item => item.id === product.id ? { ...item, quantity: desiredQty } : item);
                }
            }

            // Default tire items to 0 so cashier can type the actual selling price each time
            const isTire = product.category === '타이어';
            const basePrice = product.price;
            const priceToUse = overridePrice !== undefined ? overridePrice : (isTire ? 0 : basePrice);
            const nameToUse = overrideName || product.name;
            // Generate a unique cart item ID
            const newCartItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const initialQty = isSpecialItem || isImmediateNewProduct ? qtyToAdd : Math.min(qtyToAdd, currentStock);
            if (initialQty <= 0) return prev;

            return [...prev, {
                    ...product,
                    cartItemId: newCartItemId,
                    name: nameToUse,
                    price: priceToUse,
                    quantity: initialQty,
                    originalPrice: priceToUse
            }];
        });
    };

  // --- Emergency / Temp Product Logic (Inline Version) ---
  const addDummyProduct = () => {
      const dummyProduct = fireProducts.find(p => p.id === '99999');
      if (!dummyProduct) {
          console.error('Missing manual item template (ID:99999)');
          alert('임시 상품 데이터(ID:99999)가 없습니다. 시스템 관리자에게 문의하세요.');
          return;
      }
      const manualItem: CartItem = {
          cartItemId: `manual-${Date.now()}`,
          id: '99999',
          name: '우선결제',
          price: 0,
          stock: 0,
          stockByStore: { [activeStoreId]: 0 },
          category: '기타',
          quantity: 1,
          isManual: true,
          originalPrice: 0,
      };
      setCart(prev => [...prev, manualItem]);
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
                const product = fireProducts.find(p => p.id === item.id);
                const isServiceItem = product ? (product.category === '기타' || (product.stock || 0) >= 900) : false;
                if (!item.isManual && !isServiceItem && item.id !== '99999') {
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
      setMobilePriceEditId(null);
      setMobilePriceValue('');
  };

  const handleMobilePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '');
      setMobilePriceValue(raw === '' ? '' : Number(raw).toLocaleString());
  };

  const commitMobilePrice = (cartItemId: string) => {
      const finalPrice = mobilePriceValue === '' ? 0 : Number(mobilePriceValue.replace(/[^0-9]/g, ''));
      updatePrice(cartItemId, finalPrice);
  };

    // Discount modal logic removed



  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = Math.max(0, Math.min(checkoutForm.discount || 0, cartTotal));
    const payableTotal = Math.max(0, cartTotal - discount);
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueCount = cart.length;
  const cartQtyMap = useMemo(() => {
      const map: Record<string, number> = {};
      cart.forEach(item => {
          map[item.id] = (map[item.id] || 0) + item.quantity;
      });
      return map;
  }, [cart]);


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

        // Validate discount range
        if (checkoutForm.discount < 0 || checkoutForm.discount > cartTotal) {
                alert('할인 금액이 올바르지 않습니다. (0 이상, 합계를 초과할 수 없습니다)');
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
                totalAmount: payableTotal,
                discountAmount: discount,
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
    setCheckoutForm({ staffId: '', vehicleNumber: '', discount: 0 });
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
                                setSelectedCategory(null);
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
                        {normalizedCategories.map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => setSelectedCategory(prev => prev === cat ? null : cat)} 
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {cat}
                            </button>
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
                        const isService = product.category === '기타' || stock > 900;
                        const isLowStock = !isService && stock < 10;
                        const qtyInCart = cartQtyMap[product.id] || 0;
                        const isSelected = qtyInCart > 0;
                        return (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                disabled={false}
                                className={`group flex flex-col justify-between items-start p-4 rounded-xl border transition-all shadow-sm h-full min-h-[11rem] relative text-left
                                    hover:border-blue-500 hover:shadow-md cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50/60 shadow-md ring-1 ring-blue-200' : 'border-gray-100 bg-white'}`}
                            >
                                {qtyInCart > 0 && (
                                    <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                                        {qtyInCart}개
                                    </div>
                                )}
                                <div className="w-full mt-1 flex items-center gap-2 mb-2 pr-8">
                                    <div className="text-xs md:text-sm font-semibold text-gray-400 text-left">{product.category}</div>
                                    {product.brand && product.brand !== '기타' && (
                                        <span className="inline-flex items-center text-[11px] md:text-xs font-bold px-2.5 py-1 bg-gray-100 rounded text-gray-600 whitespace-nowrap">
                                            {product.brand}
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-bold text-base md:text-lg text-gray-800 w-full text-left mb-2 pr-6 truncate" title={product.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h4>
                                {product.specification && (
                                    <div className="w-full text-left">
                                        <span className="text-base md:text-lg font-bold text-blue-600 leading-tight">{product.specification}</span>
                                    </div>
                                )}

                                <div className="w-full mt-4 pt-3 flex items-center gap-2">
                                    <div className="flex-1 border-t border-dashed border-gray-200" aria-hidden />
                                    {!isService && (
                                        <span className={`text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full shadow-sm ${isLowStock ? 'bg-[#EF4444] text-white' : 'bg-green-100 text-green-700'}`}>
                                            재고 {stock}개
                                        </span>
                                    )}
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
                    <PaymentButton icon={CreditCard} label="카드" onClick={() => requestCheckout(PaymentMethod.CARD)} disabled={uniqueCount === 0 || totalQty === 0 || isProcessing} color="bg-blue-600 hover:bg-blue-700" />
                    <PaymentButton icon={Banknote} label="현금" onClick={() => requestCheckout(PaymentMethod.CASH)} disabled={uniqueCount === 0 || totalQty === 0 || isProcessing} color="bg-emerald-600 hover:bg-emerald-700" />
                    <PaymentButton icon={Smartphone} label="이체" onClick={() => requestCheckout(PaymentMethod.TRANSFER)} disabled={uniqueCount === 0 || totalQty === 0 || isProcessing} color="bg-violet-600 hover:bg-violet-700" />
                </div>
            </div>
        </div>

        {/* Mobile sticky bottom bar & expandable sheet (non-modal) */}
        <div
            className="lg:hidden fixed inset-x-0 bottom-0 z-30 px-3 pointer-events-none"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
        >
            <div className={`bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto transition-transform duration-300 ${isBottomSheetOpen ? 'translate-y-0' : 'translate-y-[40%]'}`}>
                <div
                    className="w-full flex items-center justify-between p-3 bg-white cursor-pointer"
                    onClick={() => setIsBottomSheetOpen(prev => !prev)}
                >
                    <div className="flex items-center gap-2 text-left">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <ShoppingCart size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-600">총 {totalQty}개 · {uniqueCount}종</div>
                            <div className="text-lg font-extrabold text-gray-900 truncate">{formatCurrency(cartTotal)}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`text-[11px] px-2 py-1 rounded-full font-semibold ${uniqueCount === 0 || totalQty === 0 ? 'bg-gray-200 text-gray-400' : 'bg-blue-50 text-blue-700'}`}
                        >
                            주문 확인
                        </span>
                        {isBottomSheetOpen ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronUp size={18} className="text-gray-500" />}
                    </div>
                </div>
                <div className={`transition-[max-height] duration-300 ease-out ${isBottomSheetOpen ? 'max-h-[70vh]' : 'max-h-0'}`}>
                    <div className="border-t border-gray-100 divide-y max-h-[52vh] overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="p-4 text-center text-gray-400 text-sm">상품을 추가하면 여기에서 확인할 수 있습니다.</div>
                        ) : (
                            cart.map(item => (
                                <div key={item.cartItemId} className="p-3 grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                                    <div className="min-w-0 pr-1">
                                        <div className="text-sm font-semibold text-gray-900 truncate" title={item.name}>{item.name}</div>
                                        <div className="text-[11px] text-gray-500 truncate">{item.specification || item.category}</div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-2 h-10 w-28 justify-between flex-shrink-0">
                                        <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 rounded-full">
                                            <Minus size={14} />
                                        </button>
                                        <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 rounded-full">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="min-w-[96px] text-right flex-shrink-0">
                                        {mobilePriceEditId === item.cartItemId ? (
                                            <input
                                                autoFocus
                                                className="w-full text-sm p-1 border border-blue-500 rounded text-right font-bold"
                                                value={mobilePriceValue}
                                                onChange={handleMobilePriceChange}
                                                onBlur={() => commitMobilePrice(item.cartItemId)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') { commitMobilePrice(item.cartItemId); e.currentTarget.blur(); }
                                                    if (e.key === 'Escape') { setMobilePriceEditId(null); setMobilePriceValue(''); }
                                                }}
                                                placeholder="0"
                                            />
                                        ) : (
                                            <button
                                                onClick={() => { setMobilePriceEditId(item.cartItemId); setMobilePriceValue(item.price.toLocaleString()); }}
                                                className="min-w-[96px] text-sm font-bold text-gray-900 whitespace-nowrap px-2 py-1 rounded hover:bg-gray-100 text-right"
                                            >
                                                {formatCurrency(item.price * item.quantity)}
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-300 hover:text-red-500 p-1 flex-shrink-0 justify-self-end">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    {cart.length > 0 && (
                        <div className="p-3 bg-gray-50 border-t border-gray-100 space-y-3">
                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>총 금액</span>
                                <span className="text-2xl font-extrabold text-blue-600">{formatCurrency(cartTotal)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <PaymentButton icon={CreditCard} label="카드" onClick={() => requestCheckout(PaymentMethod.CARD)} disabled={uniqueCount === 0 || totalQty === 0 || isProcessing} color="bg-blue-600 hover:bg-blue-700" />
                                <PaymentButton icon={Banknote} label="현금" onClick={() => requestCheckout(PaymentMethod.CASH)} disabled={uniqueCount === 0 || totalQty === 0 || isProcessing} color="bg-emerald-600 hover:bg-emerald-700" />
                                <PaymentButton icon={Smartphone} label="이체" onClick={() => requestCheckout(PaymentMethod.TRANSFER)} disabled={uniqueCount === 0 || totalQty === 0 || isProcessing} color="bg-violet-600 hover:bg-violet-700" />
                            </div>
                        </div>
                    )}
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
                        <div className="text-gray-500 mb-6 space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span>상품 합계</span>
                                <span className="font-semibold text-gray-700">{formatCurrency(cartTotal)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1 text-gray-600">- 할인</span>
                                <span className="font-semibold text-red-500">-{formatCurrency(discount)}</span>
                            </div>
                            <div className="flex items-center justify-between text-base font-bold text-gray-900">
                                <span>최종 결제금액</span>
                                <span className="text-blue-600">{formatCurrency(payableTotal)}</span>
                            </div>
                            <div className="text-xs bg-gray-100 px-2 py-0.5 rounded mt-2 inline-block">{getPaymentMethodName(confirmation.method)}</div>
                        </div>
                        
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
                                    {scheduledStaff.length === 0 && (
                                        <option value="" disabled>근무표에 등록된 직원 없음</option>
                                    )}
                                    {scheduledStaff.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                             </div>

                             {/* Discount Input */}
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">할인 (원)</label>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500">-</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500"
                                        value={checkoutForm.discount.toLocaleString()}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^0-9]/g, '');
                                            const num = raw ? Number(raw) : 0;
                                            setCheckoutForm(prev => ({ ...prev, discount: num }));
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                                {checkoutForm.discount > cartTotal && (
                                    <p className="text-xs text-red-500 mt-1">할인 금액이 합계를 초과할 수 없습니다.</p>
                                )}
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

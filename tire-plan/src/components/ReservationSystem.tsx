
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Reservation, Product, User, Store, StockStatus, ReservationStatus } from '../types';
import type { Reservation, Product, User, Store } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Trash2, Plus, StickyNote, Pencil } from 'lucide-react';

interface ReservationSystemProps {
    reservations: Reservation[];
    onAddReservation: (reservation: Reservation) => void;
    onUpdateReservation: (reservation: Reservation) => void;
    onRemoveReservation: (id: string) => void;
    products: Product[];
    currentStoreId: string;
    currentUser: User;
    stores: Store[];
    tireBrands: string[];
    tireModels: Record<string, string[]>;
}

// Helper for Autocomplete Dropdown
interface AutocompleteProps {
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    suggestions: string[];
    className?: string;
    onSelect?: (val: string) => void;
    inputRef?: React.RefObject<HTMLInputElement>;
    onKeyDown?: (e: React.KeyboardEvent) => void;
}

const AutocompleteInput: React.FC<AutocompleteProps> = ({ value, onChange, placeholder, suggestions, className, onSelect, inputRef, onKeyDown }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredSuggestions = useMemo(() => {
        if (!value) return [];
        
        // Robust normalization for flexible matching
        // 1. Standard: Lowercase, remove spaces
        const normalizeStandard = (s: string) => s.toLowerCase().replace(/\s+/g, '');
        // 2. Numeric: Digits only (for "2454518" -> "24545R18" matching)
        const normalizeNumeric = (s: string) => s.replace(/[^0-9]/g, '');

        const valStd = normalizeStandard(value);
        const valNum = normalizeNumeric(value);
        const isNumericQuery = valNum.length >= 3 && valNum.length === value.replace(/[^0-9]/g, '').length;

        return suggestions.filter(item => {
            const itemStd = normalizeStandard(item);
            if (itemStd.includes(valStd)) return true;

            // If query looks like a spec number, try matching numeric parts
            if (isNumericQuery) {
                const itemNum = normalizeNumeric(item);
                if (itemNum.includes(valNum)) return true;
            }
            return false;
        }).slice(0, 50); // Limit results for performance
    }, [value, suggestions]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isOpen && filteredSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIndex(prev => (prev + 1) % filteredSuggestions.length);
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
                return;
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleSelect(filteredSuggestions[highlightIndex]);
                return;
            }
        }
        
        if (e.key === 'Escape') {
            setIsOpen(false);
            return;
        }

        if (onKeyDown) onKeyDown(e);
    };

    const handleSelect = (item: string) => {
        onChange(item);
        if(onSelect) onSelect(item);
        setIsOpen(false);
    };

    return (
        <div className={`relative w-full h-full ${className}`} ref={wrapperRef}>
            <input
                ref={inputRef}
                type="text"
                className="w-full h-full px-2 py-1.5 bg-transparent outline-none text-sm font-medium placeholder-gray-400 focus:bg-blue-50/50"
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                    setHighlightIndex(0);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
            />
            {isOpen && filteredSuggestions.length > 0 && (
                <ul className="absolute z-[100] left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fade-in ring-1 ring-black/5">
                    {filteredSuggestions.map((item, idx) => (
                        <li
                            key={idx}
                            className={`px-3 py-2 text-xs cursor-pointer transition-colors ${idx === highlightIndex ? 'bg-blue-100 text-blue-800 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setHighlightIndex(idx)}
                        >
                            {item}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const ReservationSystem: React.FC<ReservationSystemProps> = ({ 
    reservations, onAddReservation, onUpdateReservation, onRemoveReservation, 
    products, currentStoreId, currentUser, stores, tireBrands, tireModels
}) => {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [adminSelectedStoreId, setAdminSelectedStoreId] = useState<string>(
        (currentStoreId && currentStoreId !== 'ALL') ? currentStoreId : (stores[0]?.id || '')
    );
    const activeStoreId = currentUser.role === 'STAFF' ? currentStoreId : adminSelectedStoreId;

    const [quickForm, setQuickForm] = useState({
        time: '10:00',
        size: '',
        model: '',
        qty: '4', 
        phone: '',
        memo: ''
    });
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

    // Refs for Keyboard Navigation
    const timeRef = useRef<HTMLInputElement>(null);
    const sizeRef = useRef<HTMLInputElement>(null);
    const modelRef = useRef<HTMLInputElement>(null);
    const qtyRef = useRef<HTMLInputElement>(null);
    const phoneRef = useRef<HTMLInputElement>(null);
    const memoRef = useRef<HTMLInputElement>(null);
    const inputRefs = [timeRef, sizeRef, modelRef, qtyRef, phoneRef, memoRef];

    const formatDateYMD = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // Auto-Stock Check Logic
    useEffect(() => {
        if (!quickForm.model || !quickForm.size || quickForm.size.length < 5) return;

        const checkStock = () => {
            const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');
            const targetSize = normalize(quickForm.size);
            const targetModel = normalize(quickForm.model);

            const product = products.find(p => {
                const pName = normalize(p.name);
                const pSpec = p.specification ? normalize(p.specification) : '';
                return pName === targetModel && pSpec === targetSize;
            });

            const currentStock = product ? (product.stockByStore[activeStoreId] || 0) : 0;
            const requiredQty = Number(quickForm.qty) || 0;

            if (!product || currentStock < requiredQty) {
                setQuickForm(prev => {
                    if (!prev.memo.includes('주문 필요')) {
                        return { ...prev, memo: prev.memo ? `${prev.memo}, 주문 필요` : '주문 필요' };
                    }
                    return prev;
                });
            }
        };
        const timer = setTimeout(checkStock, 500);
        return () => clearTimeout(timer);
    }, [quickForm.model, quickForm.size, quickForm.qty, products, activeStoreId]);

    const uniqueSpecs = useMemo(() => Array.from(new Set(products.map(p => p.specification).filter(Boolean) as string[])).sort(), [products]);
    const uniqueModels = useMemo(() => {
        const fromProducts = Array.from(new Set(products.map(p => p.name)));
        const fromConst = Object.values(tireModels).flat();
        return Array.from(new Set([...fromProducts, ...fromConst])).sort();
    }, [products, tireModels]);

    const filteredReservations = useMemo(() => reservations.filter(r => r.storeId === activeStoreId), [reservations, activeStoreId]);
    const dailyReservations = useMemo(() => filteredReservations.filter(r => r.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)), [filteredReservations, selectedDate]);
    const upcomingGroups = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const future = filteredReservations.filter(r => r.date >= todayStr).sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time));
        const groups: Record<string, Reservation[]> = {};
        future.forEach(r => { if (!groups[r.date]) groups[r.date] = []; groups[r.date].push(r); });
        return groups;
    }, [filteredReservations]);

    const handleQuickSubmit = () => {
        if (!quickForm.model) {
            alert('모델명은 필수입니다.');
            modelRef.current?.focus();
            return;
        }
        const newRes: Reservation = {
            id: `R-${Date.now()}`,
            storeId: activeStoreId,
            date: selectedDate,
            time: quickForm.time,
            customerName: '방문예약',
            phoneNumber: quickForm.phone,
            productName: quickForm.model,
            specification: quickForm.size,
            quantity: Number(quickForm.qty) || 4,
            status: 'PENDING',
            stockStatus: 'CHECKING',
            memo: quickForm.memo,
            createdAt: new Date().toISOString(),
            brand: '기타'
        };
        onAddReservation(newRes);
        setQuickForm({ ...quickForm, model: '', size: '', phone: '', memo: '' }); 
        setTimeout(() => timeRef.current?.focus(), 0);
    };

    const handleGridKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            const input = e.currentTarget as HTMLInputElement;
            const isText = input.type === 'text';
            const isAtEnd = isText && input.selectionStart === input.value.length;
            const isAtStart = isText && input.selectionStart === 0;
            
            if (e.key === 'ArrowRight' && (isAtEnd || !isText)) {
                e.preventDefault();
                inputRefs[index + 1]?.current?.focus();
            } else if (e.key === 'ArrowLeft' && (isAtStart || !isText)) {
                e.preventDefault();
                inputRefs[index - 1]?.current?.focus();
            }
        } else if (e.key === 'Enter') {
            if (index === inputRefs.length - 1) handleQuickSubmit();
            else inputRefs[index + 1]?.current?.focus();
        }
    };

    const handleSizeChange = (val: string) => {
        let formatted = val;
        // Auto format 7 digit numbers (e.g. 2454519 -> 245/45R19)
        if (/^\d{7}$/.test(val)) {
            formatted = `${val.slice(0, 3)}/${val.slice(3, 5)}R${val.slice(5, 7)}`;
        }
        setQuickForm(prev => ({ ...prev, size: formatted }));
    };

    const gridCols = "grid-cols-[80px_110px_1.5fr_60px_120px_2fr_80px]";

    return (
        <div className="flex h-full gap-0 bg-gray-50 border-t border-gray-200 lg:border-none overflow-hidden">
            <style>{`input[type="time"]::-webkit-calendar-picker-indicator { display: none; }`}</style>

            {/* LEFT PANEL */}
            <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-gray-200 relative z-0">
                {/* 1. Header */}
                <div className="p-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                             <span className="text-blue-600">{selectedDate.split('-')[2]}일</span> 예약 관리
                             {currentUser.role === 'STORE_ADMIN' && (
                                <select value={adminSelectedStoreId} onChange={(e) => setAdminSelectedStoreId(e.target.value)} className="ml-2 text-xs p-1 border rounded bg-gray-50 font-normal">
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                             )}
                        </h2>
                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(formatDateYMD(d)); }} className="p-1 hover:bg-white rounded shadow-sm"><ChevronLeft size={18} className="text-gray-600"/></button>
                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-gray-700 w-[110px] text-center focus:outline-none cursor-pointer" />
                            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(formatDateYMD(d)); }} className="p-1 hover:bg-white rounded shadow-sm"><ChevronRight size={18} className="text-gray-600"/></button>
                            <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="text-xs px-2 py-1 bg-white rounded shadow-sm font-bold text-blue-600 ml-1 hover:bg-blue-50">오늘</button>
                        </div>
                    </div>
                     <div className="flex justify-between items-center bg-gray-50 rounded-lg p-2 overflow-x-auto no-scrollbar gap-1">
                        {[-3, -2, -1, 0, 1, 2, 3].map(offset => {
                             const d = new Date(selectedDate); d.setDate(d.getDate() + offset);
                             const dStr = formatDateYMD(d);
                             const isSelected = dStr === selectedDate;
                             return (
                                 <button key={offset} onClick={() => setSelectedDate(dStr)} className={`flex-1 min-w-[40px] flex flex-col items-center py-2 rounded-md transition-all ${isSelected ? 'bg-white shadow ring-1 ring-blue-500' : 'hover:bg-gray-200'}`}>
                                     <span className={`text-[10px] font-medium ${d.getDay() === 0 ? 'text-red-500' : d.getDay() === 6 ? 'text-blue-500' : ''}`}>{['일', '월', '화', '수', '목', '금', '토'][d.getDay()]}</span>
                                     <span className={`text-sm font-bold ${isSelected ? 'text-blue-600' : ''}`}>{d.getDate()}</span>
                                 </button>
                             )
                        })}
                     </div>
                </div>

                {/* 2. Quick Input Row */}
                <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex-shrink-0 relative z-20 overflow-visible">
                    <h3 className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-1"><Plus size={12}/> 빠른 예약 등록</h3>
                    <div className={`grid ${gridCols} shadow-sm rounded-lg border border-blue-300 bg-white h-9 divide-x divide-gray-200 overflow-visible`}>
                         <div className="relative group"><input ref={timeRef} type="time" className="w-full h-full text-center text-sm font-bold text-gray-800 outline-none focus:bg-blue-50" value={quickForm.time} onChange={e => setQuickForm({...quickForm, time: e.target.value})} onKeyDown={(e) => handleGridKeyDown(e, 0)} /></div>
                         <div className="relative"><AutocompleteInput inputRef={sizeRef} placeholder="규격" suggestions={uniqueSpecs} value={quickForm.size} onChange={handleSizeChange} className="h-full focus-within:bg-blue-50" onKeyDown={(e) => handleGridKeyDown(e, 1)} /></div>
                         <div className="relative"><AutocompleteInput inputRef={modelRef} placeholder="모델명 / 상품명" suggestions={uniqueModels} value={quickForm.model} onChange={val => setQuickForm(prev => ({ ...prev, model: val }))} className="h-full focus-within:bg-blue-50" onKeyDown={(e) => handleGridKeyDown(e, 2)} /></div>
                         <div className="relative"><input ref={qtyRef} type="number" min="1" className="w-full h-full px-1 text-sm text-center outline-none focus:bg-blue-50" placeholder="수량" value={quickForm.qty} onChange={e => setQuickForm({...quickForm, qty: e.target.value})} onKeyDown={(e) => handleGridKeyDown(e, 3)} /></div>
                         <div className="relative"><input ref={phoneRef} type="text" className="w-full h-full px-2 text-sm outline-none focus:bg-blue-50 placeholder-gray-400" placeholder="010-0000-0000" value={quickForm.phone} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); let fmt = val; if(val.length>3 && val.length<=7) fmt = val.slice(0,3)+'-'+val.slice(3); else if(val.length>7) fmt = val.slice(0,3)+'-'+val.slice(3,7)+'-'+val.slice(7,11); setQuickForm({...quickForm, phone: fmt}) }} onKeyDown={(e) => handleGridKeyDown(e, 4)} /></div>
                         <div className="relative"><input ref={memoRef} type="text" className="w-full h-full px-2 text-sm outline-none focus:bg-blue-50 placeholder-gray-400" placeholder="메모 입력" value={quickForm.memo} onChange={e => setQuickForm({...quickForm, memo: e.target.value})} onKeyDown={(e) => handleGridKeyDown(e, 5)} /></div>
                         <button onClick={handleQuickSubmit} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center rounded-r-lg">등록</button>
                    </div>
                </div>

                {/* 3. Daily List */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white relative z-0">
                     <div className={`grid ${gridCols} bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase flex-shrink-0`}>
                        <div className="py-2 text-center border-r border-gray-100">시간</div>
                        <div className="py-2 px-2 border-r border-gray-100">규격</div>
                        <div className="py-2 px-2 border-r border-gray-100">모델명</div>
                        <div className="py-2 text-center border-r border-gray-100">수량</div>
                        <div className="py-2 px-2 border-r border-gray-100">연락처</div>
                        <div className="py-2 px-2 border-r border-gray-100">메모</div>
                        <div className="py-2 text-center">상태</div>
                     </div>
                     <div className="flex-1 overflow-y-auto">
                        {dailyReservations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400"><StickyNote size={32} className="opacity-20 mb-2"/><p>예약 내역이 없습니다.</p></div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {dailyReservations.map(res => {
                                    const isCompleted = res.status === 'COMPLETED';
                                    const isCanceled = res.status === 'CANCELED';
                                    return (
                                        <div key={res.id} className={`grid ${gridCols} group transition-colors text-sm items-center hover:bg-blue-50/20 ${isCompleted ? 'bg-gray-50 opacity-70' : isCanceled ? 'bg-red-50/20' : ''}`}>
                                            <div className="py-1.5 text-center font-bold text-gray-700 border-r border-gray-100">{res.time}</div>
                                            <div className="py-1.5 px-2 truncate border-r border-gray-100 text-blue-600 font-bold text-xs">{res.specification || '-'}</div>
                                            <div className="py-1.5 px-2 border-r border-gray-100 min-w-0"><div className={`font-bold truncate text-xs ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{res.productName}</div></div>
                                            <div className="py-1.5 text-center text-gray-600 border-r border-gray-100">{res.quantity}</div>
                                            <div className="py-1.5 px-2 text-xs text-gray-500 border-r border-gray-100 truncate">{res.phoneNumber || '-'}</div>
                                            <div className="py-1.5 px-2 text-xs text-gray-500 border-r border-gray-100 truncate">{res.memo}</div>
                                            <div className="py-1.5 text-center flex items-center justify-center gap-1">
                                                <button onClick={() => setEditingReservation(res)} className="p-1 rounded text-gray-300 hover:text-blue-500 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100" title="수정"><Pencil size={16} /></button>
                                                <button onClick={() => onUpdateReservation({ ...res, status: isCompleted ? 'PENDING' : 'COMPLETED' })} className={`p-1 rounded hover:bg-gray-100 transition-colors ${isCompleted ? 'text-green-600' : 'text-gray-300 hover:text-green-500'}`}><CheckCircle2 size={16} fill={isCompleted ? "currentColor" : "none"} className={isCompleted ? "text-green-100" : ""}/></button>
                                                <button onClick={() => { if(confirm('삭제하시겠습니까?')) onRemoveReservation(res.id); }} className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                     </div>
                </div>
            </div>

            {/* RIGHT PANEL: Timeline */}
            <div className="hidden lg:flex w-[300px] bg-gray-50 flex-col border-l border-gray-200 flex-shrink-0">
                <div className="p-4 border-b border-gray-200 bg-gray-100/50"><h3 className="font-bold text-gray-700 flex items-center gap-2"><CalendarIcon size={18} className="text-gray-500"/> 다가올 일정</h3></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {Object.keys(upcomingGroups).sort().map(dateStr => {
                        const date = new Date(dateStr);
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        const groupLabel = isToday ? '오늘 (Today)' : `${date.getMonth() + 1}/${date.getDate()} (${['일','월','화','수','목','금','토'][date.getDay()]})`;
                        return (
                            <div key={dateStr} className="animate-fade-in">
                                <h4 className={`text-xs font-bold uppercase mb-3 flex items-center gap-2 ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>{isToday && <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>}{groupLabel}</h4>
                                <div className="space-y-2 relative pl-4 border-l-2 border-gray-200">
                                    {upcomingGroups[dateStr].map(res => (
                                        <div key={res.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-colors relative">
                                            <div className="absolute -left-[21px] top-4 w-3 h-3 bg-gray-100 border-2 border-white rounded-full"></div>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-gray-800 text-sm">{res.time}</span>
                                                <span className={`text-[10px] px-1.5 rounded font-bold ${res.status === 'COMPLETED' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{res.status === 'COMPLETED' ? '완료' : '대기'}</span>
                                            </div>
                                            <div className="font-medium text-gray-700 text-sm truncate">{res.productName}</div>
                                            {res.specification && <div className="text-xs text-blue-600 font-medium mb-1">{res.specification}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {Object.keys(upcomingGroups).length === 0 && <div className="text-center py-10 text-gray-400"><p>예정된 일정이 없습니다.</p></div>}
                </div>
            </div>

            {/* Edit Modal */}
            {editingReservation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">예약 정보 수정</h3>
                            <button onClick={() => setEditingReservation(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                                <Trash2 size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">시간</label>
                                <input 
                                    type="time" 
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingReservation.time}
                                    onChange={(e) => setEditingReservation({...editingReservation, time: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">규격</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingReservation.specification || ''}
                                    onChange={(e) => setEditingReservation({...editingReservation, specification: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">모델명</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingReservation.productName}
                                    onChange={(e) => setEditingReservation({...editingReservation, productName: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">수량</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingReservation.quantity}
                                    onChange={(e) => setEditingReservation({...editingReservation, quantity: Number(e.target.value) || 1})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">연락처</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingReservation.phoneNumber}
                                    onChange={(e) => setEditingReservation({...editingReservation, phoneNumber: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">메모</label>
                                <textarea 
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    rows={3}
                                    value={editingReservation.memo || ''}
                                    onChange={(e) => setEditingReservation({...editingReservation, memo: e.target.value})}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setEditingReservation(null)}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                                >
                                    취소
                                </button>
                                <button 
                                    onClick={() => {
                                        onUpdateReservation(editingReservation);
                                        setEditingReservation(null);
                                    }}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                                >
                                    저장
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
    );
};

export default ReservationSystem;

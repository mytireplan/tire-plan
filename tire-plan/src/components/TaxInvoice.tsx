
import React, { useState, useMemo } from 'react';
import type { Sale } from '../types';
import { Send, CheckCircle, Loader2, Building, Filter, AlertCircle, Edit2, Save, X } from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface TaxInvoiceProps {
    sales: Sale[];
    onUpdateSale: (updatedSale: Sale) => void;
}

type Tab = 'REQUESTED' | 'ALL';

const TaxInvoice: React.FC<TaxInvoiceProps> = ({ sales, onUpdateSale }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('REQUESTED');
    const [loading, setLoading] = useState(false);
    
    // Edit Modal State
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [editForm, setEditForm] = useState({
        businessNumber: '',
        companyName: '',
        ceoName: '', // Mapped to customer.name
        email: ''
    });

    const [invoiceForm, setInvoiceForm] = useState({
        businessNumber: '',
        companyName: '',
        ceoName: '',
        email: ''
    });

    // Filter Sales Logic
    const filteredSales = useMemo(() => {
        let result = sales;
        if (activeTab === 'REQUESTED') {
            result = sales.filter(s => s.isTaxInvoiceRequested);
        }
        // Sort by date descending
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, activeTab]);

    const requestedCount = useMemo(() => sales.filter(s => s.isTaxInvoiceRequested).length, [sales]);

    const handleSelectSale = (sale: Sale) => {
        setSelectedSaleId(sale.id);
        // Pre-fill form with collected data
        setInvoiceForm({
            businessNumber: sale.customer?.businessNumber || '',
            companyName: sale.customer?.companyName || '',
            ceoName: sale.customer?.name || '',
            email: sale.customer?.email || ''
        });
        setStep(2);
    };

    const handleOpenEdit = (e: React.MouseEvent, sale: Sale) => {
        e.stopPropagation();
        setEditingSale(sale);
        setEditForm({
            businessNumber: sale.customer?.businessNumber || '',
            companyName: sale.customer?.companyName || '',
            ceoName: sale.customer?.name || '',
            email: sale.customer?.email || ''
        });
    };

    const handleSaveEdit = () => {
        if (editingSale) {
            const updatedSale: Sale = {
                ...editingSale,
                customer: {
                    ...editingSale.customer!,
                    businessNumber: editForm.businessNumber,
                    companyName: editForm.companyName,
                    name: editForm.ceoName,
                    email: editForm.email
                }
            };
            onUpdateSale(updatedSale);
            setEditingSale(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        // Simulate API Call to Popbill/Barobill
        setTimeout(() => {
            setLoading(false);
            setStep(3);
        }, 2000);
    };

    const reset = () => {
        setStep(1);
        setSelectedSaleId(null);
        setInvoiceForm({ businessNumber: '', companyName: '', ceoName: '', email: '' });
    };

    const selectedSale = sales.find(s => s.id === selectedSaleId);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-gray-800">전자세금계산서 발행</h2>
                <p className="text-gray-500 mt-2">국세청 연동 API를 시뮬레이션하는 페이지입니다.</p>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-center mb-8">
                <div className="flex items-center w-full max-w-md">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                    <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                    <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                </div>
            </div>

            {/* Step 1: Select Transaction */}
            {step === 1 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-fade-in overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        <button 
                            onClick={() => setActiveTab('REQUESTED')}
                            className={`flex-1 py-4 text-sm font-bold transition-colors relative ${activeTab === 'REQUESTED' ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            발행 요청 건 ({requestedCount}건)
                            {activeTab === 'REQUESTED' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                        </button>
                        <button 
                            onClick={() => setActiveTab('ALL')}
                            className={`flex-1 py-4 text-sm font-bold transition-colors relative ${activeTab === 'ALL' ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            전체 내역
                            {activeTab === 'ALL' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                        </button>
                    </div>

                    {/* List */}
                    <div className="p-4 space-y-3 min-h-[300px] bg-gray-50">
                        {filteredSales.map(sale => {
                            const bizInfo = sale.customer;
                            const isMissingInfo = !bizInfo?.businessNumber || !bizInfo?.email || !bizInfo?.companyName;
                            const isRequested = sale.isTaxInvoiceRequested;

                            return (
                                <div 
                                    key={sale.id}
                                    className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative"
                                >
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {isRequested && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">요청됨</span>
                                                )}
                                                {isMissingInfo && isRequested && (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded flex items-center gap-1">
                                                        <AlertCircle size={10} /> 정보 확인 필요
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-400">{new Date(sale.date).toLocaleDateString()}</span>
                                            </div>
                                            
                                            {/* Main Title: Company Name (CEO) */}
                                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                {bizInfo?.companyName || '상호 미입력'} 
                                                <span className="text-gray-500 font-normal text-base ml-1">({bizInfo?.name || '대표자 미입력'})</span>
                                            </h3>
                                            
                                            {/* Details Line */}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                                                <span>{bizInfo?.businessNumber || '사업자번호 없음'}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span>{bizInfo?.email || '이메일 없음'}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span>주문번호: {sale.id}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                            <div className="text-right mr-2">
                                                <div className="font-bold text-lg text-gray-900">{formatCurrency(sale.totalAmount)}</div>
                                                <div className="text-xs text-gray-400">공급가 {formatCurrency(Math.round(sale.totalAmount / 1.1))}</div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={(e) => handleOpenEdit(e, sale)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-colors"
                                                    title="정보 수정"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleSelectSale(sale)}
                                                    disabled={isRequested && isMissingInfo}
                                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                                                        isRequested && isMissingInfo 
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'
                                                    }`}
                                                >
                                                    선택하기
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredSales.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <Filter size={32} className="opacity-20 mb-2" />
                                <p>{activeTab === 'REQUESTED' ? '발행 요청된 내역이 없습니다.' : '거래 내역이 없습니다.'}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 2: Enter/Confirm Business Info */}
            {step === 2 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <Building className="text-blue-600" /> 공급받는자 정보 확인
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호</label>
                                <input 
                                    required
                                    type="text" 
                                    placeholder="000-00-00000"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={invoiceForm.businessNumber}
                                    onChange={e => setInvoiceForm({...invoiceForm, businessNumber: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">상호(법인명)</label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={invoiceForm.companyName}
                                    onChange={e => setInvoiceForm({...invoiceForm, companyName: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">대표자명</label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={invoiceForm.ceoName}
                                    onChange={e => setInvoiceForm({...invoiceForm, ceoName: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">이메일 (계산서 수신)</label>
                                <input 
                                    required
                                    type="email" 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={invoiceForm.email}
                                    onChange={e => setInvoiceForm({...invoiceForm, email: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg mt-6">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600">공급가액</span>
                                <span className="font-medium">{formatCurrency(Math.round(Number(selectedSale?.totalAmount || 0) / 1.1))}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600">세액 (10%)</span>
                                <span className="font-medium">{formatCurrency(Math.round((Number(selectedSale?.totalAmount || 0) / 1.1) * 0.1))}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                                <span className="font-bold text-lg">합계금액</span>
                                <span className="font-bold text-lg text-blue-600">{formatCurrency(selectedSale?.totalAmount)}</span>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button 
                                type="button" 
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                이전
                            </button>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                                {loading ? '전송 중...' : '국세청 전송 및 발행'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                        <CheckCircle size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">발행이 완료되었습니다!</h3>
                    <p className="text-gray-500 mb-8">
                        입력하신 이메일({invoiceForm.email})로<br/>전자세금계산서가 발송되었습니다.
                    </p>
                    <button 
                        onClick={reset}
                        className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                    >
                        다른 건 발행하기
                    </button>
                </div>
            )}

            {/* Edit Info Modal */}
            {editingSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl animate-scale-in">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="font-bold text-lg text-gray-800">사업자 정보 수정</h3>
                            <button onClick={() => setEditingSale(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">사업자등록번호</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editForm.businessNumber}
                                    onChange={e => setEditForm({...editForm, businessNumber: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">상호(법인명)</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editForm.companyName}
                                    onChange={e => setEditForm({...editForm, companyName: e.target.value})}
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">대표자명</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editForm.ceoName}
                                    onChange={e => setEditForm({...editForm, ceoName: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">이메일</label>
                                <input 
                                    type="email" 
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editForm.email}
                                    onChange={e => setEditForm({...editForm, email: e.target.value})}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setEditingSale(null)}
                                    className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50"
                                >
                                    취소
                                </button>
                                <button 
                                    onClick={handleSaveEdit}
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> 저장 완료
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaxInvoice;

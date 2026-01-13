
import React, { useState, useEffect } from 'react';
import type { Customer, Sale } from '../types';
import { Search, Users, Car, Phone, X, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface CustomerListProps {
    customers: Customer[];
    sales: Sale[];
}

const CustomerList: React.FC<CustomerListProps> = ({ customers, sales }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
        const [sortConfig, setSortConfig] = useState<{ key: 'lastVisitDate' | 'visitCount' | 'totalSpent'; direction: 'asc' | 'desc';}>({
                key: 'lastVisitDate',
                direction: 'desc'
        });
    const PAGE_SIZE = 15;

    // 검색 변경 시 페이지를 처음으로 리셋
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const filteredCustomers = customers.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phoneNumber?.includes(searchTerm) ||
        c.carModel?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedCustomers = [...filteredCustomers].sort((a, b) => {
        const getDate = (value: string) => {
            const time = new Date(value).getTime();
            return Number.isNaN(time) ? 0 : time;
        };

        let compare = 0;

        if (sortConfig.key === 'visitCount') {
            compare = a.visitCount - b.visitCount;
        } else if (sortConfig.key === 'totalSpent') {
            compare = a.totalSpent - b.totalSpent;
        } else {
            compare = getDate(a.lastVisitDate) - getDate(b.lastVisitDate);
        }

        if (compare === 0) {
            compare = getDate(b.lastVisitDate) - getDate(a.lastVisitDate);
        }

        return sortConfig.direction === 'asc' ? compare : -compare;
    });

    const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / PAGE_SIZE));
    const pagedCustomers = sortedCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleSort = (key: 'lastVisitDate' | 'visitCount' | 'totalSpent') => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
        setCurrentPage(1);
    };

    const renderSortIndicator = (key: 'lastVisitDate' | 'visitCount' | 'totalSpent') => {
        const isActive = sortConfig.key === key;
        const symbol = isActive ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕';
        return (
            <span className="ml-1 text-[10px] text-gray-400" aria-hidden>
                {symbol}
            </span>
        );
    };

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    startPage = Math.max(1, endPage - 4);
    const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, idx) => startPage + idx);

  // Helper function to get actual visit count from sales
  const getActualVisitCount = (customer: Customer): number => {
      return sales.filter(s => {
          const phoneMatch = s.customer?.phoneNumber && s.customer.phoneNumber === customer.phoneNumber;
          const vehicleMatch = (s.customer?.vehicleNumber || s.vehicleNumber) && 
                             (s.customer?.vehicleNumber === customer.vehicleNumber || 
                              s.vehicleNumber === customer.vehicleNumber);
          return phoneMatch || vehicleMatch;
      }).length;
  };

  // Filter sales for the selected customer (by phone OR vehicle number)
  const customerSales = selectedCustomer 
    ? sales.filter(s => {
        const phoneMatch = s.customer?.phoneNumber && s.customer.phoneNumber === selectedCustomer.phoneNumber;
        const vehicleMatch = (s.customer?.vehicleNumber || s.vehicleNumber) && 
                           (s.customer?.vehicleNumber === selectedCustomer.vehicleNumber || 
                            s.vehicleNumber === selectedCustomer.vehicleNumber);
        return phoneMatch || vehicleMatch;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col pb-6">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-blue-600" />
                고객 관리
            </h2>
            <p className="text-sm text-gray-500 mt-1">등록된 고객 정보를 조회하고 관리합니다.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder="이름, 전화번호, 키로수 검색" 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
         {/* Desktop Table View */}
         <div className="hidden md:block overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 sticky top-0">
                    <tr>
                        <th className="px-6 py-4">기객명</th>
                        <th className="px-6 py-4">연락처</th>
                        <th className="px-6 py-4">키로수</th>
                        <th
                            className="px-6 py-4 text-center cursor-pointer select-none"
                            onClick={() => handleSort('visitCount')}
                        >
                            방문 횟수
                            {renderSortIndicator('visitCount')}
                        </th>
                        <th 
                            className="px-6 py-4 text-right cursor-pointer select-none"
                            onClick={() => handleSort('totalSpent')}
                        >
                            총 이용 금액
                            {renderSortIndicator('totalSpent')}
                        </th>
                        <th 
                            className="px-6 py-4 cursor-pointer select-none"
                            onClick={() => handleSort('lastVisitDate')}
                        >
                            최근 방문일
                            {renderSortIndicator('lastVisitDate')}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredCustomers.length === 0 ? (
                         <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                <div className="flex flex-col items-center justify-center gap-2">
                                <Users size={32} className="opacity-20" />
                                <p>등록된 고객 정보가 없습니다.</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        pagedCustomers.map(customer => (
                            <tr 
                                key={customer.id} 
                                onClick={() => setSelectedCustomer(customer)}
                                className="hover:bg-blue-50 transition-colors cursor-pointer active:bg-blue-100"
                            >
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    {customer.name}
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="text-gray-400" />
                                        {customer.phoneNumber}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Car size={14} className="text-gray-400" />
                                        {customer.carModel || '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-blue-50 text-blue-600 py-1 px-2 rounded-full text-xs font-bold">
                                        {getActualVisitCount(customer)}회
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-700">
                                    {formatCurrency(customer.totalSpent)}
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-xs">
                                    {new Date(customer.lastVisitDate).toLocaleDateString()}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
         </div>

         {/* Mobile Card View */}
         <div className="md:hidden p-4 bg-gray-50 flex-1 overflow-y-auto">
             {filteredCustomers.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Users size={32} className="opacity-20 mb-2" />
                    <p>등록된 고객 정보가 없습니다.</p>
                 </div>
             ) : (
                 pagedCustomers.map(customer => (
                     <div 
                        key={customer.id} 
                        onClick={() => setSelectedCustomer(customer)}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 active:scale-[0.98] transition-transform"
                     >
                         <div className="flex justify-between items-start mb-2">
                             <div>
                                <h3 className="font-bold text-gray-900 text-lg">{customer.name}</h3>
                                <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
                                    <Phone size={12} /> {customer.phoneNumber}
                                </div>
                             </div>
                             <div className="text-right">
                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold">{getActualVisitCount(customer)}회 방문</span>
                             </div>
                         </div>
                         <div className="flex justify-between items-center border-t border-gray-50 pt-2 mt-2">
                             <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Car size={14} /> {customer.carModel || '-'}
                             </div>
                             <div className="text-right">
                                <div className="text-xs text-gray-400">총 이용 금액</div>
                                <div className="font-bold text-slate-700">{formatCurrency(customer.totalSpent)}</div>
                             </div>
                         </div>
                     </div>
                 ))
             )}
         </div>

         <div className="bg-white border-t border-gray-100 p-4 flex items-center justify-between text-sm text-gray-600">
            <span>총 {filteredCustomers.length}명 / {totalPages}페이지</span>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded-lg border ${currentPage === 1 ? 'text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed' : 'text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    이전
                </button>
                <div className="flex items-center gap-1">
                    {pageNumbers.map(page => (
                        <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg text-sm font-semibold ${page === currentPage ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            {page}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 rounded-lg border ${currentPage === totalPages ? 'text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed' : 'text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    다음
                </button>
            </div>
         </div>
      </div>

      {/* Customer Sales History Modal */}
      {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                      <div>
                          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                              <ShoppingBag size={20} className="text-blue-600"/> 고객 판매 내역
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                              {selectedCustomer.name} | {selectedCustomer.phoneNumber}
                              {selectedCustomer.vehicleNumber && <span className="ml-2">🚗 {selectedCustomer.vehicleNumber}</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold">
                                  방문 {customerSales.length}회
                              </span>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-bold">
                                  총 {formatCurrency(selectedCustomer.totalSpent)}
                              </span>
                          </div>
                      </div>
                      <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-0 bg-gray-50">
                    {customerSales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <ShoppingBag size={40} className="mb-2 opacity-20"/>
                            <p>구매 이력이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 p-4">
                            {customerSales.map(sale => (
                                <div key={sale.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
                                        <div>
                                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{new Date(sale.date).toLocaleDateString()}</span>
                                            <div className="text-xs text-gray-400 mt-1">주문번호: {sale.id}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900">{formatCurrency(sale.totalAmount)}</div>
                                            <div className="text-xs text-gray-500">{sale.paymentMethod}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {sale.items.map((item, idx) => (
                                            <div key={`${sale.id}-item-${idx}`} className="flex justify-between text-sm">
                                                <div className="text-gray-700">
                                                    <span className="font-medium">{item.productName}</span>
                                                    <span className="text-gray-400 text-xs ml-1">x {item.quantity}</span>
                                                </div>
                                                <div className="text-gray-600">{formatCurrency(item.priceAtSale * item.quantity)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                      <button 
                        onClick={() => setSelectedCustomer(null)}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                      >
                          닫기
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CustomerList;

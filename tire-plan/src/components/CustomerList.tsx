
import React, { useState } from 'react';
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

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phoneNumber.includes(searchTerm) ||
    c.carModel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter sales for the selected customer
  const customerSales = selectedCustomer 
    ? sales.filter(s => s.customer?.phoneNumber === selectedCustomer.phoneNumber)
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
                placeholder="이름, 전화번호, 차종 검색" 
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
                        <th className="px-6 py-4">고객명</th>
                        <th className="px-6 py-4">연락처</th>
                        <th className="px-6 py-4">차종</th>
                        <th className="px-6 py-4 text-center">방문 횟수</th>
                        <th className="px-6 py-4 text-right">총 이용 금액</th>
                        <th className="px-6 py-4">최근 방문일</th>
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
                        filteredCustomers.map(customer => (
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
                                        {customer.visitCount}회
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
                 filteredCustomers.map(customer => (
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
                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold">{customer.visitCount}회 방문</span>
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
                          </p>
                      </div>
                      <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600">
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

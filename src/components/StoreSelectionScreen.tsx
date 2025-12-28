
import React, { useState } from 'react';
import type { StoreAccount, UserRole, User } from '../types';
import { Store, LogOut, MapPin, ChevronRight, Building2, ShieldCheck, Lock, X } from 'lucide-react';

interface StoreSelectionScreenProps {
    stores: StoreAccount[];
    onSelectStore: (storeId: string, role: UserRole) => void;
    currentUser: User;
    onLogout: () => void;
    validateOwnerPin: (pin: string) => boolean;
}

const StoreSelectionScreen: React.FC<StoreSelectionScreenProps> = ({ stores, onSelectStore, onLogout, validateOwnerPin }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  const handleAdminLoginClick = () => {
      setShowPasswordModal(true);
      setPasswordInput('');
      setError('');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (validateOwnerPin(passwordInput)) {
          // Owner PIN login -> All stores as STORE_ADMIN
          setShowPasswordModal(false);
          onSelectStore('ALL', 'STORE_ADMIN');
      } else {
          setError('PIN이 일치하지 않습니다.');
      }
  };

  const handleStoreClick = (store: StoreAccount) => {
      // Direct Click -> Enter as STAFF for that store
      onSelectStore(store.id, 'STAFF');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 transition-colors duration-500">
      <div className="w-full max-w-5xl">
         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                    지점 선택
                </h1>
                <p className="mt-1 text-slate-500">
                    접속할 매장을 선택해주세요.
                </p>
            </div>
            
            <div className="flex items-center gap-3">
                 {/* Admin Login Button */}
                 <button
                    onClick={handleAdminLoginClick}
                    className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-sm bg-white text-slate-600 border border-gray-200 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200"
                 >
                     <Lock size={16} />
                     통합 로그인
                 </button>

                 <div className="w-px h-6 mx-1 bg-gray-300"></div>

                 <button 
                    onClick={onLogout} 
                    className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-colors bg-white text-slate-500 border border-gray-200 hover:text-red-600 hover:bg-red-50"
                 >
                    <LogOut size={16}/> 로그아웃
                 </button>
            </div>
         </div>

         {/* Store Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map(store => (
                <button 
                    key={store.id}
                    onClick={() => handleStoreClick(store)}
                    className="relative overflow-hidden h-48 flex flex-col justify-between p-6 rounded-2xl shadow-sm border transition-all group text-left bg-white border-gray-100 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1"
                >
                    {/* Background decoration */}
                    <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full transition-transform duration-500 ease-in-out group-hover:scale-150 bg-blue-50"></div>
                    
                    <div className="absolute top-6 right-6 transition-colors text-blue-100 group-hover:text-blue-500">
                        <Store size={32} />
                    </div>
                    
                    <div className="relative z-10">
                         <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold px-2 py-0.5 rounded border flex items-center gap-1 bg-slate-100 text-slate-600 border-slate-200">
                                <MapPin size={10}/> {store.regionName}
                            </span>
                            {store.isActive && (
                                <span className="flex items-center gap-1 bg-green-500/10 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded border border-green-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> 운영중
                                </span>
                            )}
                         </div>
                         <h3 className="text-xl font-bold mb-1 transition-colors text-slate-800 group-hover:text-blue-600">
                             {store.name}
                         </h3>
                    </div>

                    <div className="relative z-10 flex items-center text-sm font-bold mt-auto pt-4 border-t transition-colors border-gray-50 text-slate-400 group-hover:text-blue-600">
                        접속하기
                        <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform"/>
                    </div>
                </button>
            ))}
            
            {/* Add New Store Placeholder (Visual only) */}
            <div className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 min-h-[192px] border-gray-200 text-gray-400">
                <Building2 size={32} className="opacity-20"/>
                <p className="text-sm font-medium">새로운 지점 준비중</p>
                <p className="text-xs text-gray-300">본사 문의 필요</p>
            </div>
         </div>
      </div>

      {/* Admin Password Modal */}
      {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in relative">
                  <button 
                    onClick={() => setShowPasswordModal(false)} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  >
                      <X size={20} />
                  </button>
                  
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <ShieldCheck size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">PIN 인증</h3>
                      <p className="text-sm text-gray-500 mt-1">PIN으로 로그인하면 전체 지점으로 접속합니다.</p>
                  </div>

                  <form onSubmit={handlePasswordSubmit}>
                                            <input 
                                                autoFocus
                                                type="password" 
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                placeholder="PIN" 
                                                className="w-full p-3 border border-gray-300 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg"
                                                value={passwordInput}
                                                onChange={(e) => setPasswordInput(e.target.value)}
                                            />
                                            {error && <p className="text-xs text-red-500 text-center mb-3 font-bold">{error}</p>}
                      
                      <button 
                        type="submit"
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                      >
                          <Lock size={16} />
                          통합 로그인 진입
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default StoreSelectionScreen;

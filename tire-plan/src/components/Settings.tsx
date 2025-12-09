
import React, { useState } from 'react';
import type { Store, StaffPermissions, Staff } from '../types';
import { Settings as SettingsIcon, Plus, Trash2, Save, Lock, Users, MapPin, ShieldCheck, AlertCircle, Edit2, X, AlertTriangle, KeyRound, Check } from 'lucide-react';

interface SettingsProps {
  stores: Store[];
  onAddStore: (name: string) => void;
  onUpdateStore: (id: string, name: string) => void;
  onRemoveStore: (id: string) => void;
  
  staffPermissions: StaffPermissions;
  onUpdatePermissions: (perms: StaffPermissions) => void;
  
  currentAdminPassword: string;
  onUpdatePassword: (newPass: string) => void;

  staffList: Staff[];
  onAddStaff: (name: string) => void;
  onRemoveStaff: (id: string) => void;
  currentStoreId: string;
}

const Settings: React.FC<SettingsProps> = ({ 
    stores, onUpdateStore, onRemoveStore, 
  staffPermissions, onUpdatePermissions,
  currentAdminPassword, onUpdatePassword,
  staffList, onAddStaff, onRemoveStaff, currentStoreId
}) => {
  // Store Editing State
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editStoreNameInput, setEditStoreNameInput] = useState('');

  // Store Deleting State
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Password Change State
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
  const [pwdMessage, setPwdMessage] = useState({ text: '', isError: false });

  // Staff Management State
  const [newStaffName, setNewStaffName] = useState('');

  const openEditModal = (store: Store) => {
      setEditingStore(store);
      setEditStoreNameInput(store.name);
  };

  const saveEditStore = () => {
      if(editingStore && editStoreNameInput.trim()) {
          onUpdateStore(editingStore.id, editStoreNameInput.trim());
          setEditingStore(null);
          setEditStoreNameInput('');
      }
  };

  const openDeleteModal = (store: Store) => {
      setDeletingStore(store);
      setDeletePasswordInput('');
      setDeleteError('');
  };

  const confirmDeleteStore = (e: React.FormEvent) => {
      e.preventDefault();
      if(deletePasswordInput === currentAdminPassword) {
          if(deletingStore) {
              onRemoveStore(deletingStore.id);
              setDeletingStore(null);
              setDeletePasswordInput('');
              setDeleteError('');
          }
      } else {
          setDeleteError('비밀번호가 일치하지 않습니다.');
      }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.current !== currentAdminPassword) {
        setPwdMessage({ text: '현재 비밀번호가 일치하지 않습니다.', isError: true });
        return;
    }
    if (pwdForm.new.length < 4) {
        setPwdMessage({ text: '새 비밀번호는 4자리 이상이어야 합니다.', isError: true });
        return;
    }
    if (pwdForm.new !== pwdForm.confirm) {
        setPwdMessage({ text: '새 비밀번호가 일치하지 않습니다.', isError: true });
        return;
    }

    onUpdatePassword(pwdForm.new);
    setPwdMessage({ text: '비밀번호가 성공적으로 변경되었습니다.', isError: false });
    setPwdForm({ current: '', new: '', confirm: '' });
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (newStaffName.trim()) {
          onAddStaff(newStaffName.trim());
          setNewStaffName('');
      }
  };

  const currentStoreStaff = staffList.filter(s => s.storeId === currentStoreId);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10 relative">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <SettingsIcon className="text-gray-600" />
                시스템 환경 설정
            </h2>
            <p className="text-sm text-gray-500 mt-1">매장 관리, 직원 권한 및 관리자 보안 설정을 관리합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Store Management (Removed Add Feature) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
                <div className="mb-4">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <MapPin className="text-blue-600" size={20} />
                        운영 지점 목록
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        지점 정보 수정이 가능합니다. (추가는 플랫폼 관리자에게 문의)
                    </p>
                </div>
                
                <div className="flex-1 overflow-y-auto min-h-[200px] mb-4 border rounded-lg bg-gray-50">
                    {stores.map(store => (
                        <div key={store.id} className="flex justify-between items-center p-3 border-b border-gray-200 last:border-0 hover:bg-gray-50 group transition-colors">
                            <span className="font-medium text-gray-700">{store.name}</span>
                            <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => openEditModal(store)}
                                    className="text-blue-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors"
                                    title="수정"
                                >
                                    <Edit2 size={16} />
                                </button>
                                {/* Only allow delete if multiple stores exist, though logic might need to be stricter */}
                                {stores.length > 1 && (
                                    <button 
                                        onClick={() => openDeleteModal(store)}
                                        className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                                        title="폐점 (삭제)"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-700 flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>지점 추가/확장은 본사 승인 후 가능합니다.</span>
                </div>
            </div>

            {/* 2. Staff Management & Permissions */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <Users className="text-green-600" size={20} />
                    직원 목록 관리
                </h3>
                
                {/* Staff List */}
                <div className="flex-1 overflow-y-auto min-h-[150px] mb-4 border rounded-lg bg-gray-50">
                    {currentStoreStaff.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-6">
                            <Users size={24} className="opacity-20 mb-1"/>
                            <p className="text-xs">현재 지점에 등록된 직원이 없습니다.</p>
                        </div>
                    ) : (
                        currentStoreStaff.map(staff => (
                            <div key={staff.id} className="flex justify-between items-center p-3 border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                                        {staff.name[0]}
                                    </div>
                                    <div className="text-sm font-bold text-gray-800">{staff.name}</div>
                                </div>
                                <button 
                                    onClick={() => onRemoveStaff(staff.id)}
                                    className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors"
                                    title="삭제"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Staff Form */}
                <form onSubmit={handleAddStaffSubmit} className="flex gap-2 mb-6">
                    <input 
                        type="text" 
                        placeholder="직원 이름 (예: 홍길동)" 
                        className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                    />
                    <button 
                        type="submit"
                        disabled={!newStaffName.trim()}
                        className="bg-green-600 text-white px-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} />
                    </button>
                </form>

                <div className="border-t border-gray-100 pt-4 mt-auto">
                    <h4 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-1"><Lock size={14}/> 직원 모드 접근 권한 설정</h4>
                    <div className="space-y-2">
                        <PermissionToggle 
                            label="재고 관리" 
                            checked={staffPermissions.viewInventory}
                            onChange={(checked) => onUpdatePermissions({...staffPermissions, viewInventory: checked})}
                        />
                        <PermissionToggle 
                            label="매출 상세 내역" 
                            checked={staffPermissions.viewSalesHistory}
                            onChange={(checked) => onUpdatePermissions({...staffPermissions, viewSalesHistory: checked})}
                        />
                        <PermissionToggle 
                            label="세금계산서 발행" 
                            checked={staffPermissions.viewTaxInvoice}
                            onChange={(checked) => onUpdatePermissions({...staffPermissions, viewTaxInvoice: checked})}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* 3. Admin Security */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-gray-200 flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                     <ShieldCheck className="text-slate-800" size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-800">계정 보안 설정</h3>
                    <p className="text-xs text-slate-500">계정 비밀번호를 주기적으로 변경하여 보안을 강화하세요.</p>
                </div>
            </div>
            
            <div className="p-6 lg:p-8">
                <form onSubmit={handlePasswordChange} className="max-w-2xl mx-auto">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">현재 비밀번호</label>
                            <div className="relative">
                                <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="password" 
                                    value={pwdForm.current}
                                    onChange={e => setPwdForm({...pwdForm, current: e.target.value})}
                                    className="w-full pl-10 p-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none transition-all"
                                    placeholder="현재 사용 중인 비밀번호를 입력하세요"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호</label>
                                <div className="relative">
                                    <KeyRound size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                                    <input 
                                        type="password" 
                                        value={pwdForm.new}
                                        onChange={e => setPwdForm({...pwdForm, new: e.target.value})}
                                        className="w-full pl-10 p-3 bg-blue-50/30 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                        placeholder="변경할 비밀번호"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호 확인</label>
                                <div className="relative">
                                    <KeyRound size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                                    <input 
                                        type="password" 
                                        value={pwdForm.confirm}
                                        onChange={e => setPwdForm({...pwdForm, confirm: e.target.value})}
                                        className="w-full pl-10 p-3 bg-blue-50/30 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                        placeholder="비밀번호 재입력"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status Message Area */}
                        <div className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                            pwdMessage.text 
                                ? (pwdMessage.isError ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100') 
                                : 'bg-gray-50 border border-gray-100'
                        }`}>
                            <div className="flex items-center gap-2 text-sm font-medium">
                                {pwdMessage.text ? (
                                    <>
                                        {pwdMessage.isError ? <AlertCircle className="text-red-500" size={18}/> : <Check className="text-green-500" size={18}/>}
                                        <span className={pwdMessage.isError ? 'text-red-600' : 'text-green-700'}>{pwdMessage.text}</span>
                                    </>
                                ) : (
                                    <span className="text-gray-400 flex items-center gap-2"><AlertCircle size={16}/> 안전한 비밀번호 사용을 권장합니다.</span>
                                )}
                            </div>
                            <button 
                                type="submit"
                                className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-200"
                            >
                                <Save size={18} />
                                변경 내용 저장
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        {/* Edit Store Modal */}
        {editingStore && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-gray-900">매장명 수정</h3>
                        <button onClick={() => setEditingStore(null)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                    <input 
                        autoFocus
                        type="text" 
                        value={editStoreNameInput}
                        onChange={(e) => setEditStoreNameInput(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setEditingStore(null)}
                            className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50"
                        >
                            취소
                        </button>
                        <button 
                            onClick={saveEditStore}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                        >
                            저장
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Delete Store Confirmation Modal */}
        {deletingStore && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in border-t-4 border-red-500">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <AlertTriangle className="text-red-500" size={20}/> 매장 삭제 확인
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                <strong>{deletingStore.name}</strong>을(를) 삭제하시겠습니까?<br/>
                                해당 매장의 재고 정보가 모두 삭제될 수 있습니다.
                            </p>
                        </div>
                        <button onClick={() => setDeletingStore(null)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <form onSubmit={confirmDeleteStore}>
                         <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">비밀번호 입력 (본인 확인)</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input 
                                    autoFocus
                                    type="password" 
                                    value={deletePasswordInput}
                                    onChange={(e) => {
                                        setDeletePasswordInput(e.target.value);
                                        setDeleteError('');
                                    }}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                    placeholder="비밀번호 입력"
                                />
                            </div>
                            {deleteError && <p className="text-xs text-red-500 mt-2">{deleteError}</p>}
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                type="button"
                                onClick={() => setDeletingStore(null)}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50"
                            >
                                취소
                            </button>
                            <button 
                                type="submit"
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200"
                            >
                                삭제 확인
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

const PermissionToggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
        <div className="font-medium text-gray-700 text-sm">{label}</div>
        <button 
            onClick={() => onChange(!checked)}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

export default Settings;

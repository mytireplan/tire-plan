
import React, { useEffect, useState } from 'react';
import type { Store, Staff, StaffPermissions } from '../types';
import { Settings as SettingsIcon, Plus, Trash2, Users, MapPin, ShieldCheck, AlertCircle, Edit2, X, AlertTriangle, Eye, EyeOff, Check } from 'lucide-react';

interface SettingsProps {
  stores: Store[];
  onAddStore: (name: string) => void;
  onUpdateStore: (id: string, name: string) => void;
  onRemoveStore: (id: string) => void;
  
  currentAdminPassword: string;
  onUpdatePassword: (newPass: string) => void;

    currentOwnerPin: string;
    onUpdateOwnerPin: (newPin: string) => void;

    currentManagerPin: string;
    onUpdateManagerPin: (storeId: string, pin: string) => void;

  staffList: Staff[];
  onAddStaff: (name: string) => void;
  onRemoveStaff: (id: string) => void;
  currentStoreId: string;
    staffPermissions: StaffPermissions;
    onUpdatePermissions: (next: StaffPermissions) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
    stores, onUpdateStore, onRemoveStore, 
    currentAdminPassword, onUpdatePassword,
    currentOwnerPin, onUpdateOwnerPin,
    currentManagerPin, onUpdateManagerPin,
        staffList, onAddStaff, onRemoveStaff, currentStoreId,
        staffPermissions, onUpdatePermissions
}) => {
    // Permissions props reserved for future UI; referenced to satisfy lint
    void staffPermissions;
    void onUpdatePermissions;
  // Store Editing State
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editStoreNameInput, setEditStoreNameInput] = useState('');

  // Store Deleting State
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

    // Password Change State
    const [loginForm, setLoginForm] = useState({ current: '', new: '', confirm: '' });
    const [ownerForm, setOwnerForm] = useState({ current: '', new: '', confirm: '' });
    const [loginErrors, setLoginErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
    const [ownerErrors, setOwnerErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
    const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({
        loginCurrent: false,
        loginNew: false,
        loginConfirm: false,
        ownerCurrent: false,
        ownerNew: false,
        ownerConfirm: false,
    });
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [managerPinForm, setManagerPinForm] = useState({ current: '', next: '', confirm: '' });
    const [managerPinError, setManagerPinError] = useState('');
        const loginPasswordGuidelines: string[] = [
            '6자리 이상, 숫자와 영문을 조합해 주세요.',
            '최근 사용한 비밀번호는 피해주세요.',
            '공용 기기에서는 입력 후 화면을 가려주세요.'
        ];
        const ownerPinGuidelines: string[] = [
            '숫자 4~8자리로 설정해 주세요.',
            '사장님만 아는 번호로 관리하세요.',
            '민감 작업 추가 확인용으로 사용됩니다.'
        ];

  // Staff Management State
  const [newStaffName, setNewStaffName] = useState('');

  useEffect(() => {
      if (!toast) return;
      const timer = setTimeout(() => setToast(null), 2600);
      return () => clearTimeout(timer);
  }, [toast]);

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

  const handleInputChange = (kind: 'login' | 'owner', field: 'current' | 'new' | 'confirm', value: string) => {
      const setForm = kind === 'login' ? setLoginForm : setOwnerForm;
      const setErrors = kind === 'login' ? setLoginErrors : setOwnerErrors;
      setForm(prev => ({ ...prev, [field]: value }));
      setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const toggleVisibility = (key: keyof typeof passwordVisibility) => {
      setPasswordVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

    const validateLoginPasswordForm = (form: { current: string; new: string; confirm: string }) => {
      const errors: { current?: string; new?: string; confirm?: string } = {};

      if (!form.current) errors.current = '현재 비밀번호를 입력하세요.';
      else if (form.current !== currentAdminPassword) errors.current = '현재 비밀번호가 일치하지 않습니다.';

      if (!form.new) errors.new = '새 비밀번호를 입력하세요.';
      else {
          if (form.new.length < 6) errors.new = '6자리 이상으로 설정해 주세요.';
          else if (!/[0-9]/.test(form.new) || !/[A-Za-z]/.test(form.new)) errors.new = '숫자와 영문을 조합해 주세요.';
          else if (form.new === form.current) errors.new = '기존 비밀번호와 달라야 합니다.';
      }

      if (!form.confirm) errors.confirm = '비밀번호를 다시 입력하세요.';
      else if (form.confirm !== form.new) errors.confirm = '새 비밀번호가 일치하지 않습니다.';

      return errors;
  };

  const validateOwnerPinForm = (form: { current: string; new: string; confirm: string }) => {
      const errors: { current?: string; new?: string; confirm?: string } = {};

      if (!form.current) errors.current = '현재 PIN을 입력하세요.';
      else if (form.current !== currentOwnerPin) errors.current = '현재 PIN이 일치하지 않습니다.';

      if (!form.new) errors.new = '새 PIN을 입력하세요.';
      else {
          if (!/^[0-9]{4,8}$/.test(form.new)) errors.new = '숫자 4~8자리로 설정해 주세요.';
          else if (form.new === form.current) errors.new = '기존 PIN과 다르게 설정해 주세요.';
      }

      if (!form.confirm) errors.confirm = 'PIN을 다시 입력하세요.';
      else if (form.confirm !== form.new) errors.confirm = '새 PIN이 일치하지 않습니다.';

      return errors;
  };

  const handlePasswordSubmit = (kind: 'login' | 'owner') => (e: React.FormEvent) => {
      e.preventDefault();
      const form = kind === 'login' ? loginForm : ownerForm;
      const setErrors = kind === 'login' ? setLoginErrors : setOwnerErrors;
      const setForm = kind === 'login' ? setLoginForm : setOwnerForm;

      const errors = kind === 'login' ? validateLoginPasswordForm(form) : validateOwnerPinForm(form);
      setErrors(errors);
      if (Object.keys(errors).length > 0) {
          setToast({ type: 'error', message: '입력 값을 다시 확인해주세요.' });
          return;
      }

      if (kind === 'login') {
          onUpdatePassword(form.new);
          setToast({ type: 'success', message: '로그인 비밀번호를 변경했어요.' });
      } else {
          onUpdateOwnerPin(form.new);
          setToast({ type: 'success', message: '사장 PIN을 변경했어요.' });
      }
      setForm({ current: '', new: '', confirm: '' });
  };

  const handleManagerPinSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setManagerPinError('');
      const { current, next, confirm } = managerPinForm;
      if (!current || current !== currentManagerPin) {
          setManagerPinError('현재 점장 PIN이 일치하지 않습니다.');
          return;
      }
      if (!/^[0-9]{4,8}$/.test(next)) {
          setManagerPinError('숫자 4~8자리로 설정해 주세요.');
          return;
      }
      if (next === currentManagerPin) {
          setManagerPinError('기존 PIN과 다르게 설정해 주세요.');
          return;
      }
      if (next !== confirm) {
          setManagerPinError('새 PIN이 일치하지 않습니다.');
          return;
      }
      onUpdateManagerPin(currentStoreId, next);
      setToast({ type: 'success', message: '점장 PIN이 변경되었습니다.' });
      setManagerPinForm({ current: '', next: '', confirm: '' });
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (newStaffName.trim()) {
          onAddStaff(newStaffName.trim());
          setNewStaffName('');
      }
  };

    const currentStoreStaff = staffList; // already scoped by App

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10 relative">
        {toast && (
            <div className={`fixed top-6 right-6 z-40 px-4 py-3 rounded-lg shadow-lg border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                    {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                    <span>{toast.message}</span>
                </div>
            </div>
        )}
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

            </div>
        </div>

        {/* 3. Admin Security */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-gray-200 flex items-center gap-3 flex-wrap justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                         <ShieldCheck className="text-slate-800" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">계정 보안 설정</h3>
                                <p className="text-xs text-slate-500">로그인 비밀번호와 사장 PIN을 분리 관리하세요.</p>
                    </div>
                </div>
                <div className="text-[11px] text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">모바일에서는 한 컬럼으로 표시됩니다</div>
            </div>
            
            <div className="p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Login Password */}
                    <form onSubmit={handlePasswordSubmit('login')} className="rounded-xl border border-slate-100 bg-slate-50/60 p-5 shadow-sm flex flex-col gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-gray-800">로그인 비밀번호</h4>
                                <span className="text-[11px] text-gray-500">POS/포털 로그인</span>
                            </div>
                            <p className="text-xs text-gray-500">아이디 로그인에 사용하는 비밀번호입니다. 직원 공유를 피하고 주기적으로 변경하세요.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-700">현재 비밀번호</label>
                            <div className="relative">
                                <input 
                                    type={passwordVisibility.loginCurrent ? 'text' : 'password'}
                                    value={loginForm.current}
                                    onChange={(e) => handleInputChange('login', 'current', e.target.value)}
                                    className={`w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none transition-all ${loginErrors.current ? 'border-red-400 ring-red-100' : 'border-gray-300 bg-white'}`}
                                    placeholder="현재 비밀번호"
                                    autoComplete="current-password"
                                    aria-invalid={!!loginErrors.current}
                                />
                                <button 
                                    type="button"
                                    onClick={() => toggleVisibility('loginCurrent')}
                                    className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                                    aria-label="현재 비밀번호 보기 토글"
                                >
                                    {passwordVisibility.loginCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {loginErrors.current && <p className="text-xs text-red-600">{loginErrors.current}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-700">새 비밀번호</label>
                            <div className="relative">
                                <input 
                                    type={passwordVisibility.loginNew ? 'text' : 'password'}
                                    value={loginForm.new}
                                    onChange={(e) => handleInputChange('login', 'new', e.target.value)}
                                    className={`w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none transition-all ${loginErrors.new ? 'border-red-400 ring-red-100' : 'border-gray-300 bg-white'}`}
                                    placeholder="6자리 이상, 숫자+영문 조합"
                                    autoComplete="new-password"
                                    aria-invalid={!!loginErrors.new}
                                />
                                <button 
                                    type="button"
                                    onClick={() => toggleVisibility('loginNew')}
                                    className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                                    aria-label="새 비밀번호 보기 토글"
                                >
                                    {passwordVisibility.loginNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {loginErrors.new && <p className="text-xs text-red-600">{loginErrors.new}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-700">새 비밀번호 확인</label>
                            <div className="relative">
                                <input 
                                    type={passwordVisibility.loginConfirm ? 'text' : 'password'}
                                    value={loginForm.confirm}
                                    onChange={(e) => handleInputChange('login', 'confirm', e.target.value)}
                                    className={`w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none transition-all ${loginErrors.confirm ? 'border-red-400 ring-red-100' : 'border-gray-300 bg-white'}`}
                                    placeholder="한 번 더 입력"
                                    autoComplete="new-password"
                                    aria-invalid={!!loginErrors.confirm}
                                />
                                <button 
                                    type="button"
                                    onClick={() => toggleVisibility('loginConfirm')}
                                    className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                                    aria-label="새 비밀번호 확인 보기 토글"
                                >
                                    {passwordVisibility.loginConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {loginErrors.confirm && <p className="text-xs text-red-600">{loginErrors.confirm}</p>}
                        </div>

                        <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                            {loginPasswordGuidelines.map((item: string) => (
                                <div key={item} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                type="submit"
                                className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                            >
                                로그인 비밀번호 변경
                            </button>
                        </div>
                    </form>

                    {/* Owner/Admin PIN */}
                    <form onSubmit={handlePasswordSubmit('owner')} className="rounded-xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm flex flex-col gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-amber-900">사장 PIN 번호</h4>
                                <span className="text-[11px] text-amber-700">민감 작업 확인용</span>
                            </div>
                            <p className="text-xs text-amber-800">매장 삭제, 직원 권한 수정 등 사장님만 접근해야 하는 작업에 사용하는 숫자 PIN입니다.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-amber-900">현재 PIN</label>
                            <div className="relative">
                                <input 
                                    type={passwordVisibility.ownerCurrent ? 'text' : 'password'}
                                    value={ownerForm.current}
                                    onChange={(e) => handleInputChange('owner', 'current', e.target.value)}
                                    className={`w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all ${ownerErrors.current ? 'border-red-400 ring-red-100' : 'border-amber-200 bg-white'}`}
                                    placeholder="현재 PIN"
                                    autoComplete="current-password"
                                    aria-invalid={!!ownerErrors.current}
                                />
                                <button 
                                    type="button"
                                    onClick={() => toggleVisibility('ownerCurrent')}
                                    className="absolute inset-y-0 right-3 flex items-center text-amber-700"
                                    aria-label="현재 비밀번호 보기 토글"
                                >
                                    {passwordVisibility.ownerCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {ownerErrors.current && <p className="text-xs text-red-600">{ownerErrors.current}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-amber-900">새 PIN</label>
                            <div className="relative">
                                <input 
                                    type={passwordVisibility.ownerNew ? 'text' : 'password'}
                                    value={ownerForm.new}
                                    onChange={(e) => handleInputChange('owner', 'new', e.target.value)}
                                    className={`w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all ${ownerErrors.new ? 'border-red-400 ring-red-100' : 'border-amber-200 bg-white'}`}
                                    placeholder="숫자 4~8자리"
                                    autoComplete="new-password"
                                    aria-invalid={!!ownerErrors.new}
                                />
                                <button 
                                    type="button"
                                    onClick={() => toggleVisibility('ownerNew')}
                                    className="absolute inset-y-0 right-3 flex items-center text-amber-700"
                                    aria-label="새 비밀번호 보기 토글"
                                >
                                    {passwordVisibility.ownerNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {ownerErrors.new && <p className="text-xs text-red-600">{ownerErrors.new}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-amber-900">새 PIN 확인</label>
                            <div className="relative">
                                <input 
                                    type={passwordVisibility.ownerConfirm ? 'text' : 'password'}
                                    value={ownerForm.confirm}
                                    onChange={(e) => handleInputChange('owner', 'confirm', e.target.value)}
                                    className={`w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all ${ownerErrors.confirm ? 'border-red-400 ring-red-100' : 'border-amber-200 bg-white'}`}
                                    placeholder="한 번 더 입력"
                                    autoComplete="new-password"
                                    aria-invalid={!!ownerErrors.confirm}
                                />
                                <button 
                                    type="button"
                                    onClick={() => toggleVisibility('ownerConfirm')}
                                    className="absolute inset-y-0 right-3 flex items-center text-amber-700"
                                    aria-label="새 비밀번호 확인 보기 토글"
                                >
                                    {passwordVisibility.ownerConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {ownerErrors.confirm && <p className="text-xs text-red-600">{ownerErrors.confirm}</p>}
                        </div>

                        <div className="bg-white border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                            {ownerPinGuidelines.map((item: string) => (
                                <div key={item} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />{item}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                type="submit"
                                className="px-4 py-2.5 rounded-lg bg-amber-700 text-white text-sm font-bold hover:bg-amber-800 transition-colors"
                            >
                                사장 PIN 변경
                            </button>
                        </div>
                    </form>
                </div>

                {/* Manager PIN Change (Owner only) */}
                <div className="mt-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm max-w-xl">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">점장 PIN 변경</h4>
                                <p className="text-xs text-slate-500">현재 지점 점장 PIN을 변경합니다. 숫자 4~8자리 권장.</p>
                            </div>
                            <span className="text-[11px] text-slate-500">현재 지점: {stores.find(s => s.id === currentStoreId)?.name || '알 수 없음'}</span>
                        </div>
                        <form onSubmit={handleManagerPinSubmit} className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-slate-700">현재 PIN</label>
                                    <input
                                        type="password"
                                        value={managerPinForm.current}
                                        onChange={(e) => setManagerPinForm(prev => ({ ...prev, current: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                                        placeholder="현재 PIN"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-slate-700">새 PIN</label>
                                    <input
                                        type="password"
                                        value={managerPinForm.next}
                                        onChange={(e) => setManagerPinForm(prev => ({ ...prev, next: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                                        placeholder="숫자 4~8자리"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-slate-700">새 PIN 확인</label>
                                    <input
                                        type="password"
                                        value={managerPinForm.confirm}
                                        onChange={(e) => setManagerPinForm(prev => ({ ...prev, confirm: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                                        placeholder="다시 입력"
                                    />
                                </div>
                            </div>
                            {managerPinError && <p className="text-xs text-red-600">{managerPinError}</p>}
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
                                >
                                    점장 PIN 변경
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
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
                                <AlertCircle size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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

export default Settings;

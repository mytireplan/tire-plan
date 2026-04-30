
import React, { useEffect, useState } from 'react';
import type { Store, Staff, StaffPermissions, ManagerAccount, ManagerTabPermissions, Subscription, BillingKey, PaymentHistory, SubscriptionPlan } from '../types';
import { Settings as SettingsIcon, Plus, Trash2, Users, MapPin, ShieldCheck, AlertCircle, Edit2, X, AlertTriangle, Eye, EyeOff, Check, CreditCard } from 'lucide-react';
import SubscriptionManagement from './SubscriptionManagement';

interface SettingsProps {
  stores: Store[];
  onAddStore: (name: string) => void;
  onUpdateStore: (id: string, name: string) => void;
  onRemoveStore: (id: string) => void;
  onUpdateStorePassword?: (storeId: string, password: string) => void;
  onToggleStorePasswordRequired?: (storeId: string, required: boolean) => void;
  
  currentAdminPassword: string;
    onUpdatePassword: (newPass: string) => Promise<void>;

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
    
  // Subscription props
  currentSubscription?: Subscription | null;
  billingKeys?: BillingKey[];
  paymentHistory?: PaymentHistory[];
  onSelectSubscriptionPlan?: (plan: SubscriptionPlan, billingCycle: 'MONTHLY' | 'YEARLY', billingKeyId?: string) => Promise<void>;
  onCancelSubscription?: () => Promise<void>;
  ownerId?: string;
  // 점장 계정 관리
  isOwnerSession: boolean;
  managerAccounts: ManagerAccount[];
  onAddManager: (account: Omit<ManagerAccount, 'id' | 'ownerId'>) => Promise<void>;
  onUpdateManager: (id: string, updates: Partial<ManagerAccount>) => Promise<void>;
  onRemoveManager: (id: string) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ 
    stores, onUpdateStore, onRemoveStore, 
    onUpdateStorePassword, onToggleStorePasswordRequired,
    currentAdminPassword, onUpdatePassword,
    currentOwnerPin, onUpdateOwnerPin,
    currentManagerPin, onUpdateManagerPin,
        staffList, onAddStaff, onRemoveStaff, currentStoreId,
        staffPermissions, onUpdatePermissions,
        currentSubscription = null,
        billingKeys = [],
        paymentHistory = [],
        onSelectSubscriptionPlan,
        onCancelSubscription,
        ownerId = '',
        isOwnerSession,
        managerAccounts,
        onAddManager,
        onUpdateManager,
        onRemoveManager,
}) => {
    // Tab Navigation State
    const [activeSettingsTab, setActiveSettingsTab] = useState<'system' | 'subscription'>('system');
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

  // 점장 계정 관리 상태
  const DEFAULT_TAB_PERMS: ManagerTabPermissions = {
      dashboard: true, pos: true, reservation: true, history: true, incentive: true,
      dailyClose: true, dailyReport: true, tax: true,
      inventory: true, stockIn: true, financials: true, leave: true,
  };
  const TAB_LABELS: Record<keyof ManagerTabPermissions, string> = {
      dashboard: '대시보드', pos: '판매(POS)', reservation: '예약 관리',
      history: '판매 내역', incentive: '인센티브', dailyClose: '일별 마감', dailyReport: '보고서 게시판',
      tax: '세금계산서', inventory: '재고 관리', stockIn: '입고 관리',
      financials: '재무/결산', leave: '근무표',
  };
  // 일반 직원 탭 설정 — dailyClose는 원래 직원에게 안 보임 (admin 전용)
  const STAFF_TAB_LABELS: Record<keyof import('../types').StaffPermissions, string> = {
      dashboard: '대시보드', pos: '판매(POS)', reservation: '예약 관리',
      history: '판매 내역', dailyReport: '보고서 게시판',
      tax: '세금계산서', inventory: '재고 관리', stockIn: '입고 관리',
      financials: '지출', leave: '근무표',
  };
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<ManagerAccount | null>(null);
  const [managerForm, setManagerForm] = useState<{
      name: string; loginId: string; password: string; storeId: string; tabPermissions: ManagerTabPermissions;
  }>({ name: '', loginId: '', password: '', storeId: '', tabPermissions: { ...DEFAULT_TAB_PERMS } });
  const [managerFormError, setManagerFormError] = useState('');
  const [draftStaffPermissions, setDraftStaffPermissions] = useState<StaffPermissions>(staffPermissions);

  useEffect(() => {
      setDraftStaffPermissions(staffPermissions);
  }, [staffPermissions]);

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

    const handlePasswordSubmit = (kind: 'login' | 'owner') => async (e: React.FormEvent) => {
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
          try {
              await onUpdatePassword(form.new);
              setToast({ type: 'success', message: '로그인 비밀번호를 변경했어요.' });
              setForm({ current: '', new: '', confirm: '' });
          } catch (err) {
              console.error('❌ Failed to update login password:', err);
              setToast({ type: 'error', message: '로그인 비밀번호 변경에 실패했습니다.' });
          }
          return;
      }

      onUpdateOwnerPin(form.new);
      setToast({ type: 'success', message: '사장 PIN을 변경했어요.' });
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
        
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveSettingsTab('system')}
              className={`flex-1 px-6 py-4 font-medium text-center border-b-2 transition-colors ${
                activeSettingsTab === 'system'
                  ? 'text-blue-600 border-blue-600 bg-blue-50'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              시스템 환경 설정
            </button>
            <button
              onClick={() => setActiveSettingsTab('subscription')}
              className={`flex-1 px-6 py-4 font-medium text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
                activeSettingsTab === 'subscription'
                  ? 'text-blue-600 border-blue-600 bg-blue-50'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <CreditCard size={18} />
              구독관리
            </button>
          </div>
        </div>
        
        {/* System Settings Tab */}
        {activeSettingsTab === 'system' && (
        <>
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
                        <div key={store.id} className="p-3 border-b border-gray-200 last:border-0 hover:bg-gray-50 group transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-gray-700">{store.name}</span>
                                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openEditModal(store)}
                                        className="text-blue-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors"
                                        title="수정"
                                    >
                                        <Edit2 size={16} />
                                    </button>
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
                            
                            {/* Store Password Settings */}
                            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={store.requiresPassword || false}
                                            onChange={(e) => {
                                                if (onToggleStorePasswordRequired) {
                                                    onToggleStorePasswordRequired(store.id, e.target.checked);
                                                }
                                            }}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-700 font-medium">진입 시 비밀번호 필요</span>
                                    </label>
                                </div>
                                {store.requiresPassword && (
                                    <button
                                        onClick={() => {
                                            const newPassword = prompt(`${store.name} 비밀번호 변경 (숫자 4자리 권장):`, store.storePassword || '1234');
                                            if (newPassword && onUpdateStorePassword) {
                                                onUpdateStorePassword(store.id, newPassword);
                                            }
                                        }}
                                        className="px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
                                    >
                                        비밀번호 변경
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

        {/* 점장 계정 관리 (사장 세션에서만 표시) */}
        {isOwnerSession && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <ShieldCheck className="text-violet-600" size={20} />
                    점장 계정 관리
                </h3>
                <button
                    onClick={() => {
                        setEditingManager(null);
                        setManagerForm({ name: '', loginId: '', password: '', storeId: currentStoreId, tabPermissions: { ...DEFAULT_TAB_PERMS } });
                        setManagerFormError('');
                        setIsManagerModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700"
                >
                    <Plus size={16} /> 계정 추가
                </button>
            </div>
            {managerAccounts.length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm border rounded-lg bg-gray-50">
                    등록된 점장 계정이 없습니다.
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    {managerAccounts.map(manager => (
                        <div key={manager.id} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                                    {manager.name[0]}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-800">{manager.name}</div>
                                    <div className="text-xs text-gray-500">아이디: {manager.loginId}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => {
                                    setEditingManager(manager);
                                    setManagerForm({
                                        name: manager.name,
                                        loginId: manager.loginId,
                                        password: manager.password,
                                        storeId: manager.storeId,
                                        tabPermissions: { ...DEFAULT_TAB_PERMS, ...manager.tabPermissions },
                                    });
                                    setManagerFormError('');
                                    setIsManagerModalOpen(true);
                                }} className="text-blue-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => {
                                    if (confirm(`${manager.name} 계정을 삭제하시겠습니까?`)) {
                                        onRemoveManager(manager.id);
                                    }
                                }} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        )}

        {/* 일반 직원 탭 설정 (사장 세션에서만 표시) */}
        {isOwnerSession && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="mb-4">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <Users className="text-blue-600" size={20} />
                    일반 직원 탭 설정
                </h3>
                <p className="text-xs text-gray-500 mt-1">일반 직원 모드(잠금 후 기본 화면)에서 표시할 메뉴를 설정합니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {(Object.keys(STAFF_TAB_LABELS) as (keyof import('../types').StaffPermissions)[]).map(key => (
                    <label key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
                        <span className="text-sm text-gray-700">{STAFF_TAB_LABELS[key]}</span>
                        <div
                            onClick={() => setDraftStaffPermissions(prev => ({ ...prev, [key]: !prev[key] }))}
                            className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors flex-shrink-0 ${draftStaffPermissions[key] ? 'bg-blue-500' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${draftStaffPermissions[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                    </label>
                ))}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={() => setDraftStaffPermissions(staffPermissions)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    취소
                </button>
                <button
                    type="button"
                    onClick={() => {
                        onUpdatePermissions(draftStaffPermissions);
                        setToast({ type: 'success', message: '일반 직원 탭 설정이 저장되었습니다.' });
                    }}
                    className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
                >
                    <Check size={14} />
                    설정 저장
                </button>
            </div>
        </div>
        )}

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

                        <div className="border-t border-slate-200 pt-4 mt-4">
                            <div className="mb-3">
                                <h5 className="text-xs font-bold text-slate-900 mb-1">비밀번호 분실 시 초기화</h5>
                                <p className="text-xs text-slate-500">기존 비밀번호를 모를 때 기본 비밀번호(admin1234)로 초기화합니다.</p>
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!confirm('로그인 비밀번호를 기본값(admin1234)으로 초기화하시겠습니까?')) return;
                                    try {
                                        await onUpdatePassword('admin1234');
                                        setToast({ type: 'success', message: '로그인 비밀번호가 admin1234로 초기화되었습니다.' });
                                        setLoginForm({ current: '', new: '', confirm: '' });
                                    } catch (err) {
                                        console.error('❌ Failed to reset login password:', err);
                                        setToast({ type: 'error', message: '로그인 비밀번호 초기화에 실패했습니다.' });
                                    }
                                }}
                                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                            >
                                초기화
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

                        <div className="border-t border-amber-200 pt-4 mt-4">
                            <div className="mb-3">
                                <h5 className="text-xs font-bold text-amber-900 mb-1">PIN 분실 시 초기화</h5>
                                <p className="text-xs text-amber-700">기존 PIN을 모를 때 기본 PIN(1234)으로 초기화합니다.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm('사장 PIN을 기본값(1234)으로 초기화하시겠습니까?')) {
                                        onUpdateOwnerPin('1234');
                                        setToast({ type: 'success', message: '사장 PIN이 1234로 초기화되었습니다.' });
                                        setOwnerForm({ current: '', new: '', confirm: '' });
                                    }
                                }}
                                className="w-full px-4 py-2.5 rounded-lg bg-amber-700 text-white text-sm font-bold hover:bg-amber-800 transition-colors"
                            >
                                초기화
                            </button>
                        </div>
                    </form>
                </div>

                {/* Manager PIN Change (Owner only) */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Change Existing PIN */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-3">
                            <h4 className="text-sm font-bold text-slate-900">점장 PIN 변경</h4>
                            <p className="text-xs text-slate-500 mt-1">현재 PIN을 알 때 사용합니다. 숫자 4~8자리 권장.</p>
                        </div>
                        <form onSubmit={handleManagerPinSubmit} className="space-y-3">
                            <div className="flex flex-col gap-3">
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
                                    PIN 변경
                                </button>
                            </div>

                            <div className="border-t border-slate-200 pt-4 mt-4">
                                <div className="mb-3">
                                    <h5 className="text-xs font-bold text-slate-900 mb-1">PIN 분실 시 초기화</h5>
                                    <p className="text-xs text-slate-500">현재 PIN을 모를 때 기본 PIN(1234)으로 초기화합니다.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirm(`${stores.find(s => s.id === currentStoreId)?.name}의 점장 PIN을 1234로 초기화하시겠습니까?`)) {
                                            onUpdateManagerPin(currentStoreId, '1234');
                                            setToast({ type: 'success', message: '점장 PIN이 1234로 초기화되었습니다.' });
                                            setManagerPinForm({ current: '', next: '', confirm: '' });
                                        }
                                    }}
                                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                                >
                                    초기화
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Empty placeholder for grid balance */}
                    <div></div>
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
        </>
        )}
        
        {/* Subscription Management Tab */}
        {activeSettingsTab === 'subscription' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <SubscriptionManagement
              ownerId={ownerId}
              currentSubscription={currentSubscription || null}
              billingKeys={billingKeys}
              paymentHistory={paymentHistory}
              onSelectPlan={onSelectSubscriptionPlan || (async () => {})}
              onCancelSubscription={onCancelSubscription || (async () => {})}
              onAddBillingKey={() => {}}
            />
        </div>
        )}

        {/* 점장 계정 추가/수정 모달 */}
        {isManagerModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-gray-900">
                            {editingManager ? '점장 계정 수정' : '점장 계정 추가'}
                        </h3>
                        <button onClick={() => setIsManagerModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-3 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">이름</label>
                            <input type="text" value={managerForm.name}
                                onChange={e => setManagerForm(p => ({ ...p, name: e.target.value }))}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none"
                                placeholder="예: 김점장" autoFocus />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">아이디</label>
                            <input type="text" value={managerForm.loginId}
                                onChange={e => setManagerForm(p => ({ ...p, loginId: e.target.value }))}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none"
                                placeholder="로그인 시 사용할 아이디" autoComplete="off" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                비밀번호{editingManager && <span className="text-gray-400 font-normal ml-1">(변경 시에만 입력)</span>}
                            </label>
                            <input type="password" value={managerForm.password}
                                onChange={e => setManagerForm(p => ({ ...p, password: e.target.value }))}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none"
                                placeholder={editingManager ? '변경 시에만 입력' : '비밀번호'} autoComplete="new-password" />
                        </div>
                    </div>

                    {/* 탭 권한 토글 */}
                    <div className="border-t pt-4 mb-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-3">메뉴 접근 권한</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(TAB_LABELS) as (keyof ManagerTabPermissions)[]).map(key => (
                                <label key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
                                    <span className="text-sm text-gray-700">{TAB_LABELS[key]}</span>
                                    <div
                                        onClick={() => setManagerForm(p => ({
                                            ...p,
                                            tabPermissions: { ...p.tabPermissions, [key]: !p.tabPermissions[key] }
                                        }))}
                                        className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors flex-shrink-0 ${managerForm.tabPermissions[key] ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${managerForm.tabPermissions[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {managerFormError && <p className="text-sm text-red-600 mb-3">{managerFormError}</p>}

                    <div className="flex gap-2">
                        <button type="button" onClick={() => setIsManagerModalOpen(false)}
                            className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50">취소</button>
                        <button type="button"
                            onClick={async () => {
                                if (!managerForm.name.trim()) { setManagerFormError('이름을 입력하세요.'); return; }
                                if (!managerForm.loginId.trim()) { setManagerFormError('아이디를 입력하세요.'); return; }
                                if (!editingManager && !managerForm.password.trim()) { setManagerFormError('비밀번호를 입력하세요.'); return; }
                                setManagerFormError('');
                                try {
                                    if (editingManager) {
                                        const updates: Partial<ManagerAccount> = {
                                            name: managerForm.name.trim(),
                                            loginId: managerForm.loginId.trim(),
                                            tabPermissions: managerForm.tabPermissions,
                                        };
                                        if (managerForm.password.trim()) updates.password = managerForm.password.trim();
                                        await onUpdateManager(editingManager.id, updates);
                                    } else {
                                        await onAddManager({
                                            name: managerForm.name.trim(),
                                            loginId: managerForm.loginId.trim(),
                                            password: managerForm.password.trim(),
                                            storeId: managerForm.storeId || currentStoreId,
                                            isActive: true,
                                            tabPermissions: managerForm.tabPermissions,
                                        });
                                    }
                                    setIsManagerModalOpen(false);
                                    setToast({ type: 'success', message: editingManager ? '점장 계정이 수정되었습니다.' : '점장 계정이 추가되었습니다.' });
                                } catch {
                                    setManagerFormError('저장 중 오류가 발생했습니다.');
                                }
                            }}
                            className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg font-bold hover:bg-violet-700">
                            {editingManager ? '저장' : '추가'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Settings;

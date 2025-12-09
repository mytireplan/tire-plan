
import React, { useState, useMemo } from 'react';
import type { StoreAccount, User } from '../types';
import { ShieldCheck, Plus, Search, MapPin, RefreshCw, Trash2, LogOut, Store as StoreIcon, Save, X, User as UserIcon, Building, ChevronRight, ChevronDown, Phone, AlertTriangle, KeyRound, Edit2, PauseCircle, PlayCircle } from 'lucide-react';

interface SuperAdminDashboardProps {
    stores: StoreAccount[];
    users: {id: string, name: string, phoneNumber?: string, joinDate: string}[]; // Need users list to map names and phones
    onCreateOwner: (name: string, region: string, phoneNumber: string, branchName: string) => void;
    onUpdateOwner: (id: string, updates: { name?: string, phoneNumber?: string, status?: boolean, password?: string }) => void;
    onAddBranch: (ownerId: string, branchName: string, region: string) => void;
    onResetPassword: (code: string) => void;
    onDeleteStore: (storeId: string) => void; // Delete specific branch
    onDeleteOwner: (ownerId: string) => void; // Delete entire account
    onLogout: () => void;
}

const REGIONS = [
    { code: '01', name: '서울' },
    { code: '02', name: '경기' },
    { code: '03', name: '인천' },
    { code: '04', name: '강원' },
    { code: '05', name: '충청' },
    { code: '06', name: '전라' },
    { code: '07', name: '경상' },
    { code: '08', name: '제주' },
];

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ 
    stores, users, onCreateOwner, onUpdateOwner, onAddBranch, onResetPassword, onDeleteStore, onDeleteOwner, onLogout 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Action Confirmation State
    const [actionConfirm, setActionConfirm] = useState<{
        isOpen: boolean;
        type: 'RESET_PWD' | 'DELETE_OWNER' | null;
        targetId: string;
        targetName: string;
    }>({ isOpen: false, type: null, targetId: '', targetName: '' });

    // Create Owner Form
    const [newOwnerRegion, setNewOwnerRegion] = useState('01');
    const [newOwnerName, setNewOwnerName] = useState('');
    const [newOwnerPhone, setNewOwnerPhone] = useState('');
    const [newBranchName, setNewBranchName] = useState('');

    // Detail Modal State
    const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
    const [isAddBranchMode, setIsAddBranchMode] = useState(false);
    const [addBranchName, setAddBranchName] = useState('');
    const [addBranchRegion, setAddBranchRegion] = useState('01');

    // Edit Owner Modal State
    const [editOwner, setEditOwner] = useState<{
        isOpen: boolean;
        id: string;
        name: string;
        phone: string;
        isActive: boolean;
        password?: string;
    }>({ isOpen: false, id: '', name: '', phone: '', isActive: true });

    // Group Stores by Owner
    const owners = useMemo(() => {
        const ownerMap = new Map<string, { id: string, name: string, phoneNumber: string, branches: StoreAccount[], joinDate: string, isActive: boolean }>();
        
        // Populate from Users list first
        users.filter(u => u.id !== '99999').forEach(u => {
            // Determine active status from stores (if any store is active, user is active?)
            // Actually, better to check if ALL stores are inactive -> Pause.
            // For now, let's assume if at least one store exists and is active, the owner is active.
            // But we will override this based on store data below.
            ownerMap.set(u.id, {
                id: u.id,
                name: u.name,
                phoneNumber: u.phoneNumber || '-',
                branches: [],
                joinDate: u.joinDate || '-', // Use actual joinDate
                isActive: true // Default
            });
        });

        // Add Master manually if not in filtered list (though filter above removed it, we want it in the list if it exists in users)
        const master = users.find(u => u.id === '999999');
        if (master) {
             ownerMap.set(master.id, {
                id: master.id,
                name: master.name,
                phoneNumber: master.phoneNumber || '-',
                branches: [],
                joinDate: master.joinDate || '-',
                isActive: true
            });
        }

        // Map branches to owners
        stores.forEach(store => {
            const owner = ownerMap.get(store.ownerId);
            if (owner) {
                owner.branches.push(store);
                // If any branch is active, owner is potentially active.
                // But simplified logic: Owner status reflects the status of their stores generally.
                // If user sets "Pause", all stores become inactive.
                // We'll take the status of the first store as representative for the owner
                if (owner.branches.length === 1) {
                    owner.isActive = store.isActive;
                }
            } 
        });

        return Array.from(ownerMap.values());
    }, [stores, users]);

    const filteredOwners = owners.filter(o => 
        o.name.includes(searchTerm) || o.id.includes(searchTerm) || o.phoneNumber.includes(searchTerm)
    );

    // Helper to format phone number
    const formatPhoneNumber = (value: string) => {
      const raw = value.replace(/[^0-9]/g, '');
      if (raw.length <= 3) return raw;
      if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
      return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(newOwnerName.trim() && newOwnerPhone.trim()) {
            onCreateOwner(newOwnerName.trim(), newOwnerRegion, newOwnerPhone.trim(), newBranchName.trim());
            setNewOwnerName('');
            setNewOwnerRegion('01');
            setNewOwnerPhone('');
            setNewBranchName('');
            setIsCreateModalOpen(false);
        }
    };

    const handleEditOwnerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editOwner.id === '999999') {
            // Master: Only Password
            if (editOwner.password) {
                onUpdateOwner(editOwner.id, { password: editOwner.password });
            }
        } else {
            // Normal: Name, Phone, Status
            onUpdateOwner(editOwner.id, {
                name: editOwner.name,
                phoneNumber: editOwner.phone,
                status: editOwner.isActive
            });
        }
        setEditOwner({ ...editOwner, isOpen: false });
    };

    const openEditModal = (owner: typeof owners[0]) => {
        setEditOwner({
            isOpen: true,
            id: owner.id,
            name: owner.name,
            phone: owner.phoneNumber,
            isActive: owner.isActive,
            password: '' // Reset password field
        });
    };

    const handleAddBranchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedOwnerId && addBranchName.trim()) {
            onAddBranch(selectedOwnerId, addBranchName.trim(), addBranchRegion);
            setAddBranchName('');
            setIsAddBranchMode(false);
        }
    };

    const handleExecuteAction = () => {
        if (actionConfirm.type === 'RESET_PWD') {
            onResetPassword(actionConfirm.targetId);
        } else if (actionConfirm.type === 'DELETE_OWNER') {
            onDeleteOwner(actionConfirm.targetId);
        }
        setActionConfirm({ isOpen: false, type: null, targetId: '', targetName: '' });
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Top Bar */}
            <header className="bg-slate-900 text-white h-16 flex items-center justify-between px-6 shadow-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <ShieldCheck size={20} className="text-white" />
                    </div>
                    <h1 className="font-bold text-lg tracking-tight">Super Admin <span className="text-slate-400 text-sm font-normal">| 시스템 관리자</span></h1>
                </div>
                <button 
                    onClick={onLogout}
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-lg"
                >
                    <LogOut size={16} /> 로그아웃
                </button>
            </header>

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">고객사(Owner) 관리</h2>
                        <p className="text-slate-500 text-sm mt-1">총 <span className="font-bold text-blue-600">{owners.length}</span>명의 사장님과 계약 중입니다.</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="사장님 성함, ID, 전화번호 검색" 
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md whitespace-nowrap"
                        >
                            <Plus size={20} /> 고객사 생성 (신규)
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Owner ID</th>
                                    <th className="px-6 py-4">대표자명</th>
                                    <th className="px-6 py-4">연락처</th>
                                    <th className="px-6 py-4 text-center">운영 지점</th>
                                    <th className="px-6 py-4 text-center">가입일</th>
                                    <th className="px-6 py-4 text-center">계정 상태</th>
                                    <th className="px-6 py-4 text-center">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOwners.map(owner => (
                                    <tr key={owner.id} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-700">
                                            {owner.id}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900 text-base flex items-center gap-2">
                                            <UserIcon size={16} className="text-gray-400"/>
                                            {owner.name}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {owner.phoneNumber}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => setSelectedOwnerId(owner.id)}
                                                className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-200 transition-colors"
                                            >
                                                <Building size={12} /> {owner.branches.length}개 지점
                                                <ChevronRight size={12} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-500">
                                            {owner.joinDate}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {owner.isActive ? (
                                                <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-20 mx-auto">
                                                    <PlayCircle size={10} /> Active
                                                </span>
                                            ) : (
                                                <span className="text-orange-600 bg-orange-100 px-2 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-20 mx-auto">
                                                    <PauseCircle size={10} /> Pause
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 flex justify-center gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openEditModal(owner); }}
                                                className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-white hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center gap-1 text-xs font-bold"
                                                title="정보 수정"
                                            >
                                                <Edit2 size={14} /> 수정
                                            </button>
                                            
                                            {/* Master Account Logic: No PWD Reset, No Delete */}
                                            {owner.id !== '999999' && (
                                                <>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActionConfirm({
                                                                isOpen: true,
                                                                type: 'RESET_PWD',
                                                                targetId: owner.id,
                                                                targetName: owner.name
                                                            });
                                                        }}
                                                        className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-white hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center gap-1 text-xs font-bold"
                                                        title="비밀번호 초기화"
                                                    >
                                                        <RefreshCw size={14} /> PWD 초기화
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActionConfirm({
                                                                isOpen: true,
                                                                type: 'DELETE_OWNER',
                                                                targetId: owner.id,
                                                                targetName: owner.name
                                                            });
                                                        }}
                                                        className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                                        title="계정 전체 삭제"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredOwners.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                            검색된 고객사가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Owner Detail & Add Branch Modal (Existing) */}
            {selectedOwnerId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Building className="text-blue-600" />
                                    {owners.find(o => o.id === selectedOwnerId)?.name} 사장님
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">보유 지점 관리 및 추가</p>
                            </div>
                            <button onClick={() => { setSelectedOwnerId(null); setIsAddBranchMode(false); }} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-white">
                            {/* Branch List */}
                            <div className="space-y-3">
                                {owners.find(o => o.id === selectedOwnerId)?.branches.map(branch => (
                                    <div key={branch.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all bg-white group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {branch.regionName}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800 text-lg">{branch.name}</div>
                                                <div className="text-xs text-gray-400">ID: {branch.id}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {branch.isActive ? (
                                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">운영중</span>
                                            ) : (
                                                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">일시정지</span>
                                            )}
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm(`[${branch.name}] 지점을 정말 폐쇄(삭제)하시겠습니까?`)) {
                                                        onDeleteStore(branch.id);
                                                    }
                                                }}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="지점 삭제"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add Branch Section */}
                            {isAddBranchMode ? (
                                <form onSubmit={handleAddBranchSubmit} className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-fade-in">
                                    <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2"><Plus size={16}/> 신규 지점 개설</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        <input 
                                            autoFocus
                                            type="text" 
                                            placeholder="지점명 (예: 부산 해운대점)"
                                            className="w-full p-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={addBranchName}
                                            onChange={(e) => setAddBranchName(e.target.value)}
                                            required
                                        />
                                        <select 
                                            className="w-full p-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            value={addBranchRegion}
                                            onChange={(e) => setAddBranchRegion(e.target.value)}
                                        >
                                            {REGIONS.map(r => (
                                                <option key={r.code} value={r.code}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsAddBranchMode(false)}
                                            className="px-3 py-2 text-sm text-gray-600 hover:bg-white rounded-lg"
                                        >
                                            취소
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm"
                                        >
                                            추가하기
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <button 
                                    onClick={() => setIsAddBranchMode(true)}
                                    className="w-full mt-6 py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={20} /> 지점 추가 (유료 서비스)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Owner Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <UserIcon size={24} className="text-blue-600"/> 신규 고객사(Owner) 등록
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">대표자 성함 (Owner Name)</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder="예: 홍길동"
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newOwnerName}
                                    onChange={(e) => setNewOwnerName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">전화번호 (Phone Number)</label>
                                <input 
                                    type="text" 
                                    placeholder="예: 010-1234-5678"
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newOwnerPhone}
                                    onChange={(e) => setNewOwnerPhone(formatPhoneNumber(e.target.value))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">운영 지점명 (First Branch)</label>
                                <input 
                                    type="text" 
                                    placeholder="예: 강남 1호점"
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newBranchName}
                                    onChange={(e) => setNewBranchName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">첫 지점 지역</label>
                                <select 
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    value={newOwnerRegion}
                                    onChange={(e) => setNewOwnerRegion(e.target.value)}
                                >
                                    {REGIONS.map(r => (
                                        <option key={r.code} value={r.code}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="pt-2">
                                <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 mb-4">
                                    <p className="font-bold flex items-center gap-1"><ShieldCheck size={12}/> 자동 ID 발급</p>
                                    연도(2자리) + 일련번호(4자리)로 Owner ID가 발급되며, 지점이 자동 생성됩니다.
                                </div>
                                <button 
                                    type="submit"
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg"
                                >
                                    등록하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Owner Modal */}
            {editOwner.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Edit2 size={24} className="text-blue-600"/> 정보 수정 ({editOwner.name})
                            </h3>
                            <button onClick={() => setEditOwner({...editOwner, isOpen: false})} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleEditOwnerSubmit} className="space-y-4">
                            {editOwner.id === '999999' ? (
                                // Master: Only Password Change
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">새 비밀번호 (Password)</label>
                                    <input 
                                        autoFocus
                                        type="password" 
                                        placeholder="변경할 비밀번호 입력"
                                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editOwner.password}
                                        onChange={(e) => setEditOwner({...editOwner, password: e.target.value})}
                                        required
                                    />
                                    <p className="text-xs text-red-500 mt-2">
                                        * Master 계정은 비밀번호만 변경 가능합니다.
                                    </p>
                                </div>
                            ) : (
                                // Normal Owner: Name, Phone, Status
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">대표자 성함 (Owner Name)</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editOwner.name}
                                            onChange={(e) => setEditOwner({...editOwner, name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">전화번호 (Phone Number)</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editOwner.phone}
                                            onChange={(e) => setEditOwner({...editOwner, phone: formatPhoneNumber(e.target.value)})}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">계정 상태 (Status)</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setEditOwner({...editOwner, isActive: true})}
                                                className={`py-3 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${editOwner.isActive ? 'bg-green-100 border-green-200 text-green-700 ring-2 ring-green-500 ring-offset-1' : 'bg-white border-gray-200 text-gray-500'}`}
                                            >
                                                <PlayCircle size={16} /> 활동중 (Active)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditOwner({...editOwner, isActive: false})}
                                                className={`py-3 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${!editOwner.isActive ? 'bg-orange-100 border-orange-200 text-orange-700 ring-2 ring-orange-500 ring-offset-1' : 'bg-white border-gray-200 text-gray-500'}`}
                                            >
                                                <PauseCircle size={16} /> 일시정지 (Pause)
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                            
                            <div className="pt-2">
                                <button 
                                    type="submit"
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg"
                                >
                                    저장하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Action Confirmation Modal */}
            {actionConfirm.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in border-t-4 border-slate-200 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-1 ${actionConfirm.type === 'DELETE_OWNER' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                        
                        <div className="mb-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${actionConfirm.type === 'DELETE_OWNER' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                {actionConfirm.type === 'DELETE_OWNER' ? <AlertTriangle size={24}/> : <KeyRound size={24}/>}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                                {actionConfirm.type === 'DELETE_OWNER' ? '계정 삭제 확인' : '비밀번호 초기화'}
                            </h3>
                            <p className="text-gray-500 text-sm">
                                {actionConfirm.type === 'DELETE_OWNER' ? (
                                    <>
                                        정말 <span className="font-bold text-gray-800">{actionConfirm.targetName}</span> 님 계정과<br/> 
                                        연결된 모든 지점 정보를 삭제하시겠습니까?<br/>
                                        <span className="text-red-500 font-bold mt-1 block">⚠️ 이 작업은 되돌릴 수 없습니다.</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-bold text-gray-800">{actionConfirm.targetName}</span> 님의 비밀번호를<br/>
                                        <span className="font-bold text-blue-600">'1234'</span>로 초기화하시겠습니까?
                                    </>
                                )}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => setActionConfirm({ isOpen: false, type: null, targetId: '', targetName: '' })}
                                className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleExecuteAction}
                                className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg transition-colors ${
                                    actionConfirm.type === 'DELETE_OWNER' 
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                }`}
                            >
                                {actionConfirm.type === 'DELETE_OWNER' ? '삭제하기' : '초기화'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;

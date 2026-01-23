
import React, { useState, useMemo } from 'react';
import type { User, LeaveRequest, LeaveType, Staff } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, AlertCircle, Plus } from 'lucide-react';

interface LeaveManagementProps {
    staffList: Staff[];
    leaveRequests: LeaveRequest[];
    onAddRequest: (request: LeaveRequest) => void;
    onRemoveRequest: (id: string) => void;
    currentUser: User;
}

const LeaveManagement: React.FC<LeaveManagementProps> = ({ staffList, leaveRequests, onAddRequest, onRemoveRequest, currentUser }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        staffId: '',
        type: 'FULL' as LeaveType,
        reason: ''
    });

    // Calendar Helper Functions
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        // Pad previous month
        for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
        // Current month
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
        return days;
    };

    const calendarDays = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const formatDateYMD = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handleDateClick = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 7-day rule check
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + 7);
        // Allow store admin to bypass the 7-day restriction
        if (currentUser.role !== 'STORE_ADMIN') {
            if (date < minDate) {
                alert('휴무 신청은 최소 1주일(7일) 전부터 가능합니다.');
                return;
            }
        }

        setSelectedDate(formatDateYMD(date));
        setFormData({
            staffId: '', // Force selection
            type: 'FULL',
            reason: ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !formData.staffId) return;

        const staff = staffList.find(u => u.id === formData.staffId);
        if (!staff) return;

        // Check if already requested
        const exists = leaveRequests.find(r => r.date === selectedDate && r.staffId === formData.staffId);
        if (exists) {
            alert('이미 해당 날짜에 휴무 신청이 되어 있습니다.');
            return;
        }

        const newRequest: LeaveRequest = {
            id: `L-${Date.now()}`,
            date: selectedDate,
            staffId: formData.staffId,
            staffName: staff.name,
            storeId: staff.storeId || currentUser.storeId || 'ST-1',
            type: formData.type,
            reason: formData.reason,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        onAddRequest(newRequest);
        setIsModalOpen(false);
        alert('휴무 신청이 완료되었습니다.');
    };

    const getLeaveLabel = (type: LeaveType) => {
        switch (type) {
            case 'FULL': return '연차(종일)';
            case 'HALF_AM': return '오전 반차';
            case 'HALF_PM': return '오후 반차';
        }
    };

    const getLeaveColor = (type: LeaveType) => {
        switch (type) {
            case 'FULL': return 'bg-red-100 text-red-700 border-red-200';
            case 'HALF_AM': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'HALF_PM': return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10 h-full flex flex-col">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap">
                        <CalendarIcon className="text-blue-600" />
                        휴무 및 연차 관리
                    </h2>
                    <p className="text-sm text-gray-500">직원들의 휴무 일정을 캘린더에서 확인하고 신청할 수 있습니다.</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg w-full md:w-auto">
                    <AlertCircle size={16} className="text-orange-500"/>
                    <span className="whitespace-nowrap">휴무 신청은 최소 <span className="font-bold text-gray-800">1주일 전</span>에 해야 합니다.</span>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                {/* Calendar Header */}
                <div className="p-4 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800 whitespace-nowrap">
                        {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                    </h3>
                    <div className="flex gap-2 w-full sm:w-auto justify-start sm:justify-end">
                        <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-colors"><ChevronLeft size={20}/></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50">오늘</button>
                        <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-colors"><ChevronRight size={20}/></button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
                    <div className="grid grid-cols-7 mb-2">
                        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                            <div key={day} className={`text-center text-sm font-bold py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 auto-rows-[minmax(110px,1fr)]">
                        {calendarDays.map((date, index) => {
                            if (!date) return <div key={`empty-${index}`} className="bg-gray-50/30 rounded-lg"></div>;

                            const dateStr = formatDateYMD(date);
                            const isToday = new Date().toDateString() === date.toDateString();
                            const isSunday = date.getDay() === 0;
                            const isSaturday = date.getDay() === 6;
                            
                            // Check restriction: staff must follow 7-day rule; STORE_ADMIN may add any date
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const minDate = new Date(today);
                            minDate.setDate(today.getDate() + 7);
                            const isAvailable = currentUser.role === 'STORE_ADMIN' ? true : date >= minDate;

                            const daysRequests = leaveRequests.filter(r => r.date === dateStr);

                            return (
                                <div 
                                    key={dateStr}
                                    onClick={() => isAvailable && handleDateClick(date)}
                                    className={`
                                        border rounded-lg p-3 transition-all relative flex flex-col gap-2 group
                                        ${isToday ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100'}
                                        ${isAvailable ? 'hover:border-blue-300 hover:shadow-md cursor-pointer bg-white' : 'bg-gray-50 cursor-not-allowed opacity-80'}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-sm font-bold ${isSunday ? 'text-red-500' : isSaturday ? 'text-blue-500' : 'text-gray-700'}`}>
                                            {date.getDate()}
                                        </span>
                                        {isAvailable && (
                                            <Plus size={14} className="text-gray-300 opacity-0 group-hover:opacity-100" />
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                                        {daysRequests.map(req => (
                                            <div 
                                                key={req.id}
                                                className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${getLeaveColor(req.type)} ${req.status === 'approved' && currentUser.role !== 'STORE_ADMIN' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                                title={`${req.staffName} (${getLeaveLabel(req.type)}) ${req.reason}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Only STORE_ADMIN can delete. For approved requests, only STORE_ADMIN allowed.
                                                    if(currentUser.role !== 'STORE_ADMIN') {
                                                        alert('승인된 휴무는 사장님만 삭제할 수 있습니다.');
                                                        return;
                                                    }
                                                    if(confirm(`${req.staffName}님의 휴무 신청을 취소하시겠습니까?`)) {
                                                        onRemoveRequest(req.id);
                                                    }
                                                }}
                                            >
                                                <span className="font-bold">{req.staffName}</span> {req.type === 'FULL' ? '' : req.type === 'HALF_AM' ? '(오전)' : '(오후)'} {req.status === 'approved' ? '✓' : ''}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Leave Request Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">휴무 신청</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">신청 날짜</label>
                                <div className="w-full p-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-bold text-gray-700">
                                    {selectedDate}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">직원 선택</label>
                                <select 
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                    value={formData.staffId}
                                    onChange={e => setFormData({...formData, staffId: e.target.value})}
                                >
                                    <option value="">본인 선택</option>
                                    {staffList.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">휴무 종류</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'FULL', label: '연차(종일)' },
                                        { id: 'HALF_AM', label: '오전 반차' },
                                        { id: 'HALF_PM', label: '오후 반차' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setFormData({...formData, type: opt.id as LeaveType})}
                                            className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                                                formData.type === opt.id 
                                                ? 'bg-blue-600 text-white border-blue-600' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">사유 (선택)</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="예: 개인 사정, 병원 진료"
                                    value={formData.reason}
                                    onChange={e => setFormData({...formData, reason: e.target.value})}
                                />
                            </div>

                            <button 
                                type="submit"
                                disabled={!formData.staffId}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                신청 완료
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveManagement;

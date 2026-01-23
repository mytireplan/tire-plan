import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LeaveRequest, Staff, Store, Shift } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  LayoutGrid, 
  Rows, 
  X, 
  AlertCircle,
  BarChart3,
  Info,
  CheckCircle2,
  XCircle,
  User as UserIcon,
  MapPin,
  Clock,
  CalendarDays,
  FileText
} from 'lucide-react';

interface ScheduleAndLeaveProps {
  staffList: Staff[];
  leaveRequests: LeaveRequest[];
  shifts: Shift[];
  onAddShift: (shift: Shift) => void;
  onUpdateShift: (shift: Shift) => void;
  onRemoveShift: (id: string) => void;
  stores: Store[];
  currentStoreId?: string;
  onShiftRangeChange?: (start: string, end: string) => void;
  onApproveLeave?: (leaveId: string) => void;
  onRejectLeave?: (leaveId: string, reason: string) => void;
  onAddLeaveRequest?: (request: LeaveRequest) => void;
  onRemoveLeaveRequest?: (id: string) => void;
  currentUser?: { role?: string; id?: string };
}

// --- 디자인 상수 ---
const SHIFT_UI: Record<string, { label: string; color: string; badge: string; icon: string }> = {
  REGULAR: { label: '근무', color: 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm', badge: 'bg-blue-100 text-blue-800 border-blue-200', icon: '☀️' },
  NIGHT: { label: '야간', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: '🌙' },
  OFF: { label: '휴무', color: 'bg-slate-100 text-slate-500 border-slate-200', badge: 'bg-slate-200 text-slate-700 border-slate-300', icon: '🏠' },
  VACATION: { label: '월차', color: 'bg-rose-50 text-rose-700 border-rose-200', badge: 'bg-rose-100 text-rose-800 border-rose-200', icon: '✈️' },
  HALF: { label: '반차', color: 'bg-orange-50 text-orange-700 border-orange-200', badge: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🌓' },
  DUTY: { label: '당직', color: 'bg-violet-50 text-violet-700 border-violet-200 shadow-sm', badge: 'bg-violet-100 text-violet-800 border-violet-200', icon: '🚨' }
};

const DEFAULT_UI = SHIFT_UI.REGULAR;

const ScheduleAndLeave: React.FC<ScheduleAndLeaveProps> = ({ 
  staffList,
  leaveRequests, 
  shifts, 
  onAddShift, 
  onRemoveShift, 
  stores,
  onShiftRangeChange, 
  onApproveLeave, 
  onRejectLeave, 
  onAddLeaveRequest, 
  currentUser 
}) => {
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'WEEK' | 'MONTH'>('MONTH'); 
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const isAdmin = currentUser?.role === 'STORE_ADMIN';

  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [dragSelection, setDragSelection] = useState<{ staffId: string | null; start: string | null; end: string | null; isDragging: boolean }>({
    staffId: null, start: null, end: null, isDragging: false
  });

  const dateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [shiftDraft, setShiftDraft] = useState({
    groupId: '', staffId: '', storeId: stores[0]?.id || '',
    dateStart: dateToLocalString(new Date()), dateEnd: dateToLocalString(new Date()),
    memo: '', shiftType: 'REGULAR' as Shift['shiftType']
  });

  const storeColorMap = useMemo(() => {
    const palette = [
      { badge: 'bg-blue-600 text-white border-blue-700 shadow-sm' },
      { badge: 'bg-emerald-600 text-white border-emerald-700 shadow-sm' },
      { badge: 'bg-amber-500 text-white border-amber-600 shadow-sm' },   
      { badge: 'bg-purple-600 text-white border-purple-700 shadow-sm' },  
      { badge: 'bg-rose-600 text-white border-rose-700 shadow-sm' }
    ];
    const map: Record<string, typeof palette[number]> = {};
    stores.forEach((store, idx) => { if(store?.id) map[store.id] = palette[idx % palette.length]; });
    return map;
  }, [stores]);

  const startOfWeekDate = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff); d.setHours(0, 0, 0, 0);
    return d;
  };

  const dateRange = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (end < start) return dateRange(endStr, startStr);
    const days: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push(dateToLocalString(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  };

  const isoToLocalDate = (iso: string | undefined) => {
    if (!iso) return '';
    const datePart = iso.split('T')[0];
    if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
    const d = new Date(iso);
    return dateToLocalString(d);
  };

  const staffStatistics = useMemo(() => {
    const stats: Record<string, { regular: number; night: number; off: number; duty: number }> = {};
    let rangeStart: number, rangeEnd: number;

    if (viewMode === 'WEEK') {
      const monday = startOfWeekDate(anchorDate);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      rangeStart = monday.getTime();
      rangeEnd = sunday.getTime();
    } else {
      const firstDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
      const lastDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0, 23, 59, 59, 999);
      rangeStart = firstDay.getTime();
      rangeEnd = lastDay.getTime();
    }

    staffList.forEach(staff => {
      stats[staff.id] = { regular: 0, night: 0, off: 0, duty: 0 };
      shifts.forEach(shift => {
        if (shift.staffId === staff.id && (!selectedStoreId || shift.storeId === selectedStoreId)) {
          const shiftTime = new Date(shift.start).getTime();
          if (shiftTime >= rangeStart && shiftTime <= rangeEnd) {
            const type = shift.shiftType || 'REGULAR';
            if (type === 'REGULAR') stats[staff.id].regular++;
            else if (type === 'NIGHT') stats[staff.id].night++;
            else if (['OFF', 'VACATION', 'HALF'].includes(type)) stats[staff.id].off++;
            else if (type === 'DUTY') stats[staff.id].duty++;
          }
        }
      });
    });
    return stats;
  }, [staffList, shifts, anchorDate, selectedStoreId, viewMode]);

  useEffect(() => {
    const defaultType = localStorage.getItem('scheduleDefaultType');
    if (defaultType === 'LEAVE') {
      setShiftDraft(prev => ({ ...prev, shiftType: 'OFF' }));
      setIsShiftModalOpen(true);
      localStorage.removeItem('scheduleDefaultType');
    }
  }, []);

  useEffect(() => {
    if (!onShiftRangeChange) return;
    let startStr: string, endStr: string;
    if (viewMode === 'WEEK') {
      const d = startOfWeekDate(anchorDate);
      startStr = d.toISOString();
      const e = new Date(d); e.setDate(d.getDate() + 6); e.setHours(23, 59, 59, 999);
      endStr = e.toISOString();
    } else {
      const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
      const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0, 23, 59, 59, 999);
      startStr = start.toISOString(); endStr = end.toISOString();
    }
    onShiftRangeChange(startStr, endStr);
  }, [anchorDate, viewMode, onShiftRangeChange]);

  const weekDays = useMemo(() => {
    const start = startOfWeekDate(anchorDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  }, [anchorDate]);

  const filteredStaff = useMemo(() => staffList.filter(s => s?.name?.toLowerCase().includes(search.toLowerCase())), [staffList, search]);

  const moveWeek = (delta: number) => { const n = new Date(anchorDate); n.setDate(anchorDate.getDate() + delta * 7); setAnchorDate(n); };
  const moveMonth = (delta: number) => { const n = new Date(anchorDate); n.setMonth(anchorDate.getMonth() + delta, 1); setAnchorDate(n); };
  
  const submitShift = () => {
    if (!shiftDraft.staffId || !shiftDraft.storeId) return;
    const staff = staffList.find(s => s.id === shiftDraft.staffId);
    if (!staff) return;

    // 직원이 휴무/월차/반차를 선택한 경우 → LeaveRequest 생성 (shift 생성 안 함)
    if (!isAdmin && (shiftDraft.shiftType === 'OFF' || shiftDraft.shiftType === 'VACATION' || shiftDraft.shiftType === 'HALF')) {
      if (!onAddLeaveRequest) return;
      
      const days = dateRange(shiftDraft.dateStart, shiftDraft.dateEnd);
      const leaveTypeMap: Record<string, 'FULL' | 'HALF_AM' | 'HALF_PM'> = {
        'OFF': 'FULL',
        'VACATION': 'FULL',
        'HALF': 'FULL'
      };
      
      days.forEach(date => {
        const leaveRequest: LeaveRequest = {
          id: `LEAVE-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          date,
          staffId: staff.id,
          staffName: staff.name,
          storeId: shiftDraft.storeId,
          type: leaveTypeMap[shiftDraft.shiftType || 'OFF'] || 'FULL',
          reason: shiftDraft.memo || '휴무 신청',
          createdAt: new Date().toISOString(),
          status: 'pending'
        };
        onAddLeaveRequest(leaveRequest);
      });
      
      alert('휴무 신청이 접수되었습니다. 승인 후 근무표에 반영됩니다.');
      setIsShiftModalOpen(false);
      setEditingShiftId(null);
      setEditingGroupId(null);
      return;
    }

    const startDate = new Date(shiftDraft.dateStart);
    const endDate = new Date(shiftDraft.dateEnd);
    const groupId = editingGroupId || `GROUP-${Date.now()}`;
    
    let baseShifts = [...shifts];
    if (editingShiftId) {
      baseShifts = baseShifts.filter(s => s.id !== editingShiftId && s.groupId !== editingGroupId);
    }

    const newShiftsToAdd: Shift[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = dateToLocalString(currentDate);
      const shiftObj: Shift = {
        id: `SHIFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        groupId,
        staffId: staff.id,
        staffName: staff.name,
        storeId: shiftDraft.storeId,
        start: `${dateStr}T12:00:00Z`,
        end: `${dateStr}T18:00:00Z`,
        shiftType: shiftDraft.shiftType,
        memo: shiftDraft.memo.trim() || undefined
      };
      newShiftsToAdd.push(shiftObj);
      onAddShift?.(shiftObj);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setIsShiftModalOpen(false);
    setEditingShiftId(null);
    setEditingGroupId(null);
  };

  const openEditShift = (shift: Shift) => {
    if(!shift) return;
    setShiftDraft({
      groupId: shift.groupId || shift.id, staffId: shift.staffId, storeId: shift.storeId,
      dateStart: isoToLocalDate(shift.start), dateEnd: isoToLocalDate(shift.end),
      memo: shift.memo || '', shiftType: shift.shiftType || 'REGULAR'
    });
    setEditingShiftId(shift.id);
    setEditingGroupId(shift.groupId || shift.id);
    setIsShiftModalOpen(true);
  };

  const handleDragStart = (dateStr: string, staffId: string | null = null) => {
    setDragSelection({ staffId, start: dateStr, end: dateStr, isDragging: true });
  };

  const handleDragEnter = (dateStr: string) => {
    if (!dragSelection.isDragging) return;
    setDragSelection(prev => ({ ...prev, end: dateStr }));
  };

  const handleDragEnd = () => {
    if (!dragSelection.isDragging || !dragSelection.start || !dragSelection.end) {
      setDragSelection({ staffId: null, start: null, end: null, isDragging: false });
      return;
    }
    const start = dragSelection.start < dragSelection.end ? dragSelection.start : dragSelection.end;
    const end = dragSelection.start < dragSelection.end ? dragSelection.end : dragSelection.start;

    setShiftDraft({
      groupId: '',
      staffId: dragSelection.staffId || '',
      storeId: stores[0]?.id || '',
      dateStart: start,
      dateEnd: end,
      memo: '',
      shiftType: 'REGULAR'
    });
    setEditingShiftId(null); setEditingGroupId(null);
    setIsShiftModalOpen(true);
    setDragSelection({ staffId: null, start: null, end: null, isDragging: false });
  };

  const isSelected = (dateStr: string, staffId: string | null = null) => {
    if (!dragSelection.isDragging || !dragSelection.start || !dragSelection.end) return false;
    if (dragSelection.staffId !== staffId) return false;
    const start = dragSelection.start < dragSelection.end ? dragSelection.start : dragSelection.end;
    const end = dragSelection.start < dragSelection.end ? dragSelection.end : dragSelection.start;
    return dateStr >= start && dateStr <= end;
  };

  // Keep weekly horizontal scroll positioned at the far right by default
  const weekScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (viewMode === 'WEEK' && weekScrollRef.current) {
      const el = weekScrollRef.current;
      el.scrollLeft = el.scrollWidth;
    }
  }, [viewMode, anchorDate]);

  return (
    <div className="flex flex-col gap-4 min-h-screen p-2 bg-[#f8fafc]" onMouseUp={handleDragEnd}>
      {/* 1. Header Card */}
      <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-100">
            <CalendarIcon className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">근무표 매니저</h1>
            <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Shift Management Board</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
            <button onClick={() => setViewMode('WEEK')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'WEEK' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}><Rows size={14} /> 주간</button>
            <button onClick={() => setViewMode('MONTH')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'MONTH' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}><LayoutGrid size={14} /> 월간</button>
          </div>
          <button onClick={() => setIsShiftModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-100"><Plus size={16} /> 근무 등록</button>
        </div>
      </div>

      {/* 2. Toolbar Card */}
      <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <select className="bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}>
            <option value="">🏢 전체 지점</option>
            {stores.map(store => store?.id && <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button onClick={() => viewMode === 'WEEK' ? moveWeek(-1) : moveMonth(-1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"><ChevronLeft size={18} /></button>
            <span className="px-3 text-xs font-black text-slate-800 min-w-[120px] text-center">{viewMode === 'WEEK' ? `${weekDays[0].getMonth()+1}/${weekDays[0].getDate()} - ${weekDays[6].getMonth()+1}/${weekDays[6].getDate()}` : `${anchorDate.getFullYear()}년 ${anchorDate.getMonth()+1}월`}</span>
            <button onClick={() => viewMode === 'WEEK' ? moveWeek(1) : moveMonth(1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" placeholder="직원 검색..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* 3. Main Board */}
      <div className="flex flex-col gap-4 flex-1">
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-visible flex flex-col">
          {viewMode === 'WEEK' ? (
            <div className="w-full overflow-x-auto select-none" ref={weekScrollRef}>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-4 text-left font-black text-slate-400 text-[10px] uppercase tracking-widest sticky left-0 bg-slate-50 z-20 w-32 border-r text-center">Staff</th>
                    {weekDays.map(d => (
                      <th key={d.toString()} className="p-4 text-center border-r border-slate-100 last:border-0">
                        <span className={`block text-[10px] font-black uppercase mb-1 ${d.getDay() === 0 ? 'text-rose-400' : 'text-slate-400'}`}>{['일','월','화','수','목','금','토'][d.getDay()]}</span>
                        <span className={`text-lg font-black ${d.getDay() === 0 ? 'text-rose-500' : 'text-slate-700'}`}>{d.getDate()}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map(staff => staff?.id && (
                    <tr key={staff.id} className="border-b border-slate-50 group hover:bg-slate-50/30 transition-colors">
                      <td className="p-4 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.03)] text-center">{staff.name}</td>
                      {weekDays.map(d => {
                        const dateStr = dateToLocalString(d);
                        const dayShifts = shifts.filter(s => s?.staffId === staff.id && isoToLocalDate(s.start) === dateStr && (!selectedStoreId || s.storeId === selectedStoreId));
                        const pendingLeave = leaveRequests.find(r => r.staffId === staff.id && r.date === dateStr && r.status === 'pending');
                        const dragging = isSelected(dateStr, staff.id);
                        return (
                          <td 
                            key={dateStr} className={`p-1.5 border-r border-slate-50 last:border-0 min-w-[140px] h-16 overflow-hidden cursor-pointer transition-colors ${dragging ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : ''}`} 
                            onMouseDown={() => dayShifts.length === 0 && !pendingLeave && handleDragStart(dateStr, staff.id)} onMouseEnter={() => handleDragEnter(dateStr)}
                          >
                            <div className="flex flex-col gap-1.5 h-full">
                              {pendingLeave && (
                                <div className="w-full text-left px-1.5 py-1 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-amber-700 flex items-center gap-1 text-[10px] font-bold">
                                  <AlertCircle size={10} />
                                  <span>결재중</span>
                                </div>
                              )}
                              {dayShifts.map(s => {
                                const ui = SHIFT_UI[s.shiftType || 'REGULAR'] || DEFAULT_UI;
                                const storeTheme = storeColorMap[s.storeId] || { badge: 'bg-slate-100 text-slate-700 border-slate-200' };
                                return (
                                  <button key={s.id} onClick={(e) => { e.stopPropagation(); openEditShift(s); }} className={`w-full text-left px-1.5 py-1 rounded-lg border flex items-center justify-between gap-1 transition-all hover:scale-[1.02] shadow-sm ${ui.color}`}>
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="text-[10px] font-bold truncate">{ui.icon} {ui.label}</span>
                                      {s.memo && <FileText size={10} className="text-slate-400 shrink-0" />}
                                    </div>
                                    <div className={`px-1.5 py-0.2 rounded border-[0.5px] text-[8px] font-black whitespace-nowrap ${storeTheme.badge}`}>{stores.find(st => st.id === s.storeId)?.name}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="w-full p-2 select-none">
              <div className="grid grid-cols-7 gap-1 mb-2 px-1">
                {['일','월','화','수','목','금','토'].map((d, i) => (
                  <div key={d} className={`text-center text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'text-rose-400' : 'text-slate-400'}`}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 auto-rows-[minmax(130px,auto)]">
                {(() => {
                  const y = anchorDate.getFullYear(), m = anchorDate.getMonth();
                  const first = new Date(y, m, 1).getDay(), total = new Date(y, m + 1, 0).getDate();
                  const cells = [...Array(first).fill(null), ...Array.from({length: total}, (_, i) => new Date(y, m, i+1))];
                  return cells.map((d, idx) => {
                    if (!d) return <div key={`empty-${idx}`} className="bg-slate-50/20 rounded-xl border border-dashed border-slate-100" />;
                    const dateStr = dateToLocalString(d), isToday = new Date().toDateString() === d.toDateString();
                    const dayShifts = shifts.filter(s => isoToLocalDate(s.start) === dateStr && (!selectedStoreId || s.storeId === selectedStoreId));
                    const dayPendingLeaves = leaveRequests.filter(l => l.date === dateStr && l.status === 'pending');
                    const dragging = isSelected(dateStr, null);
                    return (
                      <div key={dateStr} className={`p-1.5 rounded-2xl border flex flex-col gap-1 transition-all cursor-pointer ${dragging ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100' : isToday ? 'bg-blue-50/20 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-slate-100 hover:bg-slate-50/50'}`} onMouseDown={() => handleDragStart(dateStr, null)} onMouseEnter={() => handleDragEnter(dateStr)}>
                        <div className="flex justify-between items-center mb-1 pointer-events-none"><span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>{d.getDate()}</span></div>
                        <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[140px] pr-0.5 custom-scrollbar-mini">
                          {dayPendingLeaves.map(l => (
                              <div key={l.id} className="px-1.5 py-1 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-amber-700 flex items-center gap-1 text-[10px] font-bold pointer-events-none">
                                <AlertCircle size={10} />
                                <span className="truncate">{l.staffName}</span>
                                <span>결재중</span>
                              </div>
                          ))}
                          {dayShifts.map(s => {
                            const ui = SHIFT_UI[s.shiftType || 'REGULAR'] || DEFAULT_UI;
                            const storeTheme = storeColorMap[s.storeId] || { badge: 'bg-slate-100 text-slate-700 border-slate-200' };
                            return (
                              <div key={s.id} onClick={(e) => { e.stopPropagation(); openEditShift(s); }} className={`px-1.5 py-1 rounded-lg border flex items-center justify-between gap-1 cursor-pointer hover:brightness-95 transition-all shadow-sm ${ui.color}`}>
                                <div className="flex items-center gap-1 min-w-0 pointer-events-none">
                                  <span className="text-[10px] font-bold truncate max-w-[45px]">{s.staffName}</span>
                                  <span className="text-[9px] font-medium opacity-80 shrink-0">{ui.icon} {ui.label}</span>
                                  {s.memo && <FileText size={8} className="text-slate-400 shrink-0" />}
                                </div>
                                <div className={`px-1.5 py-0.2 rounded-md border-[0.5px] text-[8px] font-black whitespace-nowrap pointer-events-none ${storeTheme.badge}`}>{stores.find(st => st.id === s.storeId)?.name}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>

        {/* 4. Bottom Dashboard: Stats & Legend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4"><Info size={16} className="text-blue-500" /><h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Shift Guide</h2></div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SHIFT_UI).map(([key, ui]) => (<div key={key} className={`flex items-center gap-2 p-2 rounded-xl border text-[10px] font-bold ${ui.color}`}><span className="text-base">{ui.icon}</span><span>{ui.label}</span></div>))}
            </div>
          </div>
          <div className="lg:col-span-2 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-orange-500" />
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {viewMode === 'WEEK' ? '주간' : '월간'} 누적 통계
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {staffList.map(staff => staff?.id && (
                <div key={staff.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5"><div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">{staff.name[0]}</div><span className="font-bold text-slate-700 text-xs truncate">{staff.name}</span></div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      {label:'근무',val:staffStatistics[staff.id]?.regular,c:'text-blue-600'},
                      {label:'야간',val:staffStatistics[staff.id]?.night,c:'text-indigo-600'},
                      {label:'휴무',val:staffStatistics[staff.id]?.off,c:'text-slate-600'},
                      {label:'당직',val:staffStatistics[staff.id]?.duty,c:'text-violet-600'}
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center text-[9px] bg-white px-2 py-1 rounded-lg border border-slate-100"><span className="text-slate-400 font-medium">{item.label}</span><span className={`font-black ${item.c}`}>{item.val}회</span></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 사장님 모드: 승인 대기중인 휴가 목록 */}
      {isAdmin && leaveRequests.filter(lr => lr.status === 'pending').length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={20} className="text-amber-500" />
            <h2 className="text-lg font-bold text-slate-800">승인 대기중인 휴가 ({leaveRequests.filter(lr => lr.status === 'pending').length}건)</h2>
          </div>
          <div className="space-y-3">
            {leaveRequests.filter(lr => lr.status === 'pending').map(leave => {
              const staff = staffList.find(s => s.id === leave.staffId);
              if (!staff) return null;
              const [, month, day] = leave.date.split('-');
              return (
                <div key={leave.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black">{staff.name[0]}</div>
                    <div>
                      <div className="font-bold text-slate-800">{staff.name}</div>
                      <div className="text-xs text-slate-500">{parseInt(month)}.{parseInt(day)} · {leave.type === 'FULL' ? '월차' : '반차'} {leave.reason && `· ${leave.reason}`}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setRejectingLeaveId(leave.id); setIsRejectModalOpen(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-200 transition-all"><XCircle size={14} /> 거절</button>
                    <button onClick={() => onApproveLeave?.(leave.id)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-200 transition-all"><CheckCircle2 size={14} /> 승인</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Add/Edit Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Clock size={24} /></div><div><h3 className="text-xl font-black text-slate-800">근무 {editingShiftId ? '수정' : '등록'}</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Schedule Registration</p></div></div>
              <button onClick={() => setIsShiftModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-1.5"><UserIcon size={12}/> 직원 선택</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none transition-all" value={shiftDraft.staffId} onChange={e => setShiftDraft({...shiftDraft, staffId: e.target.value})}>
                    <option value="">선택하세요</option>
                    {staffList.map(s => s?.id && <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-1.5"><MapPin size={12}/> 근무 지점</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none transition-all" value={shiftDraft.storeId} onChange={e => setShiftDraft({...shiftDraft, storeId: e.target.value})}>
                    {stores.map(s => s?.id && <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-1.5"><CalendarDays size={12}/> 시작일</label><input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" value={shiftDraft.dateStart} onChange={e => setShiftDraft({...shiftDraft, dateStart: e.target.value})}/></div>
                <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-1.5"><CalendarDays size={12}/> 종료일</label><input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" value={shiftDraft.dateEnd} onChange={e => setShiftDraft({...shiftDraft, dateEnd: e.target.value})}/></div>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-1.5"><LayoutGrid size={12}/> 근무 타입</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(SHIFT_UI).map(([key, ui]) => (<button key={key} onClick={() => setShiftDraft({...shiftDraft, shiftType: key as any})} className={`p-3.5 rounded-[1.25rem] border-2 text-[11px] font-black flex flex-col items-center gap-1.5 transition-all ${shiftDraft.shiftType === key ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-md scale-105' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}><span className="text-2xl">{ui.icon}</span><span>{ui.label}</span></button>))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-1.5"><FileText size={12}/> 메모 (선택사항)</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 h-24 resize-none transition-all"
                  placeholder="추가 전달사항이나 메모를 입력하세요..."
                  value={shiftDraft.memo}
                  onChange={e => setShiftDraft({...shiftDraft, memo: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-4">
                {editingShiftId && <button onClick={() => { onRemoveShift(editingShiftId); setIsShiftModalOpen(false); }} className="flex-1 py-4 rounded-2xl font-black text-xs text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all">삭제</button>}
                <button onClick={submitShift} disabled={!shiftDraft.staffId} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:opacity-30 transition-all">등록하기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 거절 사유 입력 모달 */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3"><div className="p-2 bg-rose-100 text-rose-600 rounded-xl"><XCircle size={24} /></div><div><h3 className="text-xl font-black text-slate-800">거절 사유 입력</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Rejection Reason</p></div></div>
              <button onClick={() => { setIsRejectModalOpen(false); setRejectionReason(''); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <textarea 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-rose-500/20 h-32 resize-none transition-all"
                placeholder="거절 사유를 입력하세요..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
              <div className="flex gap-4">
                <button onClick={() => { setIsRejectModalOpen(false); setRejectionReason(''); }} className="flex-1 py-4 rounded-2xl font-black text-sm text-slate-500 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-all">취소</button>
                <button onClick={() => { if(rejectingLeaveId) { onRejectLeave?.(rejectingLeaveId, rejectionReason); setIsRejectModalOpen(false); setRejectionReason(''); setRejectingLeaveId(null); }}} className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all">거절 확정</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleAndLeave;

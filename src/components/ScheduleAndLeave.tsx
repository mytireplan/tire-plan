import React, { useEffect, useMemo, useState } from 'react';
import type { LeaveRequest, Staff, Store, Shift } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Plus, Search, ToggleLeft, ToggleRight, X, AlertCircle } from 'lucide-react';

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

// Simple utility: get start of week (Mon-based)
const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDateLabel = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

const ScheduleAndLeave: React.FC<ScheduleAndLeaveProps> = ({ staffList, leaveRequests, shifts, onAddShift, onUpdateShift, onRemoveShift, stores, currentStoreId, onShiftRangeChange, onApproveLeave, onRejectLeave, onAddLeaveRequest, onRemoveLeaveRequest, currentUser }) => {
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'WEEK' | 'MONTH'>('WEEK');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const isAdmin = currentUser?.role === 'STORE_ADMIN';
  const dateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [shiftDraft, setShiftDraft] = useState({
    groupId: '',
    staffId: '',
    storeId: stores[0]?.id || '',
    dateStart: dateToLocalString(new Date()),
    dateEnd: dateToLocalString(new Date()),
    memo: '',
    shiftType: 'REGULAR' as Shift['shiftType']
  });
  const [dragSelection, setDragSelection] = useState<{ staffId: string; start: string; end: string; active: boolean; startX: number; startY: number } | null>(null);
  const [monthDrag, setMonthDrag] = useState<{ start: string; end: string; active: boolean; startX: number; startY: number } | null>(null);

  const storeColorMap = useMemo(() => {
    const palette = [
      { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
      { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
      { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
      { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
      { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', badge: 'bg-lime-100 text-lime-800 border-lime-200' }
    ];
    const map: Record<string, typeof palette[number]> = {};
    stores.forEach((store, idx) => {
      map[store.id] = palette[idx % palette.length];
    });
    return map;
  }, [stores]);

  const shiftTypeStyles: Record<NonNullable<Shift['shiftType']>, { badge: string; label: string }> = {
    REGULAR: { badge: 'bg-blue-100 text-blue-800 border-blue-200', label: '근무' },
    NIGHT: { badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: '야간' },
    OFF: { badge: 'bg-rose-100 text-rose-800 border-rose-200', label: '휴무' },
    VACATION: { badge: 'bg-amber-100 text-amber-800 border-amber-200', label: '월차' },
    HALF: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: '반차' },
    DUTY: { badge: 'bg-violet-100 text-violet-800 border-violet-200', label: '당직' }
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [anchorDate]);

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [staffList, search]);

  const moveWeek = (delta: number) => {
    const next = new Date(anchorDate);
    next.setDate(anchorDate.getDate() + delta * 7);
    setAnchorDate(next);
  };

  const moveMonth = (delta: number) => {
    const next = new Date(anchorDate);
    next.setMonth(anchorDate.getMonth() + delta, 1);
    setAnchorDate(next);
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

  // Normalize an ISO string into a local-date string (YYYY-MM-DD) to avoid timezone drift.
  const isoToLocalDate = (iso: string) => {
    // Extract the date part directly from ISO string to avoid timezone conversion issues
    const datePart = iso.split('T')[0];
    if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
    // Fallback to Date object parsing if needed
    const d = new Date(iso);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const deriveGroupIdFromId = (id: string) => {
    const parts = id.split('-');
    if (parts.length <= 2) return parts.join('-');
    parts.pop();
    return parts.join('-');
  };

  const getGroupId = (shift: Shift) => shift.groupId || deriveGroupIdFromId(shift.id);

  const resolveStoreId = () => selectedStoreId || currentStoreId || shiftDraft.storeId || stores[0]?.id || '';

  // localStorage에서 기본 근무 타입 읽기 (관리자 대시보드에서 휴무 추가 시)
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
    let startStr: string;
    let endStr: string;
    
    if (viewMode === 'WEEK') {
      // For week view, include the entire week (Mon-Sun) which may span months
      const weekStart = startOfWeek(anchorDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      startStr = weekStart.toISOString();
      endStr = weekEnd.toISOString();
    } else {
      // For month view, use month boundaries
      const year = anchorDate.getFullYear();
      const month = anchorDate.getMonth();
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      startStr = monthStart.toISOString();
      endStr = new Date(monthEnd.setHours(23, 59, 59, 999)).toISOString();
    }
    
    onShiftRangeChange(startStr, endStr);
  }, [anchorDate, viewMode, onShiftRangeChange]);

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
    
    // 관리자이거나 일반 근무 타입인 경우 → Shift 생성
    const nowTs = Date.now();
    const groupId = editingGroupId || shiftDraft.groupId || `SHIFTGROUP-${nowTs}`;
    const existingGroupShifts = shifts
      .filter(s => getGroupId(s) === groupId)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const idBase = `SHIFT-${groupId}`;
    const days = dateRange(shiftDraft.dateStart, shiftDraft.dateEnd);
    const shiftsToSave: Shift[] = days.map((d, idx) => {
      // Use midday to keep the date stable when converted to UTC.
      const start = new Date(`${d}T12:00:00`);
      const end = new Date(`${d}T12:00:00`);
      return {
        id: existingGroupShifts[0] && idx === 0 ? existingGroupShifts[0].id : `${idBase}-${idx}`,
        groupId,
        staffId: staff.id,
        staffName: staff.name,
        storeId: shiftDraft.storeId,
        start: start.toISOString(),
        end: end.toISOString(),
        memo: shiftDraft.memo || undefined,
        shiftType: shiftDraft.shiftType || 'REGULAR'
      } as Shift;
    });
    if (editingGroupId) {
      if (existingGroupShifts.length > 0) {
        onUpdateShift(shiftsToSave[0]);
        existingGroupShifts.slice(1).forEach(s => onRemoveShift(s.id));
        shiftsToSave.slice(1).forEach(onAddShift);
      } else {
        shiftsToSave.forEach(onAddShift);
      }
    } else {
      shiftsToSave.forEach(onAddShift);
    }
    setIsShiftModalOpen(false);
    setEditingShiftId(null);
    setEditingGroupId(null);
  };

  const openEditShift = (shift: Shift) => {
    const groupId = getGroupId(shift);
    const groupShifts = shifts.filter(s => getGroupId(s) === groupId && s.staffId === shift.staffId);
    const groupSet = groupShifts.length ? groupShifts : [shift];
    const startDate = isoToLocalDate(new Date(Math.min(...groupSet.map(s => new Date(s.start).getTime()))).toISOString());
    const endDate = isoToLocalDate(new Date(Math.max(...groupSet.map(s => new Date(s.end).getTime()))).toISOString());
    setShiftDraft({
      groupId,
      staffId: shift.staffId,
      storeId: shift.storeId,
      dateStart: startDate,
      dateEnd: endDate,
      memo: shift.memo || '',
      shiftType: shift.shiftType || 'REGULAR'
    });
    setEditingShiftId(shift.id);
    setEditingGroupId(groupId);
    setIsShiftModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 h-full animate-fade-in">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} /> 근무표 & 휴무
          </h1>
          <p className="text-sm text-gray-500">근무 스케줄과 휴무를 한 화면에서 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold text-gray-700">지점 색상</span>
          <div className="flex flex-wrap gap-1">
            {stores.map(store => {
              const color = storeColorMap[store.id];
              return (
                <span key={store.id} className={`px-2 py-1 rounded-full border text-[11px] ${color?.badge || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {store.name}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-visible">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-gray-50">
            <div className="flex flex-wrap gap-2 items-center">
              <select
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
              >
                <option value="">전체 지점</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2">
                <button
                  onClick={() => setViewMode('WEEK')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${viewMode === 'WEEK' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                >
                  <ToggleLeft size={14} /> 주간
                </button>
                <button
                  onClick={() => setViewMode('MONTH')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${viewMode === 'MONTH' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                >
                  <ToggleRight size={14} /> 월간
                </button>
              </div>

              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2">
                <button onClick={() => viewMode === 'WEEK' ? moveWeek(-1) : moveMonth(-1)} className="p-2 hover:bg-gray-50 rounded-md"><ChevronLeft size={16} /></button>
                <div className="px-2 text-sm font-semibold text-gray-700 whitespace-nowrap">
                  {viewMode === 'WEEK' ? `${formatDateLabel(weekDays[0])} ~ ${formatDateLabel(weekDays[6])}` : `${anchorDate.getFullYear()}-${(anchorDate.getMonth() + 1).toString().padStart(2, '0')}`}
                </div>
                <button onClick={() => viewMode === 'WEEK' ? moveWeek(1) : moveMonth(1)} className="p-2 hover:bg-gray-50 rounded-md"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-48"
                  placeholder="직원 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                onClick={() => {
                  const todayStr = dateToLocalString(new Date());
                  const resolvedStoreId = resolveStoreId();
                  setShiftDraft(prev => ({
                    ...prev,
                    groupId: '',
                    staffId: '',
                    storeId: resolvedStoreId,
                    dateStart: todayStr,
                    dateEnd: todayStr,
                    memo: '',
                    shiftType: 'REGULAR'
                  }));
                  setEditingShiftId(null);
                  setEditingGroupId(null);
                  setIsShiftModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm"
              >
                <Plus size={16} /> 근무 추가
              </button>
            </div>
          </div>

          {/* Week grid */}
          {viewMode === 'WEEK' && (
            <div className="flex-1 overflow-auto select-none">
              <div className="min-w-[900px]">
                <div className="grid" style={{ gridTemplateColumns: `140px repeat(7, 1fr)` }}>
                  <div className="bg-white border-b border-gray-100 px-3 py-3 font-bold text-gray-700">직원</div>
                  {weekDays.map(d => (
                    <div key={dateToLocalString(d)} className="bg-white border-b border-gray-100 px-4 py-3 font-bold text-gray-700 text-center">
                      {formatDateLabel(d)}<span className="text-xs text-gray-400 ml-1">({['일','월','화','수','목','금','토'][d.getDay()]})</span>
                    </div>
                  ))}

                  {dragSelection?.active && (
                    <div className="col-span-8 px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold border-b border-blue-100">
                      드래그 선택: {dragSelection.start} ~ {dragSelection.end} ({dateRange(dragSelection.start, dragSelection.end).length}일)
                    </div>
                  )}

                  {filteredStaff.map(staff => (
                    <React.Fragment key={staff.id}>
                      <div className="border-b border-gray-100 px-3 py-3 font-semibold text-gray-800 bg-gray-50/80 sticky left-0 z-10 whitespace-nowrap text-ellipsis overflow-hidden">
                        {staff.name}
                      </div>
                      {weekDays.map(d => {
                        const dateStr = dateToLocalString(d);
                        const dayShifts = shifts.filter(s => s.staffId === staff.id && isoToLocalDate(s.start) === dateStr && (!selectedStoreId || s.storeId === selectedStoreId));
                        // 승인된 휴무는 이제 Shift로 변환되므로 제거
                        // 대기중 휴가만 표시
                        const pendingLeave = leaveRequests.find(r => r.staffId === staff.id && r.date === dateStr && r.status === 'pending');
                        const isDragging = dragSelection?.active && dragSelection.staffId === staff.id && dateStr >= dragSelection.start && dateStr <= dragSelection.end;
                        return (
                          <div
                            key={dateStr + staff.id}
                            className={`border-b border-gray-100 px-2 py-2 min-h-[60px] bg-white space-y-1.5 ${isDragging ? 'ring-2 ring-blue-200 bg-blue-50' : ''}`}
                            onMouseDown={(e) => {
                              if ((e.target as HTMLElement).closest('button')) return;
                              e.preventDefault();
                              setDragSelection({ staffId: staff.id, start: dateStr, end: dateStr, active: false, startX: e.clientX, startY: e.clientY });
                            }}
                            onMouseEnter={() => {
                              if (dragSelection && dragSelection.staffId === staff.id) {
                                setDragSelection({ ...dragSelection, active: true, end: dateStr });
                              }
                            }}
                            onMouseUp={(e) => {
                              if (!dragSelection || dragSelection.staffId !== staff.id) {
                                setDragSelection(null);
                                return;
                              }
                              e.preventDefault();
                              const moved = Math.abs(e.clientX - dragSelection.startX) + Math.abs(e.clientY - dragSelection.startY);
                              const isClick = !dragSelection.active && moved < 6;

                              const startDate = dragSelection.start <= dragSelection.end ? dragSelection.start : dragSelection.end;
                              const endDate = dragSelection.start <= dragSelection.end ? dragSelection.end : dragSelection.start;
                              const resolvedStoreId = selectedStoreId || currentStoreId || staff.storeId || shiftDraft.storeId || stores[0]?.id || '';

                              if (isClick) {
                                setShiftDraft(prev => ({
                                  ...prev,
                                  groupId: '',
                                  staffId: staff.id,
                                  storeId: resolvedStoreId,
                                  dateStart: dateStr,
                                  dateEnd: dateStr,
                                  memo: '',
                                  shiftType: 'REGULAR'
                                }));
                                setEditingShiftId(null);
                                setEditingGroupId(null);
                                setIsShiftModalOpen(true);
                                setDragSelection(null);
                                return;
                              }

                              if (!dragSelection.active) {
                                setDragSelection(null);
                                return;
                              }

                              setShiftDraft(prev => ({
                                ...prev,
                                groupId: '',
                                staffId: staff.id,
                                storeId: resolvedStoreId,
                                dateStart: startDate,
                                dateEnd: endDate
                              }));
                              setEditingShiftId(null);
                              setEditingGroupId(null);
                              setIsShiftModalOpen(true);
                              setDragSelection(null);
                            }}
                          >
                            {pendingLeave && (
                              <div className="text-[11px] px-2 py-1 rounded-md border flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200 font-semibold" style={{ borderStyle: 'dashed', borderWidth: '1px' }}>
                                {(() => {
                                  const storeName = stores.find(s => s.id === pendingLeave.storeId)?.name || '지점';
                                  return (
                                    <>
                                      <AlertCircle size={10}/>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap bg-amber-100 text-amber-800 border-amber-300`}>{storeName}</span>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap bg-amber-100 text-amber-800 border-amber-300`}>{pendingLeave.type === 'FULL' ? '월차' : '반차'} 결재중</span>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                            {dayShifts.length === 0 && !pendingLeave && (
                              <div className="text-[11px] text-gray-400">근무 없음</div>
                            )}
                            {dayShifts.map(shift => {
                              const storeColor = storeColorMap[shift.storeId] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700 border-gray-200' };
                              const shiftStyle = shiftTypeStyles[shift.shiftType || 'REGULAR'];
                              const storeName = stores.find(s => s.id === shift.storeId)?.name || '지점';
                              return (
                                <button
                                  key={shift.id}
                                  className={`w-full text-left text-[11px] px-2 py-1 rounded-md border flex items-center gap-2 ${storeColor.bg} ${storeColor.text} ${storeColor.border}`}
                                  onClick={() => openEditShift(shift)}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${storeColor.badge}`}>{storeName}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${shiftStyle.badge}`}>{shiftStyle.label}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}

                  {filteredStaff.length === 0 && (
                    <div className="col-span-8 px-4 py-10 text-center text-gray-400">표시할 직원이 없습니다.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Month view: simple calendar with shifts/휴무 */}
      {viewMode === 'MONTH' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-500">
            {['일','월','화','수','목','금','토'].map(d => <div key={d}>{d}</div>)}
          </div>
          {(() => {
            const year = anchorDate.getFullYear();
            const month = anchorDate.getMonth();
            const first = new Date(year, month, 1);
            const startIdx = first.getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const cells = Array.from({ length: startIdx }, () => null as Date | null).concat(
              Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
            );
            return (
              <div className="grid grid-cols-7 gap-2 auto-rows-[minmax(110px,1fr)]">
                {cells.map((d, idx) => {
                  if (!d) return <div key={`e-${idx}`} className="bg-gray-50 rounded-lg"/>;
                  const dateStr = dateToLocalString(d);
                  const dayShifts = shifts.filter(s => isoToLocalDate(s.start) === dateStr && (!selectedStoreId || s.storeId === selectedStoreId));
                  // 승인된 휴무는 Shift로 변환되므로 제거
                  const dayPendingLeaves = leaveRequests.filter(l => l.date === dateStr && l.status === 'pending');
                  return (
                    <div
                      key={dateStr}
                      className="border border-gray-100 rounded-lg p-2 flex flex-col gap-1 bg-white select-none"
                      onMouseDown={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        e.preventDefault();
                        setMonthDrag({ start: dateStr, end: dateStr, active: false, startX: e.clientX, startY: e.clientY });
                      }}
                      onMouseEnter={() => {
                        if (monthDrag) {
                          setMonthDrag({ ...monthDrag, active: true, end: dateStr });
                        }
                      }}
                      onMouseUp={(e) => {
                        if (!monthDrag) return;
                        e.preventDefault();
                        const moved = Math.abs(e.clientX - monthDrag.startX) + Math.abs(e.clientY - monthDrag.startY);
                        const isClick = !monthDrag.active && moved < 6;
                        const startDate = monthDrag.start <= monthDrag.end ? monthDrag.start : monthDrag.end;
                        const endDate = monthDrag.start <= monthDrag.end ? monthDrag.end : monthDrag.start;
                        const resolvedStoreId = selectedStoreId || currentStoreId || shiftDraft.storeId || stores[0]?.id || '';

                        if (isClick) {
                          setShiftDraft(prev => ({
                            ...prev,
                            groupId: '',
                            staffId: '',
                            storeId: resolvedStoreId,
                            dateStart: dateStr,
                            dateEnd: dateStr,
                            memo: '',
                            shiftType: 'REGULAR'
                          }));
                          setEditingShiftId(null);
                          setEditingGroupId(null);
                          setIsShiftModalOpen(true);
                          setMonthDrag(null);
                          return;
                        }

                        if (!monthDrag.active) {
                          setMonthDrag(null);
                          return;
                        }

                        setShiftDraft(prev => ({
                          ...prev,
                          groupId: '',
                          staffId: '',
                          storeId: resolvedStoreId,
                          dateStart: startDate,
                          dateEnd: endDate
                        }));
                        setEditingShiftId(null);
                        setEditingGroupId(null);
                        setIsShiftModalOpen(true);
                        setMonthDrag(null);
                      }}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                        <span>{d.getDate()}</span>
                        <span className="text-[10px] text-gray-400">{['일','월','화','수','목','금','토'][d.getDay()]}</span>
                      </div>
                      <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                        {dayPendingLeaves.map(l => {
                          const storeColor = storeColorMap[l.storeId] || { badge: 'bg-amber-100 text-amber-800 border-amber-200' };
                          const storeName = stores.find(s => s.id === l.storeId)?.name || '지점';
                          return (
                            <button
                              key={l.id}
                              className="text-[11px] px-2 py-1 rounded-md w-full text-left bg-amber-50 text-amber-700 flex items-center gap-1 font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                              style={{ borderStyle: 'dashed', borderWidth: '1px', borderColor: '#fcd34d' }}
                              onClick={() => {
                                if (confirm(`${l.staffName}님의 휴무 신청 [${l.type === 'FULL' ? '월차' : '반차'}]을 취소하시겠습니까?`)) {
                                  onRemoveLeaveRequest?.(l.id);
                                }
                              }}
                            >
                              <AlertCircle size={10}/>
                              <span className="font-semibold">{l.staffName}</span>
                              <span className={`text-[10px] px-2 py-[2px] rounded-full border ${storeColor.badge}`}>{storeName}</span>
                              <span>{l.type === 'FULL' ? '월차' : '반차'} 결재중</span>
                            </button>
                          );
                        })}
                        {dayShifts.length === 0 && dayPendingLeaves.length === 0 && (
                          <span className="text-[10px] text-gray-400">기록 없음</span>
                        )}
                        {dayShifts.map(s => {
                          const isOff = s.shiftType === 'OFF' || s.shiftType === 'VACATION';
                          const storeColor = storeColorMap[s.storeId] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
                          const shiftStyle = shiftTypeStyles[s.shiftType || 'REGULAR'];
                          const storeName = stores.find(st => st.id === s.storeId)?.name || '지점';
                          const baseClasses = isOff
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : `${storeColor.bg} ${storeColor.text} ${storeColor.border}`;
                          return (
                            <button
                              key={s.id}
                              className={`text-[11px] px-2 py-1 rounded-md border w-full text-left flex items-center gap-1 ${baseClasses}`}
                              onClick={() => openEditShift(s)}
                            >
                              <span className="font-semibold">{s.staffName}</span>
                              {!isOff && <span>{storeName}</span>}
                              <span className="font-semibold">{shiftStyle.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* 사장님 모드: 승인 대기중인 휴가 목록 */}
      {currentUser?.role === 'STORE_ADMIN' && (
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-500" />
            승인 대기중인 휴가 ({leaveRequests.filter(lr => lr.status === 'pending').length}명)
          </h3>
          {leaveRequests.filter(lr => lr.status === 'pending').length > 0 ? (
            <div className="space-y-3">
              {leaveRequests.filter(lr => lr.status === 'pending').length > 0 ? leaveRequests.filter(lr => lr.status === 'pending').map(leave => {
                const staff = staffList.find(s => s.id === leave.staffId);
                if (!staff) return null;
                
                try {
                  const dateParts = leave.date.split('-');
                  const month = parseInt(dateParts[1]);
                  const day = parseInt(dateParts[2]);
                  const dateStr = `${month}.${day}`;
                  
                  return (
                    <div key={leave.id} className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-800">{staff.name}</span>
                          <span className="text-xs px-2 py-1 rounded-md bg-rose-100 text-rose-700 border border-rose-200 font-bold">
                            {leave.type === 'FULL' ? '월차' : '반차'}
                          </span>
                          <span className="text-xs text-gray-500">{dateStr}</span>
                          {leave.reason && <span className="text-xs text-gray-600">({leave.reason})</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                      <button
                        onClick={() => onRejectLeave?.(leave.id, '')}
                        className="px-3 py-1.5 bg-red-100 text-red-700 font-bold rounded hover:bg-red-200 text-sm"
                      >
                        거절
                      </button>
                      <button
                        onClick={() => onApproveLeave?.(leave.id)}
                        className="px-3 py-1.5 bg-emerald-100 text-emerald-700 font-bold rounded hover:bg-emerald-200 text-sm"
                      >
                        승인
                      </button>
                    </div>
                  </div>
                  );
                } catch (error) {
                  console.error('Error rendering pending leave:', error);
                  return null;
                }
              }) : null}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              승인 대기중인 휴가가 없습니다.
            </div>
          )}
        </div>
      )}

      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">근무 {editingShiftId ? '수정' : '추가'}</h3>
              <button
                onClick={() => {
                  setIsShiftModalOpen(false);
                  setEditingShiftId(null);
                  setEditingGroupId(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              ><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">직원</label>
                  <select
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                    value={shiftDraft.staffId}
                    onChange={(e) => setShiftDraft(prev => ({ ...prev, staffId: e.target.value }))}
                  >
                    <option value="">직원 선택</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">지점</label>
                  <select
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                    value={shiftDraft.storeId}
                    onChange={(e) => setShiftDraft(prev => ({ ...prev, storeId: e.target.value }))}
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">시작일</label>
                  <input
                    type="date"
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                    value={shiftDraft.dateStart}
                    onChange={(e) => setShiftDraft(prev => ({ ...prev, dateStart: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">종료일</label>
                  <input
                    type="date"
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                    value={shiftDraft.dateEnd}
                    onChange={(e) => setShiftDraft(prev => ({ ...prev, dateEnd: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">메모(선택)</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="예: 오픈 셔터, 마감 점검"
                  value={shiftDraft.memo}
                  onChange={(e) => setShiftDraft(prev => ({ ...prev, memo: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">타입</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'REGULAR', label: '근무' },
                    { id: 'NIGHT', label: '야간' },
                    { id: 'OFF', label: '휴무' },
                    { id: 'VACATION', label: '월차' },
                    { id: 'HALF', label: '반차' },
                    { id: 'DUTY', label: '당직' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setShiftDraft(prev => ({ ...prev, shiftType: opt.id as Shift['shiftType'] }))}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${shiftDraft.shiftType === opt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  onClick={() => {
                    setIsShiftModalOpen(false);
                    setEditingShiftId(null);
                    setEditingGroupId(null);
                  }}
                  type="button"
                >
                  취소
                </button>
                {editingShiftId && (
                  <button
                    className="px-4 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      const targetGroupId = editingGroupId || shiftDraft.groupId || (editingShiftId ? deriveGroupIdFromId(editingShiftId) : '');
                      const toDelete = targetGroupId ? shifts.filter(s => getGroupId(s) === targetGroupId) : shifts.filter(s => s.id === editingShiftId);
                      toDelete.forEach(s => onRemoveShift(s.id));
                      if (!toDelete.length && editingShiftId) {
                        onRemoveShift(editingShiftId);
                      }
                      setIsShiftModalOpen(false);
                      setEditingShiftId(null);
                      setEditingGroupId(null);
                    }}
                    type="button"
                  >
                    삭제
                  </button>
                )}
                <button
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50"
                  onClick={submitShift}
                  type="button"
                  disabled={!shiftDraft.staffId}
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 거절 사유 입력 모달 */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-scale-in">
            <h3 className="text-lg font-bold text-gray-800">거절 사유 입력</h3>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows={4}
              placeholder="거절 사유를 입력하세요"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionReason('');
                  setRejectingLeaveId(null);
                }}
                className="px-4 py-2 border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (rejectingLeaveId) {
                    onRejectLeave?.(rejectingLeaveId, rejectionReason);
                    setIsRejectModalOpen(false);
                    setRejectionReason('');
                    setRejectingLeaveId(null);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
              >
                거절 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleAndLeave;

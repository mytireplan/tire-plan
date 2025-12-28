import React, { useEffect, useMemo, useState } from 'react';
import type { LeaveRequest, Staff, Store, Shift } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Plus, Search, ToggleLeft, ToggleRight, X } from 'lucide-react';

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

const ScheduleAndLeave: React.FC<ScheduleAndLeaveProps> = ({ staffList, leaveRequests, shifts, onAddShift, onUpdateShift, onRemoveShift, stores, currentStoreId, onShiftRangeChange }) => {
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || '');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'WEEK' | 'MONTH'>('WEEK');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [shiftDraft, setShiftDraft] = useState({
    groupId: '',
    staffId: '',
    storeId: stores[0]?.id || '',
    dateStart: new Date().toISOString().slice(0, 10),
    dateEnd: new Date().toISOString().slice(0, 10),
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
    VACATION: { badge: 'bg-amber-100 text-amber-800 border-amber-200', label: '월차' }
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
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  };

  // Normalize an ISO string into a local-date string (YYYY-MM-DD) to avoid timezone drift.
  const isoToLocalDate = (iso: string) => {
    const d = new Date(iso);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const deriveGroupIdFromId = (id: string) => {
    const parts = id.split('-');
    if (parts.length <= 2) return parts.join('-');
    parts.pop();
    return parts.join('-');
  };

  const getGroupId = (shift: Shift) => shift.groupId || deriveGroupIdFromId(shift.id);

  const resolveStoreId = () => selectedStoreId || currentStoreId || shiftDraft.storeId || stores[0]?.id || '';

  useEffect(() => {
    if (!onShiftRangeChange) return;
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const startStr = monthStart.toISOString();
    const endStr = new Date(monthEnd.setHours(23, 59, 59, 999)).toISOString();
    onShiftRangeChange(startStr, endStr);
  }, [anchorDate, onShiftRangeChange]);

  const submitShift = () => {
    if (!shiftDraft.staffId || !shiftDraft.storeId) return;
    const staff = staffList.find(s => s.id === shiftDraft.staffId);
    if (!staff) return;
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
                  const todayStr = new Date().toISOString().slice(0, 10);
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
                    <div key={d.toISOString()} className="bg-white border-b border-gray-100 px-4 py-3 font-bold text-gray-700 text-center">
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
                        const dateStr = d.toISOString().slice(0, 10);
                        const dayShifts = shifts.filter(s => s.staffId === staff.id && s.start.slice(0, 10) === dateStr && (!selectedStoreId || s.storeId === selectedStoreId));
                        const hasLeave = leaveRequests.some(r => r.staffId === staff.id && r.date === dateStr);
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
                            {hasLeave && (
                              <div className="text-[11px] px-2 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-200 inline-flex items-center gap-1 font-semibold">
                                휴무
                              </div>
                            )}
                            {dayShifts.length === 0 && !hasLeave && (
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
                  const dateStr = d.toISOString().slice(0,10);
                  const dayShifts = shifts.filter(s => s.start.slice(0,10) === dateStr && (!selectedStoreId || s.storeId === selectedStoreId));
                  const dayLeaves = leaveRequests.filter(l => l.date === dateStr);
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
                        {dayLeaves.map(l => (
                          <button
                            key={l.id}
                            className="text-[11px] px-2 py-1 rounded-md border w-full text-left bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1"
                            onClick={() => openEditShift({
                              id: l.id,
                              staffId: l.staffId,
                              staffName: l.staffName,
                              storeId: selectedStoreId || stores[0]?.id || '',
                              start: `${l.date}T00:00:00`,
                              end: `${l.date}T23:59:59`,
                              shiftType: 'OFF'
                            } as Shift)}
                          >
                            <span className="font-semibold">{l.staffName}</span>
                            <span className="font-semibold">휴무</span>
                          </button>
                        ))}
                        {dayShifts.length === 0 && dayLeaves.length === 0 && (
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
                    { id: 'VACATION', label: '월차' }
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
    </div>
  );
};

export default ScheduleAndLeave;

import React, { useState, useMemo, useCallback } from 'react';
import type { Store, User, DailyReport, DailyReportItem } from '../types';
import { formatCurrency } from '../utils/format';
import { BookOpen, ChevronDown, ChevronUp, Trash2, Image as ImageIcon, TrendingUp, Users as UsersIcon } from 'lucide-react';

const TIRE_CATEGORIES = ['타이어', '중고타이어'];
const REPAIR_CATEGORIES = ['정비', '부품/수리', '브레이크패드', '오일필터', '엔진오일', '에어크리너', 'TPMS'];

const resolveReportItemClass = (item: DailyReportItem): DailyReportItem['itemClass'] => {
    const normalizedCategory = item.category === '부품/수리' ? '정비' : item.category;
    if (TIRE_CATEGORIES.includes(normalizedCategory)) return 'tire';
    if (REPAIR_CATEGORIES.includes(normalizedCategory)) return 'repair';
    return item.itemClass;
};

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function won(n: number) {
    return '₩' + n.toLocaleString('ko-KR');
}

function generateDailyReportImage(report: DailyReport): void {
    const W = 800, PAD = 24;
    const HEADER_H = 80, KPI_H = 90, SEC_H = 36, COL_H = 28;
    const ROW_H = 46, STAFF_ROW_H = 44, FOOTER_H = 44, GAP = 16;
    const normalizedItems = report.items.map(item => ({ ...item, itemClass: resolveReportItemClass(item) }));
    const inventoryFlowCount = report.inventoryFlowEntries?.length || 0;
    const stockInCount = report.stockInRecords?.length || 0;
    const expenseCount = report.expenseEntries?.length || 0;
    const inventorySectionHeight = inventoryFlowCount > 0 ? SEC_H + COL_H + inventoryFlowCount * 34 + GAP : 0;
    const stockSectionHeight = stockInCount > 0 ? SEC_H + COL_H + stockInCount * 34 + GAP : 0;
    const expenseSectionHeight = expenseCount > 0 ? SEC_H + COL_H + expenseCount * 34 + GAP : 0;
    const totalH =
        HEADER_H + GAP +
        KPI_H + GAP +
        SEC_H + COL_H + normalizedItems.length * ROW_H + GAP +
        SEC_H + COL_H + report.staffStats.length * STAFF_ROW_H + GAP +
        inventorySectionHeight +
        stockSectionHeight +
        expenseSectionHeight +
        FOOTER_H;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d')!;

    const sf = (size: number, bold = false) => {
        ctx.font = (bold ? 'bold ' : '') + size + 'px -apple-system, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    };

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, totalH);

    // Header
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, W, HEADER_H);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, HEADER_H - 4, W, 4);
    ctx.fillStyle = '#ffffff';
    sf(20, true);
    ctx.fillText(report.storeName, PAD, 34);
    sf(13);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText(report.dateStr.replace(/-/g, '.') + '  일별 마감 보고서', PAD, 58);
    sf(12);
    ctx.fillStyle = '#6ee7b7';
    ctx.textAlign = 'right';
    ctx.fillText('작성: ' + report.createdBy, W - PAD, 58);
    ctx.textAlign = 'left';

    let y = HEADER_H + GAP;

    // KPI boxes
    const BW = (W - PAD * 2 - 12) / 4;
    const kpis = [
        { label: '총 매출', value: won(report.revenue), sub: report.salesCount + '건', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
        { label: '총 원가', value: won(report.cost), sub: '', color: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
        { label: '순 수익', value: won(report.profit), sub: '', color: report.profit >= 0 ? '#065f46' : '#991b1b', bg: report.profit >= 0 ? '#ecfdf5' : '#fef2f2', border: report.profit >= 0 ? '#a7f3d0' : '#fecaca' },
        { label: '마진율', value: report.margin.toFixed(1) + '%', sub: '타이어 ' + report.tireQty + '개', color: '#5b21b6', bg: '#f5f3ff', border: '#ddd6fe' },
    ];
    kpis.forEach((k, i) => {
        const bx = PAD + i * (BW + 4);
        ctx.fillStyle = k.bg;
        drawRoundRect(ctx, bx, y, BW, KPI_H - 4, 8);
        ctx.fill();
        ctx.strokeStyle = k.border;
        ctx.lineWidth = 1;
        drawRoundRect(ctx, bx, y, BW, KPI_H - 4, 8);
        ctx.stroke();
        sf(11);
        ctx.fillStyle = '#6b7280';
        ctx.fillText(k.label, bx + 10, y + 22);
        sf(15, true);
        ctx.fillStyle = k.color;
        ctx.fillText(k.value, bx + 10, y + 48);
        if (k.sub) {
            sf(11);
            ctx.fillStyle = '#9ca3af';
            ctx.fillText(k.sub, bx + 10, y + 66);
        }
    });
    y += KPI_H + GAP;

    // Items section header
    ctx.fillStyle = '#f0fdf4';
    ctx.fillRect(0, y, W, SEC_H);
    ctx.fillStyle = '#166534';
    ctx.fillRect(0, y, 4, SEC_H);
    sf(13, true);
    ctx.fillStyle = '#14532d';
    ctx.fillText('품목별 실적', PAD + 10, y + 23);
    y += SEC_H;

    // Items table header
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, y, W, COL_H);
    sf(11);
    ctx.fillStyle = '#6b7280';
    const IC = [PAD + 6, PAD + 62, PAD + 282, PAD + 340, PAD + 470, PAD + 600];
    ['구분', '상품명', '수량', '판매액', '원가', '수익'].forEach((h, i) => ctx.fillText(h, IC[i], y + 19));
    y += COL_H;

    normalizedItems.forEach((item, i) => {
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f9fafb';
        ctx.fillRect(0, y, W, ROW_H);

        const bc = item.itemClass === 'tire' ? '#ea580c' : item.itemClass === 'repair' ? '#7c3aed' : '#475569';
        const bl = item.itemClass === 'tire' ? '타이어' : item.itemClass === 'repair' ? '정비' : '공임';

        ctx.fillStyle = bc + '20';
        drawRoundRect(ctx, IC[0], y + 12, 46, 20, 10);
        ctx.fill();
        sf(9, true);
        ctx.fillStyle = bc;
        ctx.textAlign = 'center';
        ctx.fillText(bl, IC[0] + 23, y + 25);
        ctx.textAlign = 'left';

        sf(12);
        ctx.fillStyle = '#111827';
        let nm = item.productName + (item.specification ? ' ' + item.specification : '');
        sf(12);
        while (ctx.measureText(nm).width > 200 && nm.length > 2) nm = nm.slice(0, -1);
        if (nm !== item.productName + (item.specification ? ' ' + item.specification : '')) nm += '…';
        ctx.fillText(nm, IC[1], y + 27);

        ctx.fillStyle = '#374151';
        ctx.fillText(item.qty + '개', IC[2], y + 27);
        ctx.fillText(won(item.revenue), IC[3], y + 27);
        ctx.fillText(item.cost > 0 ? won(item.cost) : '-', IC[4], y + 27);
        ctx.fillStyle = item.profit >= 0 ? '#059669' : '#dc2626';
        sf(12, true);
        ctx.fillText(item.cost > 0 ? won(item.profit) : '-', IC[5], y + 27);

        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y + ROW_H);
        ctx.lineTo(W, y + ROW_H);
        ctx.stroke();
        y += ROW_H;
    });
    y += GAP;

    // Staff section header
    ctx.fillStyle = '#eff6ff';
    ctx.fillRect(0, y, W, SEC_H);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, y, 4, SEC_H);
    sf(13, true);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('직원별 성과', PAD + 10, y + 23);
    y += SEC_H;

    // Staff table header
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, y, W, COL_H);
    sf(11);
    ctx.fillStyle = '#6b7280';
    const SC = [PAD + 6, PAD + 130, PAD + 210, PAD + 380, PAD + 530, PAD + 680];
    ['직원명', '건수', '매출', '원가', '수익', '마진'].forEach((h, i) => ctx.fillText(h, SC[i], y + 19));
    y += COL_H;

    report.staffStats.forEach((s, i) => {
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f9fafb';
        ctx.fillRect(0, y, W, STAFF_ROW_H);

        const sp = s.revenue - s.cost;
        const sm = s.revenue > 0 && s.cost > 0 ? (sp / s.revenue * 100).toFixed(1) + '%' : '-';

        sf(13, true);
        ctx.fillStyle = '#111827';
        ctx.fillText(s.staffName, SC[0], y + 27);
        sf(12);
        ctx.fillStyle = '#374151';
        ctx.fillText(s.salesCount + '건', SC[1], y + 27);
        ctx.fillText(won(s.revenue), SC[2], y + 27);
        ctx.fillText(s.cost > 0 ? won(s.cost) : '-', SC[3], y + 27);
        ctx.fillStyle = sp >= 0 ? '#059669' : '#dc2626';
        sf(12, true);
        ctx.fillText(s.cost > 0 ? won(sp) : '-', SC[4], y + 27);
        sf(11);
        ctx.fillStyle = '#6b7280';
        ctx.fillText(s.cost > 0 ? sm : '-', SC[5], y + 27);

        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y + STAFF_ROW_H);
        ctx.lineTo(W, y + STAFF_ROW_H);
        ctx.stroke();
        y += STAFF_ROW_H;
    });
    y += GAP;

    if (inventoryFlowCount > 0) {
        ctx.fillStyle = '#ecfdf5';
        ctx.fillRect(0, y, W, SEC_H);
        ctx.fillStyle = '#059669';
        ctx.fillRect(0, y, 4, SEC_H);
        sf(13, true);
        ctx.fillStyle = '#047857';
        ctx.fillText('재고 흐름 (전일 기준)', PAD + 10, y + 23);
        y += SEC_H;

        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(0, y, W, COL_H);
        sf(11);
        ctx.fillStyle = '#6b7280';
        const invCols = [PAD + 6, PAD + 330, PAD + 440, PAD + 550, PAD + 670];
        ['분류', '전일', '입고', '판매', '당일'].forEach((h, i) => ctx.fillText(h, invCols[i], y + 19));
        y += COL_H;

        report.inventoryFlowEntries?.forEach((item, i) => {
            ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
            ctx.fillRect(0, y, W, 34);
            sf(11);
            ctx.fillStyle = '#111827';
            ctx.fillText(item.category, invCols[0], y + 21);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#475569';
            ctx.fillText(String(item.previousStock), invCols[2] - 20, y + 21);
            ctx.fillStyle = '#2563eb';
            ctx.fillText('+' + String(item.stockInQty), invCols[3] - 20, y + 21);
            ctx.fillStyle = '#e11d48';
            ctx.fillText('-' + String(item.soldQty), invCols[4] - 20, y + 21);
            ctx.fillStyle = '#059669';
            ctx.fillText(String(item.currentStock), W - PAD, y + 21);
            ctx.textAlign = 'left';
            y += 34;
        });

        y += GAP;
    }

    if (stockInCount > 0) {
        ctx.fillStyle = '#eff6ff';
        ctx.fillRect(0, y, W, SEC_H);
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, y, 4, SEC_H);
        sf(13, true);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillText('당일 입고내역', PAD + 10, y + 23);
        y += SEC_H;

        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(0, y, W, COL_H);
        sf(11);
        ctx.fillStyle = '#6b7280';
        const stockCols = [PAD + 6, PAD + 90, PAD + 420, PAD + 600];
        ['거래처', '상품명', '분류/규격', '수량'].forEach((h, i) => ctx.fillText(h, stockCols[i], y + 19));
        y += COL_H;

        report.stockInRecords?.forEach((item, i) => {
            ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
            ctx.fillRect(0, y, W, 34);
            sf(11);
            ctx.fillStyle = '#475569';
            ctx.fillText(item.supplier || '-', stockCols[0], y + 21);
            ctx.fillStyle = '#111827';
            ctx.fillText(item.productName, stockCols[1], y + 21);
            ctx.fillStyle = '#64748b';
            ctx.fillText([item.category, item.specification].filter(Boolean).join(' / '), stockCols[2], y + 21);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#1d4ed8';
            ctx.fillText(String(item.quantity), W - PAD, y + 21);
            ctx.textAlign = 'left';
            y += 34;
        });

        y += GAP;
    }

    if (expenseCount > 0) {
        ctx.fillStyle = '#fff1f2';
        ctx.fillRect(0, y, W, SEC_H);
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(0, y, 4, SEC_H);
        sf(13, true);
        ctx.fillStyle = '#be123c';
        ctx.fillText('당일 지출내역', PAD + 10, y + 23);
        sf(11);
        ctx.textAlign = 'right';
        ctx.fillText('합계 ' + won(report.expenseTotal || 0), W - PAD, y + 23);
        ctx.textAlign = 'left';
        y += SEC_H;

        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(0, y, W, COL_H);
        sf(11);
        ctx.fillStyle = '#6b7280';
        const expenseCols = [PAD + 6, PAD + 120, PAD + 620];
        ['분류', '내용', '금액'].forEach((h, i) => ctx.fillText(h, expenseCols[i], y + 19));
        y += COL_H;

        report.expenseEntries?.forEach((item, i) => {
            ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fffafb';
            ctx.fillRect(0, y, W, 34);
            sf(11);
            ctx.fillStyle = '#be123c';
            ctx.fillText(item.category, expenseCols[0], y + 21);
            ctx.fillStyle = '#111827';
            ctx.fillText(item.description, expenseCols[1], y + 21);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#b91c1c';
            ctx.fillText(won(item.amount), W - PAD, y + 21);
            ctx.textAlign = 'left';
            y += 34;
        });

        y += GAP;
    }

    // Footer
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, y, W, FOOTER_H);
    sf(12);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('tireplan.kr', PAD, y + 28);
    ctx.textAlign = 'right';
    ctx.fillText(new Date(report.createdAt).toLocaleString('ko-KR'), W - PAD, y + 28);
    ctx.textAlign = 'left';

    const link = document.createElement('a');
    link.download = '마감보고서_' + report.storeName + '_' + report.dateStr + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

interface DailyReportBoardProps {
    reports: DailyReport[];
    stores: Store[];
    currentUser: User;
    onDeleteReport: (reportId: string) => void;
}

const DailyReportBoard: React.FC<DailyReportBoardProps> = ({ reports, currentUser, onDeleteReport }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const handleDownload = useCallback((report: DailyReport) => {
        setDownloadingId(report.id);
        setTimeout(() => {
            generateDailyReportImage(report);
            setDownloadingId(null);
        }, 80);
    }, []);

    const sortedReports = useMemo(() =>
        [...reports]
            .map(report => ({
                ...report,
                items: report.items.map(item => ({
                    ...item,
                    itemClass: resolveReportItemClass(item),
                })),
            }))
            .sort((a, b) => b.dateStr.localeCompare(a.dateStr)),
        [reports]);

    return (
        <div className="flex flex-col h-full min-h-0 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
                <BookOpen size={20} className="text-emerald-600" />
                <div>
                    <h2 className="text-base font-bold text-gray-800">마감 보고서 게시판</h2>
                    <p className="text-xs text-gray-400">일별 마감 탭에서 보고서를 올릴 수 있습니다.</p>
                </div>
                <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-medium">
                    {sortedReports.length}건
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                {sortedReports.length === 0 ? (
                    <div className="text-center py-24 text-gray-300">
                        <BookOpen size={44} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm">등록된 보고서가 없습니다.</p>
                        <p className="text-xs mt-1 text-gray-400">일별 마감 탭에서 원가 저장 후 보고서를 올려보세요.</p>
                    </div>
                ) : sortedReports.map(report => {
                    const isExpanded = expandedId === report.id;
                    const isDownloading = downloadingId === report.id;
                    const margin = report.revenue > 0 && report.cost > 0
                        ? (report.profit / report.revenue * 100).toFixed(1)
                        : null;
                    const inventoryFlowEntries = report.inventoryFlowEntries || [];
                    const priorityCategories = ['타이어', '중고타이어'];
                    const primaryInventoryFlows = priorityCategories
                        .map(category => inventoryFlowEntries.find(entry => entry.category === category))
                        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
                    const fallbackInventoryFlows = inventoryFlowEntries
                        .filter(entry => !priorityCategories.includes(entry.category))
                        .slice(0, 1);
                    const inventoryPreviewFlows = (primaryInventoryFlows.length > 0 ? primaryInventoryFlows : fallbackInventoryFlows).slice(0, 2);
                    const inventoryPreviewText = inventoryPreviewFlows
                        .map(entry => `${entry.category} ${entry.previousStock}/${entry.stockInQty}/${entry.soldQty}/${entry.currentStock}`)
                        .join(' · ');

                    return (
                        <div key={report.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                                <button
                                    className="flex-1 flex items-center gap-4 text-left"
                                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                                >
                                    <div className="w-12 text-center shrink-0">
                                        <div className="text-xs text-gray-400">보고서</div>
                                        <div className="text-base font-bold text-gray-800">
                                            {report.dateStr.slice(5).replace('-', '/')}
                                        </div>
                                    </div>
                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                                        <div>
                                            <div className="text-[11px] text-gray-400">매출</div>
                                            <div className="font-bold text-blue-600 text-sm">{formatCurrency(report.revenue)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] text-gray-400">
                                                수익{margin && <span className="text-gray-300 ml-1">({margin}%)</span>}
                                            </div>
                                            <div className={`font-bold text-sm ${report.cost > 0 ? (report.profit >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-gray-300'}`}>
                                                {report.cost > 0 ? formatCurrency(report.profit) : '원가 없음'}
                                            </div>
                                        </div>
                                        <div className="hidden md:block">
                                            <div className="text-[11px] text-gray-400">타이어 / 정비 / 공임</div>
                                            <div className="text-sm font-medium">
                                                {report.tireQty > 0 && <span className="text-orange-500 mr-1">{report.tireQty}개</span>}
                                                {report.repairQty > 0 && <span className="text-violet-500 mr-1">{report.repairQty}건</span>}
                                                {report.laborQty > 0 && <span className="text-slate-400">{report.laborQty}공임</span>}
                                            </div>
                                            {inventoryPreviewText && (
                                                <div className="hidden md:block text-[10px] text-emerald-700 mt-0.5 truncate" title={inventoryPreviewText}>
                                                    전일/입고/판매/당일: {inventoryPreviewText}
                                                </div>
                                            )}
                                        </div>
                                        <div className="hidden md:block">
                                            <div className="text-[11px] text-gray-400">작성자</div>
                                            <div className="text-sm text-gray-600 font-medium">{report.createdBy}</div>
                                        </div>
                                    </div>
                                    {report.expenseTotal ? (
                                        <div className="shrink-0 text-right hidden lg:block">
                                            <div className="text-[11px] text-gray-400">당일 지출</div>
                                            <div className="text-sm font-bold text-rose-600">{formatCurrency(report.expenseTotal)}</div>
                                        </div>
                                    ) : null}
                                    <div className="shrink-0">
                                        {isExpanded
                                            ? <ChevronUp size={16} className="text-gray-400" />
                                            : <ChevronDown size={16} className="text-gray-400" />}
                                    </div>
                                </button>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleDownload(report)}
                                        disabled={isDownloading}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                    >
                                        <ImageIcon size={13} />
                                        {isDownloading ? '생성중...' : '이미지'}
                                    </button>
                                    {(currentUser.role === 'STORE_ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
                                        deleteConfirmId === report.id ? (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => { onDeleteReport(report.id); setDeleteConfirmId(null); }}
                                                    className="px-2 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600"
                                                >
                                                    삭제
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmId(null)}
                                                    className="px-2 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold"
                                                >
                                                    취소
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirmId(report.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )
                                    )}
                                </div>

                                {inventoryPreviewText && (
                                    <div className="md:hidden w-full text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                                        전일/입고/판매/당일: {inventoryPreviewText}
                                    </div>
                                )}
                            </div>

                            {isExpanded && (
                                <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                                    {/* Items table */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                            <TrendingUp size={13} /> 품목별 실적
                                        </h4>
                                        <div className="rounded-lg overflow-hidden border border-gray-100">
                                            <div className="grid grid-cols-[50px_1fr_40px_90px_90px_90px] bg-gray-50 text-[11px] text-gray-500 font-medium px-3 py-2">
                                                <span>구분</span>
                                                <span>상품명</span>
                                                <span className="text-right">수량</span>
                                                <span className="text-right">판매</span>
                                                <span className="text-right">원가</span>
                                                <span className="text-right">수익</span>
                                            </div>
                                            {report.items.map((item, i) => {
                                                const cc = item.itemClass === 'tire'
                                                    ? 'text-orange-600 bg-orange-50'
                                                    : item.itemClass === 'repair'
                                                        ? 'text-violet-600 bg-violet-50'
                                                        : 'text-slate-500 bg-slate-50';
                                                const cl = item.itemClass === 'tire' ? '타이어' : item.itemClass === 'repair' ? '정비' : '공임';
                                                return (
                                                    <div key={i} className={`grid grid-cols-[50px_1fr_40px_90px_90px_90px] px-3 py-2.5 text-sm border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full self-center text-center ${cc}`}>{cl}</span>
                                                        <div>
                                                            <div className="font-medium text-gray-800 truncate">{item.productName}</div>
                                                            {item.specification && <div className="text-xs text-blue-500">{item.specification}</div>}
                                                        </div>
                                                        <span className="text-right text-gray-500 self-center">{item.qty}</span>
                                                        <span className="text-right text-gray-700 self-center">{formatCurrency(item.revenue)}</span>
                                                        <span className="text-right text-gray-600 self-center">{item.cost > 0 ? formatCurrency(item.cost) : '-'}</span>
                                                        <span className={`text-right font-bold self-center ${item.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {item.cost > 0 ? formatCurrency(item.profit) : '-'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Staff table */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                            <UsersIcon size={13} /> 직원별 성과
                                        </h4>
                                        <div className="rounded-lg overflow-hidden border border-gray-100">
                                            <div className="grid grid-cols-[1fr_50px_90px_90px_90px_60px] bg-gray-50 text-[11px] text-gray-500 font-medium px-3 py-2">
                                                <span>직원명</span>
                                                <span className="text-right">건수</span>
                                                <span className="text-right">매출</span>
                                                <span className="text-right">원가</span>
                                                <span className="text-right">수익</span>
                                                <span className="text-right">마진</span>
                                            </div>
                                            {report.staffStats.map((s, i) => {
                                                const sp = s.revenue - s.cost;
                                                const sm = s.revenue > 0 && s.cost > 0
                                                    ? (sp / s.revenue * 100).toFixed(1) + '%'
                                                    : '-';
                                                return (
                                                    <div key={i} className={`grid grid-cols-[1fr_50px_90px_90px_90px_60px] px-3 py-2.5 text-sm border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                                                        <span className="font-bold text-gray-800">{s.staffName}</span>
                                                        <span className="text-right text-gray-500 self-center">{s.salesCount}건</span>
                                                        <span className="text-right text-gray-700 self-center">{formatCurrency(s.revenue)}</span>
                                                        <span className="text-right text-gray-600 self-center">{s.cost > 0 ? formatCurrency(s.cost) : '-'}</span>
                                                        <span className={`text-right font-bold self-center ${sp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {s.cost > 0 ? formatCurrency(sp) : '-'}
                                                        </span>
                                                        <span className="text-right text-xs text-gray-500 self-center">{s.cost > 0 ? sm : '-'}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {report.stockInRecords && report.stockInRecords.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                                <ImageIcon size={13} /> 당일 입고내역
                                            </h4>
                                            <div className="rounded-lg overflow-hidden border border-gray-100">
                                                <div className="grid grid-cols-[110px_1fr_1fr_70px] bg-gray-50 text-[11px] text-gray-500 font-medium px-3 py-2">
                                                    <span>거래처</span>
                                                    <span>상품명</span>
                                                    <span>분류 / 규격</span>
                                                    <span className="text-right">수량</span>
                                                </div>
                                                {report.stockInRecords.map((item, i) => (
                                                    <div key={item.id} className={`grid grid-cols-[110px_1fr_1fr_70px] px-3 py-2.5 text-sm border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                                                        <span className="text-gray-600 self-center truncate">{item.supplier || '-'}</span>
                                                        <span className="font-medium text-gray-800 self-center truncate">{item.productName}</span>
                                                        <div className="self-center min-w-0">
                                                            <div className="text-gray-600 truncate">{item.category}</div>
                                                            {item.specification && <div className="text-xs text-blue-500 truncate">{item.specification}</div>}
                                                        </div>
                                                        <span className="text-right font-bold text-blue-600 self-center">{item.quantity}개</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {report.inventoryFlowEntries && report.inventoryFlowEntries.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                                <TrendingUp size={13} /> 재고 흐름 (전일 기준)
                                            </h4>
                                            <div className="rounded-lg overflow-hidden border border-gray-100">
                                                <div className="grid grid-cols-[1fr_90px_90px_90px_90px] bg-gray-50 text-[11px] text-gray-500 font-medium px-3 py-2">
                                                    <span>분류</span>
                                                    <span className="text-right">전일</span>
                                                    <span className="text-right">입고</span>
                                                    <span className="text-right">판매</span>
                                                    <span className="text-right">당일</span>
                                                </div>
                                                {report.inventoryFlowEntries.map((entry, i) => (
                                                    <div key={entry.category} className={`grid grid-cols-[1fr_90px_90px_90px_90px] px-3 py-2.5 text-sm border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                                                        <span className="font-medium text-gray-800 truncate">{entry.category}</span>
                                                        <span className="text-right text-gray-600">{entry.previousStock}개</span>
                                                        <span className="text-right text-blue-600 font-semibold">+{entry.stockInQty}개</span>
                                                        <span className="text-right text-rose-600 font-semibold">-{entry.soldQty}개</span>
                                                        <span className="text-right text-emerald-700 font-bold">{entry.currentStock}개</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {report.expenseEntries && report.expenseEntries.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                                <TrendingUp size={13} /> 당일 지출내역
                                            </h4>
                                            <div className="rounded-lg overflow-hidden border border-gray-100">
                                                <div className="grid grid-cols-[100px_1fr_110px_70px] bg-gray-50 text-[11px] text-gray-500 font-medium px-3 py-2">
                                                    <span>분류</span>
                                                    <span>내용</span>
                                                    <span className="text-right">금액</span>
                                                    <span className="text-right">구분</span>
                                                </div>
                                                {report.expenseEntries.map((expense, i) => (
                                                    <div key={expense.id} className={`grid grid-cols-[100px_1fr_110px_70px] px-3 py-2.5 text-sm border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                                                        <span className="text-gray-700 self-center truncate">{expense.category}</span>
                                                        <span className="font-medium text-gray-800 self-center truncate">{expense.description}</span>
                                                        <span className="text-right font-bold text-rose-600 self-center">{formatCurrency(expense.amount)}</span>
                                                        <span className="text-right text-xs text-gray-400 self-center">{expense.source === 'manual' ? '직접입력' : '기존지출'}</span>
                                                    </div>
                                                ))}
                                                <div className="px-3 py-2.5 border-t border-gray-100 bg-rose-50/60 flex items-center justify-end gap-3 text-sm">
                                                    <span className="text-gray-500">합계</span>
                                                    <span className="font-bold text-rose-600">{formatCurrency(report.expenseTotal || 0)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-xs text-gray-400 text-right">
                                        {report.storeName} · 작성: {report.createdBy} · {new Date(report.createdAt).toLocaleString('ko-KR')}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DailyReportBoard;

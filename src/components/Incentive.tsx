import React, { useMemo, useState } from 'react';
import type { DailyReport, IncentiveRule, User } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';
import { Save, Lock } from 'lucide-react';

interface IncentiveProps {
  dailyReports: DailyReport[];
  incentiveRules: IncentiveRule[];
  currentStoreId: string;
  currentUser: User;
  onUpsertRule: (payload: { storeId: string; productName: string; category: string; amountPerUnit: number }) => void;
  onUpsertComplexRule: (payload: {
    storeId: string;
    productName: string;
    ruleType: 'tire_quantity' | 'margin_bonus';
    tireThreshold?: number;
    marginThreshold?: number;
    bonusAmount: number;
  }) => void;
}

const Incentive: React.FC<IncentiveProps> = ({
  dailyReports,
  incentiveRules,
  currentStoreId,
  currentUser,
  onUpsertRule,
  onUpsertComplexRule,
}) => {
  const isOwner = currentUser.role === 'STORE_ADMIN' || currentUser.role === 'SUPER_ADMIN';

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [draftRates, setDraftRates] = useState<Record<string, string>>({});

  // Complex rule draft state
  const [tireBonusDraft, setTireBonusDraft] = useState<{ threshold: string; bonus: string }>({ threshold: '', bonus: '' });
  const [marginBonusDraft, setMarginBonusDraft] = useState<{ threshold: string; bonus: string }>({ threshold: '', bonus: '' });

  // 선택 월 + 지점 필터 보고서
  const monthReports = useMemo(() => {
    return dailyReports.filter((r) => {
      if (r.dateStr.slice(0, 7) !== month) return false;
      if (currentStoreId !== 'ALL' && r.storeId !== currentStoreId) return false;
      return true;
    });
  }, [dailyReports, month, currentStoreId]);

  const storeIdForRules = currentStoreId !== 'ALL' ? currentStoreId : (monthReports[0]?.storeId || '');

  // ruleMap: "storeId::productName" -> IncentiveRule (unit_price only)
  const ruleMap = useMemo(() => {
    const map = new Map<string, IncentiveRule>();
    incentiveRules.forEach((r) => {
      if (r.productName && r.productName !== '__TIRE_BONUS__' && r.productName !== '__MARGIN_BONUS__') {
        map.set(`${r.storeId}::${r.productName}`, r);
      }
    });
    return map;
  }, [incentiveRules]);

  // Complex rules
  const tireRule = useMemo(
    () => incentiveRules.find((r) => r.productName === '__TIRE_BONUS__' && (currentStoreId === 'ALL' || r.storeId === currentStoreId)),
    [incentiveRules, currentStoreId]
  );
  const marginRule = useMemo(
    () => incentiveRules.find((r) => r.productName === '__MARGIN_BONUS__' && (currentStoreId === 'ALL' || r.storeId === currentStoreId)),
    [incentiveRules, currentStoreId]
  );

  const getRate = (storeId: string, productName: string): number => {
    return ruleMap.get(`${storeId}::${productName}`)?.amountPerUnit || 0;
  };

  // staffItems에서 정비 항목만 수집 → 직원별/품목별 집계
  const { productNames, staffMap } = useMemo(() => {
    const productSet = new Set<string>();
    const staffMap = new Map<string, { storeId: string; items: Map<string, number>; tireQty: number; revenue: number; profit: number }>();

    monthReports.forEach((report) => {
      // Repair item breakdown (for unit_price calculation)
      (report.staffItems || []).forEach((si) => {
        if (si.itemClass !== 'repair') return;
        productSet.add(si.productName);
        if (!staffMap.has(si.staffName)) {
          staffMap.set(si.staffName, { storeId: report.storeId, items: new Map(), tireQty: 0, revenue: 0, profit: 0 });
        }
        const entry = staffMap.get(si.staffName)!;
        entry.items.set(si.productName, (entry.items.get(si.productName) || 0) + si.qty);
      });

      // Staff-level aggregates from staffStats (tire qty, revenue/profit for margin)
      (report.staffStats || []).forEach((ss) => {
        if (!staffMap.has(ss.staffName)) {
          staffMap.set(ss.staffName, { storeId: report.storeId, items: new Map(), tireQty: 0, revenue: 0, profit: 0 });
        }
        const entry = staffMap.get(ss.staffName)!;
        entry.tireQty += ss.tireQty || 0;
        entry.revenue += ss.revenue || 0;
        entry.profit += ss.profit || 0;
      });
    });

    const productNames = Array.from(productSet).sort();
    return { productNames, staffMap };
  }, [monthReports]);

  // 직원별 행 계산
  const staffRows = useMemo(() => {
    const tireThreshold = tireRule?.tireThreshold ?? 0;
    const tireBonus = tireRule?.bonusAmount ?? 0;
    const marginThreshold = marginRule?.marginThreshold ?? 0;
    const marginBonusAmt = marginRule?.bonusAmount ?? 0;

    return Array.from(staffMap.entries()).map(([staffName, { storeId, items, tireQty, revenue, profit }]) => {
      const repairDetails = productNames.map((name) => {
        const qty = items.get(name) || 0;
        const rate = getRate(storeId, name);
        return { productName: name, qty, rate, amount: qty * rate };
      });

      const repairIncentive = repairDetails.reduce((s, d) => s + d.amount, 0);
      const totalRepairQty = repairDetails.reduce((s, d) => s + d.qty, 0);
      const marginRate = revenue > 0 ? (profit / revenue) * 100 : 0;
      const tireBonusEarned = tireThreshold > 0 && tireQty >= tireThreshold ? tireBonus : 0;
      const marginBonusEarned = marginThreshold > 0 && marginRate >= marginThreshold ? marginBonusAmt : 0;
      const totalAmount = repairIncentive + tireBonusEarned + marginBonusEarned;

      return { staffName, storeId, repairDetails, totalRepairQty, tireQty, marginRate, repairIncentive, tireBonusEarned, marginBonusEarned, totalAmount };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [staffMap, productNames, ruleMap, tireRule, marginRule]);

  const totalRepairQty = staffRows.reduce((s, r) => s + r.totalRepairQty, 0);
  const totalTireQty = staffRows.reduce((s, r) => s + r.tireQty, 0);
  const totalIncentive = staffRows.reduce((s, r) => s + r.totalAmount, 0);

  const noReports = monthReports.length === 0;
  const hasStaffItems = monthReports.some((r) => r.staffItems && r.staffItems.length > 0);

  const tireBonusThresholdDisplay = tireBonusDraft.threshold !== '' ? tireBonusDraft.threshold : String(tireRule?.tireThreshold ?? '');
  const tireBonusAmountDisplay = tireBonusDraft.bonus !== '' ? tireBonusDraft.bonus : String(tireRule?.bonusAmount ?? '');
  const marginThresholdDisplay = marginBonusDraft.threshold !== '' ? marginBonusDraft.threshold : String(marginRule?.marginThreshold ?? '');
  const marginBonusAmountDisplay = marginBonusDraft.bonus !== '' ? marginBonusDraft.bonus : String(marginRule?.bonusAmount ?? '');

  const showComplexBonusColumns = (tireRule?.bonusAmount ?? 0) > 0 || (marginRule?.bonusAmount ?? 0) > 0;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 헤더 */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">인센티브</h2>
            <p className="text-xs text-gray-500 mt-1">
              일마감 보고서 기반으로 직원별 실적을 집계해 인센티브를 자동 계산합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">기준월</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-blue-100 bg-blue-50">
            <div className="text-xs text-blue-600 font-semibold">정비 수량 합계</div>
            <div className="text-xl font-bold text-blue-700 mt-1">{formatNumber(totalRepairQty)}개</div>
          </div>
          <div className="p-3 rounded-lg border border-violet-100 bg-violet-50">
            <div className="text-xs text-violet-600 font-semibold">타이어 판매 합계</div>
            <div className="text-xl font-bold text-violet-700 mt-1">{formatNumber(totalTireQty)}개</div>
          </div>
          <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50">
            <div className="text-xs text-emerald-600 font-semibold">인센티브 합계</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(totalIncentive)}</div>
          </div>
        </div>
      </div>

      {/* 상태 안내 */}
      {noReports && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-yellow-800">
          이 달에 저장된 일마감 보고서가 없습니다. 일별 마감 탭에서 마감을 저장하면 인센티브가 자동 집계됩니다.
        </div>
      )}
      {!noReports && !hasStaffItems && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
          기존 보고서에는 직원별 품목 데이터가 없습니다. 오늘 이후 마감을 새로 저장하면 자동 집계됩니다.
        </div>
      )}

      {/* 복합 규칙 설정 */}
      {isOwner ? (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">복합 인센티브 규칙 설정</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 타이어 수량 달성 보너스 */}
            <div className="p-4 border border-violet-200 rounded-xl bg-violet-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-violet-700">🚗 타이어 수량 달성 보너스</span>
                {tireRule?.bonusAmount ? (
                  <span className="text-xs text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                    {tireRule.tireThreshold}개 이상 → {formatCurrency(tireRule.bonusAmount)}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-gray-500">직원이 해당 월에 N개 이상 타이어를 판매하면 보너스를 지급합니다.</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="임계 수량"
                    className="w-24 px-2 py-1.5 border border-violet-300 rounded-lg text-sm text-right bg-white"
                    value={tireBonusThresholdDisplay}
                    onChange={(e) => setTireBonusDraft((p) => ({ ...p, threshold: e.target.value }))}
                  />
                  <span className="text-xs text-gray-500">개 이상</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">→</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="보너스"
                    className="w-28 px-2 py-1.5 border border-violet-300 rounded-lg text-sm text-right bg-white"
                    value={tireBonusAmountDisplay}
                    onChange={(e) => setTireBonusDraft((p) => ({ ...p, bonus: e.target.value }))}
                  />
                  <span className="text-xs text-gray-500">원</span>
                </div>
                <button
                  onClick={() => {
                    const threshold = Math.max(0, Number(tireBonusThresholdDisplay || 0));
                    const bonus = Math.max(0, Number(tireBonusAmountDisplay || 0));
                    onUpsertComplexRule({ storeId: storeIdForRules, productName: '__TIRE_BONUS__', ruleType: 'tire_quantity', tireThreshold: threshold, bonusAmount: bonus });
                    setTireBonusDraft({ threshold: '', bonus: '' });
                  }}
                  className="p-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex-shrink-0"
                  title="저장"
                >
                  <Save size={14} />
                </button>
              </div>
            </div>

            {/* 마진 달성 보너스 */}
            <div className="p-4 border border-emerald-200 rounded-xl bg-emerald-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-700">📈 마진 달성 보너스</span>
                {marginRule?.bonusAmount ? (
                  <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    마진 {marginRule.marginThreshold}% 이상 → {formatCurrency(marginRule.bonusAmount)}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-gray-500">직원의 월 마진율이 N% 이상이면 보너스를 지급합니다.</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">마진</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="마진율"
                    className="w-20 px-2 py-1.5 border border-emerald-300 rounded-lg text-sm text-right bg-white"
                    value={marginThresholdDisplay}
                    onChange={(e) => setMarginBonusDraft((p) => ({ ...p, threshold: e.target.value }))}
                  />
                  <span className="text-xs text-gray-500">% 이상</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">→</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="보너스"
                    className="w-28 px-2 py-1.5 border border-emerald-300 rounded-lg text-sm text-right bg-white"
                    value={marginBonusAmountDisplay}
                    onChange={(e) => setMarginBonusDraft((p) => ({ ...p, bonus: e.target.value }))}
                  />
                  <span className="text-xs text-gray-500">원</span>
                </div>
                <button
                  onClick={() => {
                    const threshold = Math.max(0, Number(marginThresholdDisplay || 0));
                    const bonus = Math.max(0, Number(marginBonusAmountDisplay || 0));
                    onUpsertComplexRule({ storeId: storeIdForRules, productName: '__MARGIN_BONUS__', ruleType: 'margin_bonus', marginThreshold: threshold, bonusAmount: bonus });
                    setMarginBonusDraft({ threshold: '', bonus: '' });
                  }}
                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex-shrink-0"
                  title="저장"
                >
                  <Save size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (tireRule?.bonusAmount || marginRule?.bonusAmount) ? (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Lock size={14} className="text-gray-400" /> 이달의 인센티브 조건
          </h3>
          <div className="flex flex-wrap gap-3">
            {tireRule?.bonusAmount ? (
              <div className="px-4 py-2 bg-violet-50 border border-violet-200 rounded-lg text-sm text-violet-700">
                🚗 타이어 <strong>{tireRule.tireThreshold}개</strong> 이상 판매 시 <strong>{formatCurrency(tireRule.bonusAmount)}</strong> 보너스
              </div>
            ) : null}
            {marginRule?.bonusAmount ? (
              <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                📈 마진율 <strong>{marginRule.marginThreshold}%</strong> 이상 달성 시 <strong>{formatCurrency(marginRule.bonusAmount)}</strong> 보너스
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 품목별 단가 설정 */}
      {productNames.length > 0 && (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-700">품목별 인센티브 단가 (원/개)</h3>
            {!isOwner && <span className="flex items-center gap-1 text-xs text-gray-400"><Lock size={12} /> 사장만 수정 가능</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {productNames.map((name) => {
              const key = `${storeIdForRules}::${name}`;
              const currentRate = ruleMap.get(key)?.amountPerUnit || 0;
              const inputVal = draftRates[key] ?? String(currentRate);
              return (
                <div key={name} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                  <span className="text-sm font-semibold text-gray-700 flex-1 truncate" title={name}>{name}</span>
                  {isOwner ? (
                    <>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={inputVal}
                        onChange={(e) => setDraftRates((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right bg-white"
                        placeholder="0"
                      />
                      <span className="text-xs text-gray-400 whitespace-nowrap">원</span>
                      <button
                        onClick={() => {
                          const next = Math.max(0, Number((draftRates[key] ?? String(currentRate)).trim() || '0'));
                          const existingRule = ruleMap.get(key);
                          onUpsertRule({ storeId: storeIdForRules, productName: name, category: existingRule?.category || '정비', amountPerUnit: next });
                          setDraftRates((prev) => ({ ...prev, [key]: String(next) }));
                        }}
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-shrink-0"
                        title="저장"
                      >
                        <Save size={14} />
                      </button>
                    </>
                  ) : (
                    <span className="text-sm font-bold text-blue-700">{formatCurrency(currentRate)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 직원 × 품목 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">직원별 실적 및 인센티브</h3>
          {staffRows.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">수량 옆 괄호는 해당 품목 인센티브 금액입니다.</p>
          )}
        </div>

        {staffRows.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            표시할 실적 데이터가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-bold text-gray-500 whitespace-nowrap">직원명</th>
                  {productNames.map((name) => (
                    <th key={name} className="px-3 py-3 text-right font-bold text-gray-500 whitespace-nowrap text-xs">{name}</th>
                  ))}
                  <th className="px-3 py-3 text-right font-bold text-gray-500 whitespace-nowrap text-xs">정비수량</th>
                  <th className="px-3 py-3 text-right font-bold text-violet-600 whitespace-nowrap text-xs">타이어</th>
                  <th className="px-3 py-3 text-right font-bold text-emerald-600 whitespace-nowrap text-xs">마진율</th>
                  {showComplexBonusColumns && (
                    <th className="px-3 py-3 text-right font-bold text-violet-600 whitespace-nowrap text-xs">복합보너스</th>
                  )}
                  <th className="px-4 py-3 text-right font-bold text-gray-700 whitespace-nowrap">인센티브</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staffRows.map((row, i) => (
                  <tr key={row.staffName} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                    <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">{row.staffName}</td>
                    {row.repairDetails.map((d) => (
                      <td key={d.productName} className="px-3 py-3 text-right whitespace-nowrap">
                        {d.qty > 0 ? (
                          <span className="text-gray-700">
                            {formatNumber(d.qty)}개
                            {d.amount > 0 && <span className="text-xs text-emerald-600 ml-1">({formatCurrency(d.amount)})</span>}
                          </span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right font-semibold text-blue-700 whitespace-nowrap">{formatNumber(row.totalRepairQty)}개</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className={`font-semibold ${row.tireBonusEarned > 0 ? 'text-violet-700' : 'text-gray-600'}`}>
                        {formatNumber(row.tireQty)}개{row.tireBonusEarned > 0 && <span className="text-xs ml-1">🎯</span>}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className={`font-semibold ${row.marginBonusEarned > 0 ? 'text-emerald-700' : 'text-gray-600'}`}>
                        {row.marginRate > 0 ? `${row.marginRate.toFixed(1)}%` : '-'}{row.marginBonusEarned > 0 && <span className="text-xs ml-1">🎯</span>}
                      </span>
                    </td>
                    {showComplexBonusColumns && (
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        {(row.tireBonusEarned + row.marginBonusEarned) > 0
                          ? <span className="font-semibold text-violet-700">{formatCurrency(row.tireBonusEarned + row.marginBonusEarned)}</span>
                          : <span className="text-gray-300">-</span>}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">{formatCurrency(row.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3 text-gray-700">합계</td>
                  {productNames.map((name) => {
                    const catTotal = staffRows.reduce((s, r) => s + (r.repairDetails.find((d) => d.productName === name)?.qty || 0), 0);
                    return (
                      <td key={name} className="px-3 py-3 text-right text-gray-700 whitespace-nowrap">
                        {catTotal > 0 ? `${formatNumber(catTotal)}개` : '-'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(totalRepairQty)}개</td>
                  <td className="px-3 py-3 text-right text-violet-700 whitespace-nowrap">{formatNumber(totalTireQty)}개</td>
                  <td className="px-3 py-3 text-right text-gray-500 whitespace-nowrap">-</td>
                  {showComplexBonusColumns && <td className="px-3 py-3 text-right text-gray-400 whitespace-nowrap">-</td>}
                  <td className="px-4 py-3 text-right text-emerald-700 whitespace-nowrap">{formatCurrency(totalIncentive)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Incentive;

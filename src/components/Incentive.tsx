import React, { useMemo, useState } from 'react';
import type { DailyReport, IncentiveRule } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';
import { Save } from 'lucide-react';

interface IncentiveProps {
  dailyReports: DailyReport[];
  incentiveRules: IncentiveRule[];
  currentStoreId: string;
  onUpsertRule: (payload: { storeId: string; productName: string; category: string; amountPerUnit: number }) => void;
}

const Incentive: React.FC<IncentiveProps> = ({
  dailyReports,
  incentiveRules,
  currentStoreId,
  onUpsertRule,
}) => {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [draftRates, setDraftRates] = useState<Record<string, string>>({});

  // 선택 월 + 지점 필터 보고서
  const monthReports = useMemo(() => {
    return dailyReports.filter((r) => {
      if (r.dateStr.slice(0, 7) !== month) return false;
      if (currentStoreId !== 'ALL' && r.storeId !== currentStoreId) return false;
      return true;
    });
  }, [dailyReports, month, currentStoreId]);

  // ruleMap: "storeId::productName" -> IncentiveRule
  const ruleMap = useMemo(() => {
    const map = new Map<string, IncentiveRule>();
    incentiveRules.forEach((r) => {
      if (r.productName) {
        map.set(`${r.storeId}::${r.productName}`, r);
      }
    });
    return map;
  }, [incentiveRules]);

  const storeIdForRules = currentStoreId !== 'ALL' ? currentStoreId : (monthReports[0]?.storeId || '');

  const getRate = (storeId: string, productName: string): number => {
    return ruleMap.get(`${storeId}::${productName}`)?.amountPerUnit || 0;
  };

  // staffItems에서 정비 항목만 수집 → 직원별/품목별 집계
  const { productNames, staffMap } = useMemo(() => {
    const productSet = new Set<string>();
    const staffMap = new Map<string, { storeId: string; items: Map<string, number> }>();

    monthReports.forEach((report) => {
      (report.staffItems || []).forEach((si) => {
        if (si.itemClass !== 'repair') return;
        productSet.add(si.productName);
        if (!staffMap.has(si.staffName)) {
          staffMap.set(si.staffName, { storeId: report.storeId, items: new Map() });
        }
        const entry = staffMap.get(si.staffName)!;
        entry.items.set(si.productName, (entry.items.get(si.productName) || 0) + si.qty);
      });
    });

    const productNames = Array.from(productSet).sort();
    return { productNames, staffMap };
  }, [monthReports]);

  // 직원별 행 계산
  const staffRows = useMemo(() => {
    return Array.from(staffMap.entries()).map(([staffName, { storeId, items }]) => {
      const details = productNames.map((name) => {
        const qty = items.get(name) || 0;
        const rate = getRate(storeId, name);
        return { productName: name, qty, rate, amount: qty * rate };
      });
      const totalQty = details.reduce((s, d) => s + d.qty, 0);
      const totalAmount = details.reduce((s, d) => s + d.amount, 0);
      return { staffName, storeId, details, totalQty, totalAmount };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [staffMap, productNames, ruleMap]);

  const totalQty = staffRows.reduce((s, r) => s + r.totalQty, 0);
  const totalIncentive = staffRows.reduce((s, r) => s + r.totalAmount, 0);

  const noReports = monthReports.length === 0;
  const hasStaffItems = monthReports.some((r) => r.staffItems && r.staffItems.length > 0);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 헤더 */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">인센티브</h2>
            <p className="text-xs text-gray-500 mt-1">
              일마감 보고서 기반으로 직원별 정비 품목 수량을 집계해 인센티브를 계산합니다.
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

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-blue-100 bg-blue-50">
            <div className="text-xs text-blue-600 font-semibold">정비 수량 합계</div>
            <div className="text-xl font-bold text-blue-700 mt-1">{formatNumber(totalQty)}개</div>
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

      {/* 품목별 단가 설정 */}
      {productNames.length > 0 && (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">품목별 인센티브 단가 설정 (원/개)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {productNames.map((name) => {
              const key = `${storeIdForRules}::${name}`;
              const currentRate = ruleMap.get(key)?.amountPerUnit || 0;
              const inputVal = draftRates[key] ?? String(currentRate);
              return (
                <div key={name} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                  <span className="text-sm font-semibold text-gray-700 flex-1 truncate" title={name}>{name}</span>
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
                      onUpsertRule({
                        storeId: storeIdForRules,
                        productName: name,
                        category: existingRule?.category || '정비',
                        amountPerUnit: next,
                      });
                      setDraftRates((prev) => ({ ...prev, [key]: String(next) }));
                    }}
                    className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-shrink-0"
                    title="저장"
                  >
                    <Save size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 직원 × 품목 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">직원별 정비 실적</h3>
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
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-bold text-gray-500 whitespace-nowrap">직원명</th>
                  {productNames.map((name) => (
                    <th key={name} className="px-3 py-3 text-right font-bold text-gray-500 whitespace-nowrap text-xs">
                      {name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-bold text-gray-500 whitespace-nowrap">합계 수량</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-700 whitespace-nowrap">인센티브</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staffRows.map((row, i) => (
                  <tr key={row.staffName} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                    <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">{row.staffName}</td>
                    {row.details.map((d) => (
                      <td key={d.productName} className="px-3 py-3 text-right whitespace-nowrap">
                        {d.qty > 0 ? (
                          <span className="text-gray-700">
                            {formatNumber(d.qty)}개
                            {d.amount > 0 && (
                              <span className="text-xs text-emerald-600 ml-1">({formatCurrency(d.amount)})</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-semibold text-blue-700 whitespace-nowrap">
                      {formatNumber(row.totalQty)}개
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                      {formatCurrency(row.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3 text-gray-700">합계</td>
                  {productNames.map((name) => {
                    const catTotal = staffRows.reduce(
                      (s, r) => s + (r.details.find((d) => d.productName === name)?.qty || 0),
                      0
                    );
                    return (
                      <td key={name} className="px-3 py-3 text-right text-gray-700 whitespace-nowrap">
                        {catTotal > 0 ? `${formatNumber(catTotal)}개` : '-'}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(totalQty)}개</td>
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

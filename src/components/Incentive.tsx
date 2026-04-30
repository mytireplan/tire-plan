import React, { useMemo, useState } from 'react';
import type { IncentiveRule, ManagerAccount, Product, Sale } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';

interface IncentiveProps {
  sales: Sale[];
  products: Product[];
  managerAccounts: ManagerAccount[];
  incentiveRules: IncentiveRule[];
  currentStoreId: string;
  managerSession: boolean;
  activeManagerAccount: ManagerAccount | null;
  onUpsertRule: (payload: { storeId: string; managerLoginId: string; amountPerUnit: number }) => void;
}

const normalizeCategory = (category?: string) => {
  const normalized = (category || '').trim();
  return normalized === '부품/수리' ? '기타' : normalized;
};

const Incentive: React.FC<IncentiveProps> = ({
  sales,
  products,
  managerAccounts,
  incentiveRules,
  currentStoreId,
  managerSession,
  activeManagerAccount,
  onUpsertRule
}) => {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [draftRates, setDraftRates] = useState<Record<string, string>>({});

  const productCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => map.set(p.id, normalizeCategory(p.category)));
    return map;
  }, [products]);

  const baseManagers = useMemo(() => {
    if (managerSession && activeManagerAccount) {
      return [activeManagerAccount];
    }
    return managerAccounts;
  }, [managerSession, activeManagerAccount, managerAccounts]);

  const visibleManagers = useMemo(() => {
    if (currentStoreId === 'ALL') return baseManagers;
    return baseManagers.filter((m) => m.storeId === currentStoreId);
  }, [baseManagers, currentStoreId]);

  const ruleMap = useMemo(() => {
    const map = new Map<string, IncentiveRule>();
    incentiveRules.forEach((r) => {
      const key = `${r.storeId}::${r.managerLoginId}`;
      map.set(key, r);
    });
    return map;
  }, [incentiveRules]);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (sale.isCanceled) return false;
      const saleMonth = (sale.date || '').slice(0, 7);
      if (saleMonth !== month) return false;
      if (currentStoreId === 'ALL') return true;
      return sale.storeId === currentStoreId;
    });
  }, [sales, month, currentStoreId]);

  const rows = useMemo(() => {
    return visibleManagers.map((manager) => {
      const key = `${manager.storeId}::${manager.loginId}`;
      const rule = ruleMap.get(key);
      const rate = rule?.amountPerUnit ?? 0;

      const managerSales = filteredSales.filter(
        (sale) => (sale.staffName || '').trim() === (manager.loginId || '').trim() && sale.storeId === manager.storeId
      );

      const repairQty = managerSales.reduce((sum, sale) => {
        const saleQty = (sale.items || []).reduce((itemSum, item) => {
          const itemCategory = normalizeCategory(item.category || productCategoryMap.get(item.productId) || '');
          if (itemCategory !== '정비') return itemSum;
          return itemSum + (Number(item.quantity) || 0);
        }, 0);
        return sum + saleQty;
      }, 0);

      const incentiveAmount = repairQty * rate;

      return {
        manager,
        repairQty,
        rate,
        incentiveAmount
      };
    });
  }, [visibleManagers, ruleMap, filteredSales, productCategoryMap]);

  const totalQty = rows.reduce((sum, row) => sum + row.repairQty, 0);
  const totalIncentive = rows.reduce((sum, row) => sum + row.incentiveAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">인센티브</h2>
            <p className="text-xs text-gray-500 mt-1">
              담당직원명과 점장 아이디가 일치하는 판매 건에서 정비 카테고리 수량 기준으로 계산됩니다.
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="hidden md:grid md:grid-cols-12 bg-gray-50 px-5 py-3 text-xs font-bold text-gray-500 border-b border-gray-100">
          <div className="col-span-2">점장</div>
          <div className="col-span-2">점장 아이디</div>
          <div className="col-span-2">지점</div>
          <div className="col-span-2">정비 수량</div>
          <div className="col-span-2">개당 인센티브</div>
          <div className="col-span-2 text-right">합계</div>
        </div>

        <div className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <div className="p-10 text-center text-gray-400">표시할 인센티브 데이터가 없습니다.</div>
          ) : (
            rows.map((row) => {
              const rowKey = `${row.manager.storeId}::${row.manager.loginId}`;
              const inputValue = draftRates[rowKey] ?? String(row.rate);

              return (
                <div key={rowKey} className="p-4 md:px-5 md:py-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-2 text-sm font-bold text-gray-800">{row.manager.name}</div>
                    <div className="md:col-span-2 text-sm text-gray-600">{row.manager.loginId}</div>
                    <div className="md:col-span-2 text-sm text-gray-600">{row.manager.storeId}</div>
                    <div className="md:col-span-2 text-sm font-semibold text-blue-700">{formatNumber(row.repairQty)}개</div>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={inputValue}
                        onChange={(e) => {
                          setDraftRates((prev) => ({ ...prev, [rowKey]: e.target.value }));
                        }}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => {
                          const next = Math.max(0, Number((draftRates[rowKey] ?? String(row.rate)).trim() || '0'));
                          onUpsertRule({
                            storeId: row.manager.storeId,
                            managerLoginId: row.manager.loginId,
                            amountPerUnit: next
                          });
                          setDraftRates((prev) => ({ ...prev, [rowKey]: String(next) }));
                        }}
                        className="px-2.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                      >
                        저장
                      </button>
                    </div>
                    <div className="md:col-span-2 text-right text-base font-bold text-emerald-700">
                      {formatCurrency(row.incentiveAmount)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Incentive;

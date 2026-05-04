import React, { useMemo, useState } from 'react';
import type { DailyReport, IncentiveRule, Staff, User } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';
import { Save, Lock } from 'lucide-react';

interface IncentiveProps {
  dailyReports: DailyReport[];
  incentiveRules: IncentiveRule[];
  staffList: Staff[];
  currentStoreId: string;
  currentUser: User;
  onUpsertRule: (payload: { storeId: string; staffName?: string; productName: string; category: string; amountPerUnit: number }) => void;
  onUpsertComplexRule: (payload: {
    storeId: string;
    staffName?: string;
    productName: string;
    ruleType: 'tire_quantity' | 'margin_bonus';
    tireThreshold?: number;
    marginAmountThreshold?: number;
    bonusAmount: number;
  }) => void;
  onUpsertFormulaRule: (payload: {
    storeId: string;
    staffName?: string;
    metricKey: string;
    comparisonOp: '>' | '<';
    thresholdValue: number;
    multiplier: number;
    addend: number;
  }) => void;
}

type FormulaMetricKey =
  | 'tire_qty'
  | 'used_tire_qty'
  | 'repair_brake_pad'
  | 'repair_engine_oil'
  | 'repair_brake_oil'
  | 'repair_tpms'
  | 'repair_disk'
  | 'repair_suspension'
  | 'margin_rate';

const FORMULA_METRICS: Array<{ key: FormulaMetricKey; label: string; unit: 'qty' | 'percent' }> = [
  { key: 'tire_qty', label: '타이어', unit: 'qty' },
  { key: 'used_tire_qty', label: '중고타이어', unit: 'qty' },
  { key: 'repair_brake_pad', label: '브레이크패드', unit: 'qty' },
  { key: 'repair_engine_oil', label: '엔진오일', unit: 'qty' },
  { key: 'repair_brake_oil', label: '브레이크오일', unit: 'qty' },
  { key: 'repair_tpms', label: 'TPMS', unit: 'qty' },
  { key: 'repair_disk', label: '디스크', unit: 'qty' },
  { key: 'repair_suspension', label: '하체', unit: 'qty' },
  { key: 'margin_rate', label: '마진율', unit: 'percent' },
];

const REPAIR_CAT_ITEMS: Array<{ key: FormulaMetricKey; label: string }> = [
  { key: 'repair_brake_pad', label: '브레이크패드' },
  { key: 'repair_engine_oil', label: '엔진오일' },
  { key: 'repair_brake_oil', label: '브레이크오일' },
  { key: 'repair_tpms', label: 'TPMS' },
  { key: 'repair_disk', label: '디스크' },
  { key: 'repair_suspension', label: '하체' },
];

const REPAIR_METRIC_DEFS: Array<{ key: FormulaMetricKey; keywords: string[] }> = [
  { key: 'repair_brake_pad', keywords: ['브레이크패드'] },
  { key: 'repair_engine_oil', keywords: ['엔진오일', '합성유', '오일교환'] },
  { key: 'repair_brake_oil', keywords: ['브레이크오일'] },
  { key: 'repair_tpms', keywords: ['tpms'] },
  { key: 'repair_disk', keywords: ['디스크', '로터'] },
  { key: 'repair_suspension', keywords: ['하체', '쇼바', '로어암', '활대링크', '부싱'] },
];

const INCENTIVE_AGGREGATION_START_DATE = '2026-05-01';

const createEmptyRepairMetrics = (): Record<FormulaMetricKey, number> => ({
  tire_qty: 0,
  used_tire_qty: 0,
  repair_brake_pad: 0,
  repair_engine_oil: 0,
  repair_brake_oil: 0,
  repair_tpms: 0,
  repair_disk: 0,
  repair_suspension: 0,
  margin_rate: 0,
});

const normalizeText = (text?: string) => (text || '').toLowerCase().replace(/\s+/g, '');

const pickRepairMetric = (productName: string, category: string): FormulaMetricKey | null => {
  const haystack = normalizeText(`${productName} ${category}`);
  for (const def of REPAIR_METRIC_DEFS) {
    if (def.keywords.some((kw) => haystack.includes(normalizeText(kw)))) {
      return def.key;
    }
  }
  return null;
};

const isUsedTireItem = (productName: string, category: string): boolean => {
  const haystack = normalizeText(`${productName} ${category}`);
  return haystack.includes('중고') || haystack.includes('used');
};

const DEFAULT_RULE_SCOPE = '';
const MANAGER_STORE_TIRE_BONUS_KEY = '__STORE_TIRE_BONUS__';
const MANAGER_STORE_MARGIN_BONUS_KEY = '__STORE_MARGIN_BONUS__';

const buildScopedRuleKey = (storeId: string, ruleKey: string, staffName?: string) => {
  return `${storeId}::${staffName || '__COMMON__'}::${ruleKey}`;
};

const Incentive: React.FC<IncentiveProps> = ({
  dailyReports,
  incentiveRules,
  staffList,
  currentStoreId,
  currentUser,
  onUpsertRule,
  onUpsertComplexRule,
  onUpsertFormulaRule,
}) => {
  const isOwner = currentUser.role === 'STORE_ADMIN' || currentUser.role === 'SUPER_ADMIN';

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [draftRates, setDraftRates] = useState<Record<string, string>>({});
  const [formulaDrafts, setFormulaDrafts] = useState<
    Record<string, { comparisonOp: '>' | '<'; thresholdValue: string; multiplier: string; addend: string }>
  >({});
  const [selectedRuleStaffName, setSelectedRuleStaffName] = useState<string>(DEFAULT_RULE_SCOPE);

  const [tireBonusDraft, setTireBonusDraft] = useState<{ threshold: string; bonus: string }>({ threshold: '', bonus: '' });
  const [marginBonusDraft, setMarginBonusDraft] = useState<{ threshold: string; bonus: string }>({ threshold: '', bonus: '' });
  const [managerStoreTireBonusDraft, setManagerStoreTireBonusDraft] = useState<{ threshold: string; bonus: string }>({ threshold: '', bonus: '' });
  const [managerStoreMarginBonusDraft, setManagerStoreMarginBonusDraft] = useState<{ threshold: string; bonus: string }>({ threshold: '', bonus: '' });

  const monthReports = useMemo(() => {
    return dailyReports.filter((r) => {
      if (r.dateStr < INCENTIVE_AGGREGATION_START_DATE) return false;
      if (r.dateStr.slice(0, 7) > month) return false;
      if (currentStoreId !== 'ALL' && r.storeId !== currentStoreId) return false;
      return true;
    });
  }, [dailyReports, month, currentStoreId]);

  const storeIdForRules = currentStoreId !== 'ALL' ? currentStoreId : (monthReports[0]?.storeId || '');
  const staffNames = useMemo(() => Array.from(new Set(monthReports.flatMap((report) => (report.staffStats || []).map((staff) => staff.staffName)))).sort(), [monthReports]);
  const storePerformanceMap = useMemo(() => {
    const map = new Map<string, { tireQty: number; profit: number }>();
    monthReports.forEach((report) => {
      if (!map.has(report.storeId)) {
        map.set(report.storeId, { tireQty: 0, profit: 0 });
      }
      const entry = map.get(report.storeId)!;
      entry.tireQty += report.tireQty || 0;
      entry.profit += report.profit || 0;
    });
    return map;
  }, [monthReports]);
  const managerKeySet = useMemo(() => {
    return new Set(
      staffList
        .filter((s) => s.isManager)
        .map((s) => `${s.name}::${s.storeId || ''}`)
    );
  }, [staffList]);
  const selectedStaffMeta = useMemo(
    () => staffList.find((s) => s.name === selectedRuleStaffName && (s.storeId || '') === (storeIdForRules || '')),
    [staffList, selectedRuleStaffName, storeIdForRules]
  );
  const selectedStaffIsManager = !!selectedStaffMeta?.isManager;

  const ruleMap = useMemo(() => {
    const map = new Map<string, IncentiveRule>();
    incentiveRules.forEach((r) => {
      if (r.productName && r.productName !== '__TIRE_BONUS__' && r.productName !== '__MARGIN_BONUS__' && !r.productName.startsWith('__FORMULA__::')) {
        map.set(buildScopedRuleKey(r.storeId, r.productName, r.staffName), r);
      }
    });
    return map;
  }, [incentiveRules]);

  const formulaRuleMap = useMemo(() => {
    const map = new Map<string, IncentiveRule>();
    incentiveRules.forEach((r) => {
      if (r.ruleType !== 'formula') return;
      if (!r.metricKey) return;
      map.set(buildScopedRuleKey(r.storeId, r.metricKey, r.staffName), r);
    });
    return map;
  }, [incentiveRules]);

  const getComplexRule = (storeId: string, productName: string, staffName?: string): IncentiveRule | undefined => {
    return incentiveRules.find((r) => r.storeId === storeId && (r.staffName || '') === (staffName || '') && r.productName === productName)
      || incentiveRules.find((r) => r.storeId === storeId && !r.staffName && r.productName === productName);
  };

  const tireRule = useMemo(
    () => storeIdForRules ? getComplexRule(storeIdForRules, '__TIRE_BONUS__', selectedRuleStaffName) : undefined,
    [incentiveRules, storeIdForRules, selectedRuleStaffName]
  );
  const marginRule = useMemo(
    () => storeIdForRules ? getComplexRule(storeIdForRules, '__MARGIN_BONUS__', selectedRuleStaffName) : undefined,
    [incentiveRules, storeIdForRules, selectedRuleStaffName]
  );
  const managerStoreTireRule = useMemo(
    () => storeIdForRules ? getComplexRule(storeIdForRules, MANAGER_STORE_TIRE_BONUS_KEY, selectedRuleStaffName) : undefined,
    [incentiveRules, storeIdForRules, selectedRuleStaffName]
  );
  const managerStoreMarginRule = useMemo(
    () => storeIdForRules ? getComplexRule(storeIdForRules, MANAGER_STORE_MARGIN_BONUS_KEY, selectedRuleStaffName) : undefined,
    [incentiveRules, storeIdForRules, selectedRuleStaffName]
  );

  const getRate = (storeId: string, productName: string, staffName?: string): number => {
    return ruleMap.get(buildScopedRuleKey(storeId, productName, staffName))?.amountPerUnit
      || ruleMap.get(buildScopedRuleKey(storeId, productName, DEFAULT_RULE_SCOPE))?.amountPerUnit
      || 0;
  };

  const getFormulaRule = (storeId: string, metricKey: FormulaMetricKey, staffName?: string): IncentiveRule | undefined => {
    return formulaRuleMap.get(buildScopedRuleKey(storeId, metricKey, staffName))
      || formulaRuleMap.get(buildScopedRuleKey(storeId, metricKey, DEFAULT_RULE_SCOPE));
  };

  const { staffMap } = useMemo(() => {
    const productSet = new Set<string>();
    const staffMap = new Map<
      string,
      {
        storeId: string;
        items: Map<string, number>;
        tireQty: number;
        tireQtyFromItems: number;
        usedTireQty: number;
        repairMetrics: Record<FormulaMetricKey, number>;
        revenue: number;
        profit: number;
      }
    >();

    monthReports.forEach((report) => {
      (report.staffItems || []).forEach((si) => {
        if (!staffMap.has(si.staffName)) {
          staffMap.set(si.staffName, {
            storeId: report.storeId,
            items: new Map(),
            tireQty: 0,
            tireQtyFromItems: 0,
            usedTireQty: 0,
            repairMetrics: createEmptyRepairMetrics(),
            revenue: 0,
            profit: 0,
          });
        }
        const entry = staffMap.get(si.staffName)!;

        if (si.itemClass === 'repair') {
          productSet.add(si.productName);
          entry.items.set(si.productName, (entry.items.get(si.productName) || 0) + si.qty);

          const repairMetricKey = pickRepairMetric(si.productName, si.category);
          if (repairMetricKey) {
            entry.repairMetrics[repairMetricKey] += si.qty;
          }
        }

        if (si.itemClass === 'tire') {
          entry.tireQtyFromItems += si.qty;
          if (isUsedTireItem(si.productName, si.category)) {
            entry.usedTireQty += si.qty;
          }
        }
      });

      (report.staffStats || []).forEach((ss) => {
        if (!staffMap.has(ss.staffName)) {
          staffMap.set(ss.staffName, {
            storeId: report.storeId,
            items: new Map(),
            tireQty: 0,
            tireQtyFromItems: 0,
            usedTireQty: 0,
            repairMetrics: createEmptyRepairMetrics(),
            revenue: 0,
            profit: 0,
          });
        }
        const entry = staffMap.get(ss.staffName)!;
        entry.tireQty += ss.tireQty || 0;
        entry.revenue += ss.revenue || 0;
        entry.profit += ss.profit || 0;
      });
    });

    void productSet;
    return { staffMap };
  }, [monthReports]);

  const staffRows = useMemo(() => {
    return Array.from(staffMap.entries()).map(([staffName, data]) => {
      const tireQty = data.tireQty > 0 ? data.tireQty : data.tireQtyFromItems;
      const repairDetails = REPAIR_CAT_ITEMS.map((cat) => {
        const qty = data.repairMetrics[cat.key] || 0;
        const rate = getRate(data.storeId, `__REPAIR_CAT__::${cat.key}`, staffName);
        return { productName: cat.label, qty, rate, amount: qty * rate };
      });

      const repairIncentive = repairDetails.reduce((sum, d) => sum + d.amount, 0);
      const totalRepairQty = repairDetails.reduce((sum, d) => sum + d.qty, 0);
      const marginRate = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
      const rowTireRule = getComplexRule(data.storeId, '__TIRE_BONUS__', staffName);
      const rowMarginRule = getComplexRule(data.storeId, '__MARGIN_BONUS__', staffName);
      const rowManagerStoreTireRule = getComplexRule(data.storeId, MANAGER_STORE_TIRE_BONUS_KEY, staffName);
      const rowManagerStoreMarginRule = getComplexRule(data.storeId, MANAGER_STORE_MARGIN_BONUS_KEY, staffName);
      const tireThreshold = rowTireRule?.tireThreshold ?? 0;
      const tireBonus = rowTireRule?.bonusAmount ?? 0;
      const marginAmountThreshold = rowMarginRule?.marginAmountThreshold ?? rowMarginRule?.marginThreshold ?? 0;
      const marginBonusAmt = rowMarginRule?.bonusAmount ?? 0;
      const tireBonusEarned = tireThreshold > 0 && tireQty >= tireThreshold ? tireBonus : 0;
      const marginBonusEarned = marginAmountThreshold > 0 && data.profit >= marginAmountThreshold ? marginBonusAmt : 0;
      const isManager = managerKeySet.has(`${staffName}::${data.storeId || ''}`);
      const storePerf = storePerformanceMap.get(data.storeId) || { tireQty: 0, profit: 0 };
      const managerStoreTireThreshold = rowManagerStoreTireRule?.tireThreshold ?? 0;
      const managerStoreTireBonus = rowManagerStoreTireRule?.bonusAmount ?? 0;
      const managerStoreMarginThreshold = rowManagerStoreMarginRule?.marginAmountThreshold ?? rowManagerStoreMarginRule?.marginThreshold ?? 0;
      const managerStoreMarginBonus = rowManagerStoreMarginRule?.bonusAmount ?? 0;
      const managerStoreTireBonusEarned = isManager && managerStoreTireThreshold > 0 && storePerf.tireQty >= managerStoreTireThreshold ? managerStoreTireBonus : 0;
      const managerStoreMarginBonusEarned = isManager && managerStoreMarginThreshold > 0 && storePerf.profit >= managerStoreMarginThreshold ? managerStoreMarginBonus : 0;

      const metricValues: Record<FormulaMetricKey, number> = {
        tire_qty: tireQty,
        used_tire_qty: data.usedTireQty,
        repair_brake_pad: data.repairMetrics.repair_brake_pad,
        repair_engine_oil: data.repairMetrics.repair_engine_oil,
        repair_brake_oil: data.repairMetrics.repair_brake_oil,
        repair_tpms: data.repairMetrics.repair_tpms,
        repair_disk: data.repairMetrics.repair_disk,
        repair_suspension: data.repairMetrics.repair_suspension,
        margin_rate: marginRate,
      };

      const formulaDetails = FORMULA_METRICS.map((metric) => {
        const rule = getFormulaRule(data.storeId, metric.key, staffName);
        const value = metricValues[metric.key];
        if (!rule) return { metricKey: metric.key, value, amount: 0 };

        const op = rule.comparisonOp || '>';
        const threshold = Number(rule.thresholdValue || 0);
        const multiplier = Number(rule.multiplier || 0);
        const addend = Number(rule.addend || 0);
        const matched = op === '>' ? value > threshold : value < threshold;
        const rawAmount = matched ? value * multiplier + addend : 0;
        const amount = Math.max(0, Math.round(rawAmount));

        return { metricKey: metric.key, value, amount };
      });

      const formulaIncentive = formulaDetails.reduce((sum, d) => sum + d.amount, 0);
      const totalAmount = repairIncentive + tireBonusEarned + marginBonusEarned + managerStoreTireBonusEarned + managerStoreMarginBonusEarned + formulaIncentive;

      return {
        staffName,
        storeId: data.storeId,
        repairDetails,
        totalRepairQty,
        tireQty,
        usedTireQty: data.usedTireQty,
        marginRate,
        metricValues,
        repairIncentive,
        tireBonusEarned,
        marginBonusEarned,
        managerStoreTireBonusEarned,
        managerStoreMarginBonusEarned,
        isManager,
        formulaIncentive,
        totalAmount,
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [staffMap, ruleMap, formulaRuleMap, incentiveRules, managerKeySet, storePerformanceMap]);

  const totalRepairQty = staffRows.reduce((s, r) => s + r.totalRepairQty, 0);
  const totalTireQty = staffRows.reduce((s, r) => s + r.tireQty, 0);
  const totalUsedTireQty = staffRows.reduce((s, r) => s + r.usedTireQty, 0);
  const totalFormulaIncentive = staffRows.reduce((s, r) => s + r.formulaIncentive, 0);
  const totalComplexBonus = staffRows.reduce((s, r) => s + r.tireBonusEarned + r.marginBonusEarned + r.managerStoreTireBonusEarned + r.managerStoreMarginBonusEarned, 0);
  const totalIncentive = staffRows.reduce((s, r) => s + r.totalAmount, 0);

  const noReports = monthReports.length === 0;
  const hasStaffItems = monthReports.some((r) => r.staffItems && r.staffItems.length > 0);

  const tireBonusThresholdDisplay = tireBonusDraft.threshold !== '' ? tireBonusDraft.threshold : String(tireRule?.tireThreshold ?? '');
  const tireBonusAmountDisplay = tireBonusDraft.bonus !== '' ? tireBonusDraft.bonus : String(tireRule?.bonusAmount ?? '');
  const marginAmountThresholdDisplay = marginBonusDraft.threshold !== ''
    ? marginBonusDraft.threshold
    : String(marginRule?.marginAmountThreshold ?? marginRule?.marginThreshold ?? '');
  const marginBonusAmountDisplay = marginBonusDraft.bonus !== '' ? marginBonusDraft.bonus : String(marginRule?.bonusAmount ?? '');
  const managerStoreTireThresholdDisplay = managerStoreTireBonusDraft.threshold !== ''
    ? managerStoreTireBonusDraft.threshold
    : String(managerStoreTireRule?.tireThreshold ?? '');
  const managerStoreTireBonusAmountDisplay = managerStoreTireBonusDraft.bonus !== ''
    ? managerStoreTireBonusDraft.bonus
    : String(managerStoreTireRule?.bonusAmount ?? '');
  const managerStoreMarginThresholdDisplay = managerStoreMarginBonusDraft.threshold !== ''
    ? managerStoreMarginBonusDraft.threshold
    : String(managerStoreMarginRule?.marginAmountThreshold ?? managerStoreMarginRule?.marginThreshold ?? '');
  const managerStoreMarginBonusAmountDisplay = managerStoreMarginBonusDraft.bonus !== ''
    ? managerStoreMarginBonusDraft.bonus
    : String(managerStoreMarginRule?.bonusAmount ?? '');

  const showComplexBonusColumns = staffRows.some((row) => (row.tireBonusEarned + row.marginBonusEarned + row.managerStoreTireBonusEarned + row.managerStoreMarginBonusEarned) > 0);
  const selectedRuleStaffLabel = selectedRuleStaffName || '공통 규칙';

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">인센티브</h2>
            <p className="text-xs text-gray-500 mt-1">
              보고서 게시판 데이터(staffStats/staffItems)로 직원별 수량과 마진을 집계하고 자동 계산합니다. (2026-05-01부터 누적)
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

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg border border-blue-100 bg-blue-50">
            <div className="text-xs text-blue-600 font-semibold">정비 수량 합계</div>
            <div className="text-xl font-bold text-blue-700 mt-1">{formatNumber(totalRepairQty)}개</div>
          </div>
          <div className="p-3 rounded-lg border border-violet-100 bg-violet-50">
            <div className="text-xs text-violet-600 font-semibold">타이어 판매 합계</div>
            <div className="text-xl font-bold text-violet-700 mt-1">{formatNumber(totalTireQty)}개</div>
          </div>
          <div className="p-3 rounded-lg border border-fuchsia-100 bg-fuchsia-50">
            <div className="text-xs text-fuchsia-600 font-semibold">중고타이어 합계</div>
            <div className="text-xl font-bold text-fuchsia-700 mt-1">{formatNumber(totalUsedTireQty)}개</div>
          </div>
          <div className="p-3 rounded-lg border border-amber-100 bg-amber-50">
            <div className="text-xs text-amber-600 font-semibold">수식 인센티브 합계</div>
            <div className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(totalFormulaIncentive)}</div>
          </div>
          <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50">
            <div className="text-xs text-emerald-600 font-semibold">전체 인센티브 합계</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(totalIncentive)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-700">규칙 적용 대상 직원</h3>
            <p className="text-xs text-gray-500 mt-1">아래 3개 설정 영역은 선택한 직원 기준으로 저장됩니다. 직원별 규칙이 없으면 공통 규칙이 적용됩니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">직원</label>
            <select
              value={selectedRuleStaffName}
              onChange={(e) => setSelectedRuleStaffName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[180px]"
            >
              <option value="">공통 규칙</option>
              {staffNames.map((staffName) => (
                <option key={staffName} value={staffName}>{staffName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {noReports && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-yellow-800">
          이 달에 저장된 일마감 보고서가 없습니다. 일별 마감 탭에서 마감을 저장하면 인센티브가 자동 집계됩니다.
        </div>
      )}
      {!noReports && !hasStaffItems && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
          보고서에 직원별 품목 데이터가 부족합니다. 최신 버전으로 마감을 다시 저장하면 품목별 수량과 수식 계산이 정확해집니다.
        </div>
      )}

      {isOwner ? (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-gray-700">복합 인센티브 규칙 설정</h3>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{selectedRuleStaffLabel}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-violet-200 rounded-xl bg-violet-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-violet-700">타이어 수량 달성 보너스</span>
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
                    onUpsertComplexRule({ storeId: storeIdForRules, staffName: selectedRuleStaffName || undefined, productName: '__TIRE_BONUS__', ruleType: 'tire_quantity', tireThreshold: threshold, bonusAmount: bonus });
                    setTireBonusDraft({ threshold: '', bonus: '' });
                  }}
                  className="p-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex-shrink-0"
                  title="저장"
                >
                  <Save size={14} />
                </button>
              </div>
            </div>

            <div className="p-4 border border-emerald-200 rounded-xl bg-emerald-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-700">마진 달성 보너스</span>
              </div>
              <p className="text-xs text-gray-500">직원의 월 마진 금액이 N원 이상이면 보너스를 지급합니다.</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">마진</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="마진금액"
                    className="w-28 px-2 py-1.5 border border-emerald-300 rounded-lg text-sm text-right bg-white"
                    value={marginAmountThresholdDisplay}
                    onChange={(e) => setMarginBonusDraft((p) => ({ ...p, threshold: e.target.value }))}
                  />
                  <span className="text-xs text-gray-500">원 이상</span>
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
                    const threshold = Math.max(0, Number(marginAmountThresholdDisplay || 0));
                    const bonus = Math.max(0, Number(marginBonusAmountDisplay || 0));
                    onUpsertComplexRule({
                      storeId: storeIdForRules,
                      staffName: selectedRuleStaffName || undefined,
                      productName: '__MARGIN_BONUS__',
                      ruleType: 'margin_bonus',
                      marginAmountThreshold: threshold,
                      bonusAmount: bonus,
                    });
                    setMarginBonusDraft({ threshold: '', bonus: '' });
                  }}
                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex-shrink-0"
                  title="저장"
                >
                  <Save size={14} />
                </button>
              </div>
            </div>

            <div className="p-4 border border-sky-200 rounded-xl bg-sky-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-sky-700">점장 추가: 지점 타이어 수량 보너스</span>
              </div>
              <p className="text-xs text-gray-500">선택 직원이 점장일 때만, 해당 지점의 월 타이어 수량이 기준 이상이면 보너스를 추가 지급합니다.</p>
              {selectedRuleStaffName && !selectedStaffIsManager && <p className="text-xs text-rose-600">현재 선택 직원은 점장으로 표시되어 있지 않아 적용되지 않습니다.</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="임계 수량"
                    className="w-24 px-2 py-1.5 border border-sky-300 rounded-lg text-sm text-right bg-white"
                    value={managerStoreTireThresholdDisplay}
                    onChange={(e) => setManagerStoreTireBonusDraft((p) => ({ ...p, threshold: e.target.value }))}
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
                    className="w-28 px-2 py-1.5 border border-sky-300 rounded-lg text-sm text-right bg-white"
                    value={managerStoreTireBonusAmountDisplay}
                    onChange={(e) => setManagerStoreTireBonusDraft((p) => ({ ...p, bonus: e.target.value }))}
                  />
                  <span className="text-xs text-gray-500">원</span>
                </div>
                <button
                  onClick={() => {
                    const threshold = Math.max(0, Number(managerStoreTireThresholdDisplay || 0));
                    const bonus = Math.max(0, Number(managerStoreTireBonusAmountDisplay || 0));
                    onUpsertComplexRule({
                      storeId: storeIdForRules,
                      staffName: selectedRuleStaffName || undefined,
                      productName: MANAGER_STORE_TIRE_BONUS_KEY,
                      ruleType: 'tire_quantity',
                      tireThreshold: threshold,
                      bonusAmount: bonus,
                    });
                    setManagerStoreTireBonusDraft({ threshold: '', bonus: '' });
                  }}
                  className="p-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 flex-shrink-0"
                  title="저장"
                >
                  <Save size={14} />
                </button>
              </div>
            </div>

            <div className="p-4 border border-indigo-200 rounded-xl bg-indigo-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-indigo-700">점장 추가: 지점 마진 달성 보너스</span>
              </div>
              <p className="text-xs text-gray-500">선택 직원이 점장일 때만, 해당 지점의 월 마진 금액이 기준 이상이면 보너스를 추가 지급합니다.</p>
              {selectedRuleStaffName && !selectedStaffIsManager && <p className="text-xs text-rose-600">현재 선택 직원은 점장으로 표시되어 있지 않아 적용되지 않습니다.</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">마진</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="마진금액"
                    className="w-28 px-2 py-1.5 border border-indigo-300 rounded-lg text-sm text-right bg-white"
                    value={managerStoreMarginThresholdDisplay}
                    onChange={(e) => setManagerStoreMarginBonusDraft((p) => ({ ...p, threshold: e.target.value }))}
                  />
                  <span className="text-xs text-gray-500">원 이상</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">→</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="보너스"
                    className="w-28 px-2 py-1.5 border border-indigo-300 rounded-lg text-sm text-right bg-white"
                    value={managerStoreMarginBonusAmountDisplay}
                    onChange={(e) => setManagerStoreMarginBonusDraft((p) => ({ ...p, bonus: e.target.value }))}
                  />
                  <span className="text-xs text-gray-500">원</span>
                </div>
                <button
                  onClick={() => {
                    const threshold = Math.max(0, Number(managerStoreMarginThresholdDisplay || 0));
                    const bonus = Math.max(0, Number(managerStoreMarginBonusAmountDisplay || 0));
                    onUpsertComplexRule({
                      storeId: storeIdForRules,
                      staffName: selectedRuleStaffName || undefined,
                      productName: MANAGER_STORE_MARGIN_BONUS_KEY,
                      ruleType: 'margin_bonus',
                      marginAmountThreshold: threshold,
                      bonusAmount: bonus,
                    });
                    setManagerStoreMarginBonusDraft({ threshold: '', bonus: '' });
                  }}
                  className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex-shrink-0"
                  title="저장"
                >
                  <Save size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700">품목별 수식 규칙 설정</h3>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{selectedRuleStaffLabel}</span>
          {!isOwner && <span className="flex items-center gap-1 text-xs text-gray-400"><Lock size={12} /> 사장만 수정 가능</span>}
        </div>
        <p className="text-xs text-gray-500 mb-3">지급식: 값이 조건을 만족하면 (값 * multiplier) + addend 를 지급합니다.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">항목</th>
                <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">조건</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">기준값</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">multiplier(*)</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">addend(+)</th>
                <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">저장</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {FORMULA_METRICS.map((metric) => {
                const rule = getFormulaRule(storeIdForRules, metric.key, selectedRuleStaffName);
                const draftKey = buildScopedRuleKey(storeIdForRules, metric.key, selectedRuleStaffName);
                const draft = formulaDrafts[draftKey];
                const op = draft?.comparisonOp ?? (rule?.comparisonOp || '>');
                const thresholdDisplay = draft?.thresholdValue ?? String(rule?.thresholdValue ?? 0);
                const multiplierDisplay = draft?.multiplier ?? String(rule?.multiplier ?? 0);
                const addendDisplay = draft?.addend ?? String(rule?.addend ?? 0);
                const unitLabel = metric.unit === 'percent' ? '%' : '개';

                return (
                  <tr key={metric.key}>
                    <td className="px-3 py-2 font-semibold text-gray-700">{metric.label}</td>
                    <td className="px-3 py-2 text-center">
                      {isOwner ? (
                        <select
                          value={op}
                          onChange={(e) => setFormulaDrafts((prev) => ({
                            ...prev,
                            [draftKey]: {
                              comparisonOp: e.target.value as '>' | '<',
                              thresholdValue: thresholdDisplay,
                              multiplier: multiplierDisplay,
                              addend: addendDisplay,
                            },
                          }))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value=">">{`>`}</option>
                          <option value="<">{`<`}</option>
                        </select>
                      ) : (
                        <span className="font-semibold text-gray-600">{op}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isOwner ? (
                        <input
                          type="number"
                          step={metric.unit === 'percent' ? '0.1' : '1'}
                          className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                          value={thresholdDisplay}
                          onChange={(e) => setFormulaDrafts((prev) => ({
                            ...prev,
                            [draftKey]: {
                              comparisonOp: op,
                              thresholdValue: e.target.value,
                              multiplier: multiplierDisplay,
                              addend: addendDisplay,
                            },
                          }))}
                        />
                      ) : (
                        <span className="font-semibold text-gray-700">{formatNumber(Number(thresholdDisplay || 0))}{unitLabel}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isOwner ? (
                        <input
                          type="number"
                          step="1"
                          className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                          value={multiplierDisplay}
                          onChange={(e) => setFormulaDrafts((prev) => ({
                            ...prev,
                            [draftKey]: {
                              comparisonOp: op,
                              thresholdValue: thresholdDisplay,
                              multiplier: e.target.value,
                              addend: addendDisplay,
                            },
                          }))}
                        />
                      ) : (
                        <span className="font-semibold text-gray-700">{formatNumber(Number(multiplierDisplay || 0))}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isOwner ? (
                        <input
                          type="number"
                          step="100"
                          className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                          value={addendDisplay}
                          onChange={(e) => setFormulaDrafts((prev) => ({
                            ...prev,
                            [draftKey]: {
                              comparisonOp: op,
                              thresholdValue: thresholdDisplay,
                              multiplier: multiplierDisplay,
                              addend: e.target.value,
                            },
                          }))}
                        />
                      ) : (
                        <span className="font-semibold text-gray-700">{formatCurrency(Number(addendDisplay || 0))}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isOwner ? (
                        <button
                          onClick={() => {
                            const thresholdValue = Number(thresholdDisplay || 0);
                            const multiplier = Number(multiplierDisplay || 0);
                            const addend = Number(addendDisplay || 0);
                            onUpsertFormulaRule({
                              storeId: storeIdForRules,
                              staffName: selectedRuleStaffName || undefined,
                              metricKey: metric.key,
                              comparisonOp: op,
                              thresholdValue,
                              multiplier,
                              addend,
                            });
                          }}
                          className="p-1.5 bg-amber-600 text-white rounded hover:bg-amber-700"
                          title="저장"
                        >
                          <Save size={14} />
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700">정비 품목별 인센티브 단가 (원/개)</h3>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{selectedRuleStaffLabel}</span>
          {!isOwner && <span className="flex items-center gap-1 text-xs text-gray-400"><Lock size={12} /> 사장만 수정 가능</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {REPAIR_CAT_ITEMS.map((cat) => {
            const key = buildScopedRuleKey(storeIdForRules, `__REPAIR_CAT__::${cat.key}`, selectedRuleStaffName);
            const currentRate = getRate(storeIdForRules, `__REPAIR_CAT__::${cat.key}`, selectedRuleStaffName);
            const inputVal = draftRates[key] ?? String(currentRate);
            return (
              <div key={cat.key} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                <span className="text-sm font-semibold text-gray-700 flex-1">{cat.label}</span>
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
                        onUpsertRule({ storeId: storeIdForRules, staffName: selectedRuleStaffName || undefined, productName: `__REPAIR_CAT__::${cat.key}`, category: '정비', amountPerUnit: next });
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">직원별 집계 및 인센티브</h3>
          {staffRows.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">보고서 기준 집계: 타이어/중고타이어/정비 6개 품목/마진율 + 규칙 수식</p>
          )}
        </div>

          {staffRows.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">표시할 실적 데이터가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1300px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-bold text-gray-500 whitespace-nowrap">직원명</th>
                    <th className="px-3 py-3 text-right font-bold text-violet-600 whitespace-nowrap text-xs">타이어</th>
                    <th className="px-3 py-3 text-right font-bold text-fuchsia-600 whitespace-nowrap text-xs">중고타이어</th>
                    <th className="px-3 py-3 text-right font-bold text-blue-600 whitespace-nowrap text-xs">브레이크패드</th>
                    <th className="px-3 py-3 text-right font-bold text-blue-600 whitespace-nowrap text-xs">엔진오일</th>
                    <th className="px-3 py-3 text-right font-bold text-blue-600 whitespace-nowrap text-xs">브레이크오일</th>
                    <th className="px-3 py-3 text-right font-bold text-blue-600 whitespace-nowrap text-xs">TPMS</th>
                    <th className="px-3 py-3 text-right font-bold text-blue-600 whitespace-nowrap text-xs">디스크</th>
                    <th className="px-3 py-3 text-right font-bold text-blue-600 whitespace-nowrap text-xs">하체</th>
                    <th className="px-3 py-3 text-right font-bold text-emerald-600 whitespace-nowrap text-xs">마진율</th>
                    <th className="px-3 py-3 text-right font-bold text-amber-600 whitespace-nowrap text-xs">수식인센티브</th>
                    {showComplexBonusColumns && <th className="px-3 py-3 text-right font-bold text-violet-600 whitespace-nowrap text-xs">복합보너스</th>}
                    <th className="px-4 py-3 text-right font-bold text-gray-700 whitespace-nowrap">총 인센티브</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {staffRows.map((row, i) => (
                    <tr key={row.staffName} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                      <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">{row.staffName}</td>
                      <td className="px-3 py-3 text-right text-violet-700 font-semibold whitespace-nowrap">{formatNumber(row.tireQty)}개</td>
                      <td className="px-3 py-3 text-right text-fuchsia-700 font-semibold whitespace-nowrap">{formatNumber(row.usedTireQty)}개</td>
                      <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(row.metricValues.repair_brake_pad)}개</td>
                      <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(row.metricValues.repair_engine_oil)}개</td>
                      <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(row.metricValues.repair_brake_oil)}개</td>
                      <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(row.metricValues.repair_tpms)}개</td>
                      <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(row.metricValues.repair_disk)}개</td>
                      <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(row.metricValues.repair_suspension)}개</td>
                      <td className="px-3 py-3 text-right text-gray-600 whitespace-nowrap">{row.marginRate.toFixed(1)}%</td>
                      <td className="px-3 py-3 text-right text-amber-700 font-semibold whitespace-nowrap">{formatCurrency(row.formulaIncentive)}</td>
                      {showComplexBonusColumns && <td className="px-3 py-3 text-right text-violet-700 font-semibold whitespace-nowrap">{formatCurrency(row.tireBonusEarned + row.marginBonusEarned + row.managerStoreTireBonusEarned + row.managerStoreMarginBonusEarned)}</td>}
                      <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">{formatCurrency(row.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3 text-gray-700">합계</td>
                  <td className="px-3 py-3 text-right text-violet-700 whitespace-nowrap">{formatNumber(totalTireQty)}개</td>
                  <td className="px-3 py-3 text-right text-fuchsia-700 whitespace-nowrap">{formatNumber(totalUsedTireQty)}개</td>
                  <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(staffRows.reduce((s, r) => s + r.metricValues.repair_brake_pad, 0))}개</td>
                  <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(staffRows.reduce((s, r) => s + r.metricValues.repair_engine_oil, 0))}개</td>
                  <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(staffRows.reduce((s, r) => s + r.metricValues.repair_brake_oil, 0))}개</td>
                  <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(staffRows.reduce((s, r) => s + r.metricValues.repair_tpms, 0))}개</td>
                  <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(staffRows.reduce((s, r) => s + r.metricValues.repair_disk, 0))}개</td>
                  <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(staffRows.reduce((s, r) => s + r.metricValues.repair_suspension, 0))}개</td>
                  <td className="px-3 py-3 text-right text-gray-500 whitespace-nowrap">-</td>
                  <td className="px-3 py-3 text-right text-amber-700 whitespace-nowrap">{formatCurrency(totalFormulaIncentive)}</td>
                  {showComplexBonusColumns && <td className="px-3 py-3 text-right text-violet-700 whitespace-nowrap">{formatCurrency(totalComplexBonus)}</td>}
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

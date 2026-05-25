import React, { useMemo, useState } from 'react';
import type { DailyReport, DailyReportStaffItem, IncentiveRule, Product, Sale, Staff, User } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';
import { Save, Lock } from 'lucide-react';

interface IncentiveProps {
  dailyReports: DailyReport[];
  sales: Sale[];
  products: Product[];
  incentiveRules: IncentiveRule[];
  staffList: Staff[];
  currentStoreId: string;
  currentUser: User;
  onUpsertRule: (payload: { storeId: string; staffName?: string; productName: string; category: string; amountPerUnit: number }) => void;
  onUpsertComplexRule: (payload: {
    storeId: string;
    staffName?: string;
    productName: string;
    ruleType: 'tire_quantity' | 'margin_bonus' | 'margin_step';
    tireThreshold?: number;
    marginAmountThreshold?: number;
    bonusAmount: number;
  }) => void;
  managerStaffName?: string;
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
  | 'repair_suspension_margin'
  | 'margin_rate';

const REPAIR_CAT_ITEMS: Array<{ key: FormulaMetricKey; label: string }> = [
  { key: 'repair_brake_pad', label: '브레이크패드' },
  { key: 'repair_engine_oil', label: '엔진오일' },
  { key: 'repair_brake_oil', label: '브레이크오일' },
  { key: 'repair_tpms', label: 'TPMS' },
  { key: 'repair_suspension', label: '하체' },
];

const TIRE_CATEGORIES = ['타이어', '중고타이어'];
const REPAIR_CATEGORIES = ['정비', '부품/수리', '브레이크패드', '오일필터', '엔진오일', '에어크리너', 'TPMS'];
const REPAIR_CLASS_KEYWORDS = [
  '브레이크패드', '엔진오일', '합성유', '오일교환', '브레이크오일', '브레이크 오일', '브레이크액',
  'tpms', '디스크', '로터', '하체', '쇼바', '로어암', '활대링크', '부싱',
  '휠얼라인먼트', '휠얼라인', '얼라인', 'dot3', 'dot4',
];

const REPAIR_METRIC_DEFS: Array<{ key: FormulaMetricKey; keywords: string[] }> = [
  { key: 'repair_brake_pad', keywords: ['브레이크패드'] },
  { key: 'repair_engine_oil', keywords: ['엔진오일', '합성유', '오일교환'] },
  { key: 'repair_brake_oil', keywords: ['브레이크오일', '브레이크 오일', '브레이크액', 'brakeoil', 'dot3', 'dot4'] },
  { key: 'repair_tpms', keywords: ['tpms'] },
  { key: 'repair_disk', keywords: ['디스크', '로터'] },
  { key: 'repair_suspension', keywords: ['하체', '쇼바', '로어암', '활대링크', '부싱', '얼라인', '휠얼라인먼트', '휠얼라인', '휠밸런스', '휠발란스'] },
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
  repair_suspension_margin: 0,
  margin_rate: 0,
});

const normalizeText = (text?: string) => (text || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9가-힣]/g, '');
const normalizeStaffName = (name?: string) => (name || '미지정').trim();
const PART_CATEGORY_KEYWORDS = ['부품', '브레이크패드', '오일필터', '엔진오일', '에어크리너', 'part', 'parts', 'brakepad', 'oilfilter', 'engineoil', 'aircleaner'];

const isOnlineRentalItem = (productId?: string, productName?: string, category?: string): boolean => {
  const pid = (productId || '').toLowerCase();
  if (pid === 'rental-online' || pid === 'rental_online' || pid === 'rentalonline') return true;
  const haystack = normalizeText(`${productName || ''} ${category || ''}`);
  return haystack.includes('온라인렌탈') || haystack.includes('onlinerental');
};

const isPartCodeName = (productName?: string): boolean => {
  const normalized = (productName || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^(YEC|YUMI|XOIL|SP)\d[A-Z0-9]*$/.test(normalized);
};

const isPartCategory = (category?: string): boolean => {
  const normalized = normalizeText(category);
  return PART_CATEGORY_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)));
};

const resolveIncentiveItemClass = (item: { productName: string; category: string; itemClass: 'tire' | 'repair' | 'labor' }) => {
  const normalizedCategory = item.category === '부품/수리' ? '정비' : item.category;
  const haystack = normalizeText(`${item.productName} ${item.category}`);

  if (isPartCodeName(item.productName) || isPartCategory(item.category)) return 'labor' as const;

  if (TIRE_CATEGORIES.includes(normalizedCategory)) return 'tire' as const;
  if (REPAIR_CATEGORIES.includes(normalizedCategory)) return 'repair' as const;
  if (REPAIR_CLASS_KEYWORDS.some((kw) => haystack.includes(normalizeText(kw)))) return 'repair' as const;

  return item.itemClass;
};

const pickRepairMetric = (productName: string, category: string): FormulaMetricKey | null => {
  const haystack = normalizeText(`${productName} ${category}`);

  // 명칭 변형 대응: 브레이크 오일/액, DOT 규격
  if (haystack.includes('브레이크') && (haystack.includes('오일') || haystack.includes('액') || haystack.includes('dot'))) {
    return 'repair_brake_oil';
  }

  for (const def of REPAIR_METRIC_DEFS) {
    if (def.keywords.some((kw) => haystack.includes(normalizeText(kw)))) {
      return def.key;
    }
  }
  
  // Fallback: category="기타"인 경우 productName만으로 재매칭 시도
  if (normalizeText(category).includes('기타')) {
    const productHaystack = normalizeText(productName);
    for (const def of REPAIR_METRIC_DEFS) {
      if (def.keywords.some((kw) => productHaystack.includes(normalizeText(kw)))) {
        return def.key;
      }
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
const SUSPENSION_MARGIN_STEP_KEY = '__SUSP_MARGIN_STEP__';

const buildScopedRuleKey = (storeId: string, ruleKey: string, staffName?: string) => {
  return `${storeId}::${staffName || '__COMMON__'}::${ruleKey}`;
};

const buildStaffItemsFromSales = (report: DailyReport, sales: Sale[], products: Product[]): DailyReportStaffItem[] => {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const rows = new Map<string, DailyReportStaffItem>();

  sales
    .filter((sale) => !sale.isCanceled && sale.storeId === report.storeId && sale.date.startsWith(report.dateStr))
    .forEach((sale) => {
      const staffName = normalizeStaffName(sale.staffName);
      (sale.items || []).forEach((item) => {
        if (isOnlineRentalItem(item.productId, item.productName, item.category)) return;
        const product = productMap.get(item.productId);
        const category = item.category || product?.category || '기타';
        const itemClass = resolveIncentiveItemClass({ productName: item.productName, category, itemClass: 'labor' });
        const qty = item.quantity || 0;
        const revenue = (item.priceAtSale || 0) * qty;
        const cost = ((item.purchasePrice ?? product?.factoryPrice ?? 0) || 0) * qty;
        const key = `${staffName}::${item.productName}::${category}`;

        if (rows.has(key)) {
          const row = rows.get(key)!;
          row.qty += qty;
          row.revenue += revenue;
          row.cost += cost;
          row.profit += (revenue - cost);
        } else {
          rows.set(key, {
            staffName,
            productName: item.productName,
            category,
            itemClass,
            qty,
            revenue,
            cost,
            profit: revenue - cost,
          });
        }
      });
    });

  return Array.from(rows.values());
};

const Incentive: React.FC<IncentiveProps> = ({
  dailyReports,
  sales,
  products,
  incentiveRules,
  staffList,
  currentStoreId,
  currentUser,
  managerStaffName,
  onUpsertRule,
  onUpsertComplexRule,
}) => {
  // managerStaffName이 있으면 점장 세션 → 설정 편집 불가
  const isOwner = (currentUser.role === 'STORE_ADMIN' || currentUser.role === 'SUPER_ADMIN') && !managerStaffName;

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [draftRates, setDraftRates] = useState<Record<string, string>>({});
  const [selectedRuleStaffName, setSelectedRuleStaffName] = useState<string>(DEFAULT_RULE_SCOPE);

  const [tireBonusDraft, setTireBonusDraft] = useState<{ threshold: string; bonus: string }>({ threshold: '', bonus: '' });
  const [marginBonusDraft, setMarginBonusDraft] = useState<{ threshold: string; bonus: string }>({ threshold: '', bonus: '' });
  const [managerStoreTireBonusDraft, setManagerStoreTireBonusDraft] = useState<{ threshold: string; bonus: string }>({ threshold: '', bonus: '' });
  const [managerStoreMarginBonusDraft, setManagerStoreMarginBonusDraft] = useState<{ threshold: string; bonus: string }>({ threshold: '', bonus: '' });
  const [suspensionMarginStepDraft, setSuspensionMarginStepDraft] = useState<{ threshold: string; bonus: string }>({ threshold: '', bonus: '' });

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
  const managerKeySet = useMemo(() => {
    return new Set(
      staffList
        .filter((s) => s.isManager)
        .map((s) => `${normalizeStaffName(s.name)}::${s.storeId || ''}`)
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
  const suspensionMarginStepRule = useMemo(
    () => storeIdForRules ? getComplexRule(storeIdForRules, SUSPENSION_MARGIN_STEP_KEY, selectedRuleStaffName) : undefined,
    [incentiveRules, storeIdForRules, selectedRuleStaffName]
  );

  const getRate = (storeId: string, productName: string, staffName?: string): number => {
    return ruleMap.get(buildScopedRuleKey(storeId, productName, staffName))?.amountPerUnit
      || ruleMap.get(buildScopedRuleKey(storeId, productName, DEFAULT_RULE_SCOPE))?.amountPerUnit
      || 0;
  };

  const getReportStaffItems = (report: DailyReport): DailyReportStaffItem[] => {
    const normalizedExisting = (report.staffItems || [])
      .map((item) => ({ ...item, staffName: normalizeStaffName(item.staffName) }))
      .filter((item) => item.staffName !== '' && item.staffName !== '-')
      .filter((item) => !isOnlineRentalItem(undefined, item.productName, item.category));
    if (normalizedExisting.length > 0) return normalizedExisting;

    const rebuilt = buildStaffItemsFromSales(report, sales, products);
    if (rebuilt.length > 0) return rebuilt;

    // 최후 fallback: 단일 직원 보고서면 items를 해당 직원으로 귀속
    const uniqueStaff = Array.from(new Set((report.staffStats || []).map((s) => normalizeStaffName(s.staffName)).filter(Boolean)));
    if (uniqueStaff.length === 1) {
      const onlyStaff = uniqueStaff[0];
      return (report.items || []).map((item) => ({
        staffName: onlyStaff,
        productName: item.productName,
        category: item.category,
        itemClass: item.itemClass,
        qty: item.qty,
        revenue: item.revenue,
        cost: item.cost,
        profit: item.profit,
      })).filter((item) => !isOnlineRentalItem(undefined, item.productName, item.category));
    }
    return [];
  };

  const staffRows = useMemo(() => {
    type DailyStaffMetric = {
      storeId: string;
      tireQty: number;
      tireQtyFromItems: number;
      usedTireQty: number;
      repairMetrics: Record<FormulaMetricKey, number>;
      suspensionMargin: number;
      revenue: number;
      profit: number;
    };

    type StaffAggregate = {
      staffName: string;
      storeId: string;
      totalRepairQty: number;
      tireQty: number;
      usedTireQty: number;
      revenue: number;
      profit: number;
      repairIncentive: number;
      tireBonusEarned: number;
      marginBonusEarned: number;
      managerStoreTireBonusEarned: number;
      managerStoreMarginBonusEarned: number;
      suspensionMarginStepEarned: number;
      metricValues: Record<FormulaMetricKey, number>;
      isManager: boolean;
    };

    const staffAggMap = new Map<string, StaffAggregate>();

    monthReports.forEach((report) => {
      const dailyMap = new Map<string, DailyStaffMetric>();
      const ensureDaily = (staffName: string): DailyStaffMetric => {
        const normalizedStaffName = normalizeStaffName(staffName);
        if (!dailyMap.has(normalizedStaffName)) {
          dailyMap.set(normalizedStaffName, {
            storeId: report.storeId,
            tireQty: 0,
            tireQtyFromItems: 0,
            usedTireQty: 0,
            repairMetrics: createEmptyRepairMetrics(),
            suspensionMargin: 0,
            revenue: 0,
            profit: 0,
          });
        }
        return dailyMap.get(normalizedStaffName)!;
      };

      (report.staffStats || []).forEach((ss) => {
        const daily = ensureDaily(ss.staffName);
        daily.tireQty += ss.tireQty || 0;
        daily.revenue += ss.revenue || 0;
        daily.profit += ss.profit || 0;
      });

      getReportStaffItems(report).forEach((si) => {
        const daily = ensureDaily(si.staffName);
        const resolvedItemClass = resolveIncentiveItemClass(si);
        // 정비 건수는 정비 class에만 반영
        const mk = pickRepairMetric(si.productName, si.category);
        if (resolvedItemClass === 'repair' && mk) {
          daily.repairMetrics[mk] += si.qty;
          if (mk === 'repair_suspension') {
            daily.suspensionMargin += Math.max(0, si.profit || 0);
          }
        }
        if (resolvedItemClass === 'tire') {
          daily.tireQtyFromItems += si.qty;
          if (isUsedTireItem(si.productName, si.category)) {
            daily.usedTireQty += si.qty;
          }
        }
      });

      dailyMap.forEach((daily, staffName) => {
        const tireQty = daily.tireQty > 0 ? daily.tireQty : daily.tireQtyFromItems;
        const repairDetails = REPAIR_CAT_ITEMS.map((cat) => {
          const qty = daily.repairMetrics[cat.key] || 0;
          // 하체는 전용 마진 규칙으로 지급하고, 개수 단가는 적용하지 않는다.
          const rate = cat.key === 'repair_suspension' ? 0 : getRate(daily.storeId, `__REPAIR_CAT__::${cat.key}`, staffName);
          return { qty, amount: qty * rate };
        });
        const repairIncentiveDaily = repairDetails.reduce((sum, d) => sum + d.amount, 0);
        const totalRepairQtyDaily = repairDetails.reduce((sum, d) => sum + d.qty, 0);

        const rowTireRule = getComplexRule(daily.storeId, '__TIRE_BONUS__', staffName);
        const rowMarginRule = getComplexRule(daily.storeId, '__MARGIN_BONUS__', staffName);
        const rowManagerStoreTireRule = getComplexRule(daily.storeId, MANAGER_STORE_TIRE_BONUS_KEY, staffName);
        const rowManagerStoreMarginRule = getComplexRule(daily.storeId, MANAGER_STORE_MARGIN_BONUS_KEY, staffName);
        const rowSuspensionMarginStepRule = getComplexRule(daily.storeId, SUSPENSION_MARGIN_STEP_KEY, staffName);
        const tireThreshold = rowTireRule?.tireThreshold ?? 0;
        const tireBonus = rowTireRule?.bonusAmount ?? 0;
        const marginAmountThreshold = rowMarginRule?.marginAmountThreshold ?? rowMarginRule?.marginThreshold ?? 0;
        const marginBonusAmt = rowMarginRule?.bonusAmount ?? 0;
        const tireBonusEarnedDaily = tireThreshold > 0 && tireQty >= tireThreshold ? tireBonus : 0;
        const marginBonusEarnedDaily = marginAmountThreshold > 0 && daily.profit >= marginAmountThreshold ? marginBonusAmt : 0;
        const suspensionStepThreshold = rowSuspensionMarginStepRule?.marginAmountThreshold ?? 0;
        const suspensionStepBonus = rowSuspensionMarginStepRule?.bonusAmount ?? 0;
        const suspensionMarginStepEarnedDaily = suspensionStepThreshold > 0
          ? Math.floor(daily.suspensionMargin / suspensionStepThreshold) * suspensionStepBonus
          : 0;

        const isManager = managerKeySet.has(`${staffName}::${daily.storeId || ''}`);
        const managerStoreTireThreshold = rowManagerStoreTireRule?.tireThreshold ?? 0;
        const managerStoreTireBonus = rowManagerStoreTireRule?.bonusAmount ?? 0;
        const managerStoreMarginThreshold = rowManagerStoreMarginRule?.marginAmountThreshold ?? rowManagerStoreMarginRule?.marginThreshold ?? 0;
        const managerStoreMarginBonus = rowManagerStoreMarginRule?.bonusAmount ?? 0;
        // 점장 지점 기준도 일마감(하루) 기준으로 판정
        const managerStoreTireBonusEarnedDaily = isManager && managerStoreTireThreshold > 0 && (report.tireQty || 0) >= managerStoreTireThreshold ? managerStoreTireBonus : 0;
        const managerStoreMarginBonusEarnedDaily = isManager && managerStoreMarginThreshold > 0 && (report.profit || 0) >= managerStoreMarginThreshold ? managerStoreMarginBonus : 0;

        if (!staffAggMap.has(staffName)) {
          staffAggMap.set(staffName, {
            staffName,
            storeId: daily.storeId,
            totalRepairQty: 0,
            tireQty: 0,
            usedTireQty: 0,
            revenue: 0,
            profit: 0,
            repairIncentive: 0,
            tireBonusEarned: 0,
            marginBonusEarned: 0,
            managerStoreTireBonusEarned: 0,
            managerStoreMarginBonusEarned: 0,
            suspensionMarginStepEarned: 0,
            metricValues: createEmptyRepairMetrics(),
            isManager,
          });
        }

        const agg = staffAggMap.get(staffName)!;
        agg.storeId = daily.storeId;
        agg.totalRepairQty += totalRepairQtyDaily;
        agg.tireQty += tireQty;
        agg.usedTireQty += daily.usedTireQty;
        agg.revenue += daily.revenue;
        agg.profit += daily.profit;
        agg.repairIncentive += repairIncentiveDaily;
        agg.tireBonusEarned += tireBonusEarnedDaily;
        agg.marginBonusEarned += marginBonusEarnedDaily;
        agg.managerStoreTireBonusEarned += managerStoreTireBonusEarnedDaily;
        agg.managerStoreMarginBonusEarned += managerStoreMarginBonusEarnedDaily;
        agg.suspensionMarginStepEarned += suspensionMarginStepEarnedDaily;
        agg.metricValues.repair_brake_pad += daily.repairMetrics.repair_brake_pad;
        agg.metricValues.repair_engine_oil += daily.repairMetrics.repair_engine_oil;
        agg.metricValues.repair_brake_oil += daily.repairMetrics.repair_brake_oil;
        agg.metricValues.repair_tpms += daily.repairMetrics.repair_tpms;
        agg.metricValues.repair_disk += daily.repairMetrics.repair_disk;
        agg.metricValues.repair_suspension += daily.repairMetrics.repair_suspension;
        agg.metricValues.repair_suspension_margin += daily.suspensionMargin;
      });
    });

    return Array.from(staffAggMap.values()).map((agg) => {
      const marginRate = agg.revenue > 0 ? (agg.profit / agg.revenue) * 100 : 0;
      const totalAmount = agg.repairIncentive + agg.tireBonusEarned + agg.marginBonusEarned + agg.managerStoreTireBonusEarned + agg.managerStoreMarginBonusEarned + agg.suspensionMarginStepEarned;
      return {
        ...agg,
        marginRate,
        metricValues: {
          ...agg.metricValues,
          tire_qty: agg.tireQty,
          used_tire_qty: agg.usedTireQty,
          repair_suspension_margin: agg.metricValues.repair_suspension_margin,
          margin_rate: marginRate,
        } as Record<FormulaMetricKey, number>,
        totalAmount,
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [monthReports, ruleMap, incentiveRules, managerKeySet, sales, products]);

  const visibleStaffRows = useMemo(() => staffRows, [staffRows]);

  const totalRepairQty = visibleStaffRows.reduce((s, r) => s + r.totalRepairQty, 0);
  const totalTireQty = visibleStaffRows.reduce((s, r) => s + r.tireQty, 0);
  const totalUsedTireQty = visibleStaffRows.reduce((s, r) => s + r.usedTireQty, 0);
  const totalComplexBonus = visibleStaffRows.reduce((s, r) => s + r.tireBonusEarned + r.marginBonusEarned + r.managerStoreTireBonusEarned + r.managerStoreMarginBonusEarned + r.suspensionMarginStepEarned, 0);
  const totalSuspensionMargin = visibleStaffRows.reduce((s, r) => s + r.metricValues.repair_suspension_margin, 0);
  const totalIncentive = visibleStaffRows.reduce((s, r) => s + r.totalAmount, 0);

  const noReports = monthReports.length === 0;
  const hasStaffItems = monthReports.some((r) => getReportStaffItems(r).length > 0);

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
  const suspensionMarginStepThresholdDisplay = suspensionMarginStepDraft.threshold !== ''
    ? suspensionMarginStepDraft.threshold
    : String(suspensionMarginStepRule?.marginAmountThreshold ?? '');
  const suspensionMarginStepBonusDisplay = suspensionMarginStepDraft.bonus !== ''
    ? suspensionMarginStepDraft.bonus
    : String(suspensionMarginStepRule?.bonusAmount ?? '');

  const showComplexBonusColumns = visibleStaffRows.some((row) => (row.tireBonusEarned + row.marginBonusEarned + row.managerStoreTireBonusEarned + row.managerStoreMarginBonusEarned + row.suspensionMarginStepEarned) > 0);
  const showMarginRateColumn = !managerStaffName;
  const selectedRuleStaffLabel = selectedRuleStaffName || '공통 규칙';

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">인센티브</h2>
            <p className="text-xs text-gray-500 mt-1">
              보고서 게시판 데이터(staffStats/staffItems)로 직원별 수량과 마진(하체 전용 마진 포함)을 집계하고 자동 계산합니다. (2026-05-01부터 누적)
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

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
          <div className="p-3 rounded-lg border border-cyan-100 bg-cyan-50">
            <div className="text-xs text-cyan-700 font-semibold">하체 마진 합계</div>
            <div className="text-xl font-bold text-cyan-700 mt-1">{formatCurrency(totalSuspensionMargin)}</div>
          </div>
          <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50">
            <div className="text-xs text-emerald-600 font-semibold">전체 인센티브 합계</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(totalIncentive)}</div>
          </div>
        </div>
      </div>

      {isOwner && (
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
      )}

      {noReports && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-yellow-800">
          이 달에 저장된 일마감 보고서가 없습니다. 일별 마감 탭에서 마감을 저장하면 인센티브가 자동 집계됩니다.
        </div>
      )}
      {!noReports && !hasStaffItems && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
          보고서에 직원별 품목 데이터가 부족합니다. 최신 버전으로 마감을 다시 저장하면 품목별 수량 집계가 정확해집니다.
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
              <p className="text-xs text-gray-500">직원의 일마감(하루) 타이어 수량이 N개 이상이면 보너스를 지급합니다.</p>
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
              <p className="text-xs text-gray-500">직원의 일마감(하루) 마진 금액이 N원 이상이면 보너스를 지급합니다.</p>
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
              <p className="text-xs text-gray-500">선택 직원이 점장일 때만, 해당 지점의 일마감(하루) 타이어 수량이 기준 이상이면 보너스를 추가 지급합니다.</p>
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
              <p className="text-xs text-gray-500">선택 직원이 점장일 때만, 해당 지점의 일마감(하루) 마진 금액이 기준 이상이면 보너스를 추가 지급합니다.</p>
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

      {isOwner && (
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700">정비 품목별 인센티브 설정</h3>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{selectedRuleStaffLabel}</span>
          {!isOwner && <span className="flex items-center gap-1 text-xs text-gray-400"><Lock size={12} /> 사장만 수정 가능</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {REPAIR_CAT_ITEMS.map((cat) => {
            const key = buildScopedRuleKey(storeIdForRules, `__REPAIR_CAT__::${cat.key}`, selectedRuleStaffName);
            const currentRate = getRate(storeIdForRules, `__REPAIR_CAT__::${cat.key}`, selectedRuleStaffName);
            const inputVal = draftRates[key] ?? String(currentRate);
            const isSuspension = cat.key === 'repair_suspension';
            return (
              <div key={cat.key} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                <span className="text-sm font-semibold text-gray-700 flex-1">{cat.label}</span>
                {isOwner ? (
                  isSuspension ? (
                    <>
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={suspensionMarginStepThresholdDisplay}
                          onChange={(e) => setSuspensionMarginStepDraft((p) => ({ ...p, threshold: e.target.value }))}
                          className="w-24 px-2 py-1.5 border border-cyan-300 rounded-lg text-sm text-right bg-white"
                          placeholder="기준"
                        />
                        <span className="text-[11px] text-gray-500 whitespace-nowrap">원당</span>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={suspensionMarginStepBonusDisplay}
                          onChange={(e) => setSuspensionMarginStepDraft((p) => ({ ...p, bonus: e.target.value }))}
                          className="w-24 px-2 py-1.5 border border-cyan-300 rounded-lg text-sm text-right bg-white"
                          placeholder="지급"
                        />
                        <span className="text-[11px] text-gray-500 whitespace-nowrap">원</span>
                      </div>
                      <button
                        onClick={() => {
                          const threshold = Math.max(0, Number(suspensionMarginStepThresholdDisplay || 0));
                          const bonus = Math.max(0, Number(suspensionMarginStepBonusDisplay || 0));
                          onUpsertComplexRule({
                            storeId: storeIdForRules,
                            staffName: selectedRuleStaffName || undefined,
                            productName: SUSPENSION_MARGIN_STEP_KEY,
                            ruleType: 'margin_step',
                            marginAmountThreshold: threshold,
                            bonusAmount: bonus,
                          });
                          setSuspensionMarginStepDraft({ threshold: '', bonus: '' });
                        }}
                        className="p-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex-shrink-0"
                        title="저장"
                      >
                        <Save size={14} />
                      </button>
                    </>
                  ) : (
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
                  )
                ) : (
                  isSuspension ? <span className="text-xs font-semibold text-cyan-700">{formatCurrency(Number(suspensionMarginStepThresholdDisplay || 0))}당 {formatCurrency(Number(suspensionMarginStepBonusDisplay || 0))}</span> : <span className="text-sm font-bold text-blue-700">{formatCurrency(currentRate)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">직원별 집계 및 인센티브</h3>
          {visibleStaffRows.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {showMarginRateColumn
                ? '보고서 기준 집계: 타이어/중고타이어/정비 5개 품목/하체마진/마진율'
                : '보고서 기준 집계: 타이어/중고타이어/정비 5개 품목/하체마진'}
            </p>
          )}
        </div>

          {visibleStaffRows.length === 0 ? (
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
                    <th className="px-3 py-3 text-right font-bold text-blue-600 whitespace-nowrap text-xs">하체</th>
                    <th className="px-3 py-3 text-right font-bold text-cyan-700 whitespace-nowrap text-xs">하체마진</th>
                    {showMarginRateColumn && <th className="px-3 py-3 text-right font-bold text-emerald-600 whitespace-nowrap text-xs">마진율</th>}
                    {showComplexBonusColumns && <th className="px-3 py-3 text-right font-bold text-violet-600 whitespace-nowrap text-xs">복합보너스</th>}
                    <th className="px-4 py-3 text-right font-bold text-gray-700 whitespace-nowrap">총 인센티브</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visibleStaffRows.map((row, i) => (
                    <tr key={row.staffName} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                      <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">{row.staffName}</td>
                      <td className="px-3 py-3 text-right text-violet-700 font-semibold whitespace-nowrap">{formatNumber(row.tireQty)}개</td>
                      <td className="px-3 py-3 text-right text-fuchsia-700 font-semibold whitespace-nowrap">{formatNumber(row.usedTireQty)}개</td>
                      <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(row.metricValues.repair_brake_pad)}개</td>
                      <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(row.metricValues.repair_engine_oil)}개</td>
                      <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(row.metricValues.repair_brake_oil)}개</td>
                      <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(row.metricValues.repair_tpms)}개</td>
                      <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(row.metricValues.repair_suspension)}개</td>
                      <td className="px-3 py-3 text-right text-cyan-700 whitespace-nowrap">{formatCurrency(row.metricValues.repair_suspension_margin)}</td>
                      {showMarginRateColumn && <td className="px-3 py-3 text-right text-gray-600 whitespace-nowrap">{row.marginRate.toFixed(1)}%</td>}
                      {showComplexBonusColumns && <td className="px-3 py-3 text-right text-violet-700 font-semibold whitespace-nowrap">{formatCurrency(row.tireBonusEarned + row.marginBonusEarned + row.managerStoreTireBonusEarned + row.managerStoreMarginBonusEarned + row.suspensionMarginStepEarned)}</td>}
                      <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">{formatCurrency(row.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3 text-gray-700">합계</td>
                  <td className="px-3 py-3 text-right text-violet-700 whitespace-nowrap">{formatNumber(totalTireQty)}개</td>
                  <td className="px-3 py-3 text-right text-fuchsia-700 whitespace-nowrap">{formatNumber(totalUsedTireQty)}개</td>
                  <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(visibleStaffRows.reduce((s, r) => s + r.metricValues.repair_brake_pad, 0))}개</td>
                  <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(visibleStaffRows.reduce((s, r) => s + r.metricValues.repair_engine_oil, 0))}개</td>
                  <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(visibleStaffRows.reduce((s, r) => s + r.metricValues.repair_brake_oil, 0))}개</td>
                  <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(visibleStaffRows.reduce((s, r) => s + r.metricValues.repair_tpms, 0))}개</td>
                  <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{formatNumber(visibleStaffRows.reduce((s, r) => s + r.metricValues.repair_suspension, 0))}개</td>
                  <td className="px-3 py-3 text-right text-cyan-700 whitespace-nowrap">{formatCurrency(visibleStaffRows.reduce((s, r) => s + r.metricValues.repair_suspension_margin, 0))}</td>
                  {showMarginRateColumn && <td className="px-3 py-3 text-right text-gray-500 whitespace-nowrap">-</td>}
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

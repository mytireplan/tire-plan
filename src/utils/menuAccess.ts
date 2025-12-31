// Menu access control system based on subscription plan
// src/utils/menuAccess.ts

import type { SubscriptionPlan, PlanMenuAccess, MenuType } from '../types';

/**
 * Define menu access for each subscription plan
 */
export const PLAN_MENU_ACCESS: Record<SubscriptionPlan, PlanMenuAccess> = {
  FREE: {
    plan: 'FREE',
    maxStores: 1,
    maxStaff: 3,
    maxSalesPerMonth: 50,
    maxProducts: 50,
    dataRetentionDays: 30,
    menus: {
      dashboard: {
        menu: 'dashboard',
        label: '대시보드',
        enabled: true,
        restricted: true,
        description: '당일 판매 현황만 표시',
      },
      pos: {
        menu: 'pos',
        label: '판매',
        enabled: true,
        description: '기본 결제 기능 (현금/카드)',
      },
      salesHistory: {
        menu: 'salesHistory',
        label: '판매 내역',
        enabled: true,
        restricted: true,
        description: '월 50건까지만 저장',
      },
      inventory: {
        menu: 'inventory',
        label: '재고 관리',
        enabled: true,
        restricted: true,
        description: '최대 50개 품목',
      },
      reservation: {
        menu: 'reservation',
        label: '예약 관리',
        enabled: false,
        description: 'STARTER 이상 플랜에서 이용 가능',
      },
      customers: {
        menu: 'customers',
        label: '고객 관리',
        enabled: false,
        description: 'STARTER 이상 플랜에서 이용 가능',
      },
      taxInvoice: {
        menu: 'taxInvoice',
        label: '세금계산서',
        enabled: false,
        description: 'PRO 이상 플랜에서 이용 가능',
      },
      stockIn: {
        menu: 'stockIn',
        label: '입고 관리',
        enabled: false,
        description: 'PRO 이상 플랜에서 이용 가능',
      },
      financials: {
        menu: 'financials',
        label: '재무·결산',
        enabled: false,
        description: 'STARTER 이상 플랜에서 이용 가능 (간소화)',
      },
      schedule: {
        menu: 'schedule',
        label: '근무표',
        enabled: false,
        description: 'ENTERPRISE 플랜에서만 이용 가능',
      },
      settings: {
        menu: 'settings',
        label: '설정',
        enabled: true,
        restricted: true,
        description: '기본 설정만 변경 가능',
      },
    },
  },

  STARTER: {
    plan: 'STARTER',
    maxStores: 2,
    maxStaff: 10,
    maxSalesPerMonth: 300,
    maxProducts: 200,
    dataRetentionDays: 365,
    menus: {
      dashboard: {
        menu: 'dashboard',
        label: '대시보드',
        enabled: true,
        description: '기본 매출 통계 및 예약 현황',
      },
      pos: {
        menu: 'pos',
        label: '판매',
        enabled: true,
        description: '영수증 출력 및 단순 취소 기능',
      },
      salesHistory: {
        menu: 'salesHistory',
        label: '판매 내역',
        enabled: true,
        restricted: true,
        description: '월 300건까지 저장, CSV 내보내기 가능',
      },
      inventory: {
        menu: 'inventory',
        label: '재고 관리',
        enabled: true,
        restricted: true,
        description: '최대 200개 품목 관리',
      },
      reservation: {
        menu: 'reservation',
        label: '예약 관리',
        enabled: true,
        description: '일별/주별 예약 리스트 조회 및 등록',
      },
      customers: {
        menu: 'customers',
        label: '고객 관리',
        enabled: true,
        restricted: true,
        description: '전화번호 기반 정보만 저장 (차량 정보 제외)',
      },
      taxInvoice: {
        menu: 'taxInvoice',
        label: '세금계산서',
        enabled: false,
        description: 'PRO 이상 플랜에서 이용 가능',
      },
      stockIn: {
        menu: 'stockIn',
        label: '입고 관리',
        enabled: false,
        description: 'PRO 이상 플랜에서 이용 가능',
      },
      financials: {
        menu: 'financials',
        label: '재무·결산',
        enabled: true,
        restricted: true,
        description: '간소화된 손익 리포트',
      },
      schedule: {
        menu: 'schedule',
        label: '근무표',
        enabled: false,
        description: 'ENTERPRISE 플랜에서만 이용 가능',
      },
      settings: {
        menu: 'settings',
        label: '설정',
        enabled: true,
        restricted: true,
        description: '기본 설정 변경 가능 (API/백업 제외)',
      },
    },
  },

  PRO: {
    plan: 'PRO',
    maxStores: 5,
    maxStaff: -1,
    maxSalesPerMonth: -1,
    maxProducts: -1,
    dataRetentionDays: -1,
    menus: {
      dashboard: {
        menu: 'dashboard',
        label: '대시보드',
        enabled: true,
        description: '지점 통합 현황 (최대 5개) 및 성과 지표 분석',
      },
      pos: {
        menu: 'pos',
        label: '판매',
        enabled: true,
        description: '포인트 적립 및 복합 결제 기능',
      },
      salesHistory: {
        menu: 'salesHistory',
        label: '판매 내역',
        enabled: true,
        description: '무제한 저장 및 CSV 내보내기',
      },
      inventory: {
        menu: 'inventory',
        label: '재고 관리',
        enabled: true,
        description: '품목 제한 없음, 재고 위치 및 소진 추적',
      },
      reservation: {
        menu: 'reservation',
        label: '예약 관리',
        enabled: true,
        description: '고급 예약 관리 기능',
      },
      customers: {
        menu: 'customers',
        label: '고객 관리',
        enabled: true,
        description: '차량 번호, 방문 이력, 주행 거리 등 상세 관리',
      },
      taxInvoice: {
        menu: 'taxInvoice',
        label: '세금계산서',
        enabled: true,
        description: '판매 내역 연동 즉시 발행',
      },
      stockIn: {
        menu: 'stockIn',
        label: '입고 관리',
        enabled: true,
        description: '매입처 관리, DOT 기록, 반품 관리',
      },
      financials: {
        menu: 'financials',
        label: '재무·결산',
        enabled: true,
        description: '손익계산서, 현금흐름표, 고정지출 관리',
      },
      schedule: {
        menu: 'schedule',
        label: '근무표',
        enabled: false,
        description: 'ENTERPRISE 플랜에서만 이용 가능',
      },
      settings: {
        menu: 'settings',
        label: '설정',
        enabled: true,
        restricted: true,
        description: 'API 연동 및 데이터 백업 기능 제한',
      },
    },
  },

  ENTERPRISE: {
    plan: 'ENTERPRISE',
    maxStores: -1,
    maxStaff: -1,
    maxSalesPerMonth: -1,
    maxProducts: -1,
    dataRetentionDays: -1,
    menus: {
      dashboard: {
        menu: 'dashboard',
        label: '대시보드',
        enabled: true,
        description: '무제한 지점 통합 데이터 및 고급 분석 리포트',
      },
      pos: {
        menu: 'pos',
        label: '판매',
        enabled: true,
        description: '모든 결제 및 거래 기능 지원',
      },
      salesHistory: {
        menu: 'salesHistory',
        label: '판매 내역',
        enabled: true,
        description: '전체 이력 조회 및 고급 분석',
      },
      inventory: {
        menu: 'inventory',
        label: '재고 관리',
        enabled: true,
        description: '전체 재고 기능 활성화',
      },
      reservation: {
        menu: 'reservation',
        label: '예약 관리',
        enabled: true,
        description: '고급 예약 관리 및 분석',
      },
      customers: {
        menu: 'customers',
        label: '고객 관리',
        enabled: true,
        description: '전체 고객 정보 및 이력 관리',
      },
      taxInvoice: {
        menu: 'taxInvoice',
        label: '세금계산서',
        enabled: true,
        description: '전체 세금 처리 기능',
      },
      stockIn: {
        menu: 'stockIn',
        label: '입고 관리',
        enabled: true,
        description: '전체 입고 기능',
      },
      financials: {
        menu: 'financials',
        label: '재무·결산',
        enabled: true,
        description: '전체 재무 기능 활성화',
      },
      schedule: {
        menu: 'schedule',
        label: '근무표',
        enabled: true,
        description: '직원별 교대 스케줄, 휴가 관리, 근태 이력',
      },
      settings: {
        menu: 'settings',
        label: '설정',
        enabled: true,
        description: 'API 연동, 다중 사용자 권한 관리, 데이터 백업/복원',
      },
    },
  },
};

/**
 * Check if a menu is accessible for a given plan
 */
export function isMenuAccessible(plan: SubscriptionPlan, menu: MenuType): boolean {
  return PLAN_MENU_ACCESS[plan]?.menus[menu]?.enabled ?? false;
}

/**
 * Check if a menu is restricted (enabled but with limitations)
 */
export function isMenuRestricted(plan: SubscriptionPlan, menu: MenuType): boolean {
  return PLAN_MENU_ACCESS[plan]?.menus[menu]?.restricted ?? false;
}

/**
 * Get menu access information for a plan
 */
export function getMenuAccess(plan: SubscriptionPlan, menu: MenuType) {
  return PLAN_MENU_ACCESS[plan]?.menus[menu] ?? null;
}

/**
 * Get all accessible menus for a plan
 */
export function getAccessibleMenus(plan: SubscriptionPlan) {
  return Object.values(PLAN_MENU_ACCESS[plan]?.menus ?? {}).filter(m => m.enabled);
}

/**
 * Get upgrade message for a menu
 */
export function getUpgradeMessage(currentPlan: SubscriptionPlan, menu: MenuType): string {
  const currentAccess = PLAN_MENU_ACCESS[currentPlan]?.menus[menu];
  if (!currentAccess) return '';

  if (currentPlan === 'FREE') {
    if (menu === 'schedule') {
      return 'ENTERPRISE 플랜 이상에서 이용 가능합니다.';
    }
    return 'STARTER 플랜 이상에서 이용 가능합니다.';
  }

  if (currentPlan === 'STARTER') {
    if (menu === 'schedule') {
      return 'ENTERPRISE 플랜 이상에서 이용 가능합니다.';
    }
    if (['taxInvoice', 'stockIn'].includes(menu)) {
      return 'PRO 플랜 이상에서 이용 가능합니다.';
    }
  }

  if (currentPlan === 'PRO') {
    if (menu === 'schedule') {
      return 'ENTERPRISE 플랜에서만 이용 가능합니다.';
    }
  }

  return '상위 플랜으로 업그레이드하세요.';
}

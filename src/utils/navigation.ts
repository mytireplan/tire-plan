// Navigation utility with subscription plan integration
// src/utils/navigation.ts

import type { SubscriptionPlan } from '../types';
import { PLAN_MENU_ACCESS } from './menuAccess';

export interface NavItem {
  id: string;
  label: string;
  show: boolean;
  type: 'CORE' | 'ADMIN' | 'DIVIDER';
  accessible?: boolean; // false if menu is restricted by plan
  description?: string;
}

/**
 * Get navigation items based on subscription plan
 */
export function getNavItemsByPlan(plan: SubscriptionPlan, isAdmin: boolean): NavItem[] {
  const planMenus = PLAN_MENU_ACCESS[plan];

  const items: NavItem[] = [
    {
      id: 'dashboard',
      label: '대시보드',
      show: true,
      type: 'CORE',
      accessible: planMenus.menus.dashboard.enabled,
    },
    {
      id: 'pos',
      label: '판매 (POS)',
      show: true,
      type: 'CORE',
      accessible: planMenus.menus.pos.enabled,
    },
    {
      id: 'reservation',
      label: '예약 관리',
      show: planMenus.menus.reservation.enabled,
      type: 'CORE',
      accessible: planMenus.menus.reservation.enabled,
      description: planMenus.menus.reservation.description,
    },
    {
      id: 'history',
      label: '판매 내역',
      show: true,
      type: 'CORE',
      accessible: planMenus.menus.salesHistory.enabled,
    },
    {
      id: 'tax',
      label: '세금계산서',
      show: planMenus.menus.taxInvoice.enabled,
      type: 'CORE',
      accessible: planMenus.menus.taxInvoice.enabled,
      description: planMenus.menus.taxInvoice.description,
    },
    {
      id: 'customers',
      label: '고객 관리',
      show: isAdmin && planMenus.menus.customers.enabled,
      type: 'ADMIN',
      accessible: planMenus.menus.customers.enabled,
      description: planMenus.menus.customers.description,
    },
    {
      id: 'DIVIDER_1',
      label: '',
      show: true,
      type: 'DIVIDER',
    },
    {
      id: 'inventory',
      label: '재고 관리',
      show: true,
      type: 'CORE',
      accessible: planMenus.menus.inventory.enabled,
    },
    {
      id: 'stockIn',
      label: '입고 관리',
      show: planMenus.menus.stockIn.enabled,
      type: 'CORE',
      accessible: planMenus.menus.stockIn.enabled,
      description: planMenus.menus.stockIn.description,
    },
    {
      id: 'financials',
      label: isAdmin ? '재무/결산' : '지출',
      show: planMenus.menus.financials.enabled,
      type: 'CORE',
      accessible: planMenus.menus.financials.enabled,
      description: planMenus.menus.financials.description,
    },
    {
      id: 'DIVIDER_2',
      label: '',
      show: planMenus.menus.schedule.enabled,
      type: 'DIVIDER',
    },
    {
      id: 'leave',
      label: '근무표',
      show: planMenus.menus.schedule.enabled,
      type: 'CORE',
      accessible: planMenus.menus.schedule.enabled,
      description: planMenus.menus.schedule.description,
    },
    {
      id: 'settings',
      label: '설정',
      show: isAdmin,
      type: 'ADMIN',
      accessible: planMenus.menus.settings.enabled,
    },
  ];

  return items.filter(item => item.show);
}

/**
 * Check if a menu item is accessible in the current plan
 */
export function isMenuAccessible(plan: SubscriptionPlan, menuId: string): boolean {
  const menuMap: Record<string, keyof typeof PLAN_MENU_ACCESS['FREE']['menus']> = {
    dashboard: 'dashboard',
    pos: 'pos',
    history: 'salesHistory',
    inventory: 'inventory',
    reservation: 'reservation',
    customers: 'customers',
    tax: 'taxInvoice',
    stockIn: 'stockIn',
    financials: 'financials',
    leave: 'schedule',
    settings: 'settings',
  };

  const menuKey = menuMap[menuId];
  if (!menuKey) return true; // Unknown menu IDs are allowed

  return PLAN_MENU_ACCESS[plan]?.menus[menuKey]?.enabled ?? false;
}

/**
 * Get upgrade message for a restricted menu
 */
export function getMenuUpgradeMessage(plan: SubscriptionPlan, menuId: string): string {
  const menuMap: Record<string, keyof typeof PLAN_MENU_ACCESS['FREE']['menus']> = {
    dashboard: 'dashboard',
    pos: 'pos',
    history: 'salesHistory',
    inventory: 'inventory',
    reservation: 'reservation',
    customers: 'customers',
    tax: 'taxInvoice',
    stockIn: 'stockIn',
    financials: 'financials',
    leave: 'schedule',
    settings: 'settings',
  };

  const menuKey = menuMap[menuId];
  if (!menuKey) return '';

  const access = PLAN_MENU_ACCESS[plan]?.menus[menuKey];
  if (!access) return '';

  if (access.enabled) return '';

  if (plan === 'FREE') {
    if (menuId === 'leave') return 'ENTERPRISE 플랜 이상에서 이용 가능합니다.';
    return 'STARTER 플랜 이상에서 이용 가능합니다.';
  }

  if (plan === 'STARTER') {
    if (menuId === 'leave') return 'ENTERPRISE 플랜 이상에서 이용 가능합니다.';
    if (['tax', 'stockIn'].includes(menuId)) return 'PRO 플랜 이상에서 이용 가능합니다.';
    return 'STARTER 플랜 이상에서 이용 가능합니다.';
  }

  if (plan === 'PRO') {
    if (menuId === 'leave') return 'ENTERPRISE 플랜에서만 이용 가능합니다.';
  }

  return '상위 플랜으로 업그레이드하세요.';
}

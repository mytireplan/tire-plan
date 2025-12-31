// Hook for menu access control
// src/hooks/useMenuAccess.ts

import { useMemo } from 'react';
import type { SubscriptionPlan, MenuType } from '../types';
import {
  isMenuAccessible,
  isMenuRestricted,
  getMenuAccess,
  getAccessibleMenus,
  getUpgradeMessage,
} from '../utils/menuAccess';

export function useMenuAccess(plan: SubscriptionPlan) {
  return useMemo(() => ({
    can: (menu: MenuType) => isMenuAccessible(plan, menu),
    isRestricted: (menu: MenuType) => isMenuRestricted(plan, menu),
    getInfo: (menu: MenuType) => getMenuAccess(plan, menu),
    getAccessible: () => getAccessibleMenus(plan),
    getUpgradeMessage: (menu: MenuType) => getUpgradeMessage(plan, menu),
  }), [plan]);
}

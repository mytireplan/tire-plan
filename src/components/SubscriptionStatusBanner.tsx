// Subscription Status Banner for Dashboard
// src/components/SubscriptionStatusBanner.tsx

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import type { Subscription } from '../types';
import { getDaysRemaining } from '../utils/subscription';

interface SubscriptionStatusBannerProps {
  subscription: Subscription | null;
  onUpgradeClick?: () => void;
}

const SubscriptionStatusBanner: React.FC<SubscriptionStatusBannerProps> = ({
  subscription,
  onUpgradeClick,
}) => {
  const [daysRemaining, setDaysRemaining] = useState<number>(0);

  useEffect(() => {
    if (subscription?.nextBillingDate) {
      const days = getDaysRemaining(subscription.nextBillingDate);
      setDaysRemaining(days);
    }
  }, [subscription?.nextBillingDate]);

  if (!subscription) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
          <div className="flex-1">
            <h3 className="font-bold text-yellow-900 mb-1">무료 플랜 사용 중</h3>
            <p className="text-sm text-yellow-700 mb-2">
              월 최대 50건의 판매 기록과 50개 상품만 저장 가능합니다.
            </p>
            <button
              onClick={onUpgradeClick}
              className="text-sm font-medium text-yellow-700 hover:text-yellow-900 underline"
            >
              유료 플랜으로 업그레이드하기 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (subscription.status === 'SUSPENDED') {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
          <div className="flex-1">
            <h3 className="font-bold text-red-900 mb-1">구독이 일시 정지되었습니다</h3>
            <p className="text-sm text-red-700">
              결제 실패가 반복되었습니다. 설정 → 구독관리에서 결제 수단을 확인하세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (subscription.status === 'CANCELED') {
    return (
      <div className="bg-gray-50 border-l-4 border-gray-400 p-4 mb-4 rounded">
        <div className="flex items-start gap-3">
          <Clock className="text-gray-600 mt-0.5 flex-shrink-0" size={20} />
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">구독이 취소되었습니다</h3>
            <p className="text-sm text-gray-700">
              현재 무료 플랜으로 서비스 중입니다. 다시 구독을 시작할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE subscription
  const isPlanEndingSoon = daysRemaining <= 7;

  return (
    <div
      className={`border-l-4 p-4 mb-4 rounded ${
        isPlanEndingSoon
          ? 'bg-blue-50 border-blue-400'
          : 'bg-green-50 border-green-400'
      }`}
    >
      <div className="flex items-start gap-3">
        {isPlanEndingSoon ? (
          <Clock className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
        ) : (
          <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-bold ${
              isPlanEndingSoon
                ? 'text-blue-900'
                : 'text-green-900'
            }`}>
              {subscription.plan} 플랜
            </h3>
            <span className={`text-xs px-2 py-1 rounded ${
              isPlanEndingSoon
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {subscription.billingCycle === 'MONTHLY' ? '월간' : '연간'}
            </span>
          </div>
          <p className={`text-sm ${
            isPlanEndingSoon
              ? 'text-blue-700'
              : 'text-green-700'
          }`}>
            {isPlanEndingSoon ? (
              <>
                <span className="font-medium">다음 결제일까지 {daysRemaining}일 남았습니다.</span>
                {' '}결제 수단 확인을 권장합니다.
              </>
            ) : (
              <>
                <span className="font-medium">다음 결제일:</span>
                {' '}{new Date(subscription.nextBillingDate).toLocaleDateString('ko-KR')}
              </>
            )}
          </p>
        </div>
        <Zap className={`flex-shrink-0 ${
          isPlanEndingSoon
            ? 'text-blue-400'
            : 'text-green-400'
        }`} size={20} />
      </div>
    </div>
  );
};

export default SubscriptionStatusBanner;

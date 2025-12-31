import React, { useEffect, useState } from 'react';
import { CreditCard, Plus, X, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import type { Subscription, BillingKey, PaymentHistory, SubscriptionPlan, SubscriptionPlanFeatures } from '../types';

interface SubscriptionManagementProps {
  ownerId: string;
  currentSubscription: Subscription | null;
  billingKeys: BillingKey[];
  paymentHistory: PaymentHistory[];
  onSelectPlan: (plan: SubscriptionPlan, billingCycle: 'MONTHLY' | 'YEARLY', billingKeyId?: string) => Promise<void>;
  onCancelSubscription: () => Promise<void>;
  onAddBillingKey: (billingKey: BillingKey) => void;
}

const PLAN_FEATURES: Record<SubscriptionPlan, SubscriptionPlanFeatures> = {
  FREE: {
    plan: 'FREE',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxSalesPerMonth: 50,
    maxProducts: 50,
    dataRetentionDays: 30,
    features: {
      taxInvoice: false,
      advancedAnalytics: false,
      staffManagement: false,
      multiStore: false,
      reservationSystem: false,
      leaveManagement: false,
    },
  },
  STARTER: {
    plan: 'STARTER',
    monthlyPrice: 19900,
    yearlyPrice: 199000,
    maxSalesPerMonth: 500,
    maxProducts: 500,
    dataRetentionDays: 90,
    features: {
      taxInvoice: true,
      advancedAnalytics: false,
      staffManagement: true,
      multiStore: false,
      reservationSystem: false,
      leaveManagement: false,
    },
  },
  PRO: {
    plan: 'PRO',
    monthlyPrice: 39000,
    yearlyPrice: 390000,
    maxSalesPerMonth: 5000,
    maxProducts: 5000,
    dataRetentionDays: 365,
    features: {
      taxInvoice: true,
      advancedAnalytics: true,
      staffManagement: true,
      multiStore: true,
      reservationSystem: true,
      leaveManagement: false,
    },
  },
  ENTERPRISE: {
    plan: 'ENTERPRISE',
    monthlyPrice: 89000,
    yearlyPrice: 890000,
    maxSalesPerMonth: 999999,
    maxProducts: 999999,
    dataRetentionDays: 999999,
    features: {
      taxInvoice: true,
      advancedAnalytics: true,
      staffManagement: true,
      multiStore: true,
      reservationSystem: true,
      leaveManagement: true,
    },
  },
};

const PlanCard: React.FC<{
  plan: SubscriptionPlan;
  isActive: boolean;
  isLoading: boolean;
  onSelectMonthly: () => void;
  onSelectYearly: () => void;
}> = ({ plan, isActive, isLoading, onSelectMonthly, onSelectYearly }) => {
  const features = PLAN_FEATURES[plan];
  const isFreePlan = plan === 'FREE';
  
  // Plan-specific colors
  const planColors = {
    FREE: {
      border: 'border-gray-300',
      bg: 'bg-white',
      headerBg: 'bg-gradient-to-r from-gray-50 to-gray-100',
      headerText: 'text-gray-900',
      activeHeaderBg: 'bg-gradient-to-r from-gray-100 to-gray-200',
      activeBorder: 'border-gray-400',
      badge: 'bg-gray-100 text-gray-700',
      buttonPrimary: 'bg-gray-500 hover:bg-gray-600',
      buttonSecondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    },
    STARTER: {
      border: 'border-blue-300',
      bg: 'bg-white',
      headerBg: 'bg-gradient-to-r from-blue-50 to-blue-100',
      headerText: 'text-blue-900',
      activeHeaderBg: 'bg-gradient-to-r from-blue-100 to-blue-200',
      activeBorder: 'border-blue-500',
      badge: 'bg-blue-100 text-blue-700',
      buttonPrimary: 'bg-blue-500 hover:bg-blue-600',
      buttonSecondary: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    },
    PRO: {
      border: 'border-purple-300',
      bg: 'bg-white',
      headerBg: 'bg-gradient-to-r from-purple-50 to-purple-100',
      headerText: 'text-purple-900',
      activeHeaderBg: 'bg-gradient-to-r from-purple-100 to-purple-200',
      activeBorder: 'border-purple-500',
      badge: 'bg-purple-100 text-purple-700',
      buttonPrimary: 'bg-purple-500 hover:bg-purple-600',
      buttonSecondary: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    },
    ENTERPRISE: {
      border: 'border-amber-300',
      bg: 'bg-white',
      headerBg: 'bg-gradient-to-r from-amber-50 to-amber-100',
      headerText: 'text-amber-900',
      activeHeaderBg: 'bg-gradient-to-r from-amber-100 to-amber-200',
      activeBorder: 'border-amber-500',
      badge: 'bg-amber-100 text-amber-700',
      buttonPrimary: 'bg-amber-500 hover:bg-amber-600',
      buttonSecondary: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    },
  };

  const colors = planColors[plan];

  return (
    <div
      className={`rounded-lg border-2 overflow-hidden transition-all ${
        isActive
          ? `${colors.activeBorder} shadow-lg`
          : `${colors.border} ${colors.bg} hover:shadow-md`
      }`}
    >
      <div className={`${isActive ? colors.activeHeaderBg : colors.headerBg} px-6 py-4 border-b`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-bold ${colors.headerText}`}>{plan}</h3>
          {isActive && (
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${colors.badge} text-sm font-medium`}>
              <CheckCircle size={16} />
              현재 플랜
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-4">
        {!isFreePlan && (
          <div className="mb-4 space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                ₩{features.monthlyPrice.toLocaleString()}
              </span>
              <span className="text-sm text-gray-600">/월</span>
            </div>
            <p className="text-xs text-gray-500">
              또는 연간 ₩{features.yearlyPrice.toLocaleString()} (1개월 절감)
            </p>
          </div>
        )}

        {isFreePlan && (
          <div className="mb-4 text-xs font-medium text-gray-600">
            무료 플랜
          </div>
        )}

        <div className="mb-5 space-y-1.5 border-y py-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-medium">월간 판매:</span>
            <span className="text-gray-900 font-semibold">
              최대 {features.maxSalesPerMonth.toLocaleString()}건
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-medium">등록 상품:</span>
            <span className="text-gray-900 font-semibold">
              최대 {features.maxProducts.toLocaleString()}개
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-medium">데이터 보관:</span>
            <span className="text-gray-900 font-semibold">
              {features.dataRetentionDays}일
            </span>
          </div>
        </div>

        <div className="space-y-1.5 mb-5">
          <h4 className="font-semibold text-xs text-gray-900 mb-2">포함 기능</h4>
          <ul className="space-y-1.5">
            {Object.entries(features.features).map(([key, enabled]) => (
              <li key={key} className="flex items-center gap-2 text-xs">
                <span className={`flex-shrink-0 ${enabled ? 'text-green-600' : 'text-gray-300'}`}>
                  {enabled ? '✓' : '✕'}
                </span>
                <span className={enabled ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                  {getFeatureName(key as keyof typeof features.features)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {isFreePlan ? (
          <p className="text-xs text-gray-500 text-center py-2">
            유료 플랜으로 업그레이드하여 전체 기능을 사용하세요
          </p>
        ) : (
          <div className="space-y-2">
            <button
              onClick={onSelectMonthly}
              disabled={isLoading}
              className={`w-full px-4 py-2.5 ${colors.buttonPrimary} text-white rounded-lg disabled:bg-gray-400 font-medium text-sm transition-colors flex items-center justify-center gap-2`}
            >
              {isLoading && <Loader size={16} className="animate-spin" />}
              월간 구독
            </button>
            <button
              onClick={onSelectYearly}
              disabled={isLoading}
              className={`w-full px-4 py-2.5 ${colors.buttonSecondary} rounded-lg disabled:bg-gray-200 font-medium text-sm transition-colors flex items-center justify-center gap-2`}
            >
              {isLoading && <Loader size={16} className="animate-spin" />}
              연간 구독
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function getFeatureName(key: keyof SubscriptionPlanFeatures['features']): string {
  const names: Record<string, string> = {
    taxInvoice: '세금계산서 발급',
    advancedAnalytics: '고급 분석',
    staffManagement: '직원 관리',
    multiStore: '다중 지점 관리',
    reservationSystem: '예약 시스템',
    leaveManagement: '휴무 관리',
  };
  return names[key] || key;
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  ownerId,
  currentSubscription,
  billingKeys,
  paymentHistory,
  onSelectPlan,
  onCancelSubscription,
  onAddBillingKey,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showBillingKeyModal, setShowBillingKeyModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBillingKey, setSelectedBillingKey] = useState<string | null>(null);

  const handlePlanSelection = async (plan: SubscriptionPlan, billingCycle: 'MONTHLY' | 'YEARLY') => {
    if (plan === 'FREE') {
      // Free plan doesn't need billing
      setIsLoading(true);
      try {
        await onSelectPlan(plan, billingCycle);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // For paid plans, show billing key selection
    if (!billingKeys.length) {
      setShowBillingKeyModal(true);
      return;
    }

    setIsLoading(true);
    try {
      await onSelectPlan(plan, billingCycle, billingKeys[0].id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('정말로 구독을 취소하시겠습니까?\n취소 후에는 무료 플랜으로 전환됩니다.')) {
      return;
    }

    setIsLoading(true);
    try {
      await onCancelSubscription();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const currentPlan = currentSubscription?.plan || 'FREE';

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Current Subscription Status */}
      {currentSubscription && currentPlan !== 'FREE' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4">현재 구독 정보</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded p-3">
              <p className="text-xs text-gray-600 mb-1">구독 플랜</p>
              <p className="font-bold text-gray-900">{currentPlan}</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-xs text-gray-600 mb-1">결제 주기</p>
              <p className="font-bold text-gray-900">
                {currentSubscription.billingCycle === 'MONTHLY' ? '월간' : '연간'}
              </p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-xs text-gray-600 mb-1">현재 기간</p>
              <p className="font-bold text-gray-900 text-sm">
                {new Date(currentSubscription.currentPeriodStart).toLocaleDateString('ko-KR')} ~
              </p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-xs text-gray-600 mb-1">다음 결제일</p>
              <p className="font-bold text-gray-900 text-sm">
                {new Date(currentSubscription.nextBillingDate).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelSubscription}
            disabled={isLoading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 font-medium text-sm transition-colors"
          >
            {isLoading ? '처리 중...' : '구독 취소'}
          </button>
        </div>
      )}

      {/* Plan Selection */}
      <div>
        <h3 className="font-bold text-lg text-gray-900 mb-4">구독 플랜 선택</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.keys(PLAN_FEATURES).map((plan) => (
            <PlanCard
              key={plan}
              plan={plan as SubscriptionPlan}
              isActive={currentPlan === plan}
              isLoading={isLoading}
              onSelectMonthly={() => handlePlanSelection(plan as SubscriptionPlan, 'MONTHLY')}
              onSelectYearly={() => handlePlanSelection(plan as SubscriptionPlan, 'YEARLY')}
            />
          ))}
        </div>
      </div>

      {/* Billing Keys */}
      <div className="border-t pt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <CreditCard size={20} />
            결제 수단 관리
          </h3>
          <button
            onClick={() => setShowBillingKeyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-sm transition-colors"
          >
            <Plus size={16} />
            카드 추가
          </button>
        </div>

        {billingKeys.length === 0 ? (
          <p className="text-gray-500 text-sm">등록된 결제 수단이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {billingKeys.map((key) => (
              <div key={key.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                <CreditCard size={20} className="text-gray-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{key.cardCompany}</p>
                  <p className="text-sm text-gray-600">{key.cardNumber}</p>
                </div>
                {key.isDefault && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    기본 결제 수단
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <div className="border-t pt-8">
          <h3 className="font-bold text-lg text-gray-900 mb-4">결제 내역</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {paymentHistory.map((payment) => (
              <div
                key={payment.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  payment.status === 'SUCCESS'
                    ? 'bg-green-50 border-green-200'
                    : payment.status === 'FAILED'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {payment.billingCycle === 'MONTHLY' ? '월간' : '연간'} 구독료
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(payment.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {(payment.amount / 1000).toFixed(0)}K
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      payment.status === 'SUCCESS'
                        ? 'text-green-600'
                        : payment.status === 'FAILED'
                          ? 'text-red-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {payment.status === 'SUCCESS' ? '결제 완료' : payment.status === 'FAILED' ? '결제 실패' : '대기 중'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing Key Modal - TODO: Implement Toss Payments */}
      {showBillingKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-lg text-gray-900">카드 등록</h4>
              <button
                onClick={() => setShowBillingKeyModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700">
                <strong>주의:</strong> 토스페이먼츠 카드 등록 UI는 별도 구현이 필요합니다.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                현재는 시뮬레이션 모드입니다. 실제 운영 시 토스페이먼츠 SDK를 통해 구현해주세요.
              </p>
            </div>

            <button
              onClick={() => {
                // TODO: Implement Toss Payments billing key issuance
                alert('토스페이먼츠 카드 등록 모달을 구현해야 합니다.');
                setShowBillingKeyModal(false);
              }}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
            >
              토스페이먼츠에서 카드 등록하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;

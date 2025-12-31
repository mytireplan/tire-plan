// Upgrade prompt component for restricted menu items
// src/components/UpgradePrompt.tsx

import React from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface UpgradePromptProps {
  menuName: string;
  currentPlan: string;
  message: string;
  onUpgradeClick?: () => void;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  menuName,
  currentPlan,
  message,
  onUpgradeClick,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="flex justify-center mb-4">
          <div className="bg-amber-100 rounded-full p-4">
            <Lock size={32} className="text-amber-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {menuName}
        </h2>

        <p className="text-gray-600 text-center mb-4">
          현재 플랜: <span className="font-semibold text-gray-900">{currentPlan}</span>
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-900 text-sm text-center">
            {message}
          </p>
        </div>

        <button
          onClick={onUpgradeClick}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mb-3"
        >
          <span>플랜 업그레이드</span>
          <ArrowRight size={18} />
        </button>

        <p className="text-xs text-gray-500 text-center">
          더 많은 기능을 이용하고 싶으신가요?
        </p>
      </div>
    </div>
  );
};

export default UpgradePrompt;

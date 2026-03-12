import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

export interface SpendingLimits {
  maxTransactionAmount: number;
  dailySpendingLimit: number;
  monthlySpendingLimit: number;
  maxItemValue?: number;
  maxItemsPerDay?: number;
  requiresTwoFactor: boolean;
}

interface SpendingLimitsEditorProps {
  initialLimits: Partial<SpendingLimits>;
  onLimitsChange: (limits: SpendingLimits) => void;
  mandateType?: string;
  editable?: boolean;
  compact?: boolean;
}

const PRESET_AMOUNTS = [100, 250, 500, 1000];

export function SpendingLimitsEditor({
  initialLimits,
  onLimitsChange,
  mandateType = 'payment',
  editable = true,
  compact = false,
}: SpendingLimitsEditorProps) {
  const [limits, setLimits] = useState<SpendingLimits>({
    maxTransactionAmount: initialLimits.maxTransactionAmount || 500,
    dailySpendingLimit: initialLimits.dailySpendingLimit || 1000,
    monthlySpendingLimit: initialLimits.monthlySpendingLimit || 5000,
    maxItemValue: initialLimits.maxItemValue || 200,
    maxItemsPerDay: initialLimits.maxItemsPerDay || 10,
    requiresTwoFactor: initialLimits.requiresTwoFactor ?? true,
  });

  const [isEditing, setIsEditing] = useState(editable);

  useEffect(() => {
    onLimitsChange(limits);
  }, [limits]);

  const handleChange = (key: keyof SpendingLimits, value: string | boolean) => {
    if (typeof value === 'boolean') {
      setLimits((prev) => ({ ...prev, [key]: value }));
    } else {
      const num = parseFloat(value) || 0;
      setLimits((prev) => ({ ...prev, [key]: num }));
    }
  };

  const fmt = (v: number) => `$${v.toLocaleString()}`;

  const renderAmountField = (
    label: string,
    key: keyof SpendingLimits,
    value: number,
    description: string
  ) => {
    if (!isEditing) {
      return (
        <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
          <span className="text-sm text-gray-500">{label}</span>
          <span className="text-base font-semibold text-gray-900">{fmt(value)}</span>
        </div>
      );
    }

    return (
      <div className={compact ? 'mb-3' : 'mb-5'}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
        <p className="text-xs text-gray-400 mb-2">{description}</p>
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3">
          <span className="text-lg font-semibold text-gray-400 mr-1">$</span>
          <input
            type="number"
            className="flex-1 bg-transparent text-2xl font-bold text-gray-900 py-3 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder="0"
            min={0}
          />
        </div>
        <div className="flex gap-2 mt-2">
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleChange(key, amt.toString())}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                value === amt
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-900">AI Agent Spending Limits</h3>
        {editable && (
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {isEditing && (
        <p className="text-sm text-gray-500 mb-4">
          Set the maximum amounts the AI agent can spend on your behalf
        </p>
      )}

      {/* Limit Fields */}
      <div>
        {renderAmountField(
          'Max Per Transaction',
          'maxTransactionAmount',
          limits.maxTransactionAmount,
          'Maximum amount for a single purchase'
        )}
        {renderAmountField(
          'Daily Spending Limit',
          'dailySpendingLimit',
          limits.dailySpendingLimit,
          'Maximum total spending per day'
        )}
        {renderAmountField(
          'Monthly Spending Limit',
          'monthlySpendingLimit',
          limits.monthlySpendingLimit,
          'Maximum total spending per month'
        )}

        {(mandateType === 'cart' || mandateType === 'intent') && isEditing && (
          <>
            {renderAmountField(
              'Max Item Value',
              'maxItemValue',
              limits.maxItemValue || 200,
              'Maximum price per individual item'
            )}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Max Items Per Day</label>
              <p className="text-xs text-gray-400 mb-2">Maximum number of items that can be added per day</p>
              <input
                type="number"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-lg font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-primary-500"
                value={limits.maxItemsPerDay || ''}
                onChange={(e) => handleChange('maxItemsPerDay', e.target.value)}
                placeholder="10"
                min={0}
              />
            </div>
          </>
        )}

        {/* Two-Factor Toggle */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 mt-3">
          <div className="flex-1 mr-4">
            <p className="text-sm font-semibold text-gray-700">Require Two-Factor</p>
            <p className="text-xs text-gray-400">Require biometric verification for each transaction</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={limits.requiresTwoFactor}
              onChange={(e) => handleChange('requiresTwoFactor', e.target.checked)}
              disabled={!isEditing}
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
          </label>
        </div>
      </div>

      {/* Authorization Summary */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-5">
        <h4 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Authorization Summary
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Per transaction:</span>
            <span className="font-semibold text-gray-900">Up to {fmt(limits.maxTransactionAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Daily maximum:</span>
            <span className="font-semibold text-gray-900">Up to {fmt(limits.dailySpendingLimit)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Monthly maximum:</span>
            <span className="font-semibold text-gray-900">Up to {fmt(limits.monthlySpendingLimit)}</span>
          </div>
        </div>
        {limits.requiresTwoFactor && (
          <div className="mt-3 bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-2 rounded-md text-center">
            Biometric required for each transaction
          </div>
        )}
      </div>
    </div>
  );
}

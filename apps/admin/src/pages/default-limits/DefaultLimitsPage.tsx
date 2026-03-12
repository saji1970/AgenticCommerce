import { useState } from 'react';
import {
  Card,
  CardContent,
  Button,
  Alert,
} from '../../components/common';
import { SpendingLimitsEditor, SpendingLimits } from '../../components/mandates/SpendingLimitsEditor';
import { Lightbulb, ShieldCheck, RotateCcw, Save } from 'lucide-react';

const SYSTEM_DEFAULTS: SpendingLimits = {
  maxTransactionAmount: 500,
  dailySpendingLimit: 1000,
  monthlySpendingLimit: 5000,
  requiresTwoFactor: true,
};

const STORAGE_KEY = 'admin_default_spending_limits';

function loadSavedDefaults(): SpendingLimits {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { ...SYSTEM_DEFAULTS };
}

export function DefaultLimitsPage() {
  const [limits, setLimits] = useState<SpendingLimits>(loadSavedDefaults);
  const [savedLimits, setSavedLimits] = useState<SpendingLimits>(loadSavedDefaults);
  const [success, setSuccess] = useState<string | null>(null);

  const hasChanges = JSON.stringify(limits) !== JSON.stringify(savedLimits);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limits));
    setSavedLimits({ ...limits });
    setSuccess('Default spending limits saved successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleReset = () => {
    setLimits({ ...SYSTEM_DEFAULTS });
    localStorage.removeItem(STORAGE_KEY);
    setSavedLimits({ ...SYSTEM_DEFAULTS });
    setSuccess('Limits reset to system defaults');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Default Spending Limits</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure default limits applied when new AI agent mandates are created
        </p>
      </div>

      {success && <Alert variant="success">{success}</Alert>}

      {/* Info Card */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="flex gap-3">
          <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800">How defaults work</h3>
            <p className="text-sm text-amber-700 mt-1">
              These limits are applied as defaults when creating new AI agent mandates.
              Individual mandate limits can be adjusted after creation. The more restrictive
              limit always wins when parent and child mandate limits differ.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Limits Editor */}
      <SpendingLimitsEditor
        initialLimits={limits}
        onLimitsChange={setLimits}
        editable={true}
      />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={!hasChanges} size="lg" className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          Save Default Limits
        </Button>
        <Button variant="secondary" onClick={handleReset} size="lg">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to System Defaults
        </Button>
      </div>

      {/* Security Tips */}
      <Card>
        <CardContent>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            Security Tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#x2022;</span>
              Start with conservative limits and increase as trust is established
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#x2022;</span>
              Keep two-factor authentication enabled for high-value transactions
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#x2022;</span>
              Set monthly limits lower than daily limits multiplied by 30
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#x2022;</span>
              Review agent spending patterns regularly in the Transactions page
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#x2022;</span>
              Revoke mandates for agents that are no longer needed
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

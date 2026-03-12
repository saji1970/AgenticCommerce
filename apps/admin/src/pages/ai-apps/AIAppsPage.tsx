import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mandatesApi } from '../../api/client';
import {
  Card,
  Badge,
  Button,
  Modal,
  LoadingPage,
  EmptyState,
  Alert,
} from '../../components/common';
import { SpendingLimitsEditor, SpendingLimits } from '../../components/mandates/SpendingLimitsEditor';
import { Bot, ChevronRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AIApp {
  agentId: string;
  agentName: string;
  mandates: Array<{
    id: string;
    type: string;
    status: string;
    constraints: Record<string, any>;
    createdAt: string;
  }>;
  totalActive: number;
  aggregateLimits: SpendingLimits;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  pending: 'bg-amber-500',
  revoked: 'bg-red-500',
  suspended: 'bg-gray-400',
  completed: 'bg-blue-500',
  expired: 'bg-gray-300',
};

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  active: 'success',
  pending: 'warning',
  revoked: 'error',
  suspended: 'default',
  completed: 'info',
  expired: 'default',
};

function formatCurrency(value: number) {
  return `$${value.toLocaleString()}`;
}

export function AIAppsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<AIApp | null>(null);
  const [editingLimits, setEditingLimits] = useState<SpendingLimits | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch all mandates
  const { data, isLoading, error } = useQuery({
    queryKey: ['mandates', { limit: 500 }],
    queryFn: () => mandatesApi.getAll({ limit: 500 }),
  });

  const allMandates: any[] = data?.data || [];

  // Group mandates by AI agent
  const aiApps = useMemo(() => {
    const appMap = new Map<string, AIApp>();

    allMandates.forEach((mandate: any) => {
      const existing = appMap.get(mandate.agentId);
      const mandateData = {
        id: mandate.id,
        type: mandate.type,
        status: mandate.status,
        constraints: mandate.constraints || {},
        createdAt: mandate.createdAt,
      };

      if (existing) {
        existing.mandates.push(mandateData);
        if (mandate.status === 'active') existing.totalActive++;
        if (mandate.constraints) {
          existing.aggregateLimits.maxTransactionAmount = Math.max(
            existing.aggregateLimits.maxTransactionAmount,
            mandate.constraints.maxTransactionAmount || 0
          );
          existing.aggregateLimits.dailySpendingLimit = Math.max(
            existing.aggregateLimits.dailySpendingLimit,
            mandate.constraints.dailySpendingLimit || mandate.constraints.dailyLimit || 0
          );
          existing.aggregateLimits.monthlySpendingLimit = Math.max(
            existing.aggregateLimits.monthlySpendingLimit,
            mandate.constraints.monthlySpendingLimit || mandate.constraints.monthlyLimit || 0
          );
        }
      } else {
        appMap.set(mandate.agentId, {
          agentId: mandate.agentId,
          agentName: mandate.agentName || mandate.agentId,
          mandates: [mandateData],
          totalActive: mandate.status === 'active' ? 1 : 0,
          aggregateLimits: {
            maxTransactionAmount: mandate.constraints?.maxTransactionAmount || 500,
            dailySpendingLimit: mandate.constraints?.dailySpendingLimit || mandate.constraints?.dailyLimit || 1000,
            monthlySpendingLimit: mandate.constraints?.monthlySpendingLimit || mandate.constraints?.monthlyLimit || 5000,
            requiresTwoFactor: mandate.constraints?.requiresTwoFactor ?? true,
          },
        });
      }
    });

    return Array.from(appMap.values()).sort((a, b) => b.totalActive - a.totalActive);
  }, [allMandates]);

  const activeApps = aiApps.filter((a) => a.totalActive > 0);
  const inactiveApps = aiApps.filter((a) => a.totalActive === 0);

  // Save limits mutation
  const saveMutation = useMutation({
    mutationFn: async ({ app, limits }: { app: AIApp; limits: SpendingLimits }) => {
      const constraints = {
        maxTransactionAmount: limits.maxTransactionAmount,
        dailySpendingLimit: limits.dailySpendingLimit,
        monthlySpendingLimit: limits.monthlySpendingLimit,
        requiresTwoFactor: limits.requiresTwoFactor,
      };
      const mandatesToUpdate = app.mandates.filter(
        (m) => m.status === 'active' || m.status === 'pending'
      );
      let updated = 0;
      for (const mandate of mandatesToUpdate) {
        try {
          await mandatesApi.updateConstraints(mandate.id, constraints);
          updated++;
        } catch {
          // Skip individual failures
        }
      }
      return updated;
    },
    onSuccess: (updated, { app }) => {
      queryClient.invalidateQueries({ queryKey: ['mandates'] });
      setSaveSuccess(`Updated ${updated} mandate${updated !== 1 ? 's' : ''} for ${app.agentName}`);
      setTimeout(() => {
        setSaveSuccess(null);
        setIsModalOpen(false);
      }, 2000);
    },
    onError: () => {
      setSaveError('Failed to update spending limits. Please try again.');
    },
  });

  const handleAppClick = (app: AIApp) => {
    setSelectedApp(app);
    setEditingLimits({ ...app.aggregateLimits });
    setSaveError(null);
    setSaveSuccess(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!selectedApp || !editingLimits) return;
    saveMutation.mutate({ app: selectedApp, limits: editingLimits });
  };

  if (isLoading) return <LoadingPage message="Loading AI Apps..." />;
  if (error) return <Alert variant="error">Failed to load mandates. Please try again.</Alert>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Apps</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage transaction limits and authorizations for AI applications
        </p>
      </div>

      {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-primary-600">{activeApps.length}</p>
          <p className="text-sm text-gray-500 mt-1">Active Apps</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-primary-600">
            {allMandates.filter((m: any) => m.status === 'active').length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Active Mandates</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-amber-600">
            {allMandates.filter((m: any) => m.status === 'pending').length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Pending Approvals</p>
        </Card>
      </div>

      {/* Active Apps */}
      {activeApps.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Active AI Apps</h2>
          <p className="text-sm text-gray-500 mb-4">Apps with active authorization to transact</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeApps.map((app) => (
              <AppCard key={app.agentId} app={app} onClick={() => handleAppClick(app)} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Apps */}
      {inactiveApps.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Inactive Apps</h2>
          <p className="text-sm text-gray-500 mb-4">Previously authorized apps with no active mandates</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {inactiveApps.map((app) => (
              <AppCard key={app.agentId} app={app} onClick={() => handleAppClick(app)} />
            ))}
          </div>
        </div>
      )}

      {aiApps.length === 0 && (
        <EmptyState
          icon={<Bot className="h-12 w-12 text-gray-300" />}
          title="No AI Apps"
          description="When AI agents are authorized to make purchases, they will appear here."
        />
      )}

      {/* Edit Limits Modal */}
      {selectedApp && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedApp.agentName}
          size="xl"
        >
          <div className="space-y-5">
            {saveError && <Alert variant="error">{saveError}</Alert>}
            {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}

            {/* App Summary */}
            <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
              <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
                {selectedApp.agentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedApp.agentName}</h3>
                <p className="text-xs text-gray-500 font-mono">{selectedApp.agentId}</p>
              </div>
            </div>

            {/* Authorization Summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Authorization Summary</h4>
              <div className="divide-y divide-gray-100">
                {selectedApp.mandates.map((mandate, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[mandate.status] || 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700 capitalize">{mandate.type} Mandate</span>
                    </div>
                    <Badge variant={STATUS_BADGE[mandate.status] || 'default'} size="sm">
                      {mandate.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending Limits Editor */}
            {editingLimits && (
              <SpendingLimitsEditor
                initialLimits={editingLimits}
                onLimitsChange={setEditingLimits}
                editable={true}
              />
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleSave}
                isLoading={saveMutation.isPending}
              >
                Save Limits
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setIsModalOpen(false);
                  navigate(`/mandates?agentId=${selectedApp.agentId}`);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Mandates
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- App Card Sub-component ---------- */

function AppCard({ app, onClick }: { app: AIApp; onClick: () => void }) {
  const mandateTypes = [...new Set(app.mandates.map((m) => m.type))];

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
    >
      <button type="button" className="w-full text-left p-5" onClick={onClick}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600 shrink-0">
            {app.agentName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">{app.agentName}</h3>
            <div className="flex items-center gap-1 mt-1">
              {app.mandates.slice(0, 20).map((m, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full ${STATUS_COLORS[m.status] || 'bg-gray-300'}`}
                />
              ))}
              {app.mandates.length > 20 && (
                <span className="text-xs text-gray-400 ml-1">+{app.mandates.length - 20}</span>
              )}
              <span className="text-xs text-gray-500 ml-2">
                {app.totalActive} active mandate{app.totalActive !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
        </div>

        {/* Limits Preview */}
        <div className="flex bg-gray-50 rounded-lg divide-x divide-gray-200">
          <div className="flex-1 py-3 text-center">
            <p className="text-[10px] uppercase text-gray-500 font-medium">Per Transaction</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {formatCurrency(app.aggregateLimits.maxTransactionAmount)}
            </p>
          </div>
          <div className="flex-1 py-3 text-center">
            <p className="text-[10px] uppercase text-gray-500 font-medium">Daily Limit</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {formatCurrency(app.aggregateLimits.dailySpendingLimit)}
            </p>
          </div>
          <div className="flex-1 py-3 text-center">
            <p className="text-[10px] uppercase text-gray-500 font-medium">Monthly Limit</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {formatCurrency(app.aggregateLimits.monthlySpendingLimit)}
            </p>
          </div>
        </div>

        {/* Mandate Type Badges */}
        <div className="flex gap-2 mt-3">
          {mandateTypes.map((type) => (
            <span
              key={type}
              className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded capitalize"
            >
              {type}
            </span>
          ))}
        </div>
      </button>
    </Card>
  );
}

import { useQuery } from '@tanstack/react-query';
import { vrpConsentsApi } from '../../api/client';
import { Modal, Badge, LoadingPage, Button } from '../common';
import type { VrpConsent, VrpTransaction } from '../../types';

interface VrpConsentDetailModalProps {
  consentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuspend?: () => void;
  onRevoke?: () => void;
}

export function VrpConsentDetailModal({
  consentId,
  isOpen,
  onClose,
  onSuspend,
  onRevoke,
}: VrpConsentDetailModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['vrp-consent-detail', consentId],
    queryFn: () => vrpConsentsApi.getById(consentId!),
    enabled: !!consentId && isOpen,
  });

  const payload = data?.data;
  const consent = payload?.consent as VrpConsent | undefined;
  const usage = payload?.usage as { amountUsedToday?: number; amountUsedMonth?: number; transactionsToday?: number } | undefined;
  const transactions = (payload?.transactions || []) as VrpTransaction[];

  const statusVariant = (s: string): 'success' | 'warning' | 'error' | 'default' => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      active: 'success',
      pending: 'warning',
      suspended: 'error',
      revoked: 'error',
      expired: 'default',
    };
    return map[s] || 'default';
  };

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleString() : '-';

  const formatCurrency = (n: number, currency = 'USD') =>
    n.toLocaleString('en-US', { style: 'currency', currency });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="VRP Consent Detail" size="3xl">
      {isLoading || !consent ? (
        <LoadingPage message="Loading consent details..." />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={statusVariant(consent.status)}>{consent.status}</Badge>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{consent.id}</code>
            {consent.status === 'active' && (onSuspend || onRevoke) && (
              <div className="flex gap-2 ml-auto">
                {onSuspend && (
                  <Button variant="secondary" size="sm" onClick={onSuspend}>
                    Suspend
                  </Button>
                )}
                {onRevoke && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={onRevoke}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Overview */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
              Overview
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-gray-500">Agent:</span> {consent.agentName}
              </div>
              <div>
                <span className="text-gray-500">Agent ID:</span>{' '}
                <code className="text-xs">{consent.agentId}</code>
              </div>
              <div>
                <span className="text-gray-500">User ID:</span>{' '}
                <code className="text-xs">{consent.userId}</code>
              </div>
              <div>
                <span className="text-gray-500">Created:</span> {formatDate(consent.createdAt)}
              </div>
              <div>
                <span className="text-gray-500">Updated:</span> {formatDate(consent.updatedAt)}
              </div>
              <div>
                <span className="text-gray-500">Expiry:</span>{' '}
                {consent.expiryDate ? formatDate(consent.expiryDate) : 'None'}
              </div>
            </div>
            {consent.revokedAt && (
              <div className="text-sm mt-2 p-2 bg-red-50 rounded border border-red-200">
                <span className="text-red-700 font-medium">Revoked:</span> {formatDate(consent.revokedAt)}
                {consent.revokedReason && (
                  <span className="text-red-600"> - {consent.revokedReason}</span>
                )}
              </div>
            )}
          </div>

          {/* Limits & Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">
                Limits
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Max per payment:</span>{' '}
                  {formatCurrency(consent.maxAmountPerPayment)}
                </div>
                <div>
                  <span className="text-gray-500">Daily limit:</span>{' '}
                  {consent.dailyLimit != null
                    ? formatCurrency(consent.dailyLimit)
                    : 'None'}
                </div>
                <div>
                  <span className="text-gray-500">Monthly limit:</span>{' '}
                  {consent.monthlyLimit != null
                    ? formatCurrency(consent.monthlyLimit)
                    : 'None'}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">
                Usage
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Today:</span>{' '}
                  {formatCurrency(usage?.amountUsedToday ?? consent.amountUsedToday ?? 0)} (
                  {usage?.transactionsToday ?? consent.transactionsToday ?? 0} txns)
                </div>
                <div>
                  <span className="text-gray-500">This month:</span>{' '}
                  {formatCurrency(usage?.amountUsedMonth ?? consent.amountUsedMonth ?? 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          {consent.paymentMethod && Object.keys(consent.paymentMethod).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">
                Payment Method
              </h3>
              <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                {JSON.stringify(consent.paymentMethod, null, 2)}
              </pre>
            </div>
          )}

          {/* Consent Token (masked) */}
          {consent.consentToken && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">
                Consent Token
              </h3>
              <code className="text-xs break-all">
                {consent.consentToken.slice(0, 20)}...{consent.consentToken.slice(-8)}
              </code>
            </div>
          )}

          {/* Constraints */}
          {consent.constraints && Object.keys(consent.constraints).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">
                Constraints
              </h3>
              <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                {JSON.stringify(consent.constraints, null, 2)}
              </pre>
            </div>
          )}

          {/* Transactions */}
          <div>
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">
              Transactions ({transactions.length})
            </h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500">No transactions yet</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">ID</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <code className="text-xs">{tx.id.slice(0, 8)}...</code>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(tx.amount, tx.currency)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={statusVariant(tx.status)}>{tx.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {formatDate(tx.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

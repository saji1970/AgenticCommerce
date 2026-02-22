import { useQuery } from '@tanstack/react-query';
import { mandatesApi } from '../../api/client';
import { Modal, Badge, LoadingPage } from '../common';
import type { MandateDetail } from '../../types';

interface MandateDetailModalProps {
  mandateId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenMandate?: (id: string) => void;
  onOpenTransaction?: (id: string) => void;
}

export function MandateDetailModal({
  mandateId,
  isOpen,
  onClose,
  onOpenMandate,
  onOpenTransaction,
}: MandateDetailModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['mandate-detail', mandateId],
    queryFn: () => mandatesApi.getDetail(mandateId!),
    enabled: !!mandateId && isOpen,
  });

  const detail = data as MandateDetail | undefined;

  const statusVariant = (s: string): 'success' | 'warning' | 'error' | 'default' => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      active: 'success', pending: 'warning', suspended: 'error', revoked: 'error', expired: 'default',
    };
    return map[s] || 'default';
  };

  const typeVariant = (t: string): 'info' | 'warning' | 'success' | 'default' => {
    const map: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
      app: 'info', cart: 'info', intent: 'warning', payment: 'success',
    };
    return map[t] || 'default';
  };

  const severityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleString() : '-';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mandate Detail" size="3xl">
      {isLoading || !detail ? (
        <LoadingPage message="Loading mandate details..." />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Badge variant={typeVariant(detail.mandate.type)}>{detail.mandate.type.toUpperCase()}</Badge>
            <Badge variant={statusVariant(detail.mandate.status)}>{detail.mandate.status}</Badge>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{detail.mandate.id}</code>
          </div>

          {/* Overview */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Overview</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-gray-500">Agent:</span> {detail.mandate.agentName}</div>
              <div><span className="text-gray-500">User ID:</span> <code className="text-xs">{detail.mandate.userId}</code></div>
              <div><span className="text-gray-500">Valid From:</span> {formatDate(detail.mandate.validFrom)}</div>
              <div><span className="text-gray-500">Valid Until:</span> {formatDate(detail.mandate.validUntil)}</div>
              <div><span className="text-gray-500">Created:</span> {formatDate(detail.mandate.createdAt)}</div>
              <div><span className="text-gray-500">Updated:</span> {formatDate(detail.mandate.updatedAt)}</div>
            </div>
            {detail.mandate.revokedAt && (
              <div className="text-sm mt-2 p-2 bg-red-50 rounded border border-red-200">
                <span className="text-red-700 font-medium">Revoked:</span>{' '}
                {formatDate(detail.mandate.revokedAt)}
                {detail.mandate.revokedReason && (
                  <span className="text-red-600"> - {detail.mandate.revokedReason}</span>
                )}
              </div>
            )}
            {/* Constraints */}
            {Object.keys(detail.mandate.constraints || {}).length > 0 && (
              <div className="mt-2">
                <span className="text-gray-500 text-sm font-medium">Constraints:</span>
                <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  {Object.entries(detail.mandate.constraints).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-gray-500">{key}:</span>{' '}
                      <span className="font-medium">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Payment Methods */}
            {detail.mandate.paymentMethods && detail.mandate.paymentMethods.length > 0 && (
              <div className="mt-2">
                <span className="text-gray-500 text-sm font-medium">Payment Methods:</span>
                <div className="flex gap-2 mt-1">
                  {detail.mandate.paymentMethods.map((pm: any, i: number) => (
                    <Badge key={i} variant="default">{typeof pm === 'string' ? pm : pm.type || JSON.stringify(pm)}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Parent Mandate */}
          {detail.parentMandate && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">Parent Mandate</h3>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={typeVariant(detail.parentMandate.type)}>{detail.parentMandate.type}</Badge>
                <Badge variant={statusVariant(detail.parentMandate.status)}>{detail.parentMandate.status}</Badge>
                <span className="text-gray-500">{detail.parentMandate.agentName}</span>
                {onOpenMandate && (
                  <button
                    onClick={() => onOpenMandate(detail.parentMandate!.id)}
                    className="text-indigo-600 hover:text-indigo-800 underline text-xs"
                  >
                    View
                  </button>
                )}
              </div>
            </div>
          )}

          {/* State Timeline */}
          {detail.timeline.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3">State Timeline</h3>
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200" />
                {detail.timeline.map((entry) => (
                  <div key={entry.id} className="relative">
                    <div className={`absolute -left-4 top-1.5 w-3 h-3 rounded-full ${severityColor(entry.severity)} ring-2 ring-white`} />
                    <div className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.eventType}</span>
                        <span className="text-gray-400 text-xs">{formatDate(entry.createdAt)}</span>
                      </div>
                      <p className="text-gray-600 text-xs mt-0.5">{entry.description}</p>
                      {entry.oldState && entry.newState && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {Object.keys(entry.oldState).map(k => (
                            <span key={k}>{k}: {String((entry.oldState as any)[k])} → {String((entry.newState as any)[k])}{' '}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Child Mandates */}
          {detail.childMandates.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">
                Child Mandates ({detail.childMandates.length})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Created</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.childMandates.map((child) => (
                      <tr key={child.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2"><Badge variant={typeVariant(child.type)}>{child.type}</Badge></td>
                        <td className="px-3 py-2"><Badge variant={statusVariant(child.status)}>{child.status}</Badge></td>
                        <td className="px-3 py-2 text-gray-500">{formatDate(child.createdAt)}</td>
                        <td className="px-3 py-2">
                          {onOpenMandate && (
                            <button
                              onClick={() => onOpenMandate(child.id)}
                              className="text-indigo-600 hover:text-indigo-800 text-xs underline"
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Linked Transactions */}
          {detail.transactions.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">
                Transactions ({detail.transactions.length})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2"><Badge variant={typeVariant(tx.type)}>{tx.type}</Badge></td>
                        <td className="px-3 py-2 font-medium">
                          {tx.amount.toLocaleString('en-US', { style: 'currency', currency: tx.currency })}
                        </td>
                        <td className="px-3 py-2"><Badge variant={statusVariant(tx.status)}>{tx.status}</Badge></td>
                        <td className="px-3 py-2 text-gray-500">{formatDate(tx.createdAt)}</td>
                        <td className="px-3 py-2">
                          {onOpenTransaction && (
                            <button
                              onClick={() => onOpenTransaction(tx.id)}
                              className="text-indigo-600 hover:text-indigo-800 text-xs underline"
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mandatesApi } from '../../api/client';
import { Modal, Badge, LoadingPage } from '../common';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import type { MandateDetail } from '../../types';

const ISO_FIELD_LABELS: Record<string, string> = {
  MTI: 'Message Type Indicator',
  DE2_NetworkToken: 'Network Token (masked)',
  DE4_Amount: 'Transaction Amount',
  DE7_TransmissionDateTime: 'Transmission Date/Time',
  DE11_STAN: 'System Trace Audit Number',
  DE25_POSConditionCode: 'POS Condition Code',
  DE48_CoFIndicator: 'Card-on-File Indicator',
  DE49_Currency: 'Currency Code',
  DE63_OriginalCitRef: 'Original CIT Reference',
  MandateId: 'Mandate ID',
};

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
  const queryClient = useQueryClient();
  const [isEditingConstraints, setIsEditingConstraints] = useState(false);
  const [editedConstraints, setEditedConstraints] = useState<Record<string, string>>({});
  const [constraintError, setConstraintError] = useState<string | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const constraintsMutation = useMutation({
    mutationFn: (constraints: Record<string, unknown>) =>
      mandatesApi.updateConstraints(mandateId!, constraints),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandate-detail', mandateId] });
      queryClient.invalidateQueries({ queryKey: ['mandates'] });
      setIsEditingConstraints(false);
      setConstraintError(null);
    },
    onError: (err: any) => {
      setConstraintError(err.response?.data?.error || 'Failed to update constraints');
    },
  });

  const startEditing = () => {
    if (!detail) return;
    const current: Record<string, string> = {};
    for (const [key, val] of Object.entries(detail.mandate.constraints || {})) {
      current[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
    }
    setEditedConstraints(current);
    setConstraintError(null);
    setIsEditingConstraints(true);
  };

  const saveConstraints = () => {
    const parsed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(editedConstraints)) {
      const num = Number(val);
      parsed[key] = isNaN(num) ? val : num;
    }
    constraintsMutation.mutate(parsed);
  };

  const canEditConstraints = detail &&
    !['completed', 'revoked', 'expired'].includes(detail.mandate.status);

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
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm font-medium">Constraints:</span>
                  {canEditConstraints && !isEditingConstraints && (
                    <button
                      onClick={startEditing}
                      className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Edit Constraints
                    </button>
                  )}
                </div>
                {isEditingConstraints ? (
                  <div className="mt-1 space-y-2">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {Object.entries(editedConstraints).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-gray-500 min-w-0 shrink-0">{key}:</span>
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => setEditedConstraints(prev => ({ ...prev, [key]: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-0.5 text-sm w-full focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                    {constraintError && (
                      <p className="text-red-600 text-xs">{constraintError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={saveConstraints}
                        disabled={constraintsMutation.isPending}
                        className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {constraintsMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setIsEditingConstraints(false); setConstraintError(null); }}
                        disabled={constraintsMutation.isPending}
                        className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    {Object.entries(detail.mandate.constraints).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-gray-500">{key}:</span>{' '}
                        <span className="font-medium">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
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

          {/* Cart Items */}
          {detail.cartItems && detail.cartItems.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">
                Cart Items ({detail.cartItems.length})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Product</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Price</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.cartItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {item.productImage && (
                              <img src={item.productImage} alt={item.productName} className="w-8 h-8 rounded object-cover" />
                            )}
                            <div>
                              <div className="font-medium">{item.productName}</div>
                              {item.variants && Object.keys(item.variants).length > 0 && (
                                <div className="text-xs text-gray-500">
                                  {Object.entries(item.variants).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">${item.price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right font-medium">${(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Purchase Intents */}
          {detail.purchaseIntents && detail.purchaseIntents.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">
                Purchase Intents ({detail.purchaseIntents.length})
              </h3>
              <div className="space-y-3">
                {detail.purchaseIntents.map((intent) => (
                  <div key={intent.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={statusVariant(intent.status)}>{intent.status}</Badge>
                      <span className="font-semibold">${intent.total.toFixed(2)}</span>
                    </div>
                    {intent.items.length > 0 && (
                      <div className="text-sm">
                        {intent.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-gray-600">
                            <span>{item.productName || item.name} x{item.quantity}</span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {intent.reasoning && (
                      <div className="text-xs bg-blue-50 text-blue-700 rounded p-2">
                        <span className="font-medium">AI Reasoning:</span> {intent.reasoning}
                      </div>
                    )}
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Created: {formatDate(intent.createdAt)}</span>
                      {intent.expiresAt && <span>Expires: {formatDate(intent.expiresAt)}</span>}
                      {intent.approvedAt && <span>Approved: {formatDate(intent.approvedAt)}</span>}
                      {intent.executedAt && <span>Executed: {formatDate(intent.executedAt)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Orders */}
          {detail.linkedOrders && detail.linkedOrders.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">
                Linked Orders ({detail.linkedOrders.length})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Order ID</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Items</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Total</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.linkedOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <code className="text-xs">{order.id.slice(0, 8)}...</code>
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {order.items.map((item: any, i: number) => (
                            <div key={i} className="text-xs">
                              {item.productName || item.name} x{item.quantity}
                            </div>
                          ))}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">${order.total.toFixed(2)}</td>
                        <td className="px-3 py-2"><Badge variant={statusVariant(order.status)}>{order.status}</Badge></td>
                        <td className="px-3 py-2 text-gray-500">{formatDate(order.createdAt)}</td>
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
                    {detail.transactions.map((tx) => {
                      const txAny = tx as any;
                      const isExpanded = expandedTxId === tx.id;
                      const isoMessage = txAny.gatewayResponse?.isoMessage || txAny.metadata?.isoMessage || null;
                      return (
                        <>
                        <tr
                          key={tx.id}
                          onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                          className={`cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50' : tx.type === 'CIT' ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                        >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {isExpanded ? <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" /> : <ChevronRight className="h-3 w-3 text-gray-400 shrink-0" />}
                            {tx.type === 'CIT' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">CIT</span>
                            ) : tx.type === 'MIT' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">MIT</span>
                            ) : (
                              <Badge variant={typeVariant(tx.type)}>{tx.type}</Badge>
                            )}
                            {txAny.isExceptional && (
                              <Badge variant="warning">
                                <AlertTriangle className="h-3 w-3 mr-1 inline" />
                                Override
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {tx.amount.toLocaleString('en-US', { style: 'currency', currency: tx.currency })}
                        </td>
                        <td className="px-3 py-2"><Badge variant={statusVariant(tx.status)}>{tx.status}</Badge></td>
                        <td className="px-3 py-2 text-gray-500">{formatDate(tx.createdAt)}</td>
                        <td className="px-3 py-2">
                          {onOpenTransaction && !tx.id.startsWith('cit-') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onOpenTransaction(tx.id); }}
                              className="text-indigo-600 hover:text-indigo-800 text-xs underline"
                            >
                              Full View
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <tr key={`${tx.id}-detail`}>
                          <td colSpan={5} className="px-0 py-0">
                            <div className="bg-gray-50 border-t border-b border-gray-200 px-6 py-4 space-y-4">
                              {/* Transaction Info */}
                              <div>
                                <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wide mb-2">Transaction Info</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                                  <div><span className="text-gray-500">ID:</span> <code className="text-xs bg-white px-1 py-0.5 rounded">{tx.id}</code></div>
                                  <div><span className="text-gray-500">Type:</span> <span className="font-medium">{tx.type}</span></div>
                                  <div><span className="text-gray-500">Status:</span> <Badge variant={statusVariant(tx.status)}>{tx.status}</Badge></div>
                                  <div><span className="text-gray-500">Amount:</span> <span className="font-medium">{tx.amount.toLocaleString('en-US', { style: 'currency', currency: tx.currency })}</span></div>
                                  <div><span className="text-gray-500">Currency:</span> {tx.currency}</div>
                                  <div><span className="text-gray-500">Created:</span> {formatDate(tx.createdAt)}</div>
                                  {txAny.processedAt && (
                                    <div><span className="text-gray-500">Processed:</span> {formatDate(txAny.processedAt)}</div>
                                  )}
                                  {txAny.transactionId && (
                                    <div className="col-span-2"><span className="text-gray-500">Gateway TX ID:</span> <code className="text-xs bg-white px-1 py-0.5 rounded">{txAny.transactionId}</code></div>
                                  )}
                                  {txAny.description && (
                                    <div className="col-span-2"><span className="text-gray-500">Description:</span> {txAny.description}</div>
                                  )}
                                  {txAny.merchantId && (
                                    <div><span className="text-gray-500">Merchant:</span> <code className="text-xs">{txAny.merchantId}</code></div>
                                  )}
                                </div>
                              </div>

                              {/* Network Token (for CIT) */}
                              {txAny.metadata?.networkToken && (
                                <div>
                                  <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wide mb-2">Network Token</h4>
                                  <code className="text-xs bg-white px-2 py-1 rounded border break-all">{txAny.metadata.networkToken}</code>
                                </div>
                              )}

                              {/* Error Message */}
                              {txAny.errorMessage && (
                                <div className="p-2 bg-red-50 rounded border border-red-200">
                                  <span className="text-red-700 font-medium text-sm">Error:</span>{' '}
                                  <span className="text-red-600 text-sm">{txAny.errorMessage}</span>
                                </div>
                              )}

                              {/* ISO 8583 Message */}
                              {isoMessage && typeof isoMessage === 'object' && Object.keys(isoMessage).length > 0 && (
                                <div className="bg-gray-900 rounded-lg p-3">
                                  <h4 className="font-semibold text-xs text-green-400 uppercase tracking-wide mb-2">ISO 8583 Message</h4>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-gray-700">
                                        <th className="text-left px-2 py-1 text-gray-400 font-medium">Field</th>
                                        <th className="text-left px-2 py-1 text-gray-400 font-medium">Description</th>
                                        <th className="text-left px-2 py-1 text-gray-400 font-medium">Value</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                      {Object.entries(isoMessage as Record<string, string>).map(([field, value]) => (
                                        <tr key={field}>
                                          <td className="px-2 py-1 font-mono text-green-300">{field}</td>
                                          <td className="px-2 py-1 text-gray-400">{ISO_FIELD_LABELS[field] || field}</td>
                                          <td className="px-2 py-1 font-mono text-gray-100">{String(value)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Metadata */}
                              {txAny.metadata && Object.keys(txAny.metadata).filter((k: string) => k !== 'networkToken' && k !== 'isoMessage').length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wide mb-2">Metadata</h4>
                                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                                    {Object.entries(txAny.metadata)
                                      .filter(([key]) => key !== 'networkToken' && key !== 'isoMessage')
                                      .map(([key, val]) => (
                                        <div key={key}>
                                          <span className="text-gray-500">{key}:</span>{' '}
                                          <span className="font-medium">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* Gateway Response */}
                              {txAny.gatewayResponse && Object.keys(txAny.gatewayResponse).filter((k: string) => k !== 'isoMessage').length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wide mb-2">Gateway Response</h4>
                                  <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                                    {JSON.stringify(
                                      Object.fromEntries(Object.entries(txAny.gatewayResponse).filter(([k]) => k !== 'isoMessage')),
                                      null, 2
                                    )}
                                  </pre>
                                </div>
                              )}

                              {/* Exceptional Override Details */}
                              {txAny.isExceptional && txAny.metadata?.limitContext && (
                                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                                  <h4 className="font-semibold text-xs text-amber-700 uppercase tracking-wide mb-2">
                                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                                    Merchant Limit Override
                                  </h4>
                                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                                    {JSON.stringify(txAny.metadata.limitContext, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </>
                      );
                    })}
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

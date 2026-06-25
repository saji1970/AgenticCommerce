import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vrpConsentsApi } from '../../api/client';
import { Modal, Badge, LoadingPage, Button } from '../common';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import type { VrpConsent, VrpTransaction } from '../../types';

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
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

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

          {/* Mandate Traceability */}
          {(consent.appMandateId || consent.merchantId) && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-2 border border-blue-200">
              <h3 className="font-semibold text-sm text-blue-700 uppercase tracking-wide">
                Mandate Traceability
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {consent.appMandateId && (
                  <div>
                    <span className="text-blue-600">APP Mandate:</span>{' '}
                    <code className="text-xs bg-white px-1 py-0.5 rounded">{consent.appMandateId}</code>
                  </div>
                )}
                {consent.merchantId && (
                  <div>
                    <span className="text-blue-600">Merchant ID:</span>{' '}
                    <code className="text-xs bg-white px-1 py-0.5 rounded">{consent.merchantId}</code>
                  </div>
                )}
              </div>
            </div>
          )}

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
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">ID</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Mandate</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Cart / Intent</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Product</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((tx) => {
                      const txAny = tx as any;
                      const isExpanded = expandedTxId === tx.id;
                      const isoMessage = txAny.gatewayResponse?.isoMessage || txAny.metadata?.isoMessage || null;
                      const colCount = 8;
                      return (
                        <>
                        <tr
                          key={tx.id}
                          onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                          className={`cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50' : txAny.isExceptional || txAny.metadata?.isExceptional ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}
                        >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {isExpanded ? <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" /> : <ChevronRight className="h-3 w-3 text-gray-400 shrink-0" />}
                            <code className="text-xs">{tx.id.slice(0, 8)}...</code>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(tx.amount, tx.currency)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={statusVariant(tx.status)}>{tx.status}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          {tx.mandateId ? (
                            <code className="text-xs text-blue-600">{tx.mandateId.slice(0, 8)}...</code>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {tx.cartId && <div>Cart: {tx.cartId.slice(0, 8)}...</div>}
                          {tx.intentId && <div>Intent: {tx.intentId.slice(0, 8)}...</div>}
                          {!tx.cartId && !tx.intentId && <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {tx.productInfo && Object.keys(tx.productInfo).length > 0 ? (
                            <div title={JSON.stringify(tx.productInfo, null, 2)}>
                              {Array.isArray((tx.productInfo as any).items) && (tx.productInfo as any).items.length > 0 ? (
                                <div>
                                  {(tx.productInfo as any).items.slice(0, 2).map((item: any, i: number) => (
                                    <div key={i} className="truncate max-w-[160px]">
                                      {item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}
                                    </div>
                                  ))}
                                  {(tx.productInfo as any).items.length > 2 && (
                                    <div className="text-gray-400">+{(tx.productInfo as any).items.length - 2} more</div>
                                  )}
                                </div>
                              ) : (tx.productInfo as any).orderId ? (
                                <div>
                                  <span className="text-gray-500">Order:</span>{' '}
                                  <code className="text-blue-600">{String((tx.productInfo as any).orderId).slice(0, 8)}...</code>
                                  {(tx.productInfo as any).itemCount != null && (
                                    <div className="text-gray-500">{(tx.productInfo as any).itemCount} item(s)</div>
                                  )}
                                </div>
                              ) : (tx.productInfo as any).name ? (
                                <div className="font-medium">{(tx.productInfo as any).name}</div>
                              ) : (
                                <span className="text-gray-500 cursor-help" title="Hover for details">Info</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {txAny.type === 'CIT' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">CIT</span>
                            ) : txAny.type === 'MIT' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">MIT</span>
                            ) : null}
                            {txAny.isExceptional || txAny.metadata?.isExceptional ? (
                              <Badge variant="warning">
                                <AlertTriangle className="h-3 w-3 mr-1 inline" />
                                Override
                              </Badge>
                            ) : txAny.type !== 'CIT' && txAny.type !== 'MIT' ? (
                              <span className="text-xs text-gray-400">Normal</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {formatDate(tx.createdAt)}
                        </td>
                      </tr>
                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <tr key={`${tx.id}-detail`}>
                          <td colSpan={colCount} className="px-0 py-0">
                            <div className="bg-gray-50 border-t border-b border-gray-200 px-6 py-4 space-y-4">
                              {/* Transaction Info */}
                              <div>
                                <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wide mb-2">Transaction Info</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                                  <div><span className="text-gray-500">ID:</span> <code className="text-xs bg-white px-1 py-0.5 rounded">{tx.id}</code></div>
                                  <div><span className="text-gray-500">Type:</span> <span className="font-medium">{txAny.type || '-'}</span></div>
                                  <div><span className="text-gray-500">Status:</span> <Badge variant={statusVariant(tx.status)}>{tx.status}</Badge></div>
                                  <div><span className="text-gray-500">Amount:</span> <span className="font-medium">{formatCurrency(tx.amount, tx.currency)}</span></div>
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

                              {/* Metadata (excluding networkToken and isoMessage already shown) */}
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
                              {(txAny.isExceptional || txAny.metadata?.isExceptional) && txAny.metadata?.limitContext && (
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
        </div>
      )}
    </Modal>
  );
}

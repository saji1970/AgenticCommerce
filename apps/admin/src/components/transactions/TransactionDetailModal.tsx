import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../../api/client';
import { Modal, Badge, LoadingPage } from '../common';
import type { TransactionDetail } from '../../types';

interface TransactionDetailModalProps {
  transactionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenMandate?: (id: string) => void;
}

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

export function TransactionDetailModal({
  transactionId,
  isOpen,
  onClose,
  onOpenMandate,
}: TransactionDetailModalProps) {
  const [showRawGateway, setShowRawGateway] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['transaction-detail', transactionId],
    queryFn: () => transactionsApi.getDetail(transactionId!),
    enabled: !!transactionId && isOpen,
  });

  const detail = data as TransactionDetail | undefined;

  const statusVariant = (s: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      completed: 'success', processing: 'info', pending: 'warning', failed: 'error', refunded: 'default',
      active: 'success', suspended: 'error', revoked: 'error', expired: 'default',
    };
    return map[s] || 'default';
  };

  const typeVariant = (t: string): 'info' | 'warning' | 'success' | 'default' => {
    const map: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
      payment: 'success', refund: 'warning', authorization: 'info',
      app: 'info', cart: 'info', intent: 'warning',
    };
    return map[t] || 'default';
  };

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleString() : '-';

  const formatAmount = (amount: number, currency: string) =>
    amount.toLocaleString('en-US', { style: 'currency', currency });

  // Extract ISO message fields from gatewayResponse or metadata
  const isoMessage = detail?.transaction?.gatewayResponse?.isoMessage
    || detail?.transaction?.metadata?.isoMessage
    || null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Detail" size="2xl">
      {isLoading || !detail ? (
        <LoadingPage message="Loading transaction details..." />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Badge variant={typeVariant(detail.transaction.type)}>{detail.transaction.type.toUpperCase()}</Badge>
            <Badge variant={statusVariant(detail.transaction.status)}>{detail.transaction.status}</Badge>
            <span className="text-xl font-bold">
              {formatAmount(detail.transaction.amount, detail.transaction.currency)}
            </span>
          </div>

          {/* Transaction Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Transaction Info</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-gray-500">ID:</span> <code className="text-xs">{detail.transaction.id}</code></div>
              <div><span className="text-gray-500">Currency:</span> {detail.transaction.currency}</div>
              <div><span className="text-gray-500">Created:</span> {formatDate(detail.transaction.createdAt)}</div>
              <div><span className="text-gray-500">Processed:</span> {formatDate(detail.transaction.processedAt)}</div>
              {detail.transaction.gatewayTransactionId && (
                <div className="col-span-2">
                  <span className="text-gray-500">Gateway ID:</span>{' '}
                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{detail.transaction.gatewayTransactionId}</code>
                </div>
              )}
              {detail.transaction.errorMessage && (
                <div className="col-span-2 p-2 bg-red-50 rounded border border-red-200">
                  <span className="text-red-700 font-medium">Error:</span>{' '}
                  <span className="text-red-600">{detail.transaction.errorMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* ISO 8583 Message */}
          {isoMessage && typeof isoMessage === 'object' && Object.keys(isoMessage).length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-green-400 uppercase tracking-wide mb-3">ISO 8583 Message</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left px-3 py-1.5 text-gray-400 font-medium">Field</th>
                      <th className="text-left px-3 py-1.5 text-gray-400 font-medium">Description</th>
                      <th className="text-left px-3 py-1.5 text-gray-400 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {Object.entries(isoMessage as Record<string, string>).map(([field, value]) => (
                      <tr key={field}>
                        <td className="px-3 py-1.5 font-mono text-green-300 text-xs">{field}</td>
                        <td className="px-3 py-1.5 text-gray-400 text-xs">{ISO_FIELD_LABELS[field] || field}</td>
                        <td className="px-3 py-1.5 font-mono text-gray-100 text-xs">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Metadata / Product Info */}
          {Object.keys(detail.transaction.metadata || {}).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">Product / Metadata</h3>
              {detail.transaction.metadata.items ? (
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left px-3 py-1.5 font-medium text-gray-600">Product</th>
                        <th className="text-left px-3 py-1.5 font-medium text-gray-600">Qty</th>
                        <th className="text-left px-3 py-1.5 font-medium text-gray-600">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(detail.transaction.metadata.items as any[]).map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5">{item.productName || item.name || '-'}</td>
                          <td className="px-3 py-1.5">{item.quantity || 1}</td>
                          <td className="px-3 py-1.5">{item.price != null ? `$${item.price}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  {Object.entries(detail.transaction.metadata)
                    .filter(([key]) => key !== 'isoMessage')
                    .map(([key, val]) => (
                    <div key={key}>
                      <span className="text-gray-500">{key}:</span>{' '}
                      <span className="font-medium">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Linked Mandate (Checkout/Payment mandate) */}
          {detail.linkedMandate && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">Linked Mandate</h3>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={typeVariant(detail.linkedMandate.type)}>{detail.linkedMandate.type}</Badge>
                <Badge variant={statusVariant(detail.linkedMandate.status)}>{detail.linkedMandate.status}</Badge>
                <span className="text-gray-600">{detail.linkedMandate.agentName}</span>
                {onOpenMandate && (
                  <button
                    onClick={() => onOpenMandate(detail.linkedMandate!.id)}
                    className="text-indigo-600 hover:text-indigo-800 underline text-xs"
                  >
                    View Mandate
                  </button>
                )}
              </div>
              {Object.keys(detail.linkedMandate.constraints || {}).length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Constraints: {Object.entries(detail.linkedMandate.constraints).map(([k, v]) =>
                    `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`
                  ).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Parent / VRP APP Mandate */}
          {detail.parentMandate && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-indigo-700 uppercase tracking-wide mb-2">VRP / APP Mandate</h3>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={typeVariant(detail.parentMandate.type)}>{detail.parentMandate.type.toUpperCase()}</Badge>
                <Badge variant={statusVariant(detail.parentMandate.status)}>{detail.parentMandate.status}</Badge>
                <span className="text-gray-600">{detail.parentMandate.agentName}</span>
                {onOpenMandate && (
                  <button
                    onClick={() => onOpenMandate(detail.parentMandate!.id)}
                    className="text-indigo-600 hover:text-indigo-800 underline text-xs"
                  >
                    View APP Mandate
                  </button>
                )}
              </div>
              {Object.keys(detail.parentMandate.constraints || {}).length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Constraints: {Object.entries(detail.parentMandate.constraints).map(([k, v]) =>
                    `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`
                  ).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Related Mandates (Cart/Intent siblings) */}
          {detail.relatedMandates && detail.relatedMandates.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">
                Related Mandates ({detail.relatedMandates.length})
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
                    {detail.relatedMandates.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2"><Badge variant={typeVariant(m.type)}>{m.type}</Badge></td>
                        <td className="px-3 py-2"><Badge variant={statusVariant(m.status)}>{m.status}</Badge></td>
                        <td className="px-3 py-2 text-gray-500">{formatDate(m.createdAt)}</td>
                        <td className="px-3 py-2">
                          {onOpenMandate && (
                            <button
                              onClick={() => onOpenMandate(m.id)}
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

          {/* Gateway Response */}
          {Object.keys(detail.transaction.gatewayResponse || {}).length > 0 && (
            <div>
              <button
                onClick={() => setShowRawGateway(!showRawGateway)}
                className="text-sm text-indigo-600 hover:text-indigo-800 underline"
              >
                {showRawGateway ? 'Hide' : 'Show'} Gateway Response
              </button>
              {showRawGateway && (
                <pre className="mt-2 bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(detail.transaction.gatewayResponse, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

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
    };
    return map[s] || 'default';
  };

  const typeVariant = (t: string): 'info' | 'warning' | 'success' | 'default' => {
    const map: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
      payment: 'success', refund: 'warning', authorization: 'info',
    };
    return map[t] || 'default';
  };

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleString() : '-';

  const formatAmount = (amount: number, currency: string) =>
    amount.toLocaleString('en-US', { style: 'currency', currency });

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
                  {Object.entries(detail.transaction.metadata).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-gray-500">{key}:</span>{' '}
                      <span className="font-medium">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Linked Mandate */}
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

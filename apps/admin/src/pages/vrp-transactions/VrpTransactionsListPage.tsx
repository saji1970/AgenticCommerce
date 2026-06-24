import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vrpTransactionsApi } from '../../api/client';
import {
  Badge,
  Button,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
  Modal,
  LoadingPage,
  EmptyState,
  Alert,
} from '../../components/common';
import { AlertTriangle, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';

interface OverrideDetail {
  limitType: string;
  merchantLimit: number;
  appMandateLimit: number;
  actualAmount: number;
  exceededBy: number;
}

export function VrpTransactionsListPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [exceptionalOnly, setExceptionalOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['vrp-transactions', { status: statusFilter, isExceptional: exceptionalOnly || undefined, limit, offset: page * limit }],
    queryFn: () =>
      vrpTransactionsApi.getAll({
        status: statusFilter || undefined,
        isExceptional: exceptionalOnly || undefined,
        limit,
        offset: page * limit,
      }),
  });

  const transactions = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      completed: 'success',
      pending: 'warning',
      processing: 'info',
      failed: 'error',
      refunded: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const formatLimitType = (limitType: string) => {
    const labels: Record<string, string> = {
      merchant_max_transaction: 'Per-Transaction',
      merchant_daily_limit: 'Daily Limit',
      merchant_monthly_limit: 'Monthly Limit',
    };
    return labels[limitType] || limitType;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">VRP Transactions</h1>
        <p className="text-gray-500">All checkout/VRP payment transactions with exceptional override tracking</p>
      </div>

      <Card>
        <div className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="w-full sm:w-44">
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <Select
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'refunded', label: 'Refunded' },
                ]}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exceptionalOnly}
                  onChange={(e) => { setExceptionalOnly(e.target.checked); setPage(0); }}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Exceptional Only
                </span>
              </label>
            </div>
            {(statusFilter || exceptionalOnly) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setStatusFilter(''); setExceptionalOnly(false); setPage(0); }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="error" title="Error loading transactions">
          Failed to load VRP transactions.
        </Alert>
      )}

      {isLoading ? (
        <LoadingPage message="Loading VRP transactions..." />
      ) : (
        <Card>
          {transactions.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-12 w-12" />}
              title="No transactions found"
              description={exceptionalOnly ? 'No exceptional transactions found. This means no merchant limits have been overridden.' : 'No transactions match your filters.'}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Mandate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: any) => (
                    <>
                      <TableRow
                        key={tx.id}
                        className={`cursor-pointer hover:bg-gray-50 ${tx.isExceptional ? 'bg-amber-50' : ''}`}
                        onClick={() => setSelectedTx(tx)}
                      >
                        <TableCell>
                          <span className="font-mono text-xs">{tx.id.slice(0, 8)}...</span>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${parseFloat(tx.amount).toFixed(2)} {tx.currency}
                        </TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        <TableCell className="text-sm">{tx.agentId || '-'}</TableCell>
                        <TableCell>
                          {tx.mandateId ? (
                            <span className="font-mono text-xs">{tx.mandateId.slice(0, 8)}...</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {tx.isExceptional ? (
                            <Badge variant="warning">
                              <AlertTriangle className="h-3 w-3 mr-1 inline" />
                              Override
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">Normal</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{new Date(tx.createdAt).toLocaleString()}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {tx.isExceptional && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                            >
                              {expandedTxId === tx.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedTxId === tx.id && tx.isExceptional && tx.metadata?.overrideDetails && (
                        <TableRow key={`${tx.id}-detail`}>
                          <TableCell colSpan={8}>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                              <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Merchant Limit Override Details
                              </h4>
                              <div className="space-y-2">
                                {tx.metadata.overrideDetails.map((detail: OverrideDetail, idx: number) => (
                                  <div key={idx} className="bg-white rounded p-3 border border-amber-100 text-sm">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-gray-700">{formatLimitType(detail.limitType)}</span>
                                      <Badge variant="warning">Exceeded by ${detail.exceededBy.toFixed(2)}</Badge>
                                    </div>
                                    <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-gray-500">
                                      <div>Merchant Limit: <span className="font-mono text-red-600">${detail.merchantLimit}</span></div>
                                      <div>APP Mandate Limit: <span className="font-mono text-green-600">${detail.appMandateLimit}</span></div>
                                      <div>Actual Amount: <span className="font-mono">${detail.actualAmount.toFixed(2)}</span></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {tx.metadata.limitContext && (
                                <div className="text-xs text-gray-500 mt-2">
                                  <details>
                                    <summary className="cursor-pointer text-gray-600 font-medium">Full Limit Context Snapshot</summary>
                                    <pre className="mt-1 bg-gray-100 p-2 rounded overflow-auto text-xs">
                                      {JSON.stringify(tx.metadata.limitContext, null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Transaction Detail Modal */}
      <Modal
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title="Transaction Details"
      >
        {selectedTx && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">ID</span>
                <p className="font-mono text-xs">{selectedTx.id}</p>
              </div>
              <div>
                <span className="text-gray-500">Amount</span>
                <p className="font-semibold">${parseFloat(selectedTx.amount).toFixed(2)} {selectedTx.currency}</p>
              </div>
              <div>
                <span className="text-gray-500">Status</span>
                <p>{getStatusBadge(selectedTx.status)}</p>
              </div>
              <div>
                <span className="text-gray-500">Type</span>
                <p>{selectedTx.isExceptional ? (
                  <Badge variant="warning">
                    <AlertTriangle className="h-3 w-3 mr-1 inline" />
                    Exceptional Override
                  </Badge>
                ) : 'Normal'}</p>
              </div>
              <div>
                <span className="text-gray-500">Agent</span>
                <p>{selectedTx.agentId || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Mandate</span>
                <p className="font-mono text-xs">{selectedTx.mandateId || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Merchant</span>
                <p className="font-mono text-xs">{selectedTx.merchantId || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Gateway TX</span>
                <p className="font-mono text-xs">{selectedTx.gatewayTransactionId || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Created</span>
                <p>{new Date(selectedTx.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">Processed</span>
                <p>{selectedTx.processedAt ? new Date(selectedTx.processedAt).toLocaleString() : '-'}</p>
              </div>
            </div>

            {selectedTx.isExceptional && selectedTx.metadata?.overrideDetails && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4" />
                  Override Details
                </h4>
                {selectedTx.metadata.overrideDetails.map((detail: OverrideDetail, idx: number) => (
                  <div key={idx} className="bg-white rounded p-3 border border-amber-100 text-sm mb-2">
                    <p className="font-medium">{formatLimitType(detail.limitType)}</p>
                    <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-gray-500">
                      <div>Merchant Limit: <span className="text-red-600 font-mono">${detail.merchantLimit}</span></div>
                      <div>APP Limit: <span className="text-green-600 font-mono">${detail.appMandateLimit}</span></div>
                      <div>Actual: <span className="font-mono">${detail.actualAmount.toFixed(2)}</span></div>
                      <div>Exceeded By: <span className="text-amber-600 font-mono">${detail.exceededBy.toFixed(2)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedTx.metadata && (
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-600 font-medium">Raw Metadata</summary>
                <pre className="mt-1 bg-gray-100 p-2 rounded overflow-auto max-h-60">
                  {JSON.stringify(selectedTx.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

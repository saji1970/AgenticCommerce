import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../../api/client';
import {
  Select,
  Badge,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
  LoadingPage,
  EmptyState,
  Alert,
} from '../common';
import { CreditCard } from 'lucide-react';
import type { Transaction } from '../../types';
import { TransactionDetailModal } from '../transactions/TransactionDetailModal';
import { MandateDetailModal } from '../mandates/MandateDetailModal';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'payment', label: 'Payment' },
  { value: 'refund', label: 'Refund' },
  { value: 'authorization', label: 'Authorization' },
];

const ITEMS_PER_PAGE = 10;

interface AgentTransactionsTabProps {
  agentId: string;
}

export function AgentTransactionsTab({ agentId }: AgentTransactionsTabProps) {
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedMandateId, setSelectedMandateId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', { agentId, status, type, page }],
    queryFn: () =>
      transactionsApi.getAll({
        agentId: agentId,
        status: status || undefined,
        type: type || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
    enabled: !!agentId,
  });

  const transactions: Transaction[] = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const getStatusBadge = (txStatus: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      completed: 'success',
      processing: 'info',
      pending: 'warning',
      failed: 'error',
      refunded: 'default',
    };
    return <Badge variant={variants[txStatus] || 'default'}>{txStatus}</Badge>;
  };

  const getTypeBadge = (txType: string) => {
    const variants: Record<string, 'info' | 'warning' | 'success'> = {
      payment: 'success',
      refund: 'warning',
      authorization: 'info',
    };
    return <Badge variant={variants[txType] || 'default'}>{txType}</Badge>;
  };

  return (
    <div className="space-y-6 pt-6">
      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-48">
            <Select
              options={statusOptions}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={typeOptions}
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="error" title="Error loading transactions">
          Failed to load transactions. Please try again.
        </Alert>
      )}

      {isLoading ? (
        <LoadingPage message="Loading transactions..." />
      ) : (
        <Card>
          {transactions.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-12 w-12" />}
              title="No transactions found"
              description={status || type ? 'Try adjusting your filters' : 'No transactions have been processed yet'}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow
                      key={tx.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedTransactionId(tx.id)}
                    >
                      <TableCell>{getTypeBadge(tx.type)}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {tx.amount.toLocaleString('en-US', {
                            style: 'currency',
                            currency: tx.currency,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell>
                        <div>{new Date(tx.createdAt).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(tx.createdAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {tx.processedAt ? (
                          <>
                            <div>{new Date(tx.processedAt).toLocaleDateString()}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(tx.processedAt).toLocaleTimeString()}
                            </div>
                          </>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={total}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              )}
            </>
          )}
        </Card>
      )}

      <TransactionDetailModal
        transactionId={selectedTransactionId}
        isOpen={!!selectedTransactionId}
        onClose={() => setSelectedTransactionId(null)}
        onOpenMandate={(id) => {
          setSelectedTransactionId(null);
          setSelectedMandateId(id);
        }}
      />
      <MandateDetailModal
        mandateId={selectedMandateId}
        isOpen={!!selectedMandateId}
        onClose={() => setSelectedMandateId(null)}
        onOpenMandate={(id) => setSelectedMandateId(id)}
      />
    </div>
  );
}

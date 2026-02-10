import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../../api/client';
import { Transaction } from '../../types';
import {
  Badge,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
  Pagination,
  LoadingPage,
  EmptyState,
  Alert,
} from '../../components/common';
import { CreditCard } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export function TransactionsListPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', { status: statusFilter, type: typeFilter, page: currentPage }],
    queryFn: () => transactionsApi.getAll({
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
    }),
  });

  const transactions: Transaction[] = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

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

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'info' | 'warning' | 'success'> = {
      payment: 'success',
      refund: 'warning',
      authorization: 'info',
    };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-500">View payment transactions</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-48">
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'processing', label: 'Processing' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' },
                { value: 'refunded', label: 'Refunded' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={[
                { value: '', label: 'All Types' },
                { value: 'payment', label: 'Payment' },
                { value: 'refund', label: 'Refund' },
                { value: 'authorization', label: 'Authorization' },
              ]}
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="error" title="Error loading transactions">
          Failed to load transactions.
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
              description="Transactions will appear here as payments are processed through the mandate service"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <span className="font-mono text-xs">{tx.id.slice(0, 8)}...</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatAmount(tx.amount, tx.currency)}</span>
                      </TableCell>
                      <TableCell>{getTypeBadge(tx.type)}</TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{tx.agentId ? tx.agentId.slice(0, 12) : '-'}</span>
                      </TableCell>
                      <TableCell>
                        {new Date(tx.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={total}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

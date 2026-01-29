import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ap2Api } from '../../api/client';
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
  Button,
} from '../../components/common';
import { CreditCard, Eye } from 'lucide-react';
import type { AP2Transaction } from '../../types';

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

export function TransactionsListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', { status, type, page }],
    queryFn: () =>
      ap2Api.getAll({
        status: status || undefined,
        type: type || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
  });

  if (isLoading) {
    return <LoadingPage message="Loading transactions..." />;
  }

  if (error) {
    return (
      <Alert variant="error" title="Error loading transactions">
        Failed to load transactions. Please try again.
      </Alert>
    );
  }

  const transactions: AP2Transaction[] = data?.transactions || [];

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AP2 Transactions</h1>
        <p className="text-gray-500">View all payment transactions across the platform</p>
      </div>

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

      {/* Transactions Table */}
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
                  <TableHead>User</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="text-sm">{tx.userEmail}</div>
                    </TableCell>
                    <TableCell>{tx.merchantName || '-'}</TableCell>
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
                      <div>{new Date(tx.requestedAt).toLocaleDateString()}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(tx.requestedAt).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tx.completedAt ? (
                        <>
                          <div>{new Date(tx.completedAt).toLocaleDateString()}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(tx.completedAt).toLocaleTimeString()}
                          </div>
                        </>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/transactions/${tx.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {transactions.length >= ITEMS_PER_PAGE && (
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(transactions.length / ITEMS_PER_PAGE) + 1}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}

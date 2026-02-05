import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ap2Api, merchantsApi, agentsApi } from '../../api/client';
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
} from '../../components/common';
import { CreditCard, ChevronRight } from 'lucide-react';
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

export function MerchantAppTransactionsPage() {
  const { id, agentId } = useParams<{ id: string; agentId: string }>();
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const { data: merchantData } = useQuery({
    queryKey: ['merchant', id],
    queryFn: () => merchantsApi.getById(id!),
    enabled: !!id,
  });

  const { data: monitoringData } = useQuery({
    queryKey: ['agent', agentId, 'monitoring'],
    queryFn: () => agentsApi.getMonitoring(agentId!, 7),
    enabled: !!agentId,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['ap2-transactions', { merchantId: id, agentId, status, type, page }],
    queryFn: () =>
      ap2Api.getAll({
        merchantId: id,
        agentId: agentId,
        status: status || undefined,
        type: type || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
    enabled: !!id && !!agentId,
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

  const merchant = merchantData?.merchant;
  const agentName = monitoringData?.agent?.name || agentId;
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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/merchants" className="hover:text-gray-700">
          Merchant Profiles
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/merchants/${id}`} className="hover:text-gray-700">
          {merchant?.businessName || merchant?.name || 'Merchant'}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/merchants/${id}/apps/${agentId}`} className="hover:text-gray-700">
          {agentName}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">Transactions</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">AP2 Transactions</h1>
        <p className="text-gray-500">Transactions for {agentName}</p>
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

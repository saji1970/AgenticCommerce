import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { intentsApi, merchantsApi, agentsApi } from '../../api/client';
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
import { ShoppingCart, ChevronRight } from 'lucide-react';
import type { PurchaseIntent } from '../../types';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'executed', label: 'Executed' },
  { value: 'expired', label: 'Expired' },
];

const ITEMS_PER_PAGE = 10;

export function MerchantAppIntentsPage() {
  const { id, agentId } = useParams<{ id: string; agentId: string }>();
  const [status, setStatus] = useState('');
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
    queryKey: ['intents', { agentId, status, page }],
    queryFn: () =>
      intentsApi.getAll({
        agentId: agentId,
        status: status || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
    enabled: !!agentId,
  });

  if (isLoading) {
    return <LoadingPage message="Loading intents..." />;
  }

  if (error) {
    return (
      <Alert variant="error" title="Error loading intents">
        Failed to load purchase intents. Please try again.
      </Alert>
    );
  }

  const merchant = merchantData?.merchant;
  const agentName = monitoringData?.agent?.name || agentId;
  const intents: PurchaseIntent[] = data?.intents || [];

  const getStatusBadge = (intentStatus: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      executed: 'success',
      approved: 'info',
      pending: 'warning',
      rejected: 'error',
      expired: 'default',
    };
    return <Badge variant={variants[intentStatus] || 'default'}>{intentStatus}</Badge>;
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
        <span className="text-gray-900 font-medium">Purchase Intents</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Purchase Intents</h1>
        <p className="text-gray-500">Purchase intents for {agentName}</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex gap-4">
          <div className="w-48">
            <Select
              options={statusOptions}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </Card>

      {/* Intents Table */}
      <Card>
        {intents.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="h-12 w-12" />}
            title="No intents found"
            description={status ? 'Try adjusting your filters' : 'No purchase intents have been created yet'}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intents.map((intent) => (
                  <TableRow key={intent.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {intent.firstName} {intent.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{intent.userEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                        {intent.agentId}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{intent.items.length} item(s)</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {intent.items.map((i) => i.productName).join(', ')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ${intent.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-gray-500">
                        Tax: ${intent.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(intent.status)}</TableCell>
                    <TableCell>
                      <div>{new Date(intent.createdAt).toLocaleDateString()}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(intent.createdAt).toLocaleTimeString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {intents.length >= ITEMS_PER_PAGE && (
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(intents.length / ITEMS_PER_PAGE) + 1}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}

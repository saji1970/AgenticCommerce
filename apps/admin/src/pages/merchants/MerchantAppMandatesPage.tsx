import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mandatesApi, merchantsApi, agentsApi } from '../../api/client';
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
import { FileText, ChevronRight } from 'lucide-react';
import type { Mandate } from '../../types';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'revoked', label: 'Revoked' },
  { value: 'expired', label: 'Expired' },
];

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'cart', label: 'Cart' },
  { value: 'intent', label: 'Intent' },
  { value: 'payment', label: 'Payment' },
];

const ITEMS_PER_PAGE = 10;

export function MerchantAppMandatesPage() {
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
    queryKey: ['mandates', { agentId, status, type, page }],
    queryFn: () =>
      mandatesApi.getAll({
        agentId: agentId,
        status: status || undefined,
        type: type || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
    enabled: !!agentId,
  });

  if (isLoading) {
    return <LoadingPage message="Loading mandates..." />;
  }

  if (error) {
    return (
      <Alert variant="error" title="Error loading mandates">
        Failed to load mandates. Please try again.
      </Alert>
    );
  }

  const merchant = merchantData?.merchant;
  const agentName = monitoringData?.agent?.name || agentId;
  const mandates: Mandate[] = data?.mandates || [];

  const getStatusBadge = (mandateStatus: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      active: 'success',
      pending: 'warning',
      suspended: 'error',
      revoked: 'error',
      expired: 'default',
    };
    return <Badge variant={variants[mandateStatus] || 'default'}>{mandateStatus}</Badge>;
  };

  const getTypeBadge = (mandateType: string) => {
    const variants: Record<string, 'info' | 'warning' | 'success'> = {
      cart: 'info',
      intent: 'warning',
      payment: 'success',
    };
    return <Badge variant={variants[mandateType] || 'default'}>{mandateType}</Badge>;
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
        <span className="text-gray-900 font-medium">Mandates</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mandates</h1>
        <p className="text-gray-500">Mandates for {agentName}</p>
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

      {/* Mandates Table */}
      <Card>
        {mandates.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No mandates found"
            description={status || type ? 'Try adjusting your filters' : 'No mandates have been created yet'}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mandates.map((mandate) => (
                  <TableRow key={mandate.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {mandate.firstName} {mandate.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{mandate.userEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>{mandate.agentName}</TableCell>
                    <TableCell>{getTypeBadge(mandate.type)}</TableCell>
                    <TableCell>{getStatusBadge(mandate.status)}</TableCell>
                    <TableCell>
                      {new Date(mandate.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {mandate.expiresAt
                        ? new Date(mandate.expiresAt).toLocaleDateString()
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {mandates.length >= ITEMS_PER_PAGE && (
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(mandates.length / ITEMS_PER_PAGE) + 1}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}

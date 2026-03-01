import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mandatesApi } from '../../api/client';
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
import { FileText } from 'lucide-react';
import type { Mandate } from '../../types';
import { MandateDetailModal } from '../mandates/MandateDetailModal';
import { TransactionDetailModal } from '../transactions/TransactionDetailModal';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'revoked', label: 'Revoked' },
  { value: 'expired', label: 'Expired' },
];

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'app', label: 'App' },
  { value: 'cart', label: 'Cart' },
  { value: 'intent', label: 'Intent' },
  { value: 'payment', label: 'Payment' },
];

const ITEMS_PER_PAGE = 10;

interface AgentMandatesTabProps {
  agentId: string;
}

export function AgentMandatesTab({ agentId }: AgentMandatesTabProps) {
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [selectedMandateId, setSelectedMandateId] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

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

  const mandates: Mandate[] = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const getStatusBadge = (mandateStatus: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      active: 'success',
      completed: 'info',
      pending: 'warning',
      suspended: 'error',
      revoked: 'error',
      expired: 'default',
    };
    return <Badge variant={variants[mandateStatus] || 'default'}>{mandateStatus}</Badge>;
  };

  const getTypeBadge = (mandateType: string) => {
    const variants: Record<string, 'info' | 'warning' | 'success'> = {
      app: 'info',
      cart: 'info',
      intent: 'warning',
      payment: 'success',
    };
    return <Badge variant={variants[mandateType] || 'default'}>{mandateType}</Badge>;
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
        <Alert variant="error" title="Error loading mandates">
          Failed to load mandates. Please try again.
        </Alert>
      )}

      {isLoading ? (
        <LoadingPage message="Loading mandates..." />
      ) : (
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
                    <TableHead>User ID</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mandates.map((mandate) => (
                    <TableRow
                      key={mandate.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedMandateId(mandate.id)}
                    >
                      <TableCell>
                        <code className="text-xs">{mandate.userId.substring(0, 8)}...</code>
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

      <MandateDetailModal
        mandateId={selectedMandateId}
        isOpen={!!selectedMandateId}
        onClose={() => setSelectedMandateId(null)}
        onOpenMandate={(id) => setSelectedMandateId(id)}
        onOpenTransaction={(id) => {
          setSelectedMandateId(null);
          setSelectedTransactionId(id);
        }}
      />
      <TransactionDetailModal
        transactionId={selectedTransactionId}
        isOpen={!!selectedTransactionId}
        onClose={() => setSelectedTransactionId(null)}
        onOpenMandate={(id) => {
          setSelectedTransactionId(null);
          setSelectedMandateId(id);
        }}
      />
    </div>
  );
}

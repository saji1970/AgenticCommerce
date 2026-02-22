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
import { ShoppingCart } from 'lucide-react';
import type { Mandate } from '../../types';
import { MandateDetailModal } from '../mandates/MandateDetailModal';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'revoked', label: 'Revoked' },
  { value: 'expired', label: 'Expired' },
];

const ITEMS_PER_PAGE = 10;

interface AgentIntentsTabProps {
  agentId: string;
}

export function AgentIntentsTab({ agentId }: AgentIntentsTabProps) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedMandateId, setSelectedMandateId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['intent-mandates', { agentId, status, page }],
    queryFn: () =>
      mandatesApi.getAll({
        agentId: agentId,
        type: 'intent',
        status: status || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
    enabled: !!agentId,
  });

  const intents: Mandate[] = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const getStatusBadge = (intentStatus: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      active: 'success',
      pending: 'warning',
      suspended: 'error',
      revoked: 'error',
      expired: 'default',
    };
    return <Badge variant={variants[intentStatus] || 'default'}>{intentStatus}</Badge>;
  };

  const formatConstraintValue = (val: unknown): string => {
    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="space-y-6 pt-6">
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

      {error && (
        <Alert variant="error" title="Error loading intents">
          Failed to load intent mandates. Please try again.
        </Alert>
      )}

      {isLoading ? (
        <LoadingPage message="Loading intents..." />
      ) : (
        <Card>
          {intents.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-12 w-12" />}
              title="No intent mandates found"
              description={status ? 'Try adjusting your filters' : 'No intent mandates have been created yet'}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Constraints</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {intents.map((intent) => (
                    <TableRow
                      key={intent.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedMandateId(intent.id)}
                    >
                      <TableCell>
                        <code className="text-xs">{intent.userId.substring(0, 8)}...</code>
                      </TableCell>
                      <TableCell>{getStatusBadge(intent.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {Object.keys(intent.constraints || {}).length > 0
                            ? Object.entries(intent.constraints)
                                .slice(0, 3)
                                .map(([k, v]) => `${k}: ${formatConstraintValue(v)}`)
                                .join(', ')
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{new Date(intent.createdAt).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(intent.createdAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {intent.expiresAt
                          ? new Date(intent.expiresAt).toLocaleDateString()
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
      />
    </div>
  );
}

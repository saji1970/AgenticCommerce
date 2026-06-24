import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { disputesApi } from '../../api/client';
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
  LoadingPage,
  EmptyState,
  Alert,
} from '../../components/common';
import { Scale, Plus } from 'lucide-react';
import { CreateDisputeModal } from '../../components/disputes/CreateDisputeModal';
import { DisputeDetailModal } from '../../components/disputes/DisputeDetailModal';
import type { Dispute } from '../../types';

export function DisputesListPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['disputes', { status: statusFilter, limit, offset: page * limit }],
    queryFn: () =>
      disputesApi.getAll({
        status: statusFilter || undefined,
        limit,
        offset: page * limit,
      }),
  });

  const disputes = (data?.data || []) as Dispute[];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const statusVariant = (s: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      open: 'warning',
      investigating: 'info',
      evidence_submitted: 'default',
      won: 'success',
      lost: 'error',
      closed: 'default',
    };
    return map[s] || 'default';
  };

  const bauVariant = (s: string): 'success' | 'warning' | 'error' | 'default' => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      pending: 'warning',
      pushed: 'success',
      failed: 'error',
      not_required: 'default',
    };
    return map[s] || 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputes & Chargebacks</h1>
          <p className="text-gray-500">
            Manage disputes with mandate chain evidence, ISO 8583 fields, and BAU system push
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1 inline" />
          Create Dispute
        </Button>
      </div>

      <Card>
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="w-full sm:w-44">
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <Select
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'open', label: 'Open' },
                  { value: 'investigating', label: 'Investigating' },
                  { value: 'evidence_submitted', label: 'Evidence Submitted' },
                  { value: 'won', label: 'Won' },
                  { value: 'lost', label: 'Lost' },
                  { value: 'closed', label: 'Closed' },
                ]}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            {statusFilter && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setStatusFilter('');
                  setPage(0);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="error" title="Error loading disputes">
          Failed to load disputes.
        </Alert>
      )}

      {isLoading ? (
        <LoadingPage message="Loading disputes..." />
      ) : (
        <Card>
          {disputes.length === 0 ? (
            <EmptyState
              icon={<Scale className="h-12 w-12" />}
              title="No disputes found"
              description="No disputes match your filters. Create a new dispute from a transaction."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>BAU</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedId(d.id)}
                    >
                      <TableCell>
                        <span className="font-mono text-xs">{d.id.slice(0, 8)}...</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{d.transactionId.slice(0, 8)}...</span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${d.disputeAmount.toFixed(2)} {d.currency}
                      </TableCell>
                      <TableCell className="text-sm">{d.reason}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={bauVariant(d.bauPushStatus)}>{d.bauPushStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(d.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
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

      <CreateDisputeModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />

      <DisputeDetailModal
        disputeId={selectedId}
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mandatesApi } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
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
  Input,
  ConfirmDialog,
  LoadingPage,
  EmptyState,
  Alert,
} from '../../components/common';
import { FileText, Ban, Pause, Play } from 'lucide-react';

export function MandatesListPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const queryClient = useQueryClient();
  const { isSuperAdmin, isMerchantAdmin } = useAuth();
  const canManage = isSuperAdmin || isMerchantAdmin;

  // Revoke dialog state
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Suspend dialog state
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);

  // Reactivate dialog state
  const [reactivateTarget, setReactivateTarget] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['mandates', { status: statusFilter, type: typeFilter }],
    queryFn: () => mandatesApi.getAll({
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      limit: 100,
    }),
  });

  const mandates = data?.data || [];

  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => mandatesApi.revoke(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandates'] });
      setRevokeTarget(null);
      setRevokeReason('');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => mandatesApi.suspend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandates'] });
      setSuspendTarget(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => mandatesApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandates'] });
      setReactivateTarget(null);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      active: 'success',
      pending: 'warning',
      suspended: 'warning',
      revoked: 'error',
      expired: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'info' | 'warning' | 'success'> = {
      cart: 'info',
      intent: 'warning',
      payment: 'success',
    };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mandates</h1>
        <p className="text-gray-500">View and manage all mandates</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-48">
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'revoked', label: 'Revoked' },
                { value: 'expired', label: 'Expired' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={[
                { value: '', label: 'All Types' },
                { value: 'cart', label: 'Cart' },
                { value: 'intent', label: 'Intent' },
                { value: 'payment', label: 'Payment' },
              ]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="error" title="Error loading mandates">
          Failed to load mandates.
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
              description="No mandates match your current filters"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Created</TableHead>
                  {canManage && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mandates.map((mandate: any) => (
                  <TableRow key={mandate.id}>
                    <TableCell>
                      <span className="font-mono text-xs">{mandate.id.slice(0, 8)}...</span>
                    </TableCell>
                    <TableCell>{mandate.agentName}</TableCell>
                    <TableCell>{getTypeBadge(mandate.type)}</TableCell>
                    <TableCell>{getStatusBadge(mandate.status)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{mandate.userId?.slice(0, 8)}...</span>
                    </TableCell>
                    <TableCell>
                      {new Date(mandate.createdAt).toLocaleString()}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1">
                          {mandate.status === 'active' && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setSuspendTarget(mandate.id)}
                              >
                                <Pause className="h-3 w-3 mr-1" />
                                Suspend
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setRevokeTarget(mandate.id)}
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                Revoke
                              </Button>
                            </>
                          )}
                          {mandate.status === 'suspended' && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setReactivateTarget(mandate.id)}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Reactivate
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setRevokeTarget(mandate.id)}
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                Revoke
                              </Button>
                            </>
                          )}
                          {mandate.status === 'pending' && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setRevokeTarget(mandate.id)}
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Revoke Modal */}
      <Modal
        isOpen={!!revokeTarget}
        onClose={() => { setRevokeTarget(null); setRevokeReason(''); }}
        title="Revoke Mandate"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This action cannot be undone. The mandate will be permanently revoked.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <Input
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Enter reason for revocation..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setRevokeTarget(null); setRevokeReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => revokeTarget && revokeMutation.mutate({ id: revokeTarget, reason: revokeReason || undefined })}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke Mandate'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suspend Confirmation */}
      <ConfirmDialog
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => suspendTarget && suspendMutation.mutate(suspendTarget)}
        title="Suspend Mandate"
        message="Are you sure you want to suspend this mandate? It can be reactivated later."
        confirmText="Suspend"
        variant="warning"
        isLoading={suspendMutation.isPending}
      />

      {/* Reactivate Confirmation */}
      <ConfirmDialog
        isOpen={!!reactivateTarget}
        onClose={() => setReactivateTarget(null)}
        onConfirm={() => reactivateTarget && reactivateMutation.mutate(reactivateTarget)}
        title="Reactivate Mandate"
        message="Are you sure you want to reactivate this suspended mandate?"
        confirmText="Reactivate"
        variant="warning"
        isLoading={reactivateMutation.isPending}
      />
    </div>
  );
}

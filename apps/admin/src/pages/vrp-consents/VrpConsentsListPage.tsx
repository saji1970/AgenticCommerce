import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vrpConsentsApi } from '../../api/client';
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
import { RefreshCw, Ban, Pause } from 'lucide-react';
import { VrpConsentDetailModal } from '../../components/vrp/VrpConsentDetailModal';

export function VrpConsentsListPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const queryClient = useQueryClient();
  const { isSuperAdmin, isMerchantAdmin } = useAuth();
  const canManage = isSuperAdmin || isMerchantAdmin;

  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);
  const [selectedConsentId, setSelectedConsentId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['vrp-consents', { status: statusFilter, agentId: agentFilter }],
    queryFn: () =>
      vrpConsentsApi.getAll({
        status: statusFilter || undefined,
        agentId: agentFilter || undefined,
        limit: 100,
      }),
  });

  const consents = data?.data || [];
  const agentOptions = useMemo(() => {
    const agentMap = new Map<string, string>();
    consents.forEach((c: { agentId?: string; agentName?: string }) => {
      if (c.agentId && c.agentName) agentMap.set(c.agentId, c.agentName);
    });
    return Array.from(agentMap.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [consents]);

  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => vrpConsentsApi.revoke(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vrp-consents'] });
      setRevokeTarget(null);
      setRevokeReason('');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => vrpConsentsApi.suspend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vrp-consents'] });
      setSuspendTarget(null);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">VRP Consents</h1>
        <p className="text-gray-500">Variable Recurring Payment consents for AI agents</p>
      </div>

      <Card>
        <div className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-44">
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Agent</label>
              <Select
                options={[{ value: '', label: 'All Agents' }, ...agentOptions]}
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
              />
            </div>
            {(statusFilter || agentFilter) && (
              <Button
                variant="secondary"
                size="sm"
                className="self-end"
                onClick={() => {
                  setStatusFilter('');
                  setAgentFilter('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="error" title="Error loading VRP consents">
          Failed to load consents. Ensure the payment-gateway service is running.
        </Alert>
      )}

      {isLoading ? (
        <LoadingPage message="Loading VRP consents..." />
      ) : (
        <Card>
          {consents.length === 0 ? (
            <EmptyState
              icon={<RefreshCw className="h-12 w-12" />}
              title="No VRP consents found"
              description="No variable recurring payment consents match your filters"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Created</TableHead>
                  {canManage && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {consents.map((consent: any) => (
                  <TableRow
                    key={consent.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedConsentId(consent.id)}
                  >
                    <TableCell>
                      <span className="font-mono text-xs">{consent.id.slice(0, 8)}...</span>
                    </TableCell>
                    <TableCell>{consent.agentName}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{consent.userId?.slice(0, 8)}...</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(consent.status)}</TableCell>
                    <TableCell className="text-sm">
                      ${consent.maxAmountPerPayment?.toFixed(2)}/tx
                      {consent.dailyLimit != null && ` · $${consent.dailyLimit}/day`}
                      {consent.monthlyLimit != null && ` · $${consent.monthlyLimit}/mo`}
                    </TableCell>
                    <TableCell className="text-sm">
                      ${consent.amountUsedToday?.toFixed(2) ?? 0} today · ${consent.amountUsedMonth?.toFixed(2) ?? 0} month
                    </TableCell>
                    <TableCell>{new Date(consent.createdAt).toLocaleString()}</TableCell>
                    {canManage && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {consent.status === 'active' && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setSuspendTarget(consent.id)}
                              >
                                <Pause className="h-3 w-3 mr-1" />
                                Suspend
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setRevokeTarget(consent.id)}
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                Revoke
                              </Button>
                            </>
                          )}
                          {consent.status === 'suspended' && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setRevokeTarget(consent.id)}
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Revoke
                            </Button>
                          )}
                          {consent.status === 'pending' && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setRevokeTarget(consent.id)}
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

      <Modal
        isOpen={!!revokeTarget}
        onClose={() => {
          setRevokeTarget(null);
          setRevokeReason('');
        }}
        title="Revoke VRP Consent"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This action cannot be undone. The consent will be permanently revoked.
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
            <Button
              variant="secondary"
              onClick={() => {
                setRevokeTarget(null);
                setRevokeReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                revokeTarget &&
                revokeMutation.mutate({ id: revokeTarget, reason: revokeReason || undefined })
              }
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke Consent'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => suspendTarget && suspendMutation.mutate(suspendTarget)}
        title="Suspend VRP Consent"
        message="Are you sure you want to suspend this consent? Payments will be blocked until reactivated."
        confirmText="Suspend"
        variant="warning"
        isLoading={suspendMutation.isPending}
      />

      <VrpConsentDetailModal
        consentId={selectedConsentId}
        isOpen={!!selectedConsentId}
        onClose={() => setSelectedConsentId(null)}
        onSuspend={() => {
          if (selectedConsentId) setSuspendTarget(selectedConsentId);
        }}
        onRevoke={() => {
          if (selectedConsentId) setRevokeTarget(selectedConsentId);
        }}
      />
    </div>
  );
}

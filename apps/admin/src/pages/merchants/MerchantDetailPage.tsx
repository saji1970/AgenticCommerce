import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantsApi, agentsApi } from '../../api/client';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  ConfirmDialog,
  LoadingPage,
  Alert,
  Select,
  Input,
} from '../../components/common';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Bot,
  Plus,
  Key,
  RefreshCw,
  Power,
  PowerOff,
} from 'lucide-react';
import type { Merchant, MerchantAgent, AIAgent } from '../../types';
import { MerchantForm } from '../../components/merchants/MerchantForm';

export function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddAgentModalOpen, setIsAddAgentModalOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [isRotateKeysDialogOpen, setIsRotateKeysDialogOpen] = useState(false);
  const [isNewKeysModalOpen, setIsNewKeysModalOpen] = useState(false);
  const [newKeys, setNewKeys] = useState<{ apiKey: string; apiSecret: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['merchant', id],
    queryFn: () => merchantsApi.getById(id!),
    enabled: !!id,
  });

  const { data: agentsData } = useQuery({
    queryKey: ['merchant', id, 'agents'],
    queryFn: () => merchantsApi.getAgents(id!),
    enabled: !!id,
  });

  const { data: allAgentsData } = useQuery({
    queryKey: ['agents', 'all'],
    queryFn: () => agentsApi.getAll(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', id] });
      setIsEditModalOpen(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => merchantsApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', id] });
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      setIsStatusDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => merchantsApi.delete(id!),
    onSuccess: () => {
      navigate('/merchants');
    },
  });

  const addAgentMutation = useMutation({
    mutationFn: (agentId: string) => merchantsApi.addAgent(id!, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', id, 'agents'] });
      setIsAddAgentModalOpen(false);
      setSelectedAgentId('');
    },
  });

  const removeAgentMutation = useMutation({
    mutationFn: (agentId: string) => merchantsApi.removeAgent(id!, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', id, 'agents'] });
    },
  });

  const rotateKeysMutation = useMutation({
    mutationFn: () => merchantsApi.rotateKeys(id!),
    onSuccess: (data) => {
      setNewKeys({ apiKey: data.apiKey, apiSecret: data.apiSecret });
      setIsRotateKeysDialogOpen(false);
      setIsNewKeysModalOpen(true);
      queryClient.invalidateQueries({ queryKey: ['merchant', id] });
    },
  });

  if (isLoading) {
    return <LoadingPage message="Loading merchant details..." />;
  }

  if (error || !data?.merchant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/merchants')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Merchants
        </Button>
        <Alert variant="error" title="Error">
          Failed to load merchant details.
        </Alert>
      </div>
    );
  }

  const merchant: Merchant = data.merchant;
  const merchantAgents: MerchantAgent[] = agentsData?.agents || [];
  const allAgents: AIAgent[] = allAgentsData?.agents || [];

  const assignedAgentIds = new Set(merchantAgents.map((ma) => ma.agentId));
  const availableAgents = allAgents.filter((a) => !assignedAgentIds.has(a.id));

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      active: 'success',
      pending: 'warning',
      suspended: 'error',
      deactivated: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const handleStatusChange = (newStatus: string) => {
    setPendingStatus(newStatus);
    setIsStatusDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/merchants')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{merchant.name}</h1>
            <p className="text-gray-500">{merchant.businessName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="danger" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Merchant Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{merchant.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900">{merchant.website || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">{getStatusBadge(merchant.status)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tier</dt>
                <dd className="mt-1">
                  <Badge variant="info">{merchant.tier}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(merchant.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Activity</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {merchant.lastActivityAt
                    ? new Date(merchant.lastActivityAt).toLocaleString()
                    : 'Never'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Status Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Status Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {merchant.status === 'pending' && (
              <Button
                className="w-full"
                onClick={() => handleStatusChange('active')}
              >
                <Power className="h-4 w-4 mr-2" />
                Activate Merchant
              </Button>
            )}
            {merchant.status === 'active' && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleStatusChange('suspended')}
              >
                <PowerOff className="h-4 w-4 mr-2" />
                Suspend Merchant
              </Button>
            )}
            {merchant.status === 'suspended' && (
              <>
                <Button
                  className="w-full"
                  onClick={() => handleStatusChange('active')}
                >
                  <Power className="h-4 w-4 mr-2" />
                  Reactivate
                </Button>
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => handleStatusChange('deactivated')}
                >
                  <PowerOff className="h-4 w-4 mr-2" />
                  Deactivate
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* API Credentials */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>API Credentials</CardTitle>
          <Button variant="secondary" size="sm" onClick={() => setIsRotateKeysDialogOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Rotate Keys
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">API Key</dt>
              <dd className="mt-1 flex items-center gap-2">
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                  {merchant.apiKey}
                </code>
                <Key className="h-4 w-4 text-gray-400" />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Webhook URL</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {merchant.webhookUrl || 'Not configured'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Merchant Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Max Transaction</dt>
              <dd className="mt-1 text-sm text-gray-900">
                ${merchant.settings.maxTransactionAmount.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Daily Limit</dt>
              <dd className="mt-1 text-sm text-gray-900">
                ${merchant.settings.dailyTransactionLimit.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Monthly Limit</dt>
              <dd className="mt-1 text-sm text-gray-900">
                ${merchant.settings.monthlyTransactionLimit.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Cart Mandate</dt>
              <dd className="mt-1">
                <Badge variant={merchant.settings.supportsCartMandate ? 'success' : 'default'}>
                  {merchant.settings.supportsCartMandate ? 'Enabled' : 'Disabled'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Intent Mandate</dt>
              <dd className="mt-1">
                <Badge variant={merchant.settings.supportsIntentMandate ? 'success' : 'default'}>
                  {merchant.settings.supportsIntentMandate ? 'Enabled' : 'Disabled'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Payment Mandate</dt>
              <dd className="mt-1">
                <Badge variant={merchant.settings.supportsPaymentMandate ? 'success' : 'default'}>
                  {merchant.settings.supportsPaymentMandate ? 'Enabled' : 'Disabled'}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Associated Agents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Associated Agentic Apps</CardTitle>
          <Button size="sm" onClick={() => setIsAddAgentModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add App
          </Button>
        </CardHeader>
        <CardContent>
          {merchantAgents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No agentic apps associated yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchantAgents.map((ma) => (
                  <TableRow key={ma.id}>
                    <TableCell>
                      <Link
                        to={`/merchants/${id}/apps/${ma.agent?.agentId}`}
                        className="flex items-center gap-2 text-primary-600 hover:text-primary-800"
                      >
                        <Bot className="h-4 w-4 text-gray-400" />
                        {ma.agent?.name || ma.agentId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ma.isActive ? 'success' : 'default'}>
                        {ma.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(ma.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAgentMutation.mutate(ma.agentId)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Merchant"
        size="lg"
      >
        <MerchantForm
          initialData={{
            name: merchant.name,
            businessName: merchant.businessName,
            email: merchant.email,
            website: merchant.website,
            tier: merchant.tier,
            webhookUrl: merchant.webhookUrl,
          }}
          onSubmit={async (data) => {
            await updateMutation.mutateAsync(data);
          }}
          onCancel={() => setIsEditModalOpen(false)}
          isLoading={updateMutation.isPending}
          error={updateMutation.error?.message}
        />
      </Modal>

      {/* Add Agent Modal */}
      <Modal
        isOpen={isAddAgentModalOpen}
        onClose={() => setIsAddAgentModalOpen(false)}
        title="Add Agentic App"
      >
        <div className="space-y-4">
          <Select
            label="Select Agent"
            options={[
              { value: '', label: 'Select an agent...' },
              ...availableAgents.map((a) => ({ value: a.id, label: a.name })),
            ]}
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsAddAgentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addAgentMutation.mutate(selectedAgentId)}
              disabled={!selectedAgentId}
              isLoading={addAgentMutation.isPending}
            >
              Add Agent
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Merchant"
        message={`Are you sure you want to delete "${merchant.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
      />

      {/* Status Change Confirmation */}
      <ConfirmDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        onConfirm={() => updateStatusMutation.mutate(pendingStatus)}
        title="Change Merchant Status"
        message={`Are you sure you want to change the status to "${pendingStatus}"?`}
        confirmText="Confirm"
        variant="warning"
        isLoading={updateStatusMutation.isPending}
      />

      {/* Rotate Keys Confirmation */}
      <ConfirmDialog
        isOpen={isRotateKeysDialogOpen}
        onClose={() => setIsRotateKeysDialogOpen(false)}
        onConfirm={() => rotateKeysMutation.mutate()}
        title="Rotate API Keys"
        message="Are you sure you want to rotate the API keys? The current keys will be immediately invalidated and the merchant will need to update their integration with the new keys."
        confirmText="Rotate Keys"
        variant="warning"
        isLoading={rotateKeysMutation.isPending}
      />

      {/* New Keys Modal */}
      <Modal
        isOpen={isNewKeysModalOpen}
        onClose={() => {
          setIsNewKeysModalOpen(false);
          setNewKeys(null);
        }}
        title="New API Keys Generated"
        size="lg"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            Please copy these keys now. The API Secret will not be shown again.
          </Alert>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={newKeys?.apiKey || ''}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigator.clipboard.writeText(newKeys?.apiKey || '')}
              >
                Copy
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Secret
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={newKeys?.apiSecret || ''}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigator.clipboard.writeText(newKeys?.apiSecret || '')}
              >
                Copy
              </Button>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => {
              setIsNewKeysModalOpen(false);
              setNewKeys(null);
            }}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

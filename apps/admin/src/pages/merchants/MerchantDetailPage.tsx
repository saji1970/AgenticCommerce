import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantsApi } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
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
  ConfirmDialog,
  LoadingPage,
  Alert,
  Input,
  Modal,
} from '../../components/common';
import {
  ArrowLeft,
  Bot,
  Key,
  RefreshCw,
  Power,
  PowerOff,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';

interface AgentFormData {
  name: string;
  description: string;
  agentId: string;
  agentName: string;
  apiEndpoint: string;
  capabilities: string;
}

const emptyAgentForm: AgentFormData = {
  name: '',
  description: '',
  agentId: '',
  agentName: '',
  apiEndpoint: '',
  capabilities: '',
};

export function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSuperAdmin, isMerchantAdmin } = useAuth();
  const canManageAgents = isSuperAdmin || isMerchantAdmin;

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [isRotateKeysDialogOpen, setIsRotateKeysDialogOpen] = useState(false);
  const [isNewKeysModalOpen, setIsNewKeysModalOpen] = useState(false);
  const [newKeys, setNewKeys] = useState<{ apiKey: string; apiSecret: string } | null>(null);

  // Agent CRUD state
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [deleteAgentTarget, setDeleteAgentTarget] = useState<any | null>(null);
  const [agentForm, setAgentForm] = useState<AgentFormData>(emptyAgentForm);

  // Merchant edit state
  const [isEditMerchantOpen, setIsEditMerchantOpen] = useState(false);
  const [merchantEditForm, setMerchantEditForm] = useState({ name: '', description: '', webhookUrl: '' });

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

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => merchantsApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', id] });
      setIsStatusDialogOpen(false);
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

  const createAgentMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantsApi.addAgent(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', id, 'agents'] });
      setIsCreateAgentOpen(false);
      setAgentForm(emptyAgentForm);
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: Record<string, unknown> }) =>
      merchantsApi.updateAgent(id!, agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', id, 'agents'] });
      setEditingAgent(null);
      setAgentForm(emptyAgentForm);
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => merchantsApi.deleteAgent(id!, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', id, 'agents'] });
      setDeleteAgentTarget(null);
    },
  });

  const updateMerchantMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => merchantsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', id] });
      setIsEditMerchantOpen(false);
    },
  });

  if (isLoading) {
    return <LoadingPage message="Loading merchant details..." />;
  }

  if (error || !data?.merchant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="error" title="Error">
          Failed to load merchant details.
        </Alert>
      </div>
    );
  }

  const merchant = data.merchant;
  const agents: any[] = agentsData?.agents || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      active: 'success',
      pending: 'warning',
      suspended: 'error',
      inactive: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const handleStatusChange = (newStatus: string) => {
    setPendingStatus(newStatus);
    setIsStatusDialogOpen(true);
  };

  const handleCreateAgent = () => {
    createAgentMutation.mutate({
      name: agentForm.name,
      agentId: agentForm.agentId,
      agentName: agentForm.agentName,
      description: agentForm.description || undefined,
      apiEndpoint: agentForm.apiEndpoint || undefined,
      capabilities: agentForm.capabilities
        ? agentForm.capabilities.split(',').map(c => c.trim()).filter(Boolean)
        : [],
    });
  };

  const handleEditAgent = () => {
    if (!editingAgent) return;
    updateAgentMutation.mutate({
      agentId: editingAgent.id,
      data: {
        name: agentForm.name || undefined,
        description: agentForm.description,
        apiEndpoint: agentForm.apiEndpoint,
        capabilities: agentForm.capabilities
          ? agentForm.capabilities.split(',').map(c => c.trim()).filter(Boolean)
          : undefined,
      },
    });
  };

  const openEditAgent = (agent: any) => {
    setEditingAgent(agent);
    setAgentForm({
      name: agent.name || '',
      description: agent.description || '',
      agentId: agent.agent_id || '',
      agentName: agent.agent_name || '',
      apiEndpoint: agent.api_endpoint || '',
      capabilities: (agent.capabilities || []).join(', '),
    });
  };

  const openEditMerchant = () => {
    setMerchantEditForm({
      name: merchant.name || '',
      description: merchant.description || '',
      webhookUrl: merchant.webhook_url || '',
    });
    setIsEditMerchantOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{merchant.name}</h1>
            <p className="text-gray-500 font-mono text-sm">{merchant.slug}</p>
          </div>
        </div>
        {canManageAgents && (
          <Button variant="secondary" onClick={openEditMerchant}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
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
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{merchant.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Slug</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{merchant.slug}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">{getStatusBadge(merchant.status)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{merchant.description || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Webhook URL</dt>
                <dd className="mt-1 text-sm text-gray-900">{merchant.webhook_url || 'Not configured'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(merchant.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Status Actions - super_admin only */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Status Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <Button
                  className="w-full"
                  onClick={() => handleStatusChange('active')}
                >
                  <Power className="h-4 w-4 mr-2" />
                  Reactivate
                </Button>
              )}
              {merchant.status === 'inactive' && (
                <Button
                  className="w-full"
                  onClick={() => handleStatusChange('active')}
                >
                  <Power className="h-4 w-4 mr-2" />
                  Activate
                </Button>
              )}
            </CardContent>
          </Card>
        )}
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
                  {merchant.api_key}
                </code>
                <Key className="h-4 w-4 text-gray-400" />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Associated Agents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>AI Agents ({agents.length})</CardTitle>
          {canManageAgents && (
            <Button size="sm" onClick={() => { setAgentForm(emptyAgentForm); setIsCreateAgentOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Register Agent
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No agents registered yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Agent ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {canManageAgents && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent: any) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-gray-400" />
                        {agent.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{agent.agent_id}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell>
                      {new Date(agent.created_at).toLocaleDateString()}
                    </TableCell>
                    {canManageAgents && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="secondary" size="sm" onClick={() => openEditAgent(agent)}>
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setDeleteAgentTarget(agent)}>
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
        message="Are you sure you want to rotate the API keys? The current keys will be immediately invalidated."
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
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <div className="flex items-center gap-2">
              <Input value={newKeys?.apiKey || ''} readOnly className="font-mono text-sm" />
              <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(newKeys?.apiKey || '')}>
                Copy
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
            <div className="flex items-center gap-2">
              <Input value={newKeys?.apiSecret || ''} readOnly className="font-mono text-sm" />
              <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(newKeys?.apiSecret || '')}>
                Copy
              </Button>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => { setIsNewKeysModalOpen(false); setNewKeys(null); }}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Agent Modal */}
      <Modal
        isOpen={isCreateAgentOpen}
        onClose={() => { setIsCreateAgentOpen(false); setAgentForm(emptyAgentForm); }}
        title="Register New Agent"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <Input
              value={agentForm.name}
              onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
              placeholder="My AI Agent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agent ID *</label>
            <Input
              value={agentForm.agentId}
              onChange={(e) => setAgentForm({ ...agentForm, agentId: e.target.value })}
              placeholder="agent-123"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name *</label>
            <Input
              value={agentForm.agentName}
              onChange={(e) => setAgentForm({ ...agentForm, agentName: e.target.value })}
              placeholder="Shopping Assistant"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Input
              value={agentForm.description}
              onChange={(e) => setAgentForm({ ...agentForm, description: e.target.value })}
              placeholder="A brief description of the agent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
            <Input
              value={agentForm.apiEndpoint}
              onChange={(e) => setAgentForm({ ...agentForm, apiEndpoint: e.target.value })}
              placeholder="https://api.example.com/agent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capabilities (comma-separated)</label>
            <Input
              value={agentForm.capabilities}
              onChange={(e) => setAgentForm({ ...agentForm, capabilities: e.target.value })}
              placeholder="cart, payment, search"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => { setIsCreateAgentOpen(false); setAgentForm(emptyAgentForm); }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAgent}
              disabled={!agentForm.name || !agentForm.agentId || !agentForm.agentName || createAgentMutation.isPending}
            >
              {createAgentMutation.isPending ? 'Creating...' : 'Register Agent'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Agent Modal */}
      <Modal
        isOpen={!!editingAgent}
        onClose={() => { setEditingAgent(null); setAgentForm(emptyAgentForm); }}
        title="Edit Agent"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <Input
              value={agentForm.name}
              onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Input
              value={agentForm.description}
              onChange={(e) => setAgentForm({ ...agentForm, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
            <Input
              value={agentForm.apiEndpoint}
              onChange={(e) => setAgentForm({ ...agentForm, apiEndpoint: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capabilities (comma-separated)</label>
            <Input
              value={agentForm.capabilities}
              onChange={(e) => setAgentForm({ ...agentForm, capabilities: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => { setEditingAgent(null); setAgentForm(emptyAgentForm); }}>
              Cancel
            </Button>
            <Button onClick={handleEditAgent} disabled={updateAgentMutation.isPending}>
              {updateAgentMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Agent Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteAgentTarget}
        onClose={() => setDeleteAgentTarget(null)}
        onConfirm={() => deleteAgentTarget && deleteAgentMutation.mutate(deleteAgentTarget.id)}
        title="Delete Agent"
        message={`Are you sure you want to deactivate "${deleteAgentTarget?.name}"? This will set the agent's status to inactive.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteAgentMutation.isPending}
      />

      {/* Edit Merchant Modal */}
      <Modal
        isOpen={isEditMerchantOpen}
        onClose={() => setIsEditMerchantOpen(false)}
        title="Edit Merchant Profile"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <Input
              value={merchantEditForm.name}
              onChange={(e) => setMerchantEditForm({ ...merchantEditForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Input
              value={merchantEditForm.description}
              onChange={(e) => setMerchantEditForm({ ...merchantEditForm, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
            <Input
              value={merchantEditForm.webhookUrl}
              onChange={(e) => setMerchantEditForm({ ...merchantEditForm, webhookUrl: e.target.value })}
              placeholder="https://your-domain.com/webhook"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsEditMerchantOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMerchantMutation.mutate({
                name: merchantEditForm.name,
                description: merchantEditForm.description,
                webhookUrl: merchantEditForm.webhookUrl,
              })}
              disabled={updateMerchantMutation.isPending}
            >
              {updateMerchantMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

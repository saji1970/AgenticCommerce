import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/client';
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
  Input,
} from '../../components/common';
import {
  ArrowLeft,
  User,
  FileText,
  ShoppingCart,
  Ban,
  CheckCircle,
  DollarSign,
} from 'lucide-react';
import type { User as UserType, UserSettings, Mandate, PurchaseIntent } from '../../types';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isUnblockDialogOpen, setIsUnblockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [limits, setLimits] = useState({
    defaultMaxTransaction: 1000,
    defaultDailyLimit: 5000,
    defaultMonthlyLimit: 50000,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getById(id!),
    enabled: !!id,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['user', id, 'settings'],
    queryFn: () => usersApi.getSettings(id!),
    enabled: !!id,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: {
      defaultMaxTransaction?: number;
      defaultDailyLimit?: number;
      defaultMonthlyLimit?: number;
    }) => usersApi.updateSettings(id!, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id, 'settings'] });
      setIsLimitsModalOpen(false);
    },
  });

  const blockMutation = useMutation({
    mutationFn: (reason: string) => usersApi.block(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['user', id, 'settings'] });
      setIsBlockDialogOpen(false);
      setBlockReason('');
    },
  });

  const unblockMutation = useMutation({
    mutationFn: () => usersApi.unblock(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['user', id, 'settings'] });
      setIsUnblockDialogOpen(false);
    },
  });

  if (isLoading) {
    return <LoadingPage message="Loading user details..." />;
  }

  if (error || !data?.user) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/users')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
        <Alert variant="error" title="Error">
          Failed to load user details.
        </Alert>
      </div>
    );
  }

  const user: UserType = data.user;
  const mandates: Mandate[] = data.mandates || [];
  const intents: PurchaseIntent[] = data.intents || [];
  const settings: UserSettings | null = settingsData?.settings || null;
  const isBlocked = settings?.isBlocked || false;

  const openLimitsModal = () => {
    if (settings) {
      setLimits({
        defaultMaxTransaction: settings.defaultMaxTransaction,
        defaultDailyLimit: settings.defaultDailyLimit,
        defaultMonthlyLimit: settings.defaultMonthlyLimit,
      });
    }
    setIsLimitsModalOpen(true);
  };

  const getMandateStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      active: 'success',
      pending: 'warning',
      suspended: 'error',
      revoked: 'error',
      expired: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getIntentStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      executed: 'success',
      approved: 'info',
      pending: 'warning',
      rejected: 'error',
      expired: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 font-medium text-xl">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isBlocked ? (
            <Button variant="secondary" onClick={() => setIsUnblockDialogOpen(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Unblock User
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setIsBlockDialogOpen(true)}>
              <Ban className="h-4 w-4 mr-2" />
              Block User
            </Button>
          )}
        </div>
      </div>

      {/* Blocked Alert */}
      {isBlocked && (
        <Alert variant="error" title="User Blocked">
          This user was blocked on {settings?.blockedAt ? new Date(settings.blockedAt).toLocaleString() : 'Unknown'}.
          {settings?.blockedReason && <span> Reason: {settings.blockedReason}</span>}
        </Alert>
      )}

      {/* User Info & Limits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.phoneNumber || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1">
                  <Badge variant={user.role === 'admin' ? 'success' : 'info'}>
                    {user.role}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Joined</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <Badge variant={isBlocked ? 'error' : 'success'}>
                    {isBlocked ? 'Blocked' : 'Active'}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Default Limits</CardTitle>
            <Button variant="secondary" size="sm" onClick={openLimitsModal}>
              Edit Limits
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              These are default limits that users can override in their mobile apps.
            </p>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Max Transaction
                </dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${(settings?.defaultMaxTransaction || 1000).toLocaleString()}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Daily Limit
                </dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${(settings?.defaultDailyLimit || 5000).toLocaleString()}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Monthly Limit
                </dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${(settings?.defaultMonthlyLimit || 50000).toLocaleString()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Mandates</p>
                <p className="text-2xl font-bold">
                  {mandates.filter((m) => m.status === 'active').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-primary-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Intents</p>
                <p className="text-2xl font-bold">{intents.length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold">
                  ${intents
                    .filter((i) => i.status === 'executed')
                    .reduce((sum, i) => sum + i.total, 0)
                    .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mandates */}
      <Card>
        <CardHeader>
          <CardTitle>Mandates</CardTitle>
        </CardHeader>
        <CardContent>
          {mandates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No mandates yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mandates.map((mandate) => (
                  <TableRow key={mandate.id}>
                    <TableCell>{mandate.agentName}</TableCell>
                    <TableCell>
                      <Badge variant="info">{mandate.type}</Badge>
                    </TableCell>
                    <TableCell>{getMandateStatusBadge(mandate.status)}</TableCell>
                    <TableCell>
                      {new Date(mandate.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Purchase Intents */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Intents</CardTitle>
        </CardHeader>
        <CardContent>
          {intents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No purchase intents yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intents.slice(0, 10).map((intent) => (
                  <TableRow key={intent.id}>
                    <TableCell>{intent.agentId}</TableCell>
                    <TableCell>{intent.items.length} items</TableCell>
                    <TableCell>
                      ${intent.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{getIntentStatusBadge(intent.status)}</TableCell>
                    <TableCell>
                      {new Date(intent.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Limits Modal */}
      <Modal
        isOpen={isLimitsModalOpen}
        onClose={() => setIsLimitsModalOpen(false)}
        title="Edit Default Limits"
      >
        <div className="space-y-4">
          <Alert variant="info">
            These are default limits. Users can override these values in their mobile apps.
          </Alert>
          <Input
            label="Max Transaction Amount ($)"
            type="number"
            value={limits.defaultMaxTransaction}
            onChange={(e) =>
              setLimits({ ...limits, defaultMaxTransaction: parseFloat(e.target.value) || 0 })
            }
          />
          <Input
            label="Daily Limit ($)"
            type="number"
            value={limits.defaultDailyLimit}
            onChange={(e) =>
              setLimits({ ...limits, defaultDailyLimit: parseFloat(e.target.value) || 0 })
            }
          />
          <Input
            label="Monthly Limit ($)"
            type="number"
            value={limits.defaultMonthlyLimit}
            onChange={(e) =>
              setLimits({ ...limits, defaultMonthlyLimit: parseFloat(e.target.value) || 0 })
            }
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsLimitsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateSettingsMutation.mutate(limits)}
              isLoading={updateSettingsMutation.isPending}
            >
              Save Limits
            </Button>
          </div>
        </div>
      </Modal>

      {/* Block User Dialog */}
      <Modal
        isOpen={isBlockDialogOpen}
        onClose={() => {
          setIsBlockDialogOpen(false);
          setBlockReason('');
        }}
        title="Block User"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            Blocking this user will prevent them from making any transactions or accessing their account.
          </Alert>
          <Input
            label="Reason for blocking"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Enter reason..."
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsBlockDialogOpen(false);
                setBlockReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => blockMutation.mutate(blockReason)}
              disabled={!blockReason.trim()}
              isLoading={blockMutation.isPending}
            >
              Block User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unblock User Dialog */}
      <ConfirmDialog
        isOpen={isUnblockDialogOpen}
        onClose={() => setIsUnblockDialogOpen(false)}
        onConfirm={() => unblockMutation.mutate()}
        title="Unblock User"
        message="Are you sure you want to unblock this user? They will regain access to their account and be able to make transactions."
        confirmText="Unblock"
        variant="info"
        isLoading={unblockMutation.isPending}
      />
    </div>
  );
}

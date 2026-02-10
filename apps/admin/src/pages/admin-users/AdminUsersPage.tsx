import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsersApi, merchantsApi } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import {
  Button,
  Badge,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  LoadingPage,
  EmptyState,
  Alert,
  Modal,
  Input,
  Select,
} from '../../components/common';
import { Plus, UserCog } from 'lucide-react';
import type { AdminUser } from '../../types';

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  merchant_admin: 'Merchant Admin',
  merchant_operator: 'Operator',
};

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', { role: roleFilter, status: statusFilter }],
    queryFn: () => adminUsersApi.getAll({
      role: roleFilter || undefined,
      status: statusFilter || undefined,
    }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => adminUsersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const users: AdminUser[] = data?.data || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      active: 'success',
      suspended: 'warning',
      deactivated: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'info' | 'warning' | 'success'> = {
      super_admin: 'info',
      merchant_admin: 'warning',
      merchant_operator: 'success',
    };
    return <Badge variant={variants[role] || 'default'}>{roleLabels[role] || role}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSuperAdmin ? 'Admin Users' : 'Team Members'}
          </h1>
          <p className="text-gray-500">Manage admin user accounts and roles</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-48">
            <Select
              options={[
                { value: '', label: 'All Roles' },
                ...(isSuperAdmin ? [{ value: 'super_admin', label: 'Super Admin' }] : []),
                { value: 'merchant_admin', label: 'Merchant Admin' },
                { value: 'merchant_operator', label: 'Operator' },
              ]}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'deactivated', label: 'Deactivated' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="error" title="Error loading users">
          Failed to load admin users.
        </Alert>
      )}

      {isLoading ? (
        <LoadingPage message="Loading admin users..." />
      ) : (
        <Card>
          {users.length === 0 ? (
            <EmptyState
              icon={<UserCog className="h-12 w-12" />}
              title="No admin users found"
              description="Get started by adding your first admin user"
              action={{ label: 'Add User', onClick: () => setIsCreateModalOpen(true) }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.firstName} {u.lastName}</div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell>{getStatusBadge(u.status)}</TableCell>
                    <TableCell>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deactivateMutation.mutate(u.id)}
                          isLoading={deactivateMutation.isPending}
                        >
                          Deactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      <CreateAdminUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

function CreateAdminUserModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { isSuperAdmin, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<string>(isSuperAdmin ? 'merchant_admin' : 'merchant_operator');
  const [merchantId, setMerchantId] = useState(user?.merchantId || '');
  const [error, setError] = useState('');

  const { data: merchantsData } = useQuery({
    queryKey: ['merchants-for-select'],
    queryFn: () => merchantsApi.getAll(),
    enabled: isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: adminUsersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      resetForm();
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || 'Failed to create user');
    },
  });

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setRole(isSuperAdmin ? 'merchant_admin' : 'merchant_operator');
    setMerchantId(user?.merchantId || '');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    createMutation.mutate({
      email,
      password,
      firstName,
      lastName,
      role,
      merchantId: role === 'super_admin' ? null : (merchantId || null),
    });
  };

  const merchants = merchantsData?.merchants || [];

  const roleOptions = isSuperAdmin
    ? [
        { value: 'super_admin', label: 'Super Admin' },
        { value: 'merchant_admin', label: 'Merchant Admin' },
        { value: 'merchant_operator', label: 'Operator' },
      ]
    : [
        { value: 'merchant_operator', label: 'Operator' },
      ];

  return (
    <Modal isOpen={isOpen} onClose={() => { resetForm(); onClose(); }} title="Create Admin User" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Select
          label="Role"
          options={roleOptions}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />

        {isSuperAdmin && role !== 'super_admin' && (
          <Select
            label="Merchant"
            options={[
              { value: '', label: 'Select a merchant...' },
              ...merchants.map((m: any) => ({ value: m.id, label: m.name })),
            ]}
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
          />
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => { resetForm(); onClose(); }}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            Create User
          </Button>
        </div>
      </form>
    </Modal>
  );
}

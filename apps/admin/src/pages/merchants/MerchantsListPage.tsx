import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { merchantsApi } from '../../api/client';
import {
  Button,
  Input,
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
  Modal,
  LoadingPage,
  EmptyState,
  Alert,
} from '../../components/common';
import { Plus, Search, Building2 } from 'lucide-react';
import { MerchantForm } from '../../components/merchants/MerchantForm';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deactivated', label: 'Deactivated' },
];

const ITEMS_PER_PAGE = 10;

export function MerchantsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['merchants', { search, status, page }],
    queryFn: () =>
      merchantsApi.getAll({
        search: search || undefined,
        status: status || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
  });

  const createMutation = useMutation({
    mutationFn: merchantsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      setIsCreateModalOpen(false);
    },
  });

  const getStatusBadge = (merchantStatus: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      active: 'success',
      pending: 'warning',
      suspended: 'error',
      deactivated: 'default',
    };
    return <Badge variant={variants[merchantStatus] || 'default'}>{merchantStatus}</Badge>;
  };

  const merchants: any[] = data?.merchants || [];
  const pagination = data?.pagination || { total: 0, limit: ITEMS_PER_PAGE, offset: 0 };
  const totalPages = Math.ceil(pagination.total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
          <p className="text-gray-500">Manage merchant accounts and settings</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Merchant
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search merchants..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
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
        </div>
      </Card>

      {error && (
        <Alert variant="error" title="Error loading merchants">
          Failed to load merchants. Please try again.
        </Alert>
      )}

      {isLoading ? (
        <LoadingPage message="Loading merchants..." />
      ) : (
      /* Merchants Table */
      <Card>
        {merchants.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-12 w-12" />}
            title="No merchants found"
            description={search || status ? 'Try adjusting your filters' : 'Get started by adding your first merchant'}
            action={
              !search && !status
                ? { label: 'Add Merchant', onClick: () => setIsCreateModalOpen(true) }
                : undefined
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchants.map((merchant: any) => (
                  <TableRow
                    key={merchant.id}
                    onClick={() => navigate(`/merchants/${merchant.id}`)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{merchant.name}</div>
                        {merchant.description && (
                          <div className="text-sm text-gray-500">{merchant.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-gray-500">{merchant.slug}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(merchant.status)}</TableCell>
                    <TableCell>
                      {new Date(merchant.created_at || merchant.createdAt).toLocaleDateString()}
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
                totalItems={pagination.total}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            )}
          </>
        )}
      </Card>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Merchant"
        size="lg"
      >
        <MerchantForm
          onSubmit={async (data) => {
            await createMutation.mutateAsync(data);
          }}
          onCancel={() => setIsCreateModalOpen(false)}
          isLoading={createMutation.isPending}
          error={createMutation.error?.message}
        />
      </Modal>
    </div>
  );
}

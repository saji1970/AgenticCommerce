import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '../../api/client';
import {
  Input,
  Select,
  Badge,
  Card,
  CardHeader,
  CardTitle,
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
} from '../../components/common';
import { FileText, Search } from 'lucide-react';
import type { AuditLog } from '../../types';

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'block', label: 'Block' },
  { value: 'unblock', label: 'Unblock' },
  { value: 'revoke', label: 'Revoke' },
  { value: 'status_change', label: 'Status Change' },
];

const resourceOptions = [
  { value: '', label: 'All Resources' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'agent', label: 'Agent' },
  { value: 'user', label: 'User' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'mandate', label: 'Mandate' },
  { value: 'settings', label: 'Settings' },
];

const ITEMS_PER_PAGE = 20;

export function AuditLogsPage() {
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', { action, resourceType, page }],
    queryFn: () =>
      auditLogsApi.getAll({
        action: action || undefined,
        resourceType: resourceType || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
  });

  if (isLoading) {
    return <LoadingPage message="Loading audit logs..." />;
  }

  if (error) {
    return (
      <Alert variant="error" title="Error loading audit logs">
        Failed to load audit logs. Please try again.
      </Alert>
    );
  }

  const logs: AuditLog[] = data?.logs || [];
  const pagination = data?.pagination || { total: 0, limit: ITEMS_PER_PAGE, offset: 0 };
  const totalPages = Math.ceil(pagination.total / ITEMS_PER_PAGE);

  const getActionBadge = (logAction: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      create: 'success',
      update: 'info',
      delete: 'error',
      block: 'error',
      unblock: 'success',
      revoke: 'error',
      status_change: 'warning',
    };
    return <Badge variant={variants[logAction] || 'default'}>{logAction}</Badge>;
  };

  const getResourceBadge = (resource: string) => {
    const variants: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
      merchant: 'info',
      agent: 'warning',
      user: 'success',
      certificate: 'default',
      mandate: 'info',
      settings: 'default',
    };
    return <Badge variant={variants[resource] || 'default'}>{resource}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-500">Track all administrative actions on the platform</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-48">
            <Select
              options={actionOptions}
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={resourceOptions}
              value={resourceType}
              onChange={(e) => {
                setResourceType(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        {logs.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No audit logs found"
            description={action || resourceType ? 'Try adjusting your filters' : 'No administrative actions have been recorded yet'}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{log.adminName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{log.adminEmail}</div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>{getResourceBadge(log.resourceType)}</TableCell>
                    <TableCell>
                      {log.resourceId ? (
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {log.resourceId.substring(0, 8)}...
                        </code>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{log.ipAddress || '-'}</code>
                    </TableCell>
                    <TableCell>
                      {log.newValue || log.oldValue ? (
                        <button
                          className="text-primary-600 hover:text-primary-800 text-sm"
                          onClick={() => {
                            console.log('Old:', log.oldValue);
                            console.log('New:', log.newValue);
                          }}
                        >
                          View Changes
                        </button>
                      ) : (
                        '-'
                      )}
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
    </div>
  );
}
